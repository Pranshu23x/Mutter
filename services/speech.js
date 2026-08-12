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

        const {data: translation, error: insertError}=await supabase.from('translations').insert({
            user_id: req.user.id,
            original_text: result.transcript,
            translated_text: result.parsedOutput,
            persona: persona,
            language_code: 'hi-IN'
        })
        .select()
        .single();

        //must check: if the insert failed, `translation` is null — touching translation.id below would crash the process AFTER res already sent
        if (insertError || !translation) {
            throw new Error(insertError?.message || "Failed to save translation");
        }

        res.json({
            ...result,
            wordsSpoken, //came from line 31
            wordsUsedToday: req.wordUsage + wordsSpoken
        });

        //-------------BACKGROUND WORK OF UPLOADING THE FILE----------------------------
        // Path = <userId>/<timestamp>.webm — creates a folder per user, unique filename
        // Runs AFTER the response is sent — never touches `res`, never blocks the user
    const audioFile=`${req.user.id}/${Date.now()}.webm`; //audio file from user
    const translationID= translation.id;
    supabase.storage
            .from("audio-recordings")
            .upload(audioFile, req.file.buffer,{
                contentType: req.file.mimetype,
            })
            .then(({error})=>{
                if(!error){
                    return supabase
                            .from("translations")
                            .update({audio_url: audioFile})
                            .eq("id" , translationID)
                }
            })
            .catch((err)=>console.error("Audio upload failed:", err.message)) //log instead of silent fail — debugging visibility without affecting the user
    }
    catch(err){
        //if headers already sent, log and swallow — never try to respond twice
        if (res.headersSent) {
            console.error("Speech route error after response sent:", err.message);
            return;
        }
        res.status(500).json({error: err.message});
    }

})

export default router;


//Notes for refrence ::
// authenticate — checks if user is logged in
// checkWordLimit — checks if user has words remaining today
// updateTodayUsage — updates word count after processing
// supabase — saves translation to history table
