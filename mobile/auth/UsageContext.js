import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { API_BASE_URL } from "../api.config";
import { DEV_BYPASS_TOKEN, useAuth } from "./AuthContext";

const UsageContext = createContext(null);

const DEFAULT_USAGE = { usage: 0, limit: 0, plan: "free", resetAt: null, loaded: false };

// The dev-bypass session (see AuthContext.js) never has a real Supabase token, so
// /api/usage/today would always 401 — stand in with fixed demo numbers instead of
// leaving the meter blank while that bypass is in use.
const MOCK_USAGE = {
  usage: 240,
  limit: 1000,
  plan: "free",
  resetAt: "midnight UTC",
  loaded: true,
  isMock: true,
};

// Single source of truth for today's word usage — mirrors PlanContext so any screen
// (home pill, account, profile) reads the same numbers instead of each firing its own
// fetch to /api/usage/today on a different cadence.
export function UsageProvider({ children }) {
  const { token } = useAuth();
  const [state, setState] = useState(DEFAULT_USAGE);

  const refreshUsage = useCallback(async () => {
    if (!token) {
      setState(DEFAULT_USAGE);
      return null;
    }
    if (token === DEV_BYPASS_TOKEN) {
      setState(MOCK_USAGE);
      return MOCK_USAGE;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.usage === "number" && typeof data.limit === "number") {
        const next = {
          usage: data.usage,
          limit: data.limit,
          plan: data.plan || "free",
          resetAt: data.resetAt || null,
          loaded: true,
        };
        setState(next);
        return next;
      }
      return null;
    } catch {
      // keep the last-known numbers on a transient network error
      return null;
    }
  }, [token]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") {
        refreshUsage();
      }
    });
    return () => subscription.remove();
  }, [refreshUsage]);

  const remaining = state.loaded ? Math.max(0, state.limit - state.usage) : 0;
  const pct = state.loaded && state.limit > 0 ? Math.min(1, state.usage / state.limit) : 0;
  const atLimit = state.loaded && state.usage >= state.limit;

  const value = {
    usage: state.usage,
    limit: state.limit,
    remaining,
    pct,
    atLimit,
    plan: state.plan,
    resetAt: state.resetAt,
    loaded: state.loaded,
    isMock: Boolean(state.isMock),
    refreshUsage,
  };

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error("useUsage must be used inside UsageProvider");
  return ctx;
}
