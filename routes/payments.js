import { Router } from "express";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";

import { createSubscription, getActiveSubs, getbyRazID, updateSubsStatus } from "../db/subscription.js";

import supabase from "../db/supabase.js";
import { authenticate } from "../middleware/auth.js";
import { billingCycles } from "../config/plans.js";
const router= Router();


router.post("/create-subs" , authenticate, async(req,res)=>{
    const userId=req.user.id;
    const {billing_cycle }=req.body;

    if(!billingCycles || !billingCycles[billing_cycle]){
        return res.status(400).json({message:"Billing cycle must be monthly or yearly"})
    }
    const cycle= billingCycles[billing_cycle]
    
    try{
        let existing = await getActiveSubs(userId);

        // A "created" subscription is just a checkout that was started — if it's been
        // sitting unpaid for a while, treat it as abandoned instead of blocking retries
        // forever with "you already have a subscription".
        const ABANDONED_AFTER_MS = 30 * 60 * 1000;
        if (existing && existing.status === "created") {
            const ageMs = Date.now() - new Date(existing.created_at).getTime();
            if (ageMs > ABANDONED_AFTER_MS) {
                await updateSubsStatus(existing.razorpay_subscription_id, "cancelled");
                existing = null;
            }
        }

        if (existing && ["active", "created", "authenticated"].includes(existing.status)){
            return res.status(400).json({error:"You already have a active subscription"});
        }
        const subscription= await razorpay.subscriptions.create({
            plan_id: cycle.razorpayPlanId,
            total_count: cycle.total_count,
            customer_notify: true,
        });
        await createSubscription({
            user_Id: userId,
            razorpay_Subscription_Id:subscription.id,
            planId:cycle.razorpayPlanId,
        })
        //return what the mobile app  need in Razorpay checkout
        res.status(201).json({
            subscription_id: subscription.id,
            razorpay_key_id: process.env.RAZORPAY_KEY_ID
        })
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
})

//get request to look for the current plan::::

router.get("/subs" , authenticate, async(req,res)=>{
    try{
        const sub= await getActiveSubs(req.user.id);
        if(!sub){
            return res.json({
                plan:"free",
                status: null,
                current_end: null,
            });
        }
        else return res.json({
            plan: sub.plan || "free",
            status: sub.status,
            current_period_end: sub.current_period_end,
        })
    }
    catch(error){ return res.status(500).json({error: error.message})}
})


//post webhook
// called by razorpay SERVERS AND NOT THE MOBILE APP
// what it does: verify the webhook sign , parses the event type , updates subs + plan in db, return 200
//returns 200 since razorpay always sends retries internally

//    IMPORTANT: This route uses express.raw() middleware (in server.js)
//    so req.body is a raw Buffer, not parsed JSON.
//    Razorpay docs say: "Do not parse or cast the webhook request body" 


//----------------
  // Calculate expected signature using HMAC SHA256
    // Key = your webhook secret, Message = raw request body

//Mount this with express.raw() in server.js (registered BEFORE express.json)
//so req.body arrives as a raw Buffer for signature verification
export async function razorpayWebhook(req,res){
    try{
        //verify the wwebhook
        const sign=req.headers["x-razorpay-signature"];
        const expectedSign= crypto
                            .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
                            .update(req.body)
                            .digest("hex")

       // TO prevent timing attacks :: (Implemented , timing safe comparision)
       // timingSafeEqual THROWS if the buffers differ in length — check length first,
       // otherwise a missing/empty signature header becomes a 500 instead of a 401
       const provided = Buffer.from(sign || "");
       const expected = Buffer.from(expectedSign);
       if (provided.length !== expected.length) {
            return res.status(401).json({error:"Invalid webhook sign"})
       }
       const signValid= crypto.timingSafeEqual(provided, expected)
       if(!signValid) {
            return res.status(401).json({error:"Invalid webhook sign"})
       }
       
       // PARSE THE EVENT the body is raw buffer now:
       const event= JSON.parse(req.body.toString())
       const eventType= event.event;
       const subEntity= event.payload.subscription.entity;

        //check dupilicate events

       const eventID= req.headers["x-razorpay-event-id"];
       const sub= await getbyRazID(subEntity.id); //find subscription in DB
       if(!sub){return res.status(200).json({message: "Subscription not found,  skipped"})}
         
       // handel each event by event type:::
        // Webhook timestamps (current_start, current_end) are Unix integers
        // Convert them to ISO strings for your DB

       switch (eventType){
            case "subscription.authenticated":
                await updateSubsStatus(
                    subEntity.id,
                    "authenticated", //user completed auth payment transaction , hence status change from created->authenticated
                    subEntity.current_start? new Date(subEntity.current_start*1000).toISOString() : null,
                    subEntity.current_end? new Date(subEntity.current_end*1000).toISOString() : null
                );
                break;
            case "subscription.activated": {
                await updateSubsStatus(
                    subEntity.id,
                    "active",
                    subEntity.current_start? new Date(subEntity.current_start*1000).toISOString(): null,
                    subEntity.current_end? new  Date(subEntity.current_end*1000).toISOString(): null
                )
                // "activated" fires once the mandate is confirmed — that isn't always the
                // same instant as a captured payment. Only grant Pro once there's real
                // evidence money moved (a completed billing cycle, or a captured payment
                // attached to this event), so the plan can never flip before payment.
                const paidCount = subEntity.paid_count ?? 0;
                const paymentEntity = event.payload.payment?.entity;
                const paymentCaptured = paymentEntity?.status === "captured";
                if (paidCount >= 1 || paymentCaptured) {
                    await supabase
                         .from("subscription")
                         .update({plan: "pro"})
                         .eq("razorpay_subscription_id"  , subEntity.id)
                }
                break;
            }

            case "subscription.charged":
                // recurring payment succeeded — the unambiguous real-charge event
                // (carries a payment_id). This is the primary trusted place Pro is
                // granted; also covers restoring plan on a renewal after any downgrade.
                await updateSubsStatus(
                    subEntity.id,
                    "active",
                    subEntity.current_start? new Date(subEntity.current_start*1000).toISOString():null,
                    subEntity.current_end? new Date(subEntity.current_end*1000).toISOString():null
                );
                await supabase
                     .from("subscription")
                     .update({plan: "pro"})
                     .eq("razorpay_subscription_id", subEntity.id);
                break;
            
            case "subscription.completed":
                // All billing cycles done, downgrade to free

                await updateSubsStatus(subEntity.id, "completed");
                await supabase
                    .from("subscription")
                    .update({plan: "free"})
                    .eq("razorpay_subscription_id" , subEntity.id);
                break;
            
            //subscription pending 

            case "subscription.pending":
                //pending subscription
                //no plan change , just update
                await updateSubsStatus(subEntity.id, "pending");
                
            
            break;

            case "subscription.halted": //falied after all retries
                await updateSubsStatus(subEntity.id, "halted");
                await supabase
                    .from("subscription")
                    .update({plan:"free"})
                    .eq("razorpay_subscription_id" , subEntity.id);
                break;
            
            case "subscription.paused":
                await updateSubsStatus(subEntity.id , "paused");
                await supabase
                     .from("subscription")
                     .update({plan:"free"})
                     .eq("razorpay_subscription_id" , subEntity.id);

                break;
            
            case "subscription.resumed":
                await updateSubsStatus(
                    subEntity.id,
                    "active",
                    subEntity.current_start ? new Date(subEntity.current_start*1000).toISOString() :null,
                    subEntity.current_end ? new Date(subEntity.current_end*1000).toISOString(): null

                )
                await supabase
                     .from("subscription")
                     .update({plan: "pro"})
                     .eq("razorpay_subscription_id" , subEntity.id);
                    
                break;

            case "subscription.cancelled":
                //user cancelled, downgrade
                await updateSubsStatus(subEntity.id, "cancelled")
                await supabase
                     .from("subscription")
                     .update({plan: "free"})
                     .eq("razorpay_subscription_id", subEntity.id)
                break;
        }
        res.status(200).json({message: "WebHook passed"})
    }
    catch (error) {res.status(500).json({error: error.message})}

}
export default router;


