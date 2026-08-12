
import supabase from "./supabase.js";

export async function createSubscription({user_Id, razorpay_Subscription_Id,planId}) {
    const {data, error}=await supabase
                        .from('subscription')
                        .insert({
                            user_id:user_Id,
                            razorpay_subscription_id:razorpay_Subscription_Id,
                            razorpay_plan_id: planId,
                            status: 'created',
                        })
                        .select()
                        .single();//,single mean return a single row

    if(error)  throw   error
    return data;
}

export async function getActiveSubs(user_Id){
    const {data}= await supabase
                  .from('subscription')
                  .select('*')
                  .eq("user_id", user_Id) //eq mean where
                  .in ('status' , ['created', 'authenticated', 'active'])
                  .order('created_at' , {ascending: false})
                  .limit(1)
                  .maybeSingle();
    return data; 
}

export async function getbyRazID(razorpay_Subscription_Id) {
    const {data}= await supabase
                  .from('subscription')
                  .select('*')
                  .eq('razorpay_subscription_id', razorpay_Subscription_Id)
                  .maybeSingle();

    return data;
}

export async function updateSubsStatus(razorpay_Subscription_Id , status, currentStart=null, currentEnd=null) {
    // Guard against out-of-order/retried webhooks: a subscription that is
    // already "active" must never be downgraded to "authenticated" (or any
    // earlier phase). Only terminal/derived states like cancelled, completed,
    // halted, paused may replace "active".
    if (status === "authenticated" || status === "created" || status === "pending") {
        const existing = await getbyRazID(razorpay_Subscription_Id);
        if (existing?.status === "active") {
            return existing;
        }
    }

    const update={
        status,
        updated_at: new Date().toISOString(),
    }
    if(currentStart) update.current_period_start=currentStart;
    if(currentEnd) update.current_period_end= currentEnd;
    if(status==='cancelled' || status==="completed" || status=='halted'){
        update.ended_at= new Date().toISOString();
    }
    const {data, error}= await supabase
                         .from('subscription')
                         .update(update)
                         .eq('razorpay_subscription_id' ,razorpay_Subscription_Id )
                         .select()
                         .single()
    
    if(error) throw error;
    return data;
}   