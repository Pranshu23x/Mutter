import { SarvamAIClient } from "sarvamai";
import { persona } from "./persona.js";
const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY,
});


export async function translateSpeech(file, options={}) {
     const {
        language_code = "hi-IN",
        persona: personaChoice = "Work",
    } = options;

    const response =await client.speechToText.transcribe({
        file: file.buffer, //multer gives a buffer directly to the sdk
        model:options.model|| "saaras:v3",
        mode:options.mode||"translate",
        language_code: options.language_code||"hi-IN"
    });
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
