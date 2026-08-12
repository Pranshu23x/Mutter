import { getTodayUsage } from "../db/wordUsage.js";
import { getPlanLimits } from "../config/plans.js";
export async function checkWordLimit(req,res, next) {
    const userId= req.user.id;
    const userPlan=req.user.plan || "free"
    const usage= await getTodayUsage(userId); //returns the word count
    const limits= getPlanLimits(userPlan) //returns the plan type

    if(usage>=limits.wordsPerDay){
        return res.status(429).json({message: "Daily Limit exceeded",
                                    usage,
                                    limit: limits.wordsPerDay,
                                    resetAt:'midnight UTC'
        })
    }
    req.wordUsage=usage;
    next();
}