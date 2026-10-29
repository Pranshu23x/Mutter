import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        realtime: {
            transport: ws
        }
    }
)
export default supabase;

// For auth calls that START a user session (signUp, signInWithPassword, refreshSession).
// Run on the shared client above, they store that user's session in it, and every later
// database/storage query from any request then runs as that user (under RLS) instead of
// with the service role. A throwaway client per request keeps the shared one clean.
export function createSessionClient() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}