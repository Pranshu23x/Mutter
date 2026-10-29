import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Animated, Linking, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { SoftTouchableOpacity } from "../App";
import SettingsGuide from "./SettingsGuide";

// One permission at a time: a one-line reason, a looping mini-clip of exactly what to
// tap, and one button that jumps straight to that setting. Skipping is always
// available; HomeScreen's HomeBannerCard remains the re-entry point for anything
// skipped or later revoked. Each step advances by itself once its permission is
// detected (the app re-checks whenever the user returns from Settings).
const STEPS = [
  {
    key: "microphone",
    title: "Allow the microphone",
    body: "So Mutter can hear what you dictate.",
    // Android stops showing the prompt once it's been denied; the button then opens
    // App info instead, so show that screen in the clip.
    guide: (p, tried) => (tried && p.microphonePermissionState === "denied" ? "microphoneSettings" : "microphone"),
    hint: (p, tried) =>
      tried && p.microphonePermissionState === "denied"
        ? "Tap Permissions › Microphone › Allow only while using the app."
        : "Tap “While using the app”.",
    cta: (p, tried) => (tried && p.microphonePermissionState === "denied" ? "Open microphone settings" : "Allow microphone"),
    isGranted: (p) => p.microphonePermissionState === "granted",
    isPending: (p) => p.microphonePermissionState === "requesting",
    onAllow: (p) => p.onEnableMicrophone(),
  },
  {
    key: "overlay",
    title: "Show the bubble",
    body: "Lets the Mutter bubble float over your other apps.",
    guide: () => "overlay",
    hint: () => "Find Mutter in the list and switch it on, then come back.",
    cta: () => "Open settings",
    isGranted: (p) => p.bubblePermissionState === "granted",
    isPending: () => false,
    onAllow: (p) => p.onEnableOverlay(),
  },
  {
    key: "textInput",
    title: "Type for you",
    body: "Mutter only uses this to put your dictated text into the box you're typing in.",
    guide: () => "accessibility",
    hint: () => "Open Downloaded apps (or Installed apps) › Mutter, switch on Use Mutter, tap Allow.",
    cta: () => "Open settings",
    isGranted: (p) => p.bubbleTextInputPermissionState === "granted",
    isPending: () => false,
    onAllow: (p) => p.onEnableTextInput(),
  },
];

export default function PermissionOnboardingScreen(props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [triedSteps, setTriedSteps] = useState({});
  const [showUnlock, setShowUnlock] = useState(false);
  const step = STEPS[displayedIndex];
  const tried = Boolean(triedSteps[step.key]);
  const granted = step.isGranted(props);
  const pending = step.isPending(props);
  const isLastStep = displayedIndex === STEPS.length - 1;
  // Sideloaded installs on Android 13+ show "Restricted setting" on the accessibility
  // toggle until it's unlocked in App info; offer that once they've tried it.
  const canUnlock = step.key === "textInput" && props.needsRestrictedUnlock && tried && !granted;
  const guide = showUnlock && canUnlock ? "restricted" : step.guide(props, tried);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(10)).current;

  const playEntrance = () => {
    cardTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(cardTranslate, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    playEntrance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stepIndex === displayedIndex) {
      return undefined;
    }
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: -10, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setDisplayedIndex(stepIndex);
      setShowUnlock(false);
      playEntrance();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    if (!granted) {
      return undefined;
    }
    const timer = setTimeout(advance, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, isLastStep]);

  function advance() {
    if (isLastStep) {
      props.onDone();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  const allow = () => {
    setTriedSteps((current) => ({ ...current, [step.key]: true }));
    setShowUnlock(false);
    step.onAllow(props);
  };

  const unlock = () => {
    setShowUnlock(true);
    Linking.openSettings().catch(() => {});
  };

  const hint = showUnlock && canUnlock
    ? "Tap ⋮ (top right) › Allow restricted settings, then come back and tap Open settings again."
    : step.hint(props, tried);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.dots}>
          {STEPS.map((s, index) => (
            <View key={s.key} style={[styles.dot, index === displayedIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.centerWrap}>
          <Animated.View
            style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}
          >
            <Text style={styles.step}>Step {displayedIndex + 1} of {STEPS.length}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.body}</Text>

            <View style={styles.guide}>
              <SettingsGuide guide={guide} />
            </View>
            <Text style={styles.hint}>{hint}</Text>

            <SoftTouchableOpacity
              onPress={allow}
              disabled={pending || granted}
              style={[styles.primaryButton, (pending || granted) && styles.primaryButtonBusy]}
            >
              <Text style={styles.primaryButtonText}>
                {granted ? "Allowed ✓" : pending ? "Waiting…" : step.cta(props, tried)}
              </Text>
            </SoftTouchableOpacity>

            {canUnlock && !showUnlock && (
              <SoftTouchableOpacity onPress={unlock} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>Toggle greyed out or “Restricted setting”? Unlock it</Text>
              </SoftTouchableOpacity>
            )}

            <SoftTouchableOpacity onPress={advance} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </SoftTouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    marginHorizontal: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#ffffff",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
  },
  step: {
    fontSize: 12,
    letterSpacing: 0.4,
    color: "rgba(255, 255, 255, 0.6)",
  },
  title: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  guide: {
    alignSelf: "stretch",
    marginTop: 18,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginTop: 18,
  },
  primaryButtonBusy: {
    opacity: 0.75,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 4,
  },
  linkButtonText: {
    fontSize: 13,
    color: "#ffffff",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  skipButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
});
