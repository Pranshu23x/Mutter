import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

// A tiny looping "GIF" of the Android screen the user is about to land on: a finger
// slides to the right control, taps, and it switches on. Drawn with views (not a video
// or image) so it stays crisp at any density and costs nothing to ship.
//
// Each guide is a mock screen: a header, a few rows, and one target row whose control
// gets tapped. control = "toggle" (a switch flips on) or "chip" (a button/menu item
// lights up).
export const GUIDES = {
  microphone: {
    header: "Allow Mutter to record audio?",
    rows: [
      { label: "While using the app", control: "chip", target: true },
      { label: "Only this time", control: "chip" },
      { label: "Don't allow", control: "chip" },
    ],
  },
  microphoneSettings: {
    header: "App info › Permissions › Microphone",
    rows: [
      { label: "Allow only while using the app", control: "radio", target: true },
      { label: "Ask every time", control: "radio" },
      { label: "Don't allow", control: "radio" },
    ],
  },
  overlay: {
    header: "Display over other apps",
    rows: [
      { label: "Maps", control: "toggleOff" },
      { label: "Mutter", control: "toggle", target: true, bold: true },
      { label: "Phone", control: "toggleOff" },
    ],
  },
  accessibility: {
    header: "Accessibility › Downloaded apps › Mutter",
    rows: [
      { label: "Use Mutter", control: "toggle", target: true, bold: true },
      { label: "Mutter shortcut", control: "toggleOff" },
    ],
  },
  restricted: {
    header: "App info › Mutter          ⋮",
    rows: [
      { label: "Uninstall", control: "none" },
      { label: "Allow restricted settings", control: "chip", target: true, bold: true },
    ],
  },
};

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 30;

export default function SettingsGuide({ guide }) {
  const spec = GUIDES[guide] || GUIDES.overlay;
  const targetIndex = Math.max(0, spec.rows.findIndex((row) => row.target));

  const finger = useRef(new Animated.Value(0)).current; // 0 = resting low, 1 = on target
  const press = useRef(new Animated.Value(0)).current; // 0..1 tap squeeze
  const on = useRef(new Animated.Value(0)).current; // 0 = off, 1 = switched on
  const visible = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.bezier(0.2, 0, 0, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(visible, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(on, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]),
        Animated.timing(finger, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
        Animated.timing(press, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(press, { toValue: 0, duration: 160, useNativeDriver: true }),
          Animated.timing(on, { toValue: 1, duration: 240, easing: ease, useNativeDriver: true }),
        ]),
        Animated.delay(1100),
        Animated.timing(visible, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(finger, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [finger, on, press, visible, guide]);

  const targetY = HEADER_HEIGHT + targetIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
  const fingerStyle = {
    opacity: visible,
    transform: [
      { translateX: finger.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
      { translateY: finger.interpolate({ inputRange: [0, 1], outputRange: [targetY + 50, targetY] }) },
      { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }) },
    ],
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.header} numberOfLines={1}>{spec.header}</Text>
      {spec.rows.map((row, index) => (
        <View key={row.label} style={[styles.row, index === targetIndex && styles.rowTarget]}>
          <Text style={[styles.rowLabel, row.bold && styles.rowLabelBold]} numberOfLines={1}>
            {row.label}
          </Text>
          <Control control={row.control} on={row.target ? on : null} />
        </View>
      ))}
      <Animated.View pointerEvents="none" style={[styles.finger, fingerStyle]} />
    </View>
  );
}

function Control({ control, on }) {
  if (control === "toggle" || control === "toggleOff") {
    const progress = on || new Animated.Value(0);
    return (
      <View style={styles.track}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.trackOn, { opacity: progress }]} />
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }] },
          ]}
        />
      </View>
    );
  }
  if (control === "radio") {
    return (
      <View style={styles.radio}>
        {on && <Animated.View style={[styles.radioDot, { opacity: on, transform: [{ scale: on }] }]} />}
      </View>
    );
  }
  if (control === "chip" && on) {
    return <Animated.View style={[styles.chipGlow, { opacity: on }]} />;
  }
  return null;
}

const ACCENT = "#5B3A78";

const styles = StyleSheet.create({
  screen: {
    alignSelf: "stretch",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#f4f1f6",
    overflow: "hidden",
  },
  header: {
    height: HEADER_HEIGHT,
    lineHeight: HEADER_HEIGHT,
    fontSize: 11,
    fontWeight: "600",
    color: "#6b6474",
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowTarget: {
    backgroundColor: "rgba(91, 58, 120, 0.08)",
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: "#2a2530",
  },
  rowLabelBold: {
    fontWeight: "700",
  },
  track: {
    width: 30,
    height: 18,
    borderRadius: 9,
    padding: 2,
    backgroundColor: "#c9c3cf",
    overflow: "hidden",
  },
  trackOn: {
    backgroundColor: ACCENT,
  },
  knob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#8a8392",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  chipGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 3,
    bottom: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  finger: {
    position: "absolute",
    right: 22,
    top: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(30, 27, 36, 0.35)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
});
