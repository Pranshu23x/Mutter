import { Router } from "express";
import {authenticate} from "../middleware/auth.js";
import supabase from "../db/supabase.js";
const router= Router();

router.post('/' , authenticate, async(req, res)=>{
    const {original_text, translated_text, persona , language_code}= req.body;

    if (!original_text || !translated_text) {
        return res.status(400).json({ error: "original_text and translated_text required" });
    }

    const {data, error}= await supabase.from("translations").insert({
        user_id: req.user.id,
        original_text,
        translated_text,
        persona: persona|| "Other",
        language_code: language_code|| "hi-IN"
    }).select();

    if(error) return res.status(500).json({error: error.message})

    res.status(201).json(data[0]);

})

//get api/translations --list user translations

router.get('/' , authenticate, async(req, res)=>{
    const {data, error}= await supabase.from("translations").select("*").eq("user_id" , req.user.id).order("created_at" , {ascending: false}).limit(50);

    if(error) return res.status(500).json({error: error.message})
    res.json(data);
})


//delete a translation

router.delete("/:id" , authenticate, async(req, res)=>{
    const {id}=req.params;
    const {error}= await supabase.from("translations").delete().eq("id" , id).eq("user_id", req.user.id);

    if(error) return res.status(500).json({error: error.message});
    res.json({message: "Deleted"})
})

export default router;