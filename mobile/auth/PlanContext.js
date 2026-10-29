import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "../api.config";
import { useAuth } from "./AuthContext";

const PlanContext = createContext(null);

const DEFAULT_PLAN = { plan: "free", status: null, current_period_end: null };

// Single source of truth for subscription/plan state — previously App.js, AccountScreen,
// and ProfileScreen each tracked their own copy at different refresh cadences, which is
// what made the UI look inconsistent (e.g. Pro not showing up until an app restart, or
// stale "Free" pills sitting next to an up-to-date one elsewhere).
export function PlanProvider({ children }) {
  const { token, email } = useAuth();
  const [plan, setPlan] = useState(DEFAULT_PLAN);

  // Returns the freshly fetched plan (or null on failure) so callers like
  // pollUntilActive can inspect the result directly, instead of racing a stale closure
  // over the state this also sets.
  const refreshPlan = useCallback(async () => {
    if (!token) {
      setPlan(DEFAULT_PLAN);
      return null;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/subs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const next = { ...DEFAULT_PLAN, ...data };
        setPlan(next);
        return next;
      }
      return null;
    } catch {
      // leave the last-known plan state in place — a transient network error
      // shouldn't flip a Pro user back to looking like Free.
      return null;
    }
  }, [token]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // A completed checkout doesn't guarantee the Razorpay webhook has landed yet — this
  // gives it a little time to arrive instead of leaving the UI on a stale "Free" state.
  const pollUntilActive = useCallback(
    async ({ attempts = 20, intervalMs = 3000 } = {}) => {
      for (let i = 0; i < attempts; i += 1) {
        const data = await refreshPlan();
        if (data?.plan === "pro" && data?.status === "active") {
          return true;
        }
        await wait(intervalMs);
      }
      return false;
    },
    [refreshPlan]
  );

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshPlan();
      }
    });
    return () => subscription.remove();
  }, [refreshPlan]);

  const startCheckout = useCallback(
    async (cycle) => {
      const res = await fetch(`${API_BASE_URL}/api/payments/create-subs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ billing_cycle: cycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to start subscription");
      }

      const url = `${API_BASE_URL}/checkout.html?subscription_id=${data.subscription_id}&key=${data.razorpay_key_id}&email=${encodeURIComponent(
        email || ""
      )}&cycle=${cycle}`;
      await WebBrowser.openBrowserAsync(url);
      // The checkout tab can close for reasons unrelated to payment finishing (Android's
      // openBrowserAsync in particular can resolve as soon as the tab opens, not when it
      // closes) — the plan is only ever trusted from the server, never assumed here.
      await refreshPlan();
    },
    [token, email, refreshPlan]
  );

  const isPro = plan.plan === "pro" && plan.status === "active";
  const planLabel = isPro
    ? "Pro"
    : plan.status === "authenticated"
      ? "Payment confirmed"
      : "Free";

  const value = {
    plan: plan.plan,
    status: plan.status,
    currentPeriodEnd: plan.current_period_end,
    isPro,
    planLabel,
    refreshPlan,
    pollUntilActive,
    startCheckout,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
