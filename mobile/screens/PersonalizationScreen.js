import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { FontAwesome6 } from "@expo/vector-icons";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const INTRO_ROWS = [
  ["message", "whatsapp", "messenger"],
  ["telegram", "gmail", "openai", "mail"],
  ["outlook", "teams", "slack"],
];

const PERSONALIZATION_STEPS = [
  {
    title: "personal messages?",
    apps: ["message", "messenger", "whatsapp", "telegram"],
    options: [
      { key: "formal", title: "Formal.", subtitle: "Caps + Punctuation" },
      { key: "casual", title: "Casual", subtitle: "Caps + Less punctuation" },
      { key: "very-casual", title: "Very casual", subtitle: "No caps + No punctuation" },
    ],
  },
  {
    title: "work messages?",
    apps: ["slack", "teams"],
    options: [
      { key: "formal", title: "Formal.", subtitle: "Caps + Punctuation" },
      { key: "casual", title: "Casual", subtitle: "Caps + Less punctuation" },
      { key: "excited", title: "Excited!", subtitle: "Caps + Exclamation marks" },
    ],
  },
  {
    title: "email?",
    apps: ["gmail", "openai", "outlook", "mail"],
    options: [
      { key: "formal", title: "Formal.", subtitle: "Caps + Punctuation" },
      { key: "casual", title: "Casual", subtitle: "Caps + Less punctuation" },
      { key: "brief", title: "Brief", subtitle: "Short and direct" },
    ],
  },
  {
    title: "other?",
    apps: ["docs", "openai", "notes"],
    options: [
      { key: "formal", title: "Formal.", subtitle: "Caps + Punctuation" },
      { key: "casual", title: "Casual", subtitle: "Caps + Less punctuation" },
      { key: "excited", title: "Excited!", subtitle: "Caps + Exclamation marks" },
    ],
  },
];

const ICONS = {
  message: { name: "comment", color: "#20c968" },
  messenger: { name: "facebook-messenger", color: "#168bf0", brand: true },
  whatsapp: { name: "whatsapp", color: "#20c968", brand: true },
  telegram: { name: "telegram", color: "#2ca7e8", brand: true },
  slack: { name: "slack", color: "#36c5f0", brand: true },
  teams: { name: "microsoft", color: "#5b57f2", brand: true },
  gmail: { name: "google", color: "#ea4335", brand: true },
  openai: { name: "robot", color: "#111111" },
  outlook: { name: "envelope", color: "#2f8de4" },
  mail: { name: "envelope", color: "#20aee8" },
  docs: { name: "file-lines", color: "#4285f4" },
  notes: { name: "note-sticky", color: "#e1b936" },
};

const PERSONALIZATION_KEY = "@mutter/personalization";

