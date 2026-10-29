import { Router } from "express";
import supabase, { createSessionClient } from "../db/supabase.js";
import { authenticate } from "../middleware/auth.js";
import razorpay from "../config/razorpay.js";
const router= Router();

async function removeUserAudio(userId) {
    const bucket = supabase.storage.from("audio-recordings");
    const { data: files, error } = await bucket.list(userId, { limit: 1000 });
    if (error) throw error;
    if (files?.length) {
        const { error: removeError } = await bucket.remove(files.map((file) => `${userId}/${file.name}`));
        if (removeError) throw removeError;
    }
}

//sign up route::::

router.post(`/signup` , async(req,res)=>{
    const {email, password} = req.body;
    if(!email || !password) return res.status(400).json({error: "Email or password required"});

    const {data, error}= await createSessionClient().auth.signUp({email, password});
    
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

    const {data, error}= await createSessionClient().auth.signInWithPassword({email, password});

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
    const {data, error}= await createSessionClient().auth.refreshSession({refresh_token});
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

    if (error) return res.status(401).json({error: error.message});

    res.status(200).json({message: "Logged out successfully"});
})

// Deletes the account and all first-party data. This uses the server-only Supabase
// secret; it must never be implemented with a client-side admin call.
router.delete('/account', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from("subscription")
            .select("razorpay_subscription_id, status")
            .eq("user_id", userId);
        if (subscriptionsError) throw subscriptionsError;

        // Stop any legacy Razorpay renewal before erasing its local reference.
        for (const subscription of subscriptions || []) {
            if (subscription.razorpay_subscription_id && ["created", "authenticated", "active"].includes(subscription.status)) {
                await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, false);
            }
        }

        await removeUserAudio(userId);
        for (const table of ["translations", "word_usage", "subscription"]) {
            const { error } = await supabase.from(table).delete().eq("user_id", userId);
            if (error) throw error;
        }

        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        return res.status(200).json({ message: "Account and associated data deleted" });
    } catch (error) {
        console.error("Account deletion failed:", error.message);
        return res.status(500).json({ error: "Could not delete the account. Please try again or contact support." });
    }
});

export default router;
