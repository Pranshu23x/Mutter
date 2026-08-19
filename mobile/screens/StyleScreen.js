import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  AppChip,
  BrandMark,
  SegmentTabs,
  SoftTouchableOpacity,
  STYLE_TABS,
  StyleCard,
  styles,
} from "../App";

export default function StyleScreen({
  onOpenProfile,
  onStartPersonalization,
  onPersonaChange,
  profileLetter = "M",
}) {
  const [activeTab, setActiveTab] = useState("personal");
  const [personalized, setPersonalized] = useState(false);
  const heroScale = useSharedValue(1);
  const active = STYLE_TABS.find((tab) => tab.key === activeTab) || STYLE_TABS[0];

  const selectPersona = (key) => {
    setActiveTab(key);
    const selected = STYLE_TABS.find((tab) => tab.key === key);
    if (selected) {
      onPersonaChange?.(selected.label);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      AsyncStorage.getItem("@mutter/personalization").then((value) => {
        if (mounted) {
          setPersonalized(Boolean(value));
        }
      });

      return () => {
        mounted = false;
      };
    }, [])
  );

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));
  return (
    <SafeAreaView style={styles.styleSafe}>
      <StatusBar style="dark" />

      <View style={styles.styleScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.styleContent}
        >
          <View style={styles.topBar}>
            <SoftTouchableOpacity onPress={onOpenProfile} style={styles.menuButton}>
              <Text style={styles.profileBadgeText}>{profileLetter}</Text>
            </SoftTouchableOpacity>

            <View style={styles.brandWrap}>
              <BrandMark />
            </View>
          </View>

          <SegmentTabs
            tabs={STYLE_TABS}
            activeKey={activeTab}
            onChange={selectPersona}
          />

          <View style={styles.appRow}>
            {active.apps.map((app, index) => (
              <View
                key={`${active.key}-${app.type}`}
                style={[styles.appChipWrap, index > 0 && styles.appChipOverlap]}
              >
                <AppChip type={app.type} accent={app.accent} />
              </View>
            ))}
          </View>

          <Text style={styles.caption}>{active.caption}</Text>

          {!personalized && (
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Say it your way. Send it in the right English.</Text>
              <Text style={styles.heroSubtitle}>
                Choose the tone that fits your chat, work message, or email.
              </Text>
              <Animated.View style={heroAnimatedStyle}>
                <SoftTouchableOpacity
                  onPress={onStartPersonalization}
                  onPressIn={() => {
                    heroScale.value = withSpring(0.97, { damping: 16, stiffness: 260 });
                  }}
                  onPressOut={() => {
                    heroScale.value = withSpring(1, { damping: 14, stiffness: 220 });
                  }}
                  style={styles.heroButton}
                >
                  <Text style={styles.heroButtonText}>Start now</Text>
                </SoftTouchableOpacity>
              </Animated.View>
            </View>
          )}

          <StyleCard
            title={active.title}
            subtitle={active.subtitle}
            preview={active.preview}
          />

          <Text style={styles.footerText}>
            Styles currently apply in English only
          </Text>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