export default function PersonalizationScreen({ onClose }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState({
    personal: "casual",
    work: "formal",
    email: "formal",
    other: "casual",
  });
  const [transitioning, setTransitioning] = useState(false);
  const [saving, setSaving] = useState(false);
  const transition = useSharedValue(0);
  const isIntro = step === 0;
  const currentStep = PERSONALIZATION_STEPS[step - 1];

  const animatedBodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [-32, 0, 32], [0.72, 1, 0.72]),
    transform: [{ translateX: transition.value }],
  }));

  const moveTo = (nextStep) => {
    if (transitioning || saving) {
      return;
    }

    const direction = nextStep > step ? -1 : 1;
    setTransitioning(true);
    transition.value = withTiming(direction * 32, { duration: 170 }, (finished) => {
      if (finished) {
        runOnJS(completeTransition)(nextStep, direction);
      }
    });
  };

  const completeTransition = (nextStep, direction) => {
    setStep(nextStep);
    transition.value = direction * -32;
    transition.value = withTiming(0, { duration: 280 }, (finished) => {
      if (finished) {
        runOnJS(setTransitioning)(false);
      }
    });
  };

  const handleNext = async () => {
    if (transitioning || saving) {
      return;
    }

    if (step === PERSONALIZATION_STEPS.length) {
      setSaving(true);
      try {
        await AsyncStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(selected));
      } finally {
        setSaving(false);
        onClose();
      }
      return;
    }
    moveTo(step + 1);
  };

  const selectOption = (key) => {
    const category = ["personal", "work", "email", "other"][step - 1];
    setSelected((current) => ({ ...current, [category]: key }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.progressArea}>
            <View style={styles.progressRow}>
              {[0, 1, 2, 3].map((bar) => (
                <View
                  key={bar}
                  style={[styles.progressBar, bar < step && styles.progressBarActive]}
                />
              ))}
            </View>
          </View>
        </View>

        <Animated.View
          style={[styles.body, animatedBodyStyle]}
        >
          {isIntro ? <IntroStep /> : <ChoiceStep step={currentStep} selected={selected[["personal", "work", "email", "other"][step - 1]]} onSelect={selectOption} />}
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={transitioning || saving}
            style={[
              styles.primaryButton,
              (transitioning || saving) && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>{isIntro ? "Start Personalization" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function IntroStep() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.introContent}
    >
      <Text style={styles.introTitle}>
        Think naturally.{`\n`}Write English <Text style={styles.titleAccent}>your way</Text>
      </Text>
      <Text style={styles.introSubtitle}>
        Mutter turns what you say in your language into the right English tone{`\n`}for every app
      </Text>

      <View style={styles.introGrid}>
        {INTRO_ROWS.map((row, index) => (
          <View key={index} style={styles.introRow}>
            {row.map((app) => (
              <RealAppIcon key={app} type={app} large />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ChoiceStep({ step, selected, onSelect }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.choiceContent}
    >
      <Text style={styles.choiceTitle}>
        How do you write your{`\n`}
        <Text style={styles.titleAccent}>{step.title}</Text>
      </Text>

      <View style={styles.appStack}>
        {step.apps.map((app) => (
          <RealAppIcon key={app} type={app} />
        ))}
      </View>

      <View style={styles.optionList}>
        {step.options.map((option) => {
          const isSelected = selected === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
            >
              <View style={styles.optionHeader}>
                <View>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
              </View>
              <PreviewBubble option={option} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function PreviewBubble({ option }) {
  const text = option.key === "formal"
    ? "Hey, are you free for lunch tomorrow? Let’s do 12 if that works for you."
    : option.key === "very-casual"
      ? "hey are you free for lunch tomorrow lets do 12 if that works for you"
      : option.key === "excited"
        ? "Hey, if you’re free, let’s chat about the great results!"
        : "Hey are you free for lunch tomorrow? Lets do 12 if that works for you";

  return (
    <View style={styles.previewBubble}>
      <View style={styles.previewAvatar}>
        <Text style={styles.previewAvatarText}>J</Text>
      </View>
      <Text style={styles.previewText} numberOfLines={2}>{text}</Text>
    </View>
  );
}

function RealAppIcon({ type, large = false }) {
  const icon = ICONS[type];
  return (
    <View style={[styles.iconTile, large && styles.iconTileLarge]}>
      <View style={[styles.iconCircle, large && styles.iconCircleLarge]}>
        <FontAwesome6
          name={icon.name}
          iconStyle={icon.brand ? "brand" : "solid"}
          size={large ? 44 : 23}
          color={icon.color}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f3ecdc",
  },
  screen: {
    flex: 1,
    backgroundColor: "#f3ecdc",
  },
  header: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e4dc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelButton: {
    minWidth: 70,
    height: 40,
    justifyContent: "center",
  },
  cancelText: {
    color: "#202026",
    fontSize: 18,
    fontWeight: "600",
  },
  progressArea: {
    alignItems: "flex-end",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
  },
  progressBar: {
    width: 30,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e6e4e2",
  },
  progressBarActive: {
    backgroundColor: "#1c1924",
  },
  body: {
    flex: 1,
  },
  introContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  introTitle: {
    color: "#28242e",
    fontSize: 34,
    lineHeight: 42,
    textAlign: "center",
    fontFamily: "serif",
  },
  titleAccent: {
    color: "#9b8dcc",
    fontFamily: "serif",
  },
  introSubtitle: {
    color: "#2d2932",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 18,
  },
  introGrid: {
    width: "100%",
    marginTop: 28,
    gap: 12,
  },
  introRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e8e6e8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  iconTileLarge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderColor: "#d6d3d5",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f5f5f5",
  },
  choiceContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  choiceTitle: {
    color: "#28242e",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: "serif",
  },
  appStack: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  optionList: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e3e2",
    padding: 12,
  },
  optionCardSelected: {
    borderColor: "#26232d",
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionTitle: {
    color: "#28242e",
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "500",
  },
  optionSubtitle: {
    color: "#28242e",
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#8b8a90",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#743e99",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#743e99",
  },
  previewBubble: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: "#f2effb",
    marginTop: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  previewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eccaf9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  previewAvatarText: {
    color: "#ffffff",
    fontSize: 14,
  },
  previewText: {
    flex: 1,
    color: "#2f2d34",
    fontSize: 13,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#f3ecdc",
    borderTopWidth: 1,
    borderTopColor: "#e7e4dc",
  },
  primaryButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: "#191620",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
