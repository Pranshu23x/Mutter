// Runs a recording through the real dictation pipeline (Sarvam speech-to-English
// translation, then the Groq persona rewrite) for every persona, so the output can be
// judged against what was actually said. No server or login needed.
//
// Usage: node scripts/test-recording.mjs [path/to/audio.wav]   (default: Test-audio/Recording.wav)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { translateSpeech } from "../services/sarvam.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.resolve(process.argv[2] || path.join(ROOT, "Test-audio", "Recording.wav"));
const buffer = fs.readFileSync(file);
const PERSONAS = ["Work", "Email", "Personal", "Other"];

// Duration from the WAV header, for a sanity check on how much speech went in.
if (buffer.toString("ascii", 8, 12) === "WAVE") {
    const rate = buffer.readUInt32LE(24);
    const blockAlign = buffer.readUInt16LE(32);
    console.log(`${path.basename(file)}: ~${((buffer.length - 44) / (rate * blockAlign)).toFixed(1)}s of audio\n`);
}

for (const persona of PERSONAS) {
    const started = Date.now();
    try {
        const result = await translateSpeech(
            { buffer, originalname: path.basename(file), mimetype: "audio/wav" },
            { persona }
        );
        console.log(`=== ${persona}  (${Date.now() - started}ms, language_probability=${result.language_probability ?? "n/a"})`);
        console.log(`transcript (Sarvam, English):\n  ${result.transcript}`);
        console.log(`parsedOutput (Groq ${persona} persona):\n  ${result.parsedOutput}\n`);
    } catch (err) {
        console.log(`=== ${persona}  FAILED: ${err.message}\n`);
    }
}
