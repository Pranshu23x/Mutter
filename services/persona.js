import { Groq } from 'groq-sdk';
import { config } from "dotenv";
import { KeyRotator } from "../utils/apiKeyRotator.js";

config();

const groqKeys = new KeyRotator("Groq", "GROQ");
const groqClients = new Map();

function clientFor(apiKey) {
    if (!groqClients.has(apiKey)) {
        groqClients.set(apiKey, new Groq({ apiKey }));
    }
    return groqClients.get(apiKey);
}

const PERSONA = {
    "Work": "Rewrite the following speech transcript into professional English suitable for a workplace message.",
    "Email": "Rewrite the following speech transcript into polished, formal email English.",
    "Personal": "Translate the following speech into natural, casual conversational English.",
    "Other": "Translate the following speech into natural, everyday English.",
};

export async function persona(text, style = "Work") {
    const systemStyle = PERSONA[style] || PERSONA["Work"];

    const chatCompletion = await groqKeys.run((apiKey) => clientFor(apiKey).chat.completions.create({
        messages: [
            { role: "system", content: systemStyle },
            { role: "user", content: text },
        ],
        model: "openai/gpt-oss-20b",
        temperature: 0.3,
        max_completion_tokens: 2048,
        top_p: 1,
        stream: false,
        reasoning_effort: "medium",
        stop: null,
    }));

    return chatCompletion.choices[0].message.content.trim();
}
