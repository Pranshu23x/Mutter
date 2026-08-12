import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { API_BASE_URL } from "../api.config";
import { useAuth } from "../auth/AuthContext";

const PERSONAS = ["Work", "Email", "Personal", "Other"];
const LIMIT_WORDS = 5000; // placeholder until a /api/payments/limits endpoint exists

export default function DictationPanel() {
  const { token, signOut } = useAuth();
  const [persona, setPersona] = useState("Work");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const recRef = useRef(null);
  const timerRef = useRef(null);

  const toggleRecording = async () => {
    setError("");
    if (recording) {
      await stopAndSend();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone access denied — allow it in Settings");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError("Couldn't start recording");
    }
  };

  const stopAndSend = async () => {
    clearInterval(timerRef.current);
    setRecording(false);

    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;

    setBusy(true);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error("No recording");

      const formData = new FormData();
      formData.append("persona", persona);
      formData.append("file", { uri, name: "recording.m4a", type: "audio/m4a" });

      const res = await fetch(`${API_BASE_URL}/api/speech-to-text-translate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setError("Session expired — logging you out");
        signOut();
        return;
      }
      if (!res.ok) {
        setError(data.error || data.message || "Translation failed");
        return;
      }
      setResult(data);
      setError("");
    } catch (e) {
      setError("Server not reachable — is the backend + tunnel running?");
    } finally {
      setBusy(false);
    }
  };

  const meta = result ? `${result.wordsSpoken} words · ${result.wordsUsedToday}/${LIMIT_WORDS} today` : "";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Dictate</Text>
      <Text style={styles.subtitle}>
        Tap to record, tap again to translate. Pick a style first.
      </Text>

      <View style={styles.personaRow}>
        {PERSONAS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.personaChip, persona === p && styles.personaChipActive]}
            onPress={() => setPersona(p)}
            disabled={recording || busy}
          >
            <Text style={[styles.personaText, persona === p && styles.personaTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.micButton, recording && styles.micButtonRecording, busy && styles.micButtonBusy]}
        onPress={toggleRecording}
        disabled={busy}
      >
        <View style={[styles.micDot, recording && styles.micDotRecording]} />
      </TouchableOpacity>

      <Text style={styles.micLabel}>
        {busy ? "Translating..." : recording ? `Recording ${seconds}s — tap to send` : "Tap to record"}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <View style={styles.resultPanel}>
          <Text style={styles.resultMeta}>{meta}</Text>
          <Text style={styles.resultText}>{result.parsedOutput}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    padding: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#8a8a8a",
    marginTop: 4,
    marginBottom: 16,
  },
  personaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  personaChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },
  personaChipActive: {
    backgroundColor: "#111111",
  },
  personaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
  personaTextActive: {
    color: "#ffffff",
  },
  micButton: {
    alignSelf: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#dddddd",
    backgroundColor: "#f4f4f4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  micButtonRecording: {
    borderColor: "#e5484d",
    backgroundColor: "rgba(229,72,77,0.08)",
  },
  micButtonBusy: {
    opacity: 0.5,
  },
  micDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e5484d",
  },
  micDotRecording: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  micLabel: {
    textAlign: "center",
    fontSize: 13,
    color: "#8a8a8a",
    marginBottom: 4,
  },
  error: {
    textAlign: "center",
    color: "#e5484d",
    fontSize: 13,
    marginTop: 10,
  },
  resultPanel: {
    backgroundColor: "#f8f8f8",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  resultMeta: {
    fontSize: 12,
    color: "#0a7ea4",
    fontWeight: "600",
    marginBottom: 6,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2f3138",
  },
});