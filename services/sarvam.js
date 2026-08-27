import { SarvamAIClient } from "sarvamai";
import { persona } from "./persona.js";
import { KeyRotator } from "../utils/apiKeyRotator.js";

export const sarvamKeys = new KeyRotator("Sarvam", "SARVAM");
const sarvamClients = new Map();

function clientFor(apiKey) {
    if (!sarvamClients.has(apiKey)) {
        sarvamClients.set(apiKey, new SarvamAIClient({ apiSubscriptionKey: apiKey }));
    }
    return sarvamClients.get(apiKey);
}

const FLUSH_DELAY_MS = 150;   // let the socket register the audio before flushing
const IDLE_TIMEOUT_MS = 2800; // finalize once no new segment has arrived for this long — measured flush-to-first-data latency is ~1.5-2.1s (network+model jitter), so this needs real margin above that or transcripts silently come back empty
const HARD_TIMEOUT_MS = 45_000; // safety net so a stuck socket can't hang the request

// Sarvam's speech-to-text-translate WebSocket (docs: speech-to-text-translate/ws) replaces
// the old HTTP batch call — connect, stream the audio, flush, and collect the "data" segments.
function transcribeViaWebSocket(buffer, model, apiKey) {
    const client = clientFor(apiKey);
    return new Promise((resolve, reject) => {
        let settled = false;
        let socket = null;
        let idleTimer = null;
        const segments = [];
        let lastLanguageProbability;

        const settle = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(hardTimer);
            clearTimeout(idleTimer);
            socket?.close();
            fn(value);
        };

        const hardTimer = setTimeout(
            () => settle(reject, new Error("Sarvam WebSocket timed out waiting for a transcript")),
            HARD_TIMEOUT_MS
        );

        const scheduleFinalize = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                settle(resolve, {
                    transcript: segments.join(" ").trim(),
                    language_probability: lastLanguageProbability,
                });
            }, IDLE_TIMEOUT_MS);
        };

        client.speechToTextTranslateStreaming
            .connect({ model, "Api-Subscription-Key": apiKey })
            .then((s) => {
                socket = s;
                socket.on("message", (message) => {
                    if (message.type === "data") {
                        if (message.data.transcript) segments.push(message.data.transcript);
                        lastLanguageProbability = message.data.language_probability;
                        scheduleFinalize();
                    } else if (message.type === "error") {
                        settle(reject, new Error(message.data?.error || "Sarvam WebSocket error"));
                    }
                });
                socket.on("error", (err) => settle(reject, err));
                socket.on("close", () => {
                    settle(resolve, {
                        transcript: segments.join(" ").trim(),
                        language_probability: lastLanguageProbability,
                    });
                });
                return socket.waitForOpen();
            })
            .then(() => {
                socket.translate({
                    audio: buffer.toString("base64"),
                    sample_rate: 16000,
                    encoding: "audio/wav",
                });
                setTimeout(() => {
                    try { socket.flush(); } catch { /* socket already closed/settled */ }
                    // idle countdown starts only once flush is actually sent, so the
                    // response has the full IDLE_TIMEOUT_MS window rather than racing it
                    scheduleFinalize();
                }, FLUSH_DELAY_MS);
            })
            .catch((err) => settle(reject, err));
    });
}

// Live streaming session for the bubble's real-time mic pipeline. Unlike
// transcribeViaWebSocket (which gets the whole clip at once and flushes almost
// immediately, needing a real ~2.8s margin to decode it cold), audio here
// trickles in continuously while the user talks, and Sarvam finalizes the
// whole utterance as a single "data" segment — measured repeatedly arriving
// either before flush() is even called, or within ~90ms after it. So once we
// already have a segment when stop() is called, only a short grace window is
// needed (to catch a rare trailing segment) — the long batch-mode margin is
// reserved for the rare case where nothing has arrived yet.
const STOP_GRACE_MS = 500; // safety margin over the ~90ms worst-case flush-to-data observed once a segment already exists
export async function createStreamingSession({ apiKey, model = "saaras:v3" }) {
    const client = clientFor(apiKey);
    const socket = await client.speechToTextTranslateStreaming.connect({
        model,
        input_audio_codec: "pcm_raw",
        sample_rate: "16000",
        "Api-Subscription-Key": apiKey,
    });
    await socket.waitForOpen();

    const segments = [];
    let lastLanguageProbability;
    let idleTimer = null;
    let hardTimer = null;
    let stopping = false;
    let settled = false;
    let resolveStop, rejectStop;

    const stopPromise = new Promise((resolve, reject) => {
        resolveStop = resolve;
        rejectStop = reject;
    });

    const finalTranscript = () => ({
        transcript: segments.join(" ").trim(),
        language_probability: lastLanguageProbability,
    });

    const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(hardTimer);
        try { socket.close(); } catch { /* already closed */ }
        fn(value);
    };

    // Only relevant once stop() has been called. Re-armed on every trailing
    // segment so a second late segment doesn't get cut off — but the window is
    // short once we already have at least one segment; only falls back to the
    // full batch-proven margin if stop() was called before anything arrived.
    const armFinalizeWindow = () => {
        clearTimeout(idleTimer);
        const window = segments.length > 0 ? STOP_GRACE_MS : IDLE_TIMEOUT_MS;
        idleTimer = setTimeout(() => settle(resolveStop, finalTranscript()), window);
    };

    socket.on("message", (message) => {
        if (message.type === "data") {
            if (message.data.transcript) segments.push(message.data.transcript);
            lastLanguageProbability = message.data.language_probability;
            if (stopping) armFinalizeWindow();
        } else if (message.type === "error") {
            settle(rejectStop, new Error(message.data?.error || "Sarvam WebSocket error"));
        }
    });
    socket.on("error", (err) => settle(rejectStop, err));
    socket.on("close", () => settle(resolveStop, finalTranscript()));

    return {
        // Called continuously while the user is talking — raw 16-bit PCM chunks.
        sendAudioChunk(buffer) {
            socket.translate({
                audio: buffer.toString("base64"),
                sample_rate: 16000,
                encoding: "audio/wav",
            });
        },
        // Called once, when the user taps "finish" — tells Sarvam to wrap up,
        // then resolves with the final transcript once no more segments arrive.
        stop() {
            if (settled) return stopPromise;
            stopping = true;
            hardTimer = setTimeout(
                () => settle(rejectStop, new Error("Sarvam WebSocket timed out finalizing the transcript")),
                HARD_TIMEOUT_MS
            );
            setTimeout(() => {
                try { socket.flush(); } catch { /* socket already closed/settled */ }
                armFinalizeWindow();
            }, FLUSH_DELAY_MS);
            return stopPromise;
        },
        // Called on cancel (user tapped X, or the client disconnected) — no one
        // is awaiting stopPromise in that path, just tear the socket down.
        cancel() {
            settle(() => {}, undefined);
        },
    };
}

export async function translateSpeech(file, options={}) {
     const {
        language_code = "hi-IN",
        persona: personaChoice = "Work",
    } = options;

    const response = await sarvamKeys.run((apiKey) =>
        transcribeViaWebSocket(file.buffer, options.model || "saaras:v3", apiKey)
    );
    //Skip the Groq LLM call when the transcript is empty or has <3 words — no rewrite worth the latency/cost, just pass the raw text
    const wordsSpoken = response.transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
    const parsedOutput = wordsSpoken < 3
        ? response.transcript
        : await persona(response.transcript, personaChoice);

     return {
        transcript: response.transcript,
        parsedOutput,
        language_code,
        language_probability: response.language_probability,
        persona: personaChoice,
    };

}
