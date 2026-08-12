import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isLogin = mode === "login";

  const submit = async () => {
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setMode("login");
        setNotice("Account created. Check your email to confirm it, then log in.");
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.screen}>
          <View style={styles.brandWrap}>
            <Text style={styles.brandText}>Mutter</Text>
            <Text style={styles.tagline}>Speak. Rewrite. Send.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentBtn, isLogin && styles.segmentBtnActive]}
                onPress={() => {
                  setMode("login");
                  setError("");
                  setNotice("");
                }}
              >
                <Text style={[styles.segmentText, isLogin && styles.segmentTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, !isLogin && styles.segmentBtnActive]}
                onPress={() => {
                  setMode("signup");
                  setError("");
                  setNotice("");
                }}
              >
                <Text style={[styles.segmentText, !isLogin && styles.segmentTextActive]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9a9a9a"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9a9a9a"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <TouchableOpacity
              style={[styles.submit, busy && styles.submitBusy]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>{isLogin ? "Login" : "Create account"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  brandText: {
    fontFamily: "System",
    fontSize: 40,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: "#8a8a8a",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8a8a8a",
  },
  segmentTextActive: {
    color: "#111111",
  },
  input: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111111",
    marginBottom: 12,
  },
  error: {
    color: "#e5484d",
    fontSize: 13,
    marginBottom: 12,
  },
  notice: {
    color: "#0a7ea4",
    fontSize: 13,
    marginBottom: 12,
  },
  submit: {
    backgroundColor: "#111111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  submitBusy: {
    opacity: 0.7,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});