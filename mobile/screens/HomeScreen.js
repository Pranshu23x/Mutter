import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, SafeAreaView, ScrollView, Text, View } from "react-native";
import {
  BrandMark,
  HomeBannerCard,
  InitialFlowBackground,
  SoftTouchableOpacity,
  styles,
} from "../App";
import DictationPanel from "../components/DictationPanel";
import UsagePill from "../components/UsagePill";
import PaywallModal from "../components/PaywallModal";

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
  // Every permission state starts as "checking" on each app mount, while the native
  // side asynchronously re-verifies already-granted permissions — treating "checking"
  // the same as "denied" below would flash the "allow permissions" banner on every
  // reload even for a user who granted everything long ago.
  const stillChecking =
    microphonePermissionState === "checking" ||
    bubblePermissionState === "checking" ||
    bubbleTextInputPermissionState === "checking";
  const needsMicrophone = microphonePermissionState !== "granted";
  const needsOverlay = bubblePermissionState !== "granted" || !bubbleEnabled;
  const needsTextInput = bubbleTextInputPermissionState !== "granted";

  // List only what's actually still missing — a generic "allow overlay and
  // text-input" message reads as ignoring permissions the user already granted.
  const missingLabels = [
    needsMicrophone && "microphone",
    needsOverlay && "overlay",
    needsTextInput && "text-input",
  ].filter(Boolean);
  const missingList =
    missingLabels.length <= 1
      ? missingLabels.join("")
      : `${missingLabels.slice(0, -1).join(", ")} and ${missingLabels[missingLabels.length - 1]}`;
  const bannerBody = missingLabels.length
    ? `Allow ${missingList} access so you can speak naturally and turn your thoughts into English in any chat.`
    : "";
  const [paywallVisible, setPaywallVisible] = useState(false);
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
    <InitialFlowBackground>
    <SafeAreaView style={styles.homeSafe}>
      <StatusBar style="light" />

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
              <BrandMark tintColor="#ffffff" />
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
          <UsagePill onLimitReached={() => setPaywallVisible(true)} />

          {permissionsReady && (
            <View
              style={[
                styles.homePermissionSlot,
                bubbleEnabled && styles.homePermissionSlotBottom,
              ]}
            >
              <DictationPanel />
            </View>
          )}
        </ScrollView>

        {/* "Finish setup" reopens the step-by-step flow at whichever permission is still off. */}
        {!bubbleVisible && !permissionsReady && !stillChecking && (
          <HomeBannerCard
            body={bannerBody}
            buttonLabel="Finish setup"
            onPress={needsMicrophone ? onEnableMicrophone : onEnableBubble}
          />
        )}
      </View>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </SafeAreaView>
    </InitialFlowBackground>
  );
}
