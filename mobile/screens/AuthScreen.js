import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import BrandMark from "../components/BrandMark";
import GoogleGlyph from "../components/GoogleGlyph";

export default function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const submitGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      // AuthContext's onAuthStateChange picks up a successful session automatically;
      // on cancel/error there's nothing further to do here besides letting the user retry.
      console.warn("Google sign-in failed:", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.brandWrap}>
          <BrandMark style={styles.brandLogo} tintColor="#ffffff" />
          <Text style={styles.tagline}>Think in your language. Send in English.</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.googleButton, busy && styles.submitBusy]}
            onPress={submitGoogle}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <>
                <View style={styles.googleGlyph}>
                  <GoogleGlyph size={18} />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
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
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  brandLogo: {
    width: 210,
    height: 49,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 13,
  },
  googleGlyph: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  submitBusy: {
    opacity: 0.7,
  },
});
