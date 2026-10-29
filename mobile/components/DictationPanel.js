import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Rotating "you say -> Mutter writes" examples, mixing Hindi and English the way
// people actually type/speak, crossfading into the clean English output. No card
// background here on purpose — it should read as part of the hero copy, not a box.
const EXAMPLES = [
  {
    input: "कल का report ready है, but एक बार check कर लेना please।",
    output: "The report for tomorrow is ready. Please review it once.",
  },
  {
    input: "రేపు meeting కొంచెం late అవ్వొచ్చు, is that fine?",
    output: "Tomorrow's meeting might run a little late, is that okay?",
  },
  {
    input: "இன்னைக்கு meeting கொஞ்சம் long ஆகிடுச்சு, I'll call you in ten minutes.",
    output: "The meeting ran long. I'll call you in ten minutes.",
  },
  {
    input: "আজকে আমার একটু late হবে, তুমি কি wait করতে পারবে?",
    output: "I'll be a little late today. Could you wait for me?",
  },
  {
    input: "मला उद्या थोडं लवकर निघावं लागेल, so can we move the meeting?",
    output: "I need to leave early tomorrow. Could we move the meeting?",
  },
  {
    input: "ನಾಳೆ ನಾನು ಸ್ವಲ್ಪ busy ಇರ್ತೀನಿ, call ಮಾಡೋಕೆ ಆಗಲ್ಲ.",
    output: "I'll be a bit busy tomorrow, I won't be able to call.",
  },
  {
    input: "કાલે meeting થોડી late થઈ શકે છે, is that okay?",
    output: "Tomorrow's meeting might run a little late, is that okay?",
  },
  {
    input: "ਅੱਜ ਮੈਨੂੰ ਥੋੜਾ late ਹੋਊ, tussi wait kar sakde ho?",
    output: "I'll be a little late today, can you wait?",
  },
  {
    input: "നാളെ meeting-ന് ഒരു ചെറിയ delay ഉണ്ടാകും, is that fine?",
    output: "There'll be a small delay for tomorrow's meeting, is that okay?",
  },
];

const FADE_MS = 280;
const HOLD_INPUT_MS = 1500;
const HOLD_OUTPUT_MS = 2000;

export default function DictationPanel() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("input"); // "input" | "output"
  const opacity = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    let cancelled = false;
    let timer;

    const fadeIn = () =>
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
      ]);

    const fadeOut = () =>
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(shift, { toValue: -6, duration: FADE_MS, useNativeDriver: true }),
      ]);

    const step = () => {
      shift.setValue(6);
      fadeIn().start(() => {
        if (cancelled) return;
        const hold = phase === "input" ? HOLD_INPUT_MS : HOLD_OUTPUT_MS;
        timer = setTimeout(() => {
          if (cancelled) return;
          fadeOut().start(() => {
            if (cancelled) return;
            if (phase === "input") {
              setPhase("output");
            } else {
              setPhase("input");
              setIndex((prev) => (prev + 1) % EXAMPLES.length);
            }
          });
        }, hold);
      });
    };

    step();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, opacity, shift]);

  const example = EXAMPLES[index];
  const isOutput = phase === "output";

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity, transform: [{ translateY: shift }] }}>
        <Text style={styles.label}>{isOutput ? "Mutter writes" : "You say"}</Text>
        <Text style={[styles.line, isOutput && styles.lineOutput]}>
          {isOutput ? example.output : example.input}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    minHeight: 104,
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(255, 255, 255, 0.55)",
  },
  line: {
    marginTop: 8,
    fontSize: 23,
    lineHeight: 30,
    color: "rgba(255, 255, 255, 0.88)",
    letterSpacing: -0.2,
  },
  lineOutput: {
    color: "#ffffff",
  },
});
