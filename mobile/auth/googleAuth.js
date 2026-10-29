import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabaseClient";

// Opens Google's sign-in page in a custom tab / SFSafariViewController, waits for the
// "mutter://" redirect Supabase sends back, and finishes the PKCE exchange. Returns the
// resulting Supabase session (or throws) — AuthContext's onAuthStateChange listener
// picks up the new session automatically once this resolves.
export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Could not start Google sign-in");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled");
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) {
    throw new Error(params.error_description || errorCode);
  }
  if (!params.code) {
    throw new Error("Google sign-in did not return an authorization code");
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(params.code);
  if (exchangeError) throw exchangeError;

  return sessionData.session;
}
