import { authenticateToken } from "../middleware/auth.js";
import { getTodayUsage, updateTodayUsage } from "../db/wordUsage.js";
import { getPlanLimits } from "../config/plans.js";
import { sarvamKeys, createStreamingSession } from "./sarvam.js";
import { persona } from "./persona.js";
import supabase from "../db/supabase.js";

const VALID_PERSONA = ["Work", "Email", "Personal", "Other"];

function buildWavBuffer(pcm, sampleRate = 16000, numChannels = 1, bitDepth = 16) {
    const blockAlign = numChannels * (bitDepth / 8);
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * blockAlign, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

// Background persistence (translation row + audio upload) — mirrors the
// fire-and-forget pattern in services/speech.js. Never blocks the WS reply.
function persistInBackground({ userId, transcript, parsedOutput, personaChoice, pcmChunks }) {
    supabase.from("translations").insert({
        user_id: userId,
        original_text: transcript,
        translated_text: parsedOutput,
        persona: personaChoice,
        language_code: "hi-IN",
    })
    .select()
    .single()
    .then(({ data: translation, error: insertError }) => {
        if (insertError || !translation) {
            throw new Error(insertError?.message || "Failed to save translation");
        }
        const wavBuffer = buildWavBuffer(Buffer.concat(pcmChunks));
        const audioFile = `${userId}/${Date.now()}.wav`;
        return supabase.storage
            .from("audio-recordings")
            .upload(audioFile, wavBuffer, { contentType: "audio/wav" })
            .then(({ error }) => {
                if (!error) {
                    return supabase.from("translations").update({ audio_url: audioFile }).eq("id", translation.id);
                }
            });
    })
    .catch((err) => console.error("Background translation save failed:", err.message));
}

export async function handleStreamConnection(ws, req) {
    const tConnect = Date.now();
    const pcmChunks = [];
    let stopped = false; // true once we've committed to either "stop" or "cancel" — guards against double-handling
    let session = null;
    let user = null;
    let personaChoice = "Work";
    let usage = 0;

    // The real client (native Android) starts streaming mic audio the instant
    // the socket opens, with no handshake wait — it won't know when our async
    // auth/word-limit/Sarvam-connect setup below has finished. A `ws.on("message")`
    // listener attached only after those awaits would silently drop anything sent
    // in that window (Node emits "message" with no listeners = lost, not queued).
    // So the listener goes on immediately, buffering until setup completes.
    let ready = false;
    let cancelledEarly = false;
    const buffered = [];

    const handleMessage = async (data, isBinary) => {
        if (stopped) return;

        if (isBinary) {
            pcmChunks.push(data);
            session.sendAudioChunk(data);
            return;
        }

        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch {
            return;
        }

        if (msg.type === "stop") {
            stopped = true;
            try {
                // Per-stage timings from the user's tap on "finish" — what they actually wait for.
                const tStop = Date.now();
                const { transcript } = await session.stop();
                const tTranscript = Date.now();
                const wordsSpoken = transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
                const parsedOutput = wordsSpoken < 3 ? transcript : await persona(transcript, personaChoice);
                const tPersona = Date.now();
                const timings = {
                    sttMs: tTranscript - tStop,
                    personaMs: tPersona - tTranscript,
                    totalMs: tPersona - tStop,
                };

                // Text goes to the user first: the usage write is two Supabase round trips
                // (~1s from India) and used to sit between "finish" and the text appearing.
                send(ws, {
                    type: "result",
                    transcript,
                    parsedOutput,
                    wordsSpoken,
                    wordsUsedToday: usage + wordsSpoken,
                    persona: personaChoice,
                    timings,
                });

                // Still awaited before closing, so a new session (which needs another tap,
                // plus the bubble's ~1s "Done" collapse) almost always sees the updated
                // count for its word-limit check.
                const tUsage = Date.now();
                try {
                    await updateTodayUsage(user.id, wordsSpoken);
                } catch (usageErr) {
                    console.error("Usage update failed:", usageErr.message);
                }
                console.log(`[stream] stop->result ${timings.totalMs}ms (stt ${timings.sttMs}, persona ${timings.personaMs}); usage write after send ${Date.now() - tUsage}ms`);
                ws.close(1000, "done");

                persistInBackground({ userId: user.id, transcript, parsedOutput, personaChoice, pcmChunks });
            } catch (err) {
                send(ws, { type: "error", message: err.message || "Translation failed" });
                ws.close(1011, "translation failed");
            }
        } else if (msg.type === "cancel") {
            stopped = true;
            session.cancel();
            ws.close(1000, "cancelled");
        }
    };

    ws.on("message", (data, isBinary) => {
        if (!ready) {
            if (!isBinary) {
                try {
                    if (JSON.parse(data.toString())?.type === "cancel") cancelledEarly = true;
                } catch { /* not JSON, ignore */ }
            }
            buffered.push({ data, isBinary });
            return;
        }
        handleMessage(data, isBinary);
    });

    ws.on("close", () => {
        if (!stopped) {
            stopped = true;
            session?.cancel();
        }
    });

    // A "cancel" buffered mid-setup must still close the client-facing socket —
    // session?.cancel() only tears down the Sarvam side, the client would
    // otherwise hang waiting for a close that never comes.
    const bailIfCancelled = () => {
        if (!cancelledEarly) return false;
        stopped = true;
        if (ws.readyState === ws.OPEN) ws.close(1000, "cancelled");
        return true;
    };

    // --- async setup — a buffered "cancel" or a client that's already gone
    // short-circuits each step below rather than doing needless work. ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        ws.close(4401, "No bearer token exists");
        return;
    }

    const stages = {};
    let tStage = Date.now();
    try {
        user = await authenticateToken(authHeader.split(" ")[1]);
        stages.authMs = Date.now() - tStage;
    } catch (err) {
        ws.close(4401, err.message || "Unauthorized");
        return;
    }
    if (bailIfCancelled() || ws.readyState !== ws.OPEN) return;

    const url = new URL(req.url, "http://internal");
    const requestedPersona = url.searchParams.get("persona") || "Work";
    personaChoice = VALID_PERSONA.includes(requestedPersona) ? requestedPersona : "Work";

    // The usage check (a Supabase round trip) and the Sarvam connect don't depend on each
    // other, so run them in parallel rather than back to back. Both start only after
    // auth, so unauthenticated sockets never open a Sarvam connection.
    tStage = Date.now();
    const usagePromise = getTodayUsage(user.id).then((value) => {
        stages.usageMs = Date.now() - tStage;
        return value;
    });
    const sessionPromise = createStreamingSession({ apiKey: sarvamKeys.currentKey() }).then((value) => {
        stages.sarvamMs = Date.now() - tStage;
        return value;
    });
    const [usageResult, sessionResult] = await Promise.allSettled([usagePromise, sessionPromise]);
    const discardSession = () => {
        if (sessionResult.status === "fulfilled") sessionResult.value.cancel();
    };

    if (usageResult.status === "rejected") {
        discardSession();
        send(ws, { type: "error", message: "Could not check your usage" });
        ws.close(1011, "usage check failed");
        return;
    }
    usage = usageResult.value;
    const limits = getPlanLimits(user.plan);
    if (usage >= limits.wordsPerDay) {
        discardSession();
        send(ws, { type: "error", code: "LIMIT_EXCEEDED", message: "Daily limit exceeded", usage, limit: limits.wordsPerDay });
        ws.close(4429, "Daily limit exceeded");
        return;
    }
    if (sessionResult.status === "rejected") {
        send(ws, { type: "error", message: "Translation service unavailable" });
        ws.close(1011, "Sarvam connect failed");
        return;
    }
    session = sessionResult.value;
    if (bailIfCancelled() || ws.readyState !== ws.OPEN) {
        session.cancel();
        return;
    }

    ready = true;
    console.log(`[stream] setup ${Date.now() - tConnect}ms (auth ${stages.authMs}, usage check ${stages.usageMs}, Sarvam connect ${stages.sarvamMs}; audio is buffered meanwhile)`);
    const toReplay = buffered.splice(0);
    for (const { data, isBinary } of toReplay) {
        await handleMessage(data, isBinary);
        if (stopped) break;
    }
}
