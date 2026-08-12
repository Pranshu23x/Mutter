// middlwware to verify: Ohh , so bascially middleware is verifiying that okay this user is logged in, show his stuff


import supabase from "../db/supabase.js";

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No bearer token exists" });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: "User not found" });
    }

    // Fetch the user's subscription plan from the subscription table
    // NOTE: read the latest row regardless of status — placeholder rows are
    // created with status "inactive" (NOT "active"), because "active" would
    // make the payments guard treat free users as paid subscribers.
    let { data: sub } = await supabase
        .from("subscription")
        .select("plan")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // If no subscription row exists, create one with free plan (lazy init)
    if (!sub) {
        await supabase
            .from("subscription")
            .insert({
                user_id: user.id,
                plan: "free",
                status: "inactive",
            });
        sub = { plan: "free" };
    }

    req.user = user;
    req.user.plan = sub.plan || "free";

    next();
}