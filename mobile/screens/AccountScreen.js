import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { InitialFlowBackground, SoftTouchableOpacity, styles } from "../App";
import { useAuth } from "../auth/AuthContext";
import { usePlan } from "../auth/PlanContext";
import { useUsage } from "../auth/UsageContext";
import { PURCHASES_AVAILABLE_IN_APP } from "../config/storePolicy";

export default function AccountScreen({ onBack }) {
  const { email, signOut, deleteAccount } = useAuth();
  const { isPro, status, currentPeriodEnd, planLabel, startCheckout, pollUntilActive } = usePlan();
  const { usage, limit, remaining, pct, atLimit, loaded: usageLoaded, isMock: usageIsMock } = useUsage();
  const [cycle, setCycle] = useState("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [payError, setPayError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const avatarLetter = (email || "M").trim().charAt(0).toUpperCase() || "M";

  const upgrade = async () => {
    setUpgrading(true);
    setPayError("");
    try {
      await startCheckout(cycle);
      const activated = await pollUntilActive();
      if (!activated) {
        setPayError("Payment received, but activation is still pending. Check again in a moment.");
      }
    } catch (e) {
      setPayError(e.message || "Server not reachable");
    } finally {
      setUpgrading(false);
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your transcripts, recordings, subscription data, and account. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (error) {
              Alert.alert("Could not delete account", error.message || "Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <InitialFlowBackground white>
    <SafeAreaView style={styles.accountSafe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.accountContent}
      >
        <View style={styles.accountTopBar}>
          <SoftTouchableOpacity onPress={onBack} style={styles.accountBackButton}>
            <Text style={styles.accountBackGlyph}>{"←"}</Text>
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

        {usageLoaded ? (
          <View style={localStyles.usageCard}>
            <View style={localStyles.usageRow}>
              <Text style={localStyles.usageLabel}>Words remaining today</Text>
              <Text style={[localStyles.usageCount, atLimit && localStyles.usageCountAtLimit]}>
                {atLimit ? "0" : remaining} left
              </Text>
            </View>
            <View style={localStyles.usageTrack}>
              <View
                style={[
                  localStyles.usageFill,
                  atLimit && localStyles.usageFillAtLimit,
                  { width: `${Math.round(pct * 100)}%` },
                ]}
              />
            </View>
            <Text style={localStyles.usageSubLabel}>
              {usage} / {limit} used · resets at midnight UTC{usageIsMock ? " · demo data" : ""}
            </Text>
          </View>
        ) : null}

        {isPro ? (
          <View style={localStyles.planCard}>
            <Text style={localStyles.planTitle}>Mutter Pro</Text>
            <Text style={localStyles.planBody}>
              {currentPeriodEnd
                ? `Renews on ${new Date(currentPeriodEnd).toLocaleDateString()}`
                : "Active"}
            </Text>
          </View>
        ) : PURCHASES_AVAILABLE_IN_APP ? (
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
        ) : null}

        <TouchableOpacity style={styles.accountSignOutCard} onPress={signOut}>
          <Text style={styles.accountSignOutText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[localStyles.deleteAccountButton, deleting && localStyles.deleteAccountButtonBusy]}
          onPress={confirmAccountDeletion}
          disabled={deleting}
        >
          <Text style={localStyles.deleteAccountText}>{deleting ? "Deleting account..." : "Delete account"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </InitialFlowBackground>
  );
}

const localStyles = StyleSheet.create({
  usageCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.72)",
  },
  usageCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  usageCountAtLimit: {
    color: "#ff8a80",
  },
  usageTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  usageFillAtLimit: {
    backgroundColor: "#ff8a80",
  },
  usageSubLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.48)",
    marginTop: 6,
  },
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
  deleteAccountButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12,
  },
  deleteAccountButtonBusy: { opacity: 0.6 },
  deleteAccountText: { color: "#cd2b31", fontSize: 14 },
});
