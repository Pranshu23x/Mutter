import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SettingsRow, SoftTouchableOpacity, styles } from "../App";

export default function ProfileScreen({
  onBack,
  onOpenSettings,
  onOpenAccount,
  email,
  planLabel,
  onUpgrade,
}) {
  const [cycle, setCycle] = useState("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [payError, setPayError] = useState("");
  const avatarLetter = (email || "M").trim().charAt(0).toUpperCase() || "M";
  const isPro = planLabel === "Pro";

  const upgrade = async () => {
    setUpgrading(true);
    setPayError("");
    try {
      await onUpgrade(cycle);
    } catch (error) {
      setPayError(error.message || "Unable to start checkout");
    } finally {
      setUpgrading(false);
    }
  };

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
          <Text style={styles.accountTitle}>Profile</Text>
          <View style={styles.accountTopSpacer} />
        </View>

        <View style={styles.accountProfileCard}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.drawerName}>{email || "Unknown"}</Text>
          <View style={styles.drawerPlanPill}>
            <Text style={styles.drawerPlanText}>{planLabel || "Free"}</Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <SettingsRow title="Settings" showChevron onPress={onOpenSettings} />
          <View style={styles.settingsDivider} />
          <SettingsRow title="Account" showChevron onPress={onOpenAccount} />
        </View>

        <View style={profileStyles.pricingCard}>
          <Text style={profileStyles.pricingTitle}>{isPro ? "Mutter Pro" : "Upgrade to Pro"}</Text>
          <Text style={profileStyles.pricingBody}>
            {isPro
              ? "Your Pro plan is active."
              : "Unlimited dictation with higher daily limits."}
          </Text>

          {!isPro ? (
            <>
              <View style={profileStyles.cycleRow}>
                {[
                  { key: "monthly", label: "Monthly", price: "INR 299/mo" },
                  { key: "yearly", label: "Yearly", price: "INR 2,999/yr" },
                ].map((option) => {
                  const selected = cycle === option.key;
                  return (
                    <SoftTouchableOpacity
                      key={option.key}
                      onPress={() => setCycle(option.key)}
                      disabled={upgrading}
                      style={[profileStyles.cycleChip, selected && profileStyles.cycleChipActive]}
                    >
                      <Text style={[profileStyles.cycleText, selected && profileStyles.cycleTextActive]}>
                        {option.label}
                      </Text>
                      <Text style={[profileStyles.cyclePrice, selected && profileStyles.cyclePriceActive]}>
                        {option.price}
                      </Text>
                    </SoftTouchableOpacity>
                  );
                })}
              </View>

              <SoftTouchableOpacity
                onPress={upgrade}
                disabled={upgrading}
                style={[profileStyles.upgradeButton, upgrading && profileStyles.upgradeButtonBusy]}
              >
                {upgrading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={profileStyles.upgradeButtonText}>Upgrade</Text>
                )}
              </SoftTouchableOpacity>
              {payError ? <Text style={profileStyles.payError}>{payError}</Text> : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const profileStyles = StyleSheet.create({
  pricingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginTop: 18,
  },
  pricingTitle: {
    color: "#202026",
    fontSize: 20,
  },
  pricingBody: {
    color: "#77737f",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  cycleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cycleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  cycleChipActive: {
    borderColor: "#111111",
    backgroundColor: "#f6f6f6",
  },
  cycleText: {
    color: "#333333",
    fontSize: 13,
  },
  cycleTextActive: {
    color: "#111111",
  },
  cyclePrice: {
    color: "#999999",
    fontSize: 11,
    marginTop: 2,
  },
  cyclePriceActive: {
    color: "#111111",
  },
  upgradeButton: {
    backgroundColor: "#111111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 14,
  },
  upgradeButtonBusy: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    color: "#ffffff",
    fontSize: 15,
  },
  payError: {
    color: "#cd2b31",
    fontSize: 12,
    marginTop: 10,
  },
});
