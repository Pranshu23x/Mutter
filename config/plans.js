//RPD->request per day, RPM-> request per minute
const plan = {
    free: {
        name: "Free",
        requestsPerMinute: 5,
        wordsPerDay: 1000,
        audioStore: true,
    },
    pro: {
        name: "Pro",
        requestsPerMinute: 30,
        wordsPerDay: 5000,  // effectively unlimited
        audioStore: true,
    },
};

export  function getPlanLimits(plankey="free"){
    return plan[plankey] || plan.free
}

export default plan;

export const billingCycles={
    monthly:{
        label: "Monthly",
        priceDisplay: "₹299",
        razorpayPlanId: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
        total_count: 12, //12 month->1 year
    },
    
    yearly:{
        label: "Yearly",
        priceDisplay:"₹2,999",
        razorpayPlanId: process.env.RAZORPAY_PRO_YEARLY_PLAN_ID,
        total_count:1,
    }
}