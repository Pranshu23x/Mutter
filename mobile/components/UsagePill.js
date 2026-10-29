import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useUsage } from "../auth/UsageContext";

// Shows how many words the user has left against their daily limit, and tells
// HomeScreen when they've hit it (via onLimitReached) so it can show the upgrade paywall.
export default function UsagePill({ onLimitReached }) {
  const { usage, limit, remaining, pct, atLimit, loaded, isMock } = useUsage();
  const notifiedRef = useRef(false);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const hasEntered = useRef(false);

  useEffect(() => {
    if (!loaded) return;
    if (atLimit) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        onLimitReached?.();
      }
    } else {
      notifiedRef.current = false;
    }
  }, [loaded, atLimit, onLimitReached]);

  useEffect(() => {
    if (loaded && !hasEntered.current) {
      hasEntered.current = true;
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [loaded, enterAnim]);

  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [pct, loaded, fillAnim]);

  if (!loaded) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enterAnim,
          transform: [
            { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.label}>Words remaining today</Text>
        <Text style={[styles.count, atLimit && styles.countAtLimit]}>
          {atLimit ? "0" : remaining} left
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            atLimit && styles.fillAtLimit,
            { width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </View>
      <Text style={styles.subLabel}>
        {usage} / {limit} used{isMock ? " · demo data" : ""}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.72)",
  },
  count: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  countAtLimit: {
    color: "#ff8a80",
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  fillAtLimit: {
    backgroundColor: "#ff8a80",
  },
  subLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.48)",
    marginTop: 6,
  },
});
