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

const FIDELITY_RULE = "Never add words, phrases, or ideas that were not present in the original speech — no invented sentences, no filler like 'let me know' or 'looking forward to it' unless the speaker actually said something equivalent. Preserve exactly who is speaking to whom: if the speaker addresses someone directly (second person, e.g. 'kaisa hai' said to that person), keep it second person in English — do not shift it to third person ('how's X doing'). If part of the source is unclear or garbled, translate your best literal reading of it rather than inventing a plausible-sounding replacement.";

const PERSONA={
    "Work": `Rewrite the following speech transcript into formal, professional English suitable for a workplace. The user may speak in Hindi, Hinglish, or another Indian language — translate it fully into English. If the original has profanity, paraphrase it politely. ${FIDELITY_RULE} Never refuse, never apologize, never add explanations. Output ONLY the rewritten text.`,
    "Email": `Rewrite the following speech transcript into polished, formal email English. The user may speak in Hindi, Hinglish, or another Indian language — translate it fully into English. If the original has profanity, paraphrase it politely. ${FIDELITY_RULE} Never refuse, never apologize, never add explanations. Output ONLY the rewritten text.`,

    "Personal": `Translate the following Hindi or Hinglish speech into natural, casual conversational English. Faithfully convey the full meaning, tone, and emotion of the original. Do NOT summarize or shorten — translate every part of the message. If there is profanity, translate it to its closest English equivalent. ${FIDELITY_RULE} Output ONLY the translated English text.`,

    "Other": `Translate the following speech into natural, everyday English. The user may speak in Hindi, Hinglish, or another Indian language — translate the full message faithfully. If the original has profanity, paraphrase it politely. ${FIDELITY_RULE} Never refuse, never apologize, never add explanations. Output ONLY the translated text.`
};

export async function persona(text, style="Work") {
    const systemStyle= PERSONA[style]|| PERSONA["Work"];
    const chatCompletion = await groqKeys.run((apiKey) => clientFor(apiKey).chat.completions.create({
    "messages": [
        {
        "role": "system",
        "content": systemStyle
        },
        {
            "role":"user",
            "content": text
        }
    ],
    "model": "openai/gpt-oss-20b",
    "temperature": 0.3,
    "max_completion_tokens": 2048,
    "top_p": 1,
    "stream": false,
    "reasoning_effort": "medium",
    "stop": null
    }));

    const output = chatCompletion.choices[0].message.content.trim();

    //Refusal detection: if the model refuses (profanity etc.), fall back to the raw transcript so an output is always returned
    const REFUSAL = /can'?t (assist|help|comply|fulfill)|cannot (assist|help|comply)|i'?m (sorry|unable)|i (apologize|won'?t)|against (my|their) (policies|guidelines|principles)/i;

    if (!output || REFUSAL.test(output)) {
        console.warn("Persona rewrite refused, returning raw transcript");
        return text;
    }

    return output;
}
