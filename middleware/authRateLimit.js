//Hand-rolled brute-force protection for auth routes.
//Sliding-window counter keyed by client IP: `attempts` hits allowed per `windowMs`.
//Works on a single server instance — swap for Redis if you ever scale horizontally.
const hits = new Map(); // key -> [timestamps]

export function authRateLimit(max = 10, windowMs = 5 * 60 * 1000) {
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        const now = Date.now();
        //keep only timestamps still inside the window
        const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);

        if (arr.length >= max) {
            const oldest = arr[0];
            const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
            res.set("Retry-After", String(retryAfter));
            return res.status(429).json({
                error: "Too many attempts. Try again later.",
                retryAfter,
            });
        }

        arr.push(now);
        hits.set(ip, arr);
        next();
    };
}