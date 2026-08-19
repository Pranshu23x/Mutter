import { useEffect, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const EXAMPLES = [
  {
    category: "Personal",
    input: "ଆଜି थोड़ा देर ହେବ, traffic बहुत ज्यादा ଅଛି।",
    output: "I’ll be a little late today, the traffic is really heavy.",
  },
  {
    category: "Personal",
    input: "আজকে আমার একটু late হবে, তুমি কি wait করতে পারবে?",
    output: "I’ll be a little late today. Could you wait for me?",
  },
  {
    category: "Work",
    input: "कल का report ready है, but एक बार check कर लेना please।",
    output: "The report for tomorrow is ready. Please review it once.",
  },
  {
    category: "Work",
    input: "இன்னைக்கு meeting கொஞ்சம் long ஆகிடுச்சு, I’ll call you in ten minutes.",
    output: "The meeting ran long. I’ll call you in ten minutes.",
  },
  {
    category: "Email",
    input: "मला उद्या थोडं लवकर निघावं लागेल, so can we move the meeting?",
    output: "I need to leave early tomorrow. Could we move the meeting?",
  },
];

export default function DictationPanel({
  expanded = false,
  microphonePermissionState = "checking",
}) {
  const [micBusy, setMicBusy] = useState(false);
  const [micStatus, setMicStatus] = useState(microphonePermissionState);

  useEffect(() => {
    setMicStatus(microphonePermissionState);
  }, [microphonePermissionState]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      setMicStatus("unavailable");
      return;
    }

    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then(
      (granted) => {
        if (microphonePermissionState === "checking") {
          setMicStatus(granted ? "granted" : "denied");
        }
      }
    );
  }, []);

  const requestMicPermission = async () => {
    if (Platform.OS !== "android" || micBusy || micStatus === "granted") {
      return;
    }

    setMicBusy(true);
    setMicStatus("requesting");
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone access",
          message: "Mutter needs microphone access to dictate your speech.",
          buttonPositive: "Allow microphone",
          buttonNegative: "Not now",
        }
      );

      setMicStatus(result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied");
    } finally {
      setMicBusy(false);
    }
  };

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Text style={styles.title}>Say it naturally. Send it in English.</Text>
      <Text style={styles.subtitle}>
        {micStatus === "denied"
          ? "Microphone access isn't enabled. Allow it to speak naturally and turn your words into English."
          : micStatus === "granted"
            ? "Microphone is enabled. Speak naturally and Mutter will turn your words into English."
            : "Speak in the language you think in. Mutter turns it into professional, casual, or polished English for any chat."}
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={requestMicPermission}
        disabled={micBusy || micStatus === "granted" || Platform.OS !== "android"}
        style={[styles.button, (micBusy || micStatus === "granted") && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {micBusy
            ? "Checking..."
            : micStatus === "granted"
              ? "Mic enabled"
              : micStatus === "denied"
                ? "Try again"
              : "Enable microphone"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.examplesTitle}>See how Mutter rewrites you</Text>
      <ScrollView
        style={styles.examplesScroll}
        contentContainerStyle={styles.examplesContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {EXAMPLES.map((example) => (
          <View key={`${example.category}-${example.input}`} style={styles.exampleCard}>
            <Text style={styles.exampleTone}>{example.category}</Text>
            <Text style={styles.exampleLabel}>You say</Text>
            <Text style={styles.exampleInput}>{example.input}</Text>
            <Text style={styles.exampleLabel}>Mutter writes</Text>
            <Text style={styles.exampleOutput}>{example.output}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#000000",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
    padding: 20,
    marginTop: 20,
  },
  cardExpanded: {
    flex: 1,
    minHeight: 0,
  },
  title: {
    fontSize: 20,
    color: "#ffffff",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#ffffff",
    marginTop: 4,
  },
  button: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    fontSize: 14,
    color: "#000000",
  },
  examplesTitle: {
    marginTop: 22,
    fontSize: 16,
    color: "#ffffff",
  },
  examplesScroll: {
    flex: 1,
    minHeight: 0,
    marginTop: 10,
  },
  examplesContent: {
    paddingBottom: 4,
    gap: 10,
  },
  exampleCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#1b1b1b",
  },
  exampleTone: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: "#000000",
    fontSize: 11,
  },
  exampleLabel: {
    marginTop: 10,
    color: "#a8a8a8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exampleInput: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  exampleOutput: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
});
