// Live-dictation benchmark over the real WebSocket path the bubble uses.
//   1. Latency: streams Test-audio/Recording.wav at real-time pace (like a person
//      speaking) and measures what the user waits for: "finish" tap -> text, with the
//      server's per-stage breakdown (Sarvam finalize, Groq rewrite, usage write).
//   2. Multilingual: synthesizes the same sentence in every language Sarvam supports
//      (plus Hinglish code-mixing) with Sarvam TTS, streams each one, and checks the
//      English that comes back still carries the sentence's key facts.
// Uses a throwaway Supabase user that is deleted at the end.
//
// Usage: node scripts/voice-benchmark.mjs [latency|languages|all] [latencyRuns=3]
//        node scripts/voice-benchmark.mjs file <audio file>   (any format ffmpeg reads;
//        dictated once per persona, full length, at real-time pace)
import "dotenv/config";
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";
import { SarvamAIClient } from "sarvamai";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODE = process.argv[2] || "all";
const LATENCY_RUNS = Number(process.argv[3] || 3);
const PORT = Number(process.env.BENCH_PORT || 3998);
const PASSWORD = `Bench-${crypto.randomBytes(8).toString("hex")}`;
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// Reference meaning for every clip: "Tomorrow at 10 a.m., send the report to Ravi,
// and call me after the meeting." Each output must keep these facts.
const KEY_FACTS = [
    ["tomorrow", /tomorrow/i],
    ["10 o'clock", /\b10\b|ten/i],
    ["Ravi", /ravi/i],
    ["report", /report/i],
    ["call/phone", /call|phone|ring/i],
    ["after the meeting", /meeting/i],
];
const SENTENCES = [
    ["Hindi", "hi-IN", "कल सुबह दस बजे रवि को रिपोर्ट भेज देना और मीटिंग के बाद मुझे फ़ोन करना।"],
    ["Hinglish (code-mixed)", "hi-IN", "कल morning दस बजे Ravi को report send कर देना, और meeting के बाद मुझे call करना।"],
    ["Bengali", "bn-IN", "কাল সকাল দশটায় রবিকে রিপোর্টটা পাঠিয়ে দিও আর মিটিংয়ের পরে আমাকে ফোন কোরো।"],
    ["Tamil", "ta-IN", "நாளை காலை பத்து மணிக்கு ரவிக்கு அறிக்கையை அனுப்பி விடு, கூட்டம் முடிந்ததும் எனக்கு போன் பண்ணு."],
    ["Telugu", "te-IN", "రేపు ఉదయం పది గంటలకు రవికి రిపోర్ట్ పంపించు, మీటింగ్ తర్వాత నాకు ఫోన్ చెయ్యి."],
    ["Kannada", "kn-IN", "ನಾಳೆ ಬೆಳಿಗ್ಗೆ ಹತ್ತು ಗಂಟೆಗೆ ರವಿಗೆ ವರದಿಯನ್ನು ಕಳುಹಿಸು, ಮೀಟಿಂಗ್ ಆದ ಮೇಲೆ ನನಗೆ ಫೋನ್ ಮಾಡು."],
    ["Malayalam", "ml-IN", "നാളെ രാവിലെ പത്തു മണിക്ക് രവിക്ക് റിപ്പോർട്ട് അയച്ചേക്കൂ, മീറ്റിംഗ് കഴിഞ്ഞ് എന്നെ ഫോൺ ചെയ്യൂ."],
    ["Marathi", "mr-IN", "उद्या सकाळी दहा वाजता रवीला रिपोर्ट पाठव आणि मीटिंग झाल्यावर मला फोन कर."],
    ["Gujarati", "gu-IN", "કાલે સવારે દસ વાગ્યે રવિને રિપોર્ટ મોકલી દેજે અને મીટિંગ પછી મને ફોન કરજે."],
    ["Punjabi", "pa-IN", "ਕੱਲ੍ਹ ਸਵੇਰੇ ਦਸ ਵਜੇ ਰਵੀ ਨੂੰ ਰਿਪੋਰਟ ਭੇਜ ਦੇਣਾ ਅਤੇ ਮੀਟਿੰਗ ਤੋਂ ਬਾਅਦ ਮੈਨੂੰ ਫ਼ੋਨ ਕਰਨਾ।"],
    ["Odia", "od-IN", "କାଲି ସକାଳ ଦଶଟାରେ ରବିଙ୍କୁ ରିପୋର୍ଟ ପଠାଇଦିଅ ଏବଂ ମିଟିଂ ପରେ ମୋତେ ଫୋନ କର।"],
    ["English (Indian)", "en-IN", "Tomorrow at ten in the morning, send the report to Ravi, and call me after the meeting."],
];

