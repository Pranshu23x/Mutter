import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// createClient() throws synchronously if either value is missing, and this module is
// evaluated at import time (before AuthProvider/App ever mount) — an unset .env used to
// crash straight to a blank screen with no explanation. Fall back to a harmless
// placeholder client instead, and let AuthContext show an actionable message.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see mobile/ENV_SETUP.md. " +
      "Sign-in is disabled until mobile/.env is set up."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // There's no URL for the client to parse on native — the OAuth redirect is
      // captured explicitly via WebBrowser.openAuthSessionAsync (see googleAuth.js).
      detectSessionInUrl: false,
      // googleAuth.js calls exchangeCodeForSession(), which requires the server to
      // redirect back with a "?code=" query param — that only happens under PKCE.
      // Without this, the client defaults to the implicit flow (a "#access_token="
      // fragment instead), so params.code is always empty and sign-in silently fails.
      flowType: "pkce",
    },
  }
);

// Keep auto-refresh running even while backgrounded — the floating bubble operates
// independently of the main app's foreground state, using whatever access token was
// last pushed to it. Pausing refresh in the background (the previous behavior) let
// that token expire during any long idle period, silently breaking the bubble's
// recording until the user reopened the app to force a refresh. Always-on refresh
// costs a little background battery/network, but that's the right trade-off for a
// feature meant to work 24/7.
if (isSupabaseConfigured) {
  supabase.auth.startAutoRefresh();
}
