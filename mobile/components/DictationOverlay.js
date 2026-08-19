import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function DictationOverlay({ visible, onCancel, onComplete }) {
  const [phase, setPhase] = useState("listening");
  const completionTimer = useRef(null);

  useEffect(() => {
    if (!visible) {
      setPhase("listening");
      return undefined;
    }

    setPhase("listening");
    return () => {
      if (completionTimer.current) {
        clearTimeout(completionTimer.current);
        completionTimer.current = null;
      }
    };
  }, [visible]);

  const confirmCapture = () => {
    if (phase !== "listening") {
      return;
    }

    setPhase("processing");
    completionTimer.current = setTimeout(() => {
      completionTimer.current = null;
      onComplete?.();
    }, 900);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.captureBar}>
          <TouchableOpacity
            accessibilityLabel="Cancel dictation"
            onPress={onCancel}
            style={styles.actionButton}
          >
            <Text style={styles.cancelIcon}>{"\u00d7"}</Text>
          </TouchableOpacity>

          <View style={styles.capturePill}>
            <View style={styles.dotRow}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => (
                <PulseDot key={dot} delay={dot * 45} />
              ))}
            </View>
            <Text style={styles.phaseLabel}>
              {phase === "processing" ? "Converting" : "Listening"}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel={phase === "processing" ? "Converting dictation" : "Finish dictation"}
            onPress={confirmCapture}
            disabled={phase === "processing"}
            style={[styles.actionButton, styles.confirmButton]}
          >
            <Text style={styles.confirmIcon}>{"\u2713"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PulseDot({ delay }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420 }),
          withTiming(0, { duration: 420 })
        ),
        -1,
        false
      )
    );

    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scaleY: 0.7 + progress.value * 0.9 }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(16, 13, 23, 0.42)",
  },
  captureBar: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 241, 250, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  cancelIcon: {
    color: "#14121a",
    fontSize: 48,
    fontWeight: "300",
  },
  capturePill: {
    flex: 1,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 241, 250, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  dotRow: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#30293a",
  },
  phaseLabel: {
    marginTop: 2,
    color: "rgba(48, 41, 58, 0.72)",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  confirmButton: {
    backgroundColor: "rgba(112, 40, 158, 0.86)",
  },
  confirmIcon: {
    color: "#ffffff",
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "400",
  },
});