// ---------------------------------------------------------------------------
let serverProc = null;
const serverLines = [];
async function startServer() {
    serverProc = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
    const onData = (d) => serverLines.push(...d.toString().split(/\r?\n/).filter(Boolean));
    serverProc.stdout.on("data", onData);
    serverProc.stderr.on("data", onData);
    for (let i = 0; i < 80; i++) {
        try { if ((await fetch(`http://localhost:${PORT}/healthz`)).ok) return; } catch { /* booting */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`server did not start:\n${serverLines.join("\n")}`);
}

function readWavPcm(buf) {
    let offset = 12;
    while (offset + 8 <= buf.length) {
        const id = buf.toString("ascii", offset, offset + 4);
        const size = buf.readUInt32LE(offset + 4);
        if (id === "data") return buf.subarray(offset + 8, offset + 8 + Math.min(size, buf.length - offset - 8));
        offset += 8 + size + (size % 2);
    }
    throw new Error("no data chunk in WAV");
}

/** Streams PCM at real-time pace (100 ms of audio every 100 ms), sends "stop", and
 *  measures stop -> result on the client clock. */
function dictate(token, pcm, persona = "Other") {
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://localhost:${PORT}/api/speech-stream?persona=${persona}`, { headers: { Authorization: `Bearer ${token}` } });
        let tStop = 0;
        const timer = setTimeout(() => { ws.terminate(); resolve({ error: "timeout" }); }, 90_000);
        ws.on("message", (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === "result" || msg.type === "error") {
                clearTimeout(timer);
                resolve({ ...msg, clientMs: Date.now() - tStop });
            }
        });
        ws.on("error", (err) => { clearTimeout(timer); resolve({ error: err.message }); });
        ws.on("open", async () => {
            const CHUNK = 3200; // 100 ms of 16 kHz 16-bit mono
            for (let i = 0; i < pcm.length && ws.readyState === ws.OPEN; i += CHUNK) {
                ws.send(pcm.subarray(i, i + CHUNK));
                await new Promise((r) => setTimeout(r, 100));
            }
            tStop = Date.now();
            ws.send(JSON.stringify({ type: "stop" }));
        });
    });
}

const stats = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return `min ${s[0]} / median ${s[Math.floor(s.length / 2)]} / max ${s[s.length - 1]} ms`;
};

// ---------------------------------------------------------------------------
async function latency(token) {
    console.log(`\n## Latency: ${LATENCY_RUNS} live dictations of an 8s Hindi clip, streamed at real-time pace`);
    const pcm = readWavPcm(fs.readFileSync(path.join(ROOT, "Test-audio", "Recording.wav"))).subarray(0, 16000 * 2 * 8);
    const runs = [];
    for (let i = 1; i <= LATENCY_RUNS; i++) {
        const r = await dictate(token, pcm);
        if (r.error || r.type === "error") { console.log(`  run ${i}: FAILED ${r.error || r.message}`); continue; }
        runs.push(r);
        console.log(`  run ${i}: finish -> text ${r.clientMs} ms  (Sarvam ${r.timings.sttMs}, Groq ${r.timings.personaMs})`);
    }
    if (runs.length) {
        console.log(`  finish -> text: ${stats(runs.map((r) => r.clientMs))}`);
        console.log(`  Sarvam finalize: ${stats(runs.map((r) => r.timings.sttMs))}`);
        console.log(`  Groq rewrite:    ${stats(runs.map((r) => r.timings.personaMs))}`);
    }
    const setups = serverLines.filter((l) => l.startsWith("[stream] setup")).map((l) => Number(l.match(/setup (\d+)ms/)[1]));
    if (setups.length) console.log(`  connection setup (hidden while speaking): ${stats(setups)}`);
    serverLines.filter((l) => l.startsWith("[stream] setup")).forEach((l) => console.log(`    ${l}`));
}

