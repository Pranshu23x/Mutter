import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getTodayUsage } from "../db/wordUsage.js";
import { getPlanLimits } from "../config/plans.js";

const router = Router();

// GET /api/usage/today — lets the app show word usage before the user ever speaks,
// instead of only learning it as a side effect of a speech-to-text-translate response.
router.get("/today", authenticate, async (req, res) => {
    try {
        const usage = await getTodayUsage(req.user.id);
        const limit = getPlanLimits(req.user.plan).wordsPerDay;
        res.json({ usage, limit, plan: req.user.plan, resetAt: "midnight UTC" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
