import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, SafeAreaView, ScrollView, Text, View } from "react-native";
import {
  BrandMark,
  HomeBannerCard,
  SoftTouchableOpacity,
  styles,
} from "../App";
import DictationPanel from "../components/DictationPanel";

export default function HomeScreen({
  onOpenProfile,
  profileLetter = "M",
  onEnableBubble,
  onEnableMicrophone,
  bubbleEnabled,
  bubblePermissionState,
  bubbleTextInputPermissionState,
  bubbleVisible,
  bubbleBusy,
  microphonePermissionState,
}) {
  const permissionsReady =
    microphonePermissionState === "granted" &&
    bubblePermissionState === "granted" &&
    bubbleTextInputPermissionState === "granted";
  const needsMicrophone = microphonePermissionState !== "granted";
  const needsOverlay = bubblePermissionState !== "granted" || !bubbleEnabled;
  const needsTextInput = bubbleTextInputPermissionState !== "granted";
  const sloganOpacity = useRef(new Animated.Value(bubbleVisible ? 1 : 0)).current;
  const sloganOffset = useRef(new Animated.Value(bubbleVisible ? 0 : 8)).current;

  useEffect(() => {
    if (!bubbleVisible) {
      sloganOpacity.setValue(0);
      sloganOffset.setValue(8);
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.timing(sloganOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(sloganOffset, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [bubbleVisible, sloganOffset, sloganOpacity]);

  const sloganStyle = bubbleVisible
    ? {
        opacity: sloganOpacity,
        transform: [{ translateY: sloganOffset }],
      }
    : null;

  return (
    <SafeAreaView style={styles.homeSafe}>
      <StatusBar style="dark" />

      <View style={styles.homeScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.homeContent, styles.homeContentFill]}
        >
          <View style={styles.homeTopBar}>
            <SoftTouchableOpacity onPress={onOpenProfile} style={styles.homeMenuButton}>
              <Text style={styles.profileBadgeText}>{profileLetter}</Text>
            </SoftTouchableOpacity>

            <View style={styles.homeBrandWrap}>
              <BrandMark />
            </View>

            <View style={styles.homeTopSpacer} />
          </View>

          <View style={styles.homeSlogan}>
            <Animated.Text style={[styles.homeSloganTitle, sloganStyle]}>
              {bubbleVisible ? "Keep muttering" : "Think in your language. Send in English."}
            </Animated.Text>
            {!bubbleVisible && (
              <Text style={styles.homeSloganBody}>
                Speak naturally in any Indian language and send clear, confident English in every chat.
              </Text>
            )}
          </View>
          {permissionsReady && (
            <View
              style={[
                styles.homePermissionSlot,
                bubbleEnabled && styles.homePermissionSlotBottom,
              ]}
            >
              <DictationPanel
                expanded={bubbleEnabled}
                microphonePermissionState={microphonePermissionState}
              />
            </View>
          )}
        </ScrollView>

        {!bubbleVisible && !permissionsReady && (
          <HomeBannerCard
            buttonLabel={
              bubbleBusy
                ? "Opening settings..."
                : needsMicrophone
                  ? "Enable microphone"
                  : needsOverlay && bubblePermissionState === "denied"
                  ? "Try again"
                  : needsTextInput && bubbleTextInputPermissionState === "requesting"
                    ? "Open text input settings"
                    : needsTextInput
                      ? "Allow text input access"
                      : "Allow overlay"
            }
            buttonDisabled={bubbleBusy}
            onPress={needsMicrophone ? onEnableMicrophone : onEnableBubble}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
