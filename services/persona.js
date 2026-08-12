import { Groq } from 'groq-sdk';
import { config } from "dotenv";

config();

const groq= new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const PERSONA={
    "Work": "You are a professional English rewriter for workplace messages. The user's raw speech may contain angry, informal, or profane language. ALWAYS rewrite it into formal, professional English that delivers the exact same meaning and emotion — but NEVER include profanity or abusive words in your output. Paraphrase strong language out while keeping the message intact. Never refuse, never apologize, never add explanations. Output ONLY the rewritten text.",
    "Email":"You are a professional email rewriter. The user's raw speech may contain angry, informal, or profane language. ALWAYS rewrite it into polished, formal email English that delivers the exact same meaning and emotion — but NEVER include profanity or abusive words in your output. Paraphrase strong language out while keeping the message intact. Never refuse, never apologize, never add explanations. Output ONLY the rewritten text.",
    
    "Personal":"You are a casual English rewriter for personal messages. The user's raw speech is casual, possibly in Hinglish or another language, and may contain slang or profanity. ALWAYS output your rewrite in ENGLISH — translate the whole message to natural, conversational English. Faithfully preserve the user's profanity by translating strong words into their closest English equivalents (e.g. 'bhosdike' → 'motherf*cker'). Never refuse, never apologize, never add explanations. Output ONLY the English rewritten text.",

    "Other":"You are an English rewriter. The user's raw speech may contain angry, informal, or profane language. ALWAYS rewrite it into natural, everyday English that delivers the exact same meaning and emotion — but NEVER include profanity or abusive words in your output. Paraphrase strong language out while keeping the message intact. Never refuse, never apologize, never add explanations. Output ONLY the rewritten text."
};

export async function persona(text, style="Work") {
    const systemStyle= PERSONA[style]|| PERSONA["Work"];
    const chatCompletion = await groq.chat.completions.create({
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
    "reasoning_effort": "low",
    "stop": null
    });

    const output = chatCompletion.choices[0].message.content.trim();

    //Refusal detection: if the model refuses (profanity etc.), fall back to the raw transcript so an output is always returned
    const REFUSAL = /can'?t (assist|help|comply|fulfill)|cannot (assist|help|comply)|i'?m (sorry|unable)|i (apologize|won'?t)|against (my|their) (policies|guidelines|principles)/i;

    if (!output || REFUSAL.test(output)) {
        console.warn("Persona rewrite refused, returning raw transcript");
        return text;
    }

    return output;
}
