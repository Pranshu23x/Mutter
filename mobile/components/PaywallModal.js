import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlan } from "../auth/PlanContext";
import { PURCHASES_AVAILABLE_IN_APP } from "../config/storePolicy";

export default function PaywallModal({ visible, onClose }) {
  const { startCheckout, pollUntilActive } = usePlan();
  const [cycle, setCycle] = useState("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");

  const upgrade = async () => {
    setUpgrading(true);
    setError("");
    try {
      await startCheckout(cycle);
      pollUntilActive();
      onClose();
    } catch (e) {
      setError(e.message || "Unable to start checkout");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} style={styles.scrim} onPress={onClose} />

        <View style={styles.card}>
          <Text style={styles.title}>You're out of free words for today</Text>
          <Text style={styles.body}>
            {PURCHASES_AVAILABLE_IN_APP
              ? "Upgrade to Pro for a much higher daily limit — 5,000 words a day instead of 1,000."
              : "Your free daily limit resets at midnight UTC."}
          </Text>

          {PURCHASES_AVAILABLE_IN_APP && <View style={styles.cycleRow}>
            {[
              { key: "monthly", label: "Monthly", price: "₹299/mo" },
              { key: "yearly", label: "Yearly", price: "₹2,999/yr" },
            ].map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.cycleChip, cycle === c.key && styles.cycleChipActive]}
                onPress={() => setCycle(c.key)}
                disabled={upgrading}
              >
                <Text style={[styles.cycleText, cycle === c.key && styles.cycleTextActive]}>
                  {c.label}
                </Text>
                <Text style={[styles.cyclePrice, cycle === c.key && styles.cyclePriceActive]}>
                  {c.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>}

          {PURCHASES_AVAILABLE_IN_APP && <TouchableOpacity
            style={[styles.upgradeBtn, upgrading && styles.upgradeBtnBusy]}
            onPress={upgrade}
            disabled={upgrading}
          >
            {upgrading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            )}
          </TouchableOpacity>}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={onClose} style={styles.dismissBtn} disabled={upgrading}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 17, 17, 0.45)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#77737f",
  },
  cycleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
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
    paddingVertical: 14,
  },
  upgradeBtnBusy: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    color: "#cd2b31",
    fontSize: 12,
    marginTop: 10,
  },
  dismissBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 6,
  },
  dismissText: {
    fontSize: 14,
    color: "#8a8a8a",
  },
});
