// middlwware to verify: Ohh , so bascially middleware is verifiying that okay this user is logged in, show his stuff


import supabase from "../db/supabase.js";

// Verifies a bearer token and resolves the user's plan. Shared by the Express
// `authenticate` middleware (HTTP routes) and the WebSocket streaming handler,
// which has no middleware chain of its own to hook into.
export async function authenticateToken(token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        throw new Error("User not found");
    }

    // Fetch the user's subscription plan from the subscription table.
    // Prefer an "active" row first — a lazy-init placeholder (status "inactive",
    // plan "free") can be created *after* a real paid subscription already exists
    // (e.g. a stray/duplicate init call), and picking "whatever row is newest"
    // regardless of status would then hide an actually-active Pro subscription
    // behind a newer placeholder. Only fall back to "latest row, any status" —
    // and then lazy-init — when there's truly no active subscription.
    let { data: sub } = await supabase
        .from("subscription")
        .select("plan")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!sub) {
        ({ data: sub } = await supabase
            .from("subscription")
            .select("plan")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle());
    }

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

    user.plan = sub.plan || "free";
    return user;
}

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No bearer token exists" });
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = await authenticateToken(token);
        next();
    } catch (err) {
        return res.status(401).json({ error: err.message });
    }
}