async function fileTest(token, file) {
    // Decode to the exact format the bubble streams: 16 kHz, 16-bit, mono PCM.
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { maxBuffer: 1 << 28 });
    console.log(`
## ${path.basename(file)}: ${(pcm.length / 32000).toFixed(1)}s, dictated live once per persona`);
    for (const persona of ["Work", "Email", "Personal", "Other"]) {
        const r = await dictate(token, pcm, persona);
        if (r.error || r.type === "error") { console.log(`
  ${persona}: FAILED ${r.error || r.message}`); continue; }
        console.log(`
  ${persona} (finish -> text ${r.clientMs} ms; Sarvam ${r.timings.sttMs}, Groq ${r.timings.personaMs}; ${r.wordsSpoken} words counted)`);
        if (persona === "Work") console.log(`    Sarvam: ${r.transcript}`);
        console.log(`    Output: ${r.parsedOutput}`);
    }
}

async function languages(token) {
    console.log(`\n## Multilingual: same sentence in ${SENTENCES.length} languages (Sarvam TTS bulbul:v3 -> live dictation -> English)`);
    console.log(`  Reference meaning: "Tomorrow at 10 a.m., send the report to Ravi, and call me after the meeting."`);
    const tts = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
    let fullMarks = 0;
    for (const [name, code, text] of SENTENCES) {
        let pcm;
        try {
            const res = await tts.textToSpeech.convert({ text, target_language_code: code, model: "bulbul:v3", speech_sample_rate: 16000 });
            pcm = readWavPcm(Buffer.from(res.audios[0], "base64"));
        } catch (err) {
            console.log(`\n  ${name}: TTS failed (${err.message}), skipped`);
            continue;
        }
        const r = await dictate(token, pcm);
        if (r.error || r.type === "error") { console.log(`\n  ${name}: FAILED ${r.error || r.message}`); continue; }
        const missing = KEY_FACTS.filter(([, re]) => !re.test(r.parsedOutput)).map(([fact]) => fact);
        if (!missing.length) fullMarks++;
        console.log(`\n  ${name} (${(pcm.length / 32000).toFixed(1)}s, finish -> text ${r.clientMs} ms): ${missing.length ? `MISSING ${missing.join(", ")}` : "all key facts kept"}`);
        console.log(`    Sarvam: ${r.transcript}`);
        console.log(`    Output: ${r.parsedOutput}`);
    }
    console.log(`\n  ${fullMarks}/${SENTENCES.length} languages kept every key fact`);
}

// ---------------------------------------------------------------------------
let userId = null;
try {
    const email = `mutter-bench-${Date.now()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
    const { data: login, error: loginError } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    if (loginError) throw loginError;
    // A Pro row so the benchmark never trips the free daily word limit.
    await admin.from("subscription").insert({ user_id: userId, plan: "pro", status: "active" });
    await startServer();
    if (MODE === "file") await fileTest(login.session.access_token, path.resolve(process.argv[3]));
    if (MODE === "latency" || MODE === "all") await latency(login.session.access_token);
    if (MODE === "languages" || MODE === "all") await languages(login.session.access_token);
} catch (err) {
    console.error("Benchmark aborted:", err.message);
    process.exitCode = 1;
} finally {
    serverProc?.kill();
    if (userId) {
        const { data: files } = await admin.storage.from("audio-recordings").list(userId, { limit: 1000 });
        if (files?.length) await admin.storage.from("audio-recordings").remove(files.map((f) => `${userId}/${f.name}`));
        for (const table of ["translations", "word_usage", "subscription"]) await admin.from(table).delete().eq("user_id", userId);
        await admin.auth.admin.deleteUser(userId);
    }
}
