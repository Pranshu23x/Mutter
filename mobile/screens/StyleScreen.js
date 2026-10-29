import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AppChip,
  BrandMark,
  InitialFlowBackground,
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
  voicePersona,
  profileLetter = "M",
}) {
  const persistedTab = useMemo(
    () => STYLE_TABS.find((tab) => tab.label === voicePersona)?.key,
    [voicePersona]
  );
  const [activeTab, setActiveTab] = useState(persistedTab || "personal");
  const [personalized, setPersonalized] = useState(false);

  // voicePersona loads from AsyncStorage asynchronously in App.js, so it can arrive
  // after this screen's first render — keep the tab in sync once it does.
  useEffect(() => {
    if (persistedTab) {
      setActiveTab(persistedTab);
    }
  }, [persistedTab]);
  const heroScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const contentOffset = useSharedValue(0);
  const active = STYLE_TABS.find((tab) => tab.key === activeTab) || STYLE_TABS[0];

  const selectPersona = (key) => {
    if (key === activeTab) {
      return;
    }
    // Cross-fade the persona content instead of snapping to the new tab instantly.
    contentOpacity.value = withTiming(0, { duration: 90 }, (finished) => {
      if (finished) {
        contentOffset.value = 6;
        contentOpacity.value = withTiming(1, { duration: 180 });
        contentOffset.value = withTiming(0, { duration: 180 });
      }
    });
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

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentOffset.value }],
  }));

  return (
    <InitialFlowBackground>
    <SafeAreaView style={styles.styleSafe}>
      <StatusBar style="light" />

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
              <BrandMark tintColor="#ffffff" />
            </View>
          </View>

          <SegmentTabs
            tabs={STYLE_TABS}
            activeKey={activeTab}
            onChange={selectPersona}
          />

          <Animated.View style={contentAnimatedStyle}>
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
          </Animated.View>

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

          <Animated.View style={contentAnimatedStyle}>
            <StyleCard
              title={active.title}
              subtitle={active.subtitle}
              preview={active.preview}
            />
          </Animated.View>

          <Text style={styles.footerText}>
            Styles currently apply in English only
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
    </InitialFlowBackground>
  );
}
