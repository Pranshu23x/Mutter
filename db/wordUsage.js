import supabase from "./supabase.js";

export async function getTodayUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    //We need to query by today's date. toISOString() gives 2026-08-01T14:30:00.000Z, splitting at T and taking first part gives 2026-08-01.

    const {data}= await supabase
                  .from ('word_usage')
                  .select('word_count')
                  .eq('user_id' , userId)
                  .eq('date', today)
                  .single()
    return data?.word_count||0;
}

export async function updateTodayUsage(userID , words) {
    const today= new Date().toISOString().split('T')[0];
    const {data: existing}=await supabase
                 .from ('word_usage')
                 .select ('word_count')
                 .eq('user_id' , userID)
                 .eq('date', today)
                 .single()
    
    if(existing){
        await supabase
            .from('word_usage')
            .update({word_count: existing.word_count+words})
            .eq('user_id' , userID)
            .eq('date' , today)
    }
    else{
        await supabase
             .from ('word_usage')
             .insert({user_id: userID, date: today, word_count: words})
    }
}