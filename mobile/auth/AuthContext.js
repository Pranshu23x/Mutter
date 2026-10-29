import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../api.config";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { signInWithGoogle as runGoogleSignIn } from "./googleAuth";

const AuthContext = createContext(null);

// Exported so other contexts (e.g. UsageContext) can recognize the dev-bypass session
// and skip calls the backend will always 401 on, without hardcoding this string twice.
export const DEV_BYPASS_TOKEN = "dev-bypass-token";

async function post(path, body) {
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// TEMPORARY, dev-only: lets the login screen be skipped while Google sign-in end-to-end
// is inconvenient to repeat during testing. No real session is created, so nothing that
// calls the backend (word usage, translations, payments) will work while this is active.
// Remove bypassLoginForTesting and its usage in AuthScreen.js once no longer needed.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Email/password still goes through the existing Express routes (kept intentionally
  // unchanged on the backend); the resulting session is then handed to supabase-js so
  // it owns persistence + auto-refresh from here on, same as a Google sign-in session.
  const signIn = useCallback(async (emailInput, password) => {
    const { ok, data } = await post("/api/auth/login", { email: emailInput, password });
    if (!ok) throw new Error(data.error || "Login failed");
    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error("Login did not return a session");
    }
    const { error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (emailInput, password) => {
    const { ok, data } = await post("/api/auth/signup", { email: emailInput, password });
    if (!ok) throw new Error(data.error || "Signup failed");
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await runGoogleSignIn();
  }, []);

  const signOut = useCallback(async () => {
    setDevBypass(false);
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error("You must be signed in to delete your account.");
    }
    const res = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not delete your account.");
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setSession(null);
  }, [session?.access_token]);

  const bypassLoginForTesting = useCallback(() => {
    setDevBypass(true);
  }, []);

  const value = {
    token: devBypass ? DEV_BYPASS_TOKEN : session?.access_token ?? null,
    email: devBypass ? "dev@bypass.local" : session?.user?.email ?? null,
    loading,
    isSupabaseConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    deleteAccount,
    bypassLoginForTesting,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
