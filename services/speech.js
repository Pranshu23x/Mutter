import { Router } from "express";
import multer from "multer"; //middleware that handles file uploads
import {translateSpeech} from "./sarvam.js";
import {authenticate} from "../middleware/auth.js"
import { checkWordLimit } from "../middleware/wordLimiter.js";
import { getTodayUsage, updateTodayUsage } from "../db/wordUsage.js";
import supabase from "../db/supabase.js";

const router=Router();

const upload=multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, //10MB max — blocks memory DoS from huge uploads
});
const VALID_PERSONA=["Work" , "Email" , "Personal" ,"Other"]

router.post('/speech-to-text-translate' , authenticate, checkWordLimit,upload.single('file') , async(req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({error:"No audio captured"})
        }
        const persona= req.body.persona||"Work"; //default to work
        
        if(!VALID_PERSONA.includes(persona)){
            return res.status(400).json({error: "Invalid persona — must be one of: Work, Email, Personal, Other"})
        }
        const result=await translateSpeech(req.file, req.body);
        //The audio file gets attached to req.file as a buffer object
        //Any other fields (like "model" or "prompt") go into req.body

        //count words::::::

        // Regex to count words::
        const wordsSpoken = result.transcript.trim().split(/\s+/).filter(w => w.length > 0).length;

        await updateTodayUsage(req.user.id, wordsSpoken);

        res.json({
            ...result,
            wordsSpoken, //came from line 31
            wordsUsedToday: req.wordUsage + wordsSpoken
        });

        //-------------BACKGROUND WORK: save translation + upload audio----------------------------
        // Runs AFTER the response is sent — never touches `res`, never blocks the user
        supabase.from('translations').insert({
            user_id: req.user.id,
            original_text: result.transcript,
            translated_text: result.parsedOutput,
            persona: persona,
            language_code: 'hi-IN'
        })
        .select()
        .single()
        .then(({data: translation, error: insertError}) => {
            if (insertError || !translation) {
                throw new Error(insertError?.message || "Failed to save translation");
            }
            // Path = <userId>/<timestamp>.webm — creates a folder per user, unique filename
            const audioFile=`${req.user.id}/${Date.now()}.webm`; //audio file from user
            return supabase.storage
                .from("audio-recordings")
                .upload(audioFile, req.file.buffer,{
                    contentType: req.file.mimetype,
                })
                .then(({error})=>{
                    if(!error){
                        return supabase
                                .from("translations")
                                .update({audio_url: audioFile})
                                .eq("id" , translation.id)
                    }
                });
        })
        .catch((err)=>console.error("Background translation save failed:", err.message)) //log instead of silent fail — debugging visibility without affecting the user
    }
    catch(err){
        if (res.headersSent) {
            console.error("Speech route error after response sent:", err.message);
            return;
        }
        const msg = err.message || "";
        if (msg.includes("403") || msg.includes("Access denied")) {
            return res.status(502).json({ error: "Translation service unavailable in your region. Disable VPN or use an Indian network." });
        }
        if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
            return res.status(429).json({ error: "Translation service is busy. Try again in a minute." });
        }
        res.status(500).json({error: msg || "Translation failed"});
    }

})

export default router;


//Notes for refrence ::
// authenticate — checks if user is logged in
// checkWordLimit — checks if user has words remaining today
// updateTodayUsage — updates word count after processing
// supabase — saves translation to history table
