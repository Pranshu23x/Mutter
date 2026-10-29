import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Animated, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { SoftTouchableOpacity } from "../App";

// One permission at a time, each with a short "why we need this" card, instead of the
// old behavior of firing mic + overlay + accessibility prompts back-to-back the moment
// a user logged in. Skipping is always available — HomeScreen's HomeBannerCard remains
// the persistent re-entry point for anything skipped or later revoked.
const STEPS = [
  {
    key: "microphone",
    title: "Hear you out",
    body: "Mutter listens while you dictate, so it can turn your words into English.",
    cta: "Allow microphone",
    isGranted: (p) => p.microphonePermissionState === "granted",
    isPending: (p) => p.microphonePermissionState === "requesting",
    onAllow: (p) => p.onEnableMicrophone(),
  },
  {
    key: "overlay",
    title: "Dictate anywhere",
    body: "The floating Mutter bubble lets you dictate inside any app, not just this one. Allowing this opens Android Settings — come back here once it's on.",
    cta: "Allow overlay",
    isGranted: (p) => p.bubblePermissionState === "granted",
    isPending: (p) => p.bubbleBusy || p.bubblePermissionState === "requesting",
    onAllow: (p) => p.onEnableOverlay(),
  },
  {
    key: "textInput",
    title: "Type it in for you",
    body: "Accessibility access can expose the active app and editable field. Mutter uses it only to find that field and insert your completed dictation; it never sends messages or takes actions by itself.",
    instructions: [
      "In Accessibility settings, open Downloaded apps.",
      "Choose Mutter and turn on Allow Mutter to control your device.",
      "Leave the Mutter shortcut turned off. You can turn this access off anytime in Settings.",
    ],
    cta: "Open Accessibility settings",
    isGranted: (p) => p.bubbleTextInputPermissionState === "granted",
    isPending: (p) => p.bubbleBusy || p.bubbleTextInputPermissionState === "requesting",
    onAllow: (p) => p.onEnableTextInput(),
  },
];

export default function PermissionOnboardingScreen(props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const step = STEPS[displayedIndex];
  const granted = step.isGranted(props);
  const pending = step.isPending(props);
  const isLastStep = displayedIndex === STEPS.length - 1;

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(14)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;

  const playEntrance = () => {
    cardTranslate.setValue(14);
    cardScale.setValue(0.94);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslate, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Mount entrance.
  useEffect(() => {
    playEntrance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crossfade + slide/scale out the old card, then in with the new one, instead of
  // an abrupt content swap.
  useEffect(() => {
    if (stepIndex === displayedIndex) {
      return undefined;
    }
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: -14,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayedIndex(stepIndex);
      playEntrance();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    if (!granted) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (isLastStep) {
        props.onDone();
      } else {
        setStepIndex((i) => i + 1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, isLastStep]);

  const advance = () => {
    if (isLastStep) {
      props.onDone();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.dots}>
          {STEPS.map((s, index) => (
            <View
              key={s.key}
              style={[styles.dot, index === displayedIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.centerWrap}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslate }, { scale: cardScale }],
              },
            ]}
          >
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.body}</Text>
            {step.instructions && (
              <View style={styles.instructions}>
                {step.instructions.map((instruction, index) => (
                  <View key={instruction} style={styles.instructionRow}>
                    <Text style={styles.instructionNumber}>{index + 1}.</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            )}

            <SoftTouchableOpacity
              onPress={() => step.onAllow(props)}
              disabled={pending || granted}
              style={[styles.primaryButton, (pending || granted) && styles.primaryButtonBusy]}
            >
              <Text style={styles.primaryButtonText}>
                {granted ? "Allowed" : pending ? "Waiting for you..." : step.cta}
              </Text>
            </SoftTouchableOpacity>

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
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  dot: {
    width: 10,
    height: 10,
    marginHorizontal: 6,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  dotActive: {
    backgroundColor: "#ffffff",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  description: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  instructions: {
    alignSelf: "stretch",
    marginTop: 20,
    gap: 12,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  instructionNumber: {
    width: 24,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.85)",
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginTop: 24,
  },
  primaryButtonBusy: {
    opacity: 0.75,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
  },
});
