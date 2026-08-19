import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SoftTouchableOpacity, styles } from "../App";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../api.config";

export default function AccountScreen({ onBack, onUpgrade }) {
  const { token, email, signOut } = useAuth();
  const [plan, setPlan] = useState({ plan: "free", status: null, current_period_end: null });
  const [loadingSub, setLoadingSub] = useState(true);
  const [cycle, setCycle] = useState("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [payError, setPayError] = useState("");

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/subs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        signOut();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setPlan(data);
      setPayError("");
    } catch {
      setPayError("Subscription status is unavailable right now.");
    } finally {
      setLoadingSub(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const isPro = plan.plan === "pro" && plan.status === "active";
  const avatarLetter = (email || "M").trim().charAt(0).toUpperCase() || "M";

  const pollPlan = () => {
    let attempts = 20;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/subs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.plan === "pro" && data.status === "active") {
          clearInterval(iv);
          setPlan(data);
          setPayError("");
        } else if (--attempts <= 0) {
          clearInterval(iv);
          setPayError("Payment received, but activation is still pending. Check again in a moment.");
        }
      } catch {
        if (--attempts <= 0) clearInterval(iv);
      }
    }, 3000);
  };

  const upgrade = async () => {
    setUpgrading(true);
    setPayError("");
    try {
      await onUpgrade(cycle);
      pollPlan();
    } catch (e) {
      setPayError(e.message || "Server not reachable");
    } finally {
      setUpgrading(false);
    }
  };

  const planLabel = loadingSub
    ? "Loading..."
    : isPro
      ? "Pro"
      : plan.status === "authenticated"
        ? "Payment confirmed"
        : "Free";

  return (
    <SafeAreaView style={styles.accountSafe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.accountContent}
      >
        <View style={styles.accountTopBar}>
          <SoftTouchableOpacity onPress={onBack} style={styles.accountBackButton}>
            <Text style={styles.accountBackGlyph}>{"\u2190"}</Text>
          </SoftTouchableOpacity>
          <Text style={styles.accountTitle}>Account</Text>
          <View style={styles.accountTopSpacer} />
        </View>

        <View style={styles.accountProfileCard}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.drawerName}>{email || "Unknown"}</Text>
          <View style={styles.drawerPlanPill}>
            <Text style={styles.drawerPlanText}>{planLabel}</Text>
          </View>
        </View>

        {isPro ? (
          <View style={localStyles.planCard}>
            <Text style={localStyles.planTitle}>Mutter Pro</Text>
            <Text style={localStyles.planBody}>
              {plan.current_period_end
                ? `Renews on ${new Date(plan.current_period_end).toLocaleDateString()}`
                : "Active"}
            </Text>
          </View>
        ) : (
          <View style={localStyles.planCard}>
            <Text style={localStyles.planTitle}>Upgrade to Pro</Text>
            <Text style={localStyles.planBody}>
              Unlimited dictation with higher daily limits.
            </Text>

            <View style={localStyles.cycleRow}>
              {[
                { key: "monthly", label: "Monthly", price: "₹299/mo" },
                { key: "yearly", label: "Yearly", price: "₹2,999/yr" },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[localStyles.cycleChip, cycle === c.key && localStyles.cycleChipActive]}
                  onPress={() => setCycle(c.key)}
                  disabled={upgrading}
                >
                  <Text
                    style={[
                      localStyles.cycleText,
                      cycle === c.key && localStyles.cycleTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                  <Text
                    style={[
                      localStyles.cyclePrice,
                      cycle === c.key && localStyles.cyclePriceActive,
                    ]}
                  >
                    {c.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[localStyles.upgradeBtn, upgrading && localStyles.upgradeBtnBusy]}
              onPress={upgrade}
              disabled={upgrading}
            >
              {upgrading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={localStyles.upgradeBtnText}>Upgrade</Text>
              )}
            </TouchableOpacity>

            {payError ? <Text style={localStyles.payError}>{payError}</Text> : null}
          </View>
        )}

        <TouchableOpacity style={styles.accountSignOutCard} onPress={signOut}>
          <Text style={styles.accountSignOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  planCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eeeeee",
    padding: 18,
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 16,
    color: "#111111",
  },
  planBody: {
    fontSize: 13,
    color: "#8a8a8a",
    marginTop: 4,
    marginBottom: 14,
  },
  cycleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  cycleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cycleChipActive: {
    borderColor: "#111111",
    backgroundColor: "#f6f6f6",
  },
  cycleText: {
    fontSize: 14,
    color: "#333333",
  },
  cycleTextActive: {
    color: "#111111",
  },
  cyclePrice: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
  },
  cyclePriceActive: {
    color: "#111111",
  },
  upgradeBtn: {
    backgroundColor: "#111111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  upgradeBtnBusy: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    color: "#ffffff",
    fontSize: 15,
  },
  payError: {
    color: "#cd2b31",
    fontSize: 12,
    marginTop: 10,
  },
});
