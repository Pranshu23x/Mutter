import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../api.config";

const MAX_ITEMS = 5;

// Replaces the old static "example" demo cards with real history — every bubble
// dictation already gets saved via POST /api/translations from routes/speech.js, this
// just surfaces it.
export default function RecentTranscripts() {
  const { token } = useAuth();
  const [items, setItems] = useState(null);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const hasEntered = useRef(false);

  const fetchRecent = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/translations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) {
        setItems(data.slice(0, MAX_ITEMS));
      }
    } catch {
      // keep whatever was last shown on a transient network error
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchRecent();
    }, [fetchRecent])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchRecent();
      }
    });
    return () => subscription.remove();
  }, [fetchRecent]);

  useEffect(() => {
    if (items !== null && !hasEntered.current) {
      hasEntered.current = true;
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [items, enterAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enterAnim,
          transform: [
            { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    >
      <Text style={styles.title}>Recent dictations</Text>

      {items === null ? null : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Your dictations will show up here — try the bubble!
          </Text>
          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>You say</Text>
            <Text style={styles.exampleInput}>
              कल का report ready है, but एक बार check कर लेना please।
            </Text>
            <Text style={styles.exampleLabel}>Mutter writes</Text>
            <Text style={styles.exampleOutput}>
              The report for tomorrow is ready. Please review it once.
            </Text>
          </View>
        </View>
      ) : (
        items.map((item, index) => (
          <TranscriptItem key={item.id} item={item} delay={index * 60} />
        ))
      )}
    </Animated.View>
  );
}

function TranscriptItem({ item, delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        styles.item,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <Text style={styles.itemPersona}>{item.persona || "Other"}</Text>
      <Text style={styles.itemOriginal} numberOfLines={2}>
        {item.original_text}
      </Text>
      <Text style={styles.itemTranslated} numberOfLines={2}>
        {item.translated_text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#000000",
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    color: "#ffffff",
  },
  emptyState: {
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.72)",
    marginBottom: 14,
  },
  exampleCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#1b1b1b",
  },
  exampleLabel: {
    color: "#a8a8a8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exampleInput: {
    marginTop: 4,
    marginBottom: 10,
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
  item: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  itemPersona: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: "#000000",
    fontSize: 11,
    marginBottom: 8,
  },
  itemOriginal: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 13,
    lineHeight: 18,
  },
  itemTranslated: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 19,
  },
});
