import { Router } from "express";
import supabase from "../db/supabase.js";
const router= Router();

//sign up route::::

router.post(`/signup` , async(req,res)=>{
    const {email, password} = req.body;
    if(!email || !password) return res.status(400).json({error: "Email or password required"});

    const {data, error}= await supabase.auth.signUp({email, password});
    
    if(error) return res.status(400).json({error: error.message});

    res.status(201).json({
        message: `Signup completed`,
        user: data.user
    })
})

//log in::::

router.post('/login', async(req,res)=>{
    const {email, password}=req.body;
    if(!email || !password) return res.status(400).json({error: "No email password provided"});

    const {data, error}= await supabase.auth.signInWithPassword({email, password});

    if(error) return res.status(401).json({error: error.message});

    res.status(200).json({
        message: `Login Successful`,
        session: data.session,
    })
})

// refresh 

router.post('/refresh' , async(req, res)=>{
    const {refresh_token}= req.body;
    if(!refresh_token) return res.status(400).json({error: "No refresh token provided"});
    const {data, error}= await supabase.auth.refreshSession({refresh_token});
    if(error) return res.status(401).json({error: error.message});
    res.json({
        message: "Session Refreshed",
        session: data.session,
    })
})

//get me :

router.get('/me' ,  async(req,res)=>{
    const authHeader= req.headers.authorization

    if(!authHeader ||!authHeader.startsWith("Bearer ") ){
        return res.status(401).json({error: 'No tokens provided'});
    }
    const token = authHeader.split(" ")[1];

    const {data: {user}  , error}= await supabase.auth.getUser(token);

    if(error) return res.status(401).json({error: error.message});

    return res.status(200).json({user});
})

//logout :::: revokes the session server-side so the token dies immediately
router.post('/logout', async(req,res)=>{
    const authHeader= req.headers.authorization

    if(!authHeader ||!authHeader.startsWith("Bearer ") ){
        return res.status(401).json({error: 'No tokens provided'});
    }
    const token = authHeader.split(" ")[1];

    const { error } = await supabase.auth.admin.signOut(token);

    if (error) return res.status(400).json({error: error.message});

    res.status(200).json({message: "Logged out successfully"});
})

export default router;
