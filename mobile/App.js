import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReanimatedAnimated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Modal,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SCREENS } from "./routes";
import { useFloatingBubbleController } from "./bubble";
import { API_BASE_URL } from "./api.config";
import HomeRoute from "./screens/HomeScreen";
import StyleRoute from "./screens/StyleScreen";
import SettingsRoute from "./screens/SettingsScreen";
import AccountRoute from "./screens/AccountScreen";
import ProfileRoute from "./screens/ProfileScreen";
import PersonalizationRoute from "./screens/PersonalizationScreen";
import AuthScreen from "./screens/AuthScreen";
import PermissionOnboardingScreen from "./screens/PermissionOnboardingScreen";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { PlanProvider, usePlan } from "./auth/PlanContext";
import { UsageProvider } from "./auth/UsageContext";
import BrandMark from "./components/BrandMark";
import { StatusBar } from "expo-status-bar";
import {
  WhatsAppGlyph,
  MessengerGlyph,
  TelegramGlyph,
  TeamsGlyph,
  OutlookGlyph,
  OpenAIGlyph,
  DocsGlyph,
  SlackGlyph,
  GmailGlyph,
  MessageGlyph,
  MailGlyph,
  NotesGlyph,
} from "./components/AppGlyphs";

export { BrandMark };

export const SCREEN_WIDTH = Dimensions.get("window").width;
export const DRAWER_WIDTH = Math.min(336, Math.round(SCREEN_WIDTH * 0.84));
const VOICE_PERSONA_KEY = "@mutter/voice-persona";
const WELCOME_SEEN_KEY = "@mutter/welcome-seen";
const PERMISSION_ONBOARDING_DONE_KEY = "@mutter/permission-onboarding-done";
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

// Real mixed-language-in / English-out examples, tagged by persona — leads the Welcome
// screen so new users see what the app actually does before being asked to sign up.
const WELCOME_EXAMPLES = [
  {
    tag: "Work",
    input: "कल का report ready है, but एक बार check कर लेना please।",
    output: "The report for tomorrow is ready. Please review it once.",
  },
  {
    tag: "Personal",
    input: "ଆଜି थोड़ा देर ହେବ, traffic बहुत ज्यादा ଅଛି।",
    output: "I'll be a little late today, the traffic is really heavy.",
  },
  {
    tag: "Email",
    input: "मला उद्या थोडं लवकर निघावं लागेल, so can we move the meeting?",
    output: "I need to leave early tomorrow. Could we move the meeting?",
  },
];

export const STYLE_TABS = [
  {
    key: "personal",
    label: "Personal",
    caption: "Natural English for personal chats",
    title: "Casual",
    subtitle: "Caps + Less punctuation",
    preview:
      "Hey are you free for lunch tomorrow? Lets do 12 if that works for you",
    apps: [
      { type: "message", accent: "#27d95d" },
      { type: "messenger", accent: "#6f55ff" },
      { type: "whatsapp", accent: "#22c55e" },
      { type: "telegram", accent: "#2fa5f4" },
    ],
  },
  {
    key: "work",
    label: "Work",
    caption: "Clear, professional English for work chats",
    title: "Formal.",
    subtitle: "Caps + Punctuation",
    preview: "Hey, if youre free, lets chat about the great results.",
    apps: [
      { type: "slack", accent: "#ffffff" },
      { type: "teams", accent: "#5b57f2" },
    ],
  },
  {
    key: "email",
    label: "Email",
    caption: "Polished English for every email",
    title: "Formal.",
    subtitle: "Caps + Punctuation",
    preview:
      "Hi Alex, It was great talking with you today. Looking forward to our next chat.",
    apps: [
      { type: "gmail", accent: "#ffffff" },
      { type: "openai", accent: "#111111" },
      { type: "outlook", accent: "#1e88ff" },
      { type: "mail", accent: "#3da0ff" },
    ],
  },
  {
    key: "other",
    label: "Other",
    caption: "The right English for every other app",
    title: "Casual.",
    subtitle: "Caps + Less punctuation",
    preview:
      "So far I'm enjoying the new workout routine. I'm excited for tomorrow's workout especially after a full night of rest.",
    apps: [
      { type: "docs", accent: "#ffffff" },
      { type: "openai", accent: "#111111" },
      { type: "notes", accent: "#f3cf4f" },
    ],
  },
];

function NavigatorTabBar({ state, navigation }) {
  const activeRoute = state.routes[state.index]?.name ?? SCREENS.HOME;

  return (
    <BottomNav
      active={activeRoute}
      theme="dark"
      onHomePress={() => navigation.navigate(SCREENS.HOME)}
      onStylePress={() => navigation.navigate(SCREENS.STYLE)}
    />
  );
}

function MainTabs({
  onOpenProfile,
  onStartPersonalization,
  onPersonaChange,
  voicePersona,
  profileLetter,
  onEnableBubble,
  onEnableMicrophone,
  bubbleEnabled,
  bubblePermissionState,
  bubbleTextInputPermissionState,
  bubbleVisible,
  bubbleBusy,
  microphonePermissionState,
}) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, animation: "shift" }}
      tabBar={(props) => <NavigatorTabBar {...props} />}
    >
      <Tab.Screen name={SCREENS.HOME}>
        {() => (
          <HomeRoute
            onOpenProfile={onOpenProfile}
            profileLetter={profileLetter}
            onEnableBubble={onEnableBubble}
            onEnableMicrophone={onEnableMicrophone}
            bubbleEnabled={bubbleEnabled}
            bubblePermissionState={bubblePermissionState}
            bubbleTextInputPermissionState={bubbleTextInputPermissionState}
            bubbleVisible={bubbleVisible}
            bubbleBusy={bubbleBusy}
            microphonePermissionState={microphonePermissionState}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name={SCREENS.STYLE}>
        {() => (
          <StyleRoute
            onOpenProfile={onOpenProfile}
            onStartPersonalization={onStartPersonalization}
            onPersonaChange={onPersonaChange}
            voicePersona={voicePersona}
            profileLetter={profileLetter}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Shared background for every pre-app screen (loading spinners, config-missing, auth,
// permission onboarding, welcome) so the whole first-run flow reads as one continuous
// experience instead of flashing between different solid colors screen to screen.
export function InitialFlowBackground({ children, white = false }) {
  return (
    <ReanimatedAnimated.View
      style={{ flex: 1 }}
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(180)}
    >
      {white ? (
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>{children}</View>
      ) : (
        <ImageBackground
          source={require("./assets/welcome-background.jpg")}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          {children}
        </ImageBackground>
      )}
    </ReanimatedAnimated.View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <UsageProvider>
          <AppShell />
        </UsageProvider>
      </PlanProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { token, email, signOut, loading, isSupabaseConfigured } = useAuth();
  const { planLabel, startCheckout } = usePlan();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voicePersona, setVoicePersona] = useState("Personal");
  const [microphonePermissionState, setMicrophonePermissionState] = useState("checking");
  const bubble = useFloatingBubbleController();
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [permissionOnboardingDismissedThisSession, setPermissionOnboardingDismissedThisSession] =
    useState(false);

  // Welcome is a one-time marketing/onboarding screen shown before auth, not gated on
  // being logged in — it should only ever appear once per install, regardless of
  // whether the user later logs out and back in.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then((seen) => {
        if (mounted) {
          setWelcomeVisible(seen !== "true");
          setWelcomeReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setWelcomeVisible(true);
          setWelcomeReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setOnboardingVisible(false);
      setOnboardingReady(false);
      return undefined;
    }

    let mounted = true;
    AsyncStorage.getItem(PERMISSION_ONBOARDING_DONE_KEY)
      .then((done) => {
        if (mounted) {
          setOnboardingVisible(done !== "true");
          setOnboardingReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setOnboardingVisible(true);
          setOnboardingReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    AsyncStorage.getItem(VOICE_PERSONA_KEY).then((storedPersona) => {
      if (mounted && ["Personal", "Work", "Email", "Other"].includes(storedPersona)) {
        setVoicePersona(storedPersona);
      }
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    bubble.configureVoiceSession(API_BASE_URL, token, voicePersona).catch(() => {});
  }, [bubble.configureVoiceSession, token, voicePersona]);

  const profileLetter = (email || "M").trim().charAt(0).toUpperCase() || "M";
  const handleEnableBubble = async () => {
    // A stale service state must not prevent the user from reopening Android
    // settings after the overlay permission was revoked.
    if (bubble.isBusy) {
      return;
    }

    try {
      const granted = await bubble.enable();
      if (!granted) {
        await bubble.refreshPermission();
      }
    } catch {
      // Ignore failed overlay launches; the banner stays available for retry.
      await bubble.refreshPermission().catch(() => {});
    }
  };

  const handleEnableOverlayOnly = async () => {
    if (bubble.isBusy) {
      return;
    }

    try {
      const granted = await bubble.enableOverlay();
      if (!granted) {
        await bubble.refreshPermission();
      }
    } catch {
      await bubble.refreshPermission().catch(() => {});
    }
  };

  const handleEnableTextInputOnly = async () => {
    if (bubble.isBusy) {
      return;
    }

    try {
      await bubble.requestTextInputPermission();
    } catch {
      await bubble.refreshTextInputPermission().catch(() => {});
    }
  };

  const handleEnableMicrophone = async () => {
    if (Platform.OS !== "android") {
      return;
    }

    setMicrophonePermissionState("requesting");
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone access",
          message: "Mutter needs microphone access to turn your speech into English.",
          buttonPositive: "Allow microphone",
          buttonNegative: "Not now",
        }
      );
      setMicrophonePermissionState(
        result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied"
      );
    } catch {
      setMicrophonePermissionState("denied");
    }
  };

  // Permissions are no longer requested automatically here — each one is now asked for
  // explicitly, one at a time with context, via PermissionOnboardingScreen (first login)
  // or HomeBannerCard (if skipped/revoked later). This effect only ever *checks* current
  // state on login so the UI reflects reality — it never triggers a native prompt.
  useEffect(() => {
    if (!token || loading || Platform.OS !== "android") {
      return;
    }

    let mounted = true;
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then((granted) => {
      if (mounted) {
        setMicrophonePermissionState(granted ? "granted" : "denied");
      }
    });

    return () => {
      mounted = false;
    };
  }, [loading, token]);

  if (!isSupabaseConfigured) {
    return <ConfigMissingScreen />;
  }

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <InitialFlowBackground>
            <View style={styles.welcomeLoading}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          </InitialFlowBackground>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!welcomeReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <InitialFlowBackground>
            <View style={styles.welcomeLoading}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          </InitialFlowBackground>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (welcomeVisible) {
    return (
      <WelcomeScreen
        onGetStarted={async () => {
          await AsyncStorage.setItem(WELCOME_SEEN_KEY, "true");
          setWelcomeVisible(false);
        }}
      />
    );
  }

  if (!token) {
    // AuthScreen renders a SafeAreaView from react-native-safe-area-context, which
    // requires a SafeAreaProvider ancestor to supply insets — without this wrapper it
    // throws ("No safe area value available") instead of rendering the login screen.
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <InitialFlowBackground>
            <AuthScreen />
          </InitialFlowBackground>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!onboardingReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <InitialFlowBackground>
            <View style={styles.welcomeLoading}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          </InitialFlowBackground>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Beyond the one-time "seen onboarding before" flag, also re-show the step flow any
  // time a raw permission is actually missing (e.g. Android auto-revoking overlay/
  // accessibility on app reinstall/update) — not just on first-ever login. Deliberately
  // ignores bubble.enabled (the manual on/off toggle): that's a separate concern
  // HomeScreen's own banner already covers once all real permissions are granted.
  const permissionsReady =
    microphonePermissionState === "granted" &&
    bubble.permissionState === "granted" &&
    bubble.textInputPermissionState === "granted";
  const permissionsStillChecking =
    microphonePermissionState === "checking" ||
    bubble.permissionState === "checking" ||
    bubble.textInputPermissionState === "checking";
  // Finishing/skipping the flow must not immediately re-trigger it just because a
  // permission is still missing (e.g. skipped on the last step) — sessionDismissed
  // resets on every fresh app open, so the step flow still greets you again next time
  // something's missing, but never traps you mid-session the way a persisted flag would.
  const showPermissionFlow =
    !permissionOnboardingDismissedThisSession &&
    (onboardingVisible || (!permissionsReady && !permissionsStillChecking));

  if (showPermissionFlow) {
    return (
      <InitialFlowBackground>
        <PermissionOnboardingScreen
          microphonePermissionState={microphonePermissionState}
          onEnableMicrophone={handleEnableMicrophone}
          bubblePermissionState={bubble.permissionState}
          bubbleTextInputPermissionState={bubble.textInputPermissionState}
          bubbleBusy={bubble.isBusy}
          onEnableOverlay={handleEnableOverlayOnly}
          onEnableTextInput={handleEnableTextInputOnly}
          onDone={async () => {
            await AsyncStorage.setItem(PERMISSION_ONBOARDING_DONE_KEY, "true");
            setOnboardingVisible(false);
            setPermissionOnboardingDismissedThisSession(true);
            // Only now — after the whole permission sequence is finished or skipped —
            // does the bubble actually become visible, never mid-onboarding.
            bubble.activateBubble().catch(() => {});
          }}
        />
      </InitialFlowBackground>
    );
  }

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const goToProfile = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(SCREENS.PROFILE);
    }
  };
  const goToSettings = () => {
    closeDrawer();
    if (navigationRef.isReady()) {
      navigationRef.navigate(SCREENS.SETTINGS);
    }
  };
  const goToAccount = () => {
    closeDrawer();
    if (navigationRef.isReady()) {
      navigationRef.navigate(SCREENS.ACCOUNT);
    }
  };
  const handleSignOut = async () => {
    closeDrawer();
    await signOut();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer ref={navigationRef}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="MainTabs">
                {() => (
          <MainTabs
                    onOpenProfile={goToProfile}
            onStartPersonalization={() => navigationRef.navigate(SCREENS.PERSONALIZATION)}
            onPersonaChange={(persona) => {
              setVoicePersona(persona);
              AsyncStorage.setItem(VOICE_PERSONA_KEY, persona).catch(() => {});
            }}
                    voicePersona={voicePersona}
                    profileLetter={profileLetter}
                    onEnableBubble={handleEnableBubble}
                    onEnableMicrophone={handleEnableMicrophone}
                    bubbleEnabled={bubble.enabled}
                    bubblePermissionState={bubble.permissionState}
                    bubbleTextInputPermissionState={bubble.textInputPermissionState}
                    bubbleVisible={bubble.isShowing}
                    bubbleBusy={bubble.isBusy}
                    microphonePermissionState={microphonePermissionState}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen name={SCREENS.PROFILE}>
                {(props) => (
                  <ProfileRoute
                    onBack={() => props.navigation.goBack()}
                    onOpenSettings={goToSettings}
                    onOpenAccount={goToAccount}
                    email={email}
                    planLabel={planLabel}
                    onUpgrade={startCheckout}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen name={SCREENS.SETTINGS}>
                {(props) => (
                  <SettingsRoute
                    onBack={() => props.navigation.goBack()}
                    bubbleOpacity={bubble.opacity}
                    onBubbleOpacityChange={bubble.setOpacity}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen name={SCREENS.ACCOUNT}>
                {(props) => (
                  <AccountRoute onBack={() => props.navigation.goBack()} />
                )}
              </RootStack.Screen>
              <RootStack.Screen
                name={SCREENS.PERSONALIZATION}
                options={{ animation: "fade" }}
              >
                {(props) => (
                  <PersonalizationRoute onClose={() => props.navigation.goBack()} />
                )}
              </RootStack.Screen>
            </RootStack.Navigator>
          </NavigationContainer>
        </View>

        <GlobalDrawer
          visible={drawerOpen}
          onClose={closeDrawer}
          onOpenSettings={goToSettings}
          onOpenAccount={goToAccount}
          email={email}
          planLabel={planLabel}
          onSignOut={handleSignOut}
        />

      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ConfigMissingScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <InitialFlowBackground>
          <SafeAreaView style={configMissingStyles.safe}>
            <View style={configMissingStyles.card}>
              <Text style={configMissingStyles.title}>Setup needed</Text>
              <Text style={configMissingStyles.body}>
                EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY aren't set, so
                sign-in can't work yet. Create mobile/.env — see mobile/ENV_SETUP.md for the
                values to fill in — then restart the app.
              </Text>
            </View>
          </SafeAreaView>
        </InitialFlowBackground>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const configMissingStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#eeeeee",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4d4d4d",
  },
});

function WelcomeScreen({ onGetStarted }) {
  return (
    <InitialFlowBackground>
      <SafeAreaView style={styles.welcomeSafeInner}>
      <StatusBar style="light" />
      <View style={styles.welcomeScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.welcomeScrollContent}
        >
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeLogoMark}>
              <View style={styles.welcomeLogoBarShort} />
              <View style={styles.welcomeLogoBarTall} />
              <View style={styles.welcomeLogoBarMid} />
              <View style={styles.welcomeLogoBarShort} />
            </View>
            <Text style={styles.welcomeLogoText}>Mutter</Text>
          </View>

          <Text style={styles.welcomeTitle}>Think in your language, type in English — 4x faster</Text>

          {WELCOME_EXAMPLES.map((example) => (
            <View key={example.tag + example.input} style={styles.welcomeExampleCard}>
              <View style={styles.welcomeExampleTag}>
                <Text style={styles.welcomeExampleTagText}>{example.tag}</Text>
              </View>
              <Text style={styles.welcomeExampleInput}>{example.input}</Text>
              <Text style={styles.welcomeExampleOutput}>{example.output}</Text>
            </View>
          ))}

          <Text style={styles.welcomeBody}>
            Speak in Hindi, Tamil, Bengali, or any language you think in. Mutter turns it into clear English for every chat.
          </Text>
        </ScrollView>

        <View style={styles.welcomeFooter}>
          <View style={styles.welcomeDots}>
            <View style={[styles.welcomeDot, styles.welcomeDotActive]} />
            <View style={styles.welcomeDot} />
            <View style={styles.welcomeDot} />
          </View>
          <SoftTouchableOpacity onPress={onGetStarted} style={styles.welcomeButton}>
            <Text style={styles.welcomeButtonText}>Get started</Text>
          </SoftTouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    </InitialFlowBackground>
  );
}

function GlobalDrawer({
  visible,
  onClose,
  onOpenSettings,
  onOpenAccount,
  email,
  planLabel,
  onSignOut,
}) {
  const drawerTranslate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerTranslate, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: visible ? 260 : 220,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 180,
        easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, drawerTranslate, scrimOpacity]);

  const handleAccountPress = () => {
    onClose();
    onOpenAccount();
  };
  const handleSettingsPress = () => {
    onClose();
    onOpenSettings();
  };
  return (
    <View style={styles.drawerLayer} pointerEvents={visible ? "auto" : "none"}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.drawerScrimHitArea}>
        <Animated.View
          pointerEvents="none"
          style={[styles.drawerScrim, { opacity: scrimOpacity }]}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.drawerPanel,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: drawerTranslate }],
          },
        ]}
      >
        <View style={styles.drawerContent}>
          <View style={styles.drawerProfileCard}>
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>
                {(email || "M").trim().charAt(0).toUpperCase() || "M"}
              </Text>
            </View>
            <Text style={styles.drawerName}>{email || "Unknown"}</Text>
            <SoftTouchableOpacity onPress={handleAccountPress} style={styles.drawerPlanPill}>
              <Text style={styles.drawerPlanText}>{planLabel}</Text>
            </SoftTouchableOpacity>
          </View>

          <View style={styles.drawerMenuGroup}>
            <DrawerMenuItem icon="issue" label="Report an issue" onPress={onClose} />
            <DrawerMenuItem icon="feedback" label="Share feedback" onPress={onClose} />

            <View style={styles.drawerDivider} />

            <DrawerMenuItem icon="settings" label="Settings" onPress={handleSettingsPress} />
            <DrawerMenuItem icon="account" label="Account" onPress={handleAccountPress} />

            <View style={styles.drawerDivider} />

            <DrawerMenuItem icon="signout" label="Sign out" onPress={onSignOut} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export function SoftTouchableOpacity({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (nextScale, nextOpacity) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        speed: 24,
        bounciness: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: nextOpacity,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressIn = (event) => {
    animateTo(0.985, 0.94);
    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePressOut = (event) => {
    animateTo(1, 1);
    if (onPressOut) {
      onPressOut(event);
    }
  };

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const baseTransform = Array.isArray(flattenedStyle.transform) ? flattenedStyle.transform : [];

  return (
    <AnimatedTouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [...baseTransform, { scale }], opacity }]}
      {...rest}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

export function EditProfileModal({
  visible,
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
  onCancel,
  onSave,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.editModalBackdrop}>
        <TouchableOpacity activeOpacity={1} onPress={onCancel} style={styles.editModalScrim} />

        <View style={styles.editModalCardWrap}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit Profile</Text>

            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={onChangeFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                selectionColor="#9a6400"
                style={styles.editField}
                placeholder="First name"
                placeholderTextColor="#8d6c43"
              />
            </View>

            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={onChangeLastName}
                autoCapitalize="words"
                autoCorrect={false}
                selectionColor="#9a6400"
                style={styles.editField}
                placeholder="Last name"
                placeholderTextColor="#8d6c43"
              />
            </View>

            <View style={styles.editModalActions}>
              <SoftTouchableOpacity onPress={onCancel} style={styles.editModalActionButton}>
                <Text style={styles.editModalActionText}>Cancel</Text>
              </SoftTouchableOpacity>
              <SoftTouchableOpacity onPress={onSave} style={styles.editModalActionButton}>
                <Text style={styles.editModalActionText}>Save</Text>
              </SoftTouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SettingsRow({ title, subtitle, showChevron = false, onPress }) {
  return (
    <SoftTouchableOpacity onPress={onPress} style={styles.settingsRow}>
      <View style={styles.settingsRowText}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingsRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {showChevron ? <Text style={styles.settingsChevron}>{"\u203A"}</Text> : null}
    </SoftTouchableOpacity>
  );
}

export function ToggleSettingsRow({ title, description, value, onToggle }) {
  return (
    <SoftTouchableOpacity onPress={onToggle} style={styles.toggleRow}>
      <View style={styles.toggleRowText}>
        <Text style={styles.toggleRowTitle}>{title}</Text>
        <Text style={styles.toggleRowDescription}>{description}</Text>
      </View>
      <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </View>
    </SoftTouchableOpacity>
  );
}

export function DrawerMenuItem({ icon, label, onPress, disabled = false }) {
  return (
    <SoftTouchableOpacity onPress={onPress} disabled={disabled} style={styles.drawerMenuItem}>
      <View style={styles.drawerMenuIcon}>{renderDrawerIcon(icon)}</View>
      <Text style={styles.drawerMenuLabel}>{label}</Text>
    </SoftTouchableOpacity>
  );
}

function renderDrawerIcon(icon) {
  switch (icon) {
    case "issue":
      return <DrawerIssueGlyph />;
    case "feedback":
      return <DrawerFeedbackGlyph />;
    case "settings":
      return <DrawerSettingsGlyph />;
    case "bubble":
      return <FlowBarsGlyph />;
case "account":
      return <DrawerAccountGlyph />;
    case "signout":
      return <DrawerSignOutGlyph />;
    default:
      return null;
  }
}

function DrawerIssueGlyph() {
  return (
    <View style={styles.drawerIssueGlyph}>
      <View style={styles.drawerBubbleOutline} />
      <View style={styles.drawerBubbleTail} />
      <Text style={styles.drawerIssueMark}>!</Text>
    </View>
  );
}

function DrawerFeedbackGlyph() {
  return (
    <View style={styles.drawerFeedbackGlyph}>
      <View style={styles.drawerBubbleOutline} />
      <View style={styles.drawerBubbleTail} />
      <View style={styles.drawerFeedbackLine} />
      <View style={styles.drawerFeedbackLineShort} />
    </View>
  );
}

function DrawerSettingsGlyph() {
  return (
    <View style={styles.drawerSettingsGlyph}>
      <View style={styles.drawerSettingsRing} />
      <View style={styles.drawerSettingsCenter} />
      <View style={[styles.drawerSettingsSpoke, styles.drawerSettingsSpokeTop]} />
      <View style={[styles.drawerSettingsSpoke, styles.drawerSettingsSpokeRight]} />
      <View style={[styles.drawerSettingsSpoke, styles.drawerSettingsSpokeBottom]} />
      <View style={[styles.drawerSettingsSpoke, styles.drawerSettingsSpokeLeft]} />
    </View>
  );
}

function DrawerAccountGlyph() {
  return (
    <View style={styles.drawerAccountGlyph}>
      <View style={styles.drawerAccountHead} />
      <View style={styles.drawerAccountBody} />
    </View>
  );
}

function DrawerSignOutGlyph() {
  return (
    <View style={styles.drawerSignOutGlyph}>
      <View style={styles.drawerSignOutDoor} />
      <View style={styles.drawerSignOutShaft} />
      <View style={styles.drawerSignOutTip} />
    </View>
  );
}

export function HomeBannerCard({
  title = "Allow permissions",
  body = "Allow overlay and text-input access so you can speak naturally and turn your thoughts into English in any chat.",
  buttonLabel = "Allow",
  buttonDisabled = false,
  onPress,
}) {
  const slideX = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: 0,
      speed: 22,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [slideX]);

  return (
    <Animated.View style={[styles.homeBannerCard, { transform: [{ translateX: slideX }] }]}>
      <Text style={styles.homeBannerTitle}>{title}</Text>
      <Text style={styles.homeBannerBody}>{body}</Text>
      <SoftTouchableOpacity
        onPress={onPress}
        disabled={buttonDisabled}
        style={[styles.homeBannerButton, buttonDisabled && styles.homeBannerButtonDisabled]}
      >
        <Text style={styles.homeBannerButtonText}>{buttonLabel}</Text>
      </SoftTouchableOpacity>
    </Animated.View>
  );
}

export function HomePagerDots() {
  return (
    <View style={styles.homeDots}>
      <View style={[styles.homeDot, styles.homeDotActive]} />
      <View style={styles.homeDot} />
    </View>
  );
}

export function HomeDictationCard() {
  return (
    <View style={styles.homeDictationCard}>
      <View style={styles.homeCloseButton}>
        <CloseGlyph />
      </View>

      <Text style={styles.homeDictationTitle}>Start dictating!</Text>
      <Text style={styles.homeDictationBody}>
        Speak in Hindi, Tamil, Telugu, Bengali, Marathi, or the language you think in. Mutter turns it into English for any chat.
      </Text>

      <View style={styles.homePreviewPanel}>
        <View style={styles.homePreviewTopRow}>
          <Text style={styles.homePreviewTitle}>Mutter Bubble</Text>
          <View style={styles.homePreviewBadge}>
            <FlowBarsGlyph />
          </View>
        </View>

        <View style={styles.homePreviewPill}>
          <Text style={styles.homePreviewPillText}>ily so much</Text>
        </View>

        <View style={styles.homePreviewInput}>
          <Text style={styles.homePreviewInputText}>Message</Text>
        </View>

        <View style={styles.homeKeyboard}>
          <KeyboardRow letters="qwertyuiop" />
          <KeyboardRow letters="asdfghjkl" offset />
          <KeyboardRow letters="zxcvbnm" offset compact />
        </View>
      </View>
    </View>
  );
}

function CloseGlyph() {
  return (
    <View style={styles.closeGlyph}>
      <View style={[styles.closeBar, styles.closeBarOne]} />
      <View style={[styles.closeBar, styles.closeBarTwo]} />
    </View>
  );
}

function FlowBarsGlyph() {
  return (
    <View style={styles.flowBarsGlyph}>
      <View style={[styles.flowBar, styles.flowBarShort]} />
      <View style={[styles.flowBar, styles.flowBarTall]} />
      <View style={[styles.flowBar, styles.flowBarMid]} />
      <View style={[styles.flowBar, styles.flowBarShorter]} />
    </View>
  );
}

function KeyboardRow({ letters, offset = false, compact = false }) {
  return (
    <View
      style={[
        styles.keyboardRow,
        offset && styles.keyboardRowOffset,
        compact && styles.keyboardRowCompact,
      ]}
    >
      {letters.split("").map((letter) => (
        <View key={letter} style={styles.keyCap}>
          <Text style={styles.keyCapText}>{letter}</Text>
        </View>
      ))}
    </View>
  );
}

export function SegmentTabs({ tabs, activeKey, onChange }) {
  return (
    <View style={styles.segmentedWrap}>
      {tabs.map((tab, index) => {
        const active = tab.key === activeKey;
        return (
          <SoftTouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.segment,
              index < tabs.length - 1 && styles.segmentDivider,
              active && styles.segmentActive,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {tab.label}
            </Text>
          </SoftTouchableOpacity>
        );
      })}
    </View>
  );
}

export function StyleCard({ eyebrow, title, subtitle, preview }) {
  return (
    <View style={styles.styleCard}>
      <View style={styles.styleCardHeader}>
        <View style={styles.styleCardTitleBlock}>
          {eyebrow ? <Text style={styles.styleCardEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.styleCardTitle}>{title}</Text>
          <Text style={styles.styleCardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.previewBubble}>
        <View style={styles.previewAvatar}>
          <Text style={styles.previewAvatarText}>J</Text>
        </View>
        <Text style={styles.previewText}>{preview}</Text>
      </View>
    </View>
  );
}

export function BottomNav({ active, theme = "light", onHomePress, onStylePress }) {
  const darkTheme = theme === "dark";
  const navBackground = darkTheme ? "rgba(255, 255, 255, 0.62)" : "#f3ecdc";
  const navBorder = darkTheme ? "rgba(17, 17, 17, 0.08)" : "#ececec";
  const labelColor = "#6b6d75";
  const activeLabelColor = darkTheme ? "#25232a" : "#000000";
  const inactiveIconColor = darkTheme ? "#6b6d75" : "#4d4f58";
  const activeSlotColor = darkTheme ? "rgba(17, 17, 17, 0.08)" : "#e8e8e4";

  return (
    <View
      style={[
        styles.bottomNav,
        { backgroundColor: navBackground, borderTopColor: navBorder },
      ]}
    >
      <NavItem
        label="Home"
        active={active === "home"}
        onPress={onHomePress}
        activeSlotColor={activeSlotColor}
        labelColor={labelColor}
        activeLabelColor={activeLabelColor}
        icon={<HomeGlyph color={active === "home" ? activeLabelColor : inactiveIconColor} />}
      />
      <NavItem
        label="Mutter"
        active={active === "style"}
        onPress={onStylePress}
        activeSlotColor={activeSlotColor}
        labelColor={labelColor}
        activeLabelColor={activeLabelColor}
        icon={
          <Text
            style={[
              styles.styleGlyph,
              { color: active === "style" ? activeLabelColor : inactiveIconColor },
            ]}
          >
            Tt
          </Text>
        }
      />
    </View>
  );
}

function NavItem({ label, active, onPress, icon, activeSlotColor, labelColor, activeLabelColor }) {
  return (
    <SoftTouchableOpacity onPress={onPress} style={styles.navItem}>
      <View
        style={[
          styles.navIconSlot,
          { backgroundColor: active ? activeSlotColor : "transparent" },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          styles.navLabel,
          { color: active ? activeLabelColor : labelColor },
        ]}
      >
        {label}
      </Text>
    </SoftTouchableOpacity>
  );
}

export function AppChip({ type, accent }) {
  return (
    <View style={styles.appRing}>
      <View style={styles.appCore}>{renderAppGlyph(type, accent)}</View>
    </View>
  );
}

function renderAppGlyph(type, accent) {
  switch (type) {
    case "message":
      return <MessageGlyph color={accent} />;
    case "messenger":
      return <MessengerGlyph color={accent} />;
    case "whatsapp":
      return <WhatsAppGlyph color={accent} />;
    case "telegram":
      return <TelegramGlyph color={accent} />;
    case "slack":
      return <SlackGlyph />;
    case "teams":
      return <TeamsGlyph color={accent} />;
    case "gmail":
      return <GmailGlyph />;
    case "openai":
      return <OpenAIGlyph color={accent} />;
    case "outlook":
      return <OutlookGlyph color={accent} />;
    case "mail":
      return <MailGlyph color={accent} />;
    case "docs":
      return <DocsGlyph />;
    case "notes":
      return <NotesGlyph color={accent} />;
    default:
      return null;
  }
}

function HomeGlyph({ color }) {
  return (
    <View style={styles.homeGlyph}>
      <View style={[styles.homeRoof, { borderBottomColor: color }]} />
      <View style={[styles.homeBase, { borderColor: color }]} />
      <View style={[styles.homeDoor, { backgroundColor: color }]} />
    </View>
  );
}

export const styles = StyleSheet.create({
  welcomeLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  welcomeSafeInner: {
    flex: 1,
  },
  welcomeScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  welcomeLogoMark: {
    width: 34,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 10,
  },
  welcomeLogoBarShort: {
    width: 4,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  welcomeLogoBarTall: {
    width: 4,
    height: 32,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  welcomeLogoBarMid: {
    width: 4,
    height: 25,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  welcomeLogoText: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -1.2,
    color: "#ffffff",
  },
  welcomeTitle: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 30,
    lineHeight: 38,
    color: "#fff9eb",
  },
  welcomeScrollContent: {
    paddingBottom: 8,
  },
  welcomeExampleCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  welcomeExampleTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    marginBottom: 10,
  },
  welcomeExampleTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#141414",
  },
  welcomeExampleInput: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.72)",
  },
  welcomeExampleOutput: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#ffffff",
  },
  welcomeBody: {
    marginTop: 8,
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    color: "rgba(255, 255, 255, 0.92)",
  },
  welcomeFooter: {
    alignItems: "center",
  },
  welcomeDots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
  },
  welcomeDot: {
    width: 12,
    height: 12,
    marginHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  welcomeDotActive: {
    backgroundColor: "#ffffff",
  },
  welcomeButton: {
    width: "100%",
    minHeight: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
  welcomeButtonText: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  homeSafe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  homeScreen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 124,
  },
  homeContentFill: {
    flexGrow: 1,
  },
  homePermissionSlot: {
    marginTop: 52,
  },
  homePermissionSlotBottom: {
    marginTop: 24,
    flex: 1,
    minHeight: 0,
  },
  homeTopBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  homeMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f04f1f",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 48 }],
  },
  homeBrandWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 40 }],
  },
  homeTopSpacer: {
    width: 36,
    height: 36,
  },
  homeSlogan: {
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 34,
    marginTop: 24,
  },
  homeSloganTitle: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "left",
    color: "#ffffff",
  },
  homeSloganBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    color: "rgba(255, 255, 255, 0.82)",
  },
  homeBannerCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 106,
    borderRadius: 28,
    backgroundColor: "#000000",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  homeBannerTitle: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    color: "#ffffff",
  },
  homeBannerBody: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    color: "#ffffff",
  },
  homeBannerButton: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  homeBannerButtonDisabled: {
    opacity: 0.74,
  },
  homeBannerButtonText: {
    fontSize: 18,
    lineHeight: 20,
    color: "#000000",
  },
  homeDots: {
    marginTop: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  homeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#cfcfd3",
    marginHorizontal: 5,
  },
  homeDotActive: {
    backgroundColor: "#2f3138",
  },
  homeDictationCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  homeCloseButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#cfcfcf",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  homeDictationTitle: {
    marginTop: 8,
    fontSize: 32,
    lineHeight: 36,
    textAlign: "center",
    color: "#4d4750",
  },
  homeDictationBody: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    color: "#49484f",
  },
  homePreviewPanel: {
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 2,
    borderColor: "#f6f2db",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },
  homePreviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homePreviewTitle: {
    fontSize: 25,
    lineHeight: 28,
    color: "#dcc7f4",
  },
  homePreviewBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: "#dcc7f4",
    alignItems: "center",
    justifyContent: "center",
  },
  homePreviewPill: {
    width: 104,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#222222",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  homePreviewPillText: {
    fontSize: 12,
    lineHeight: 14,
    color: "#3f3f3f",
  },
  homePreviewInput: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#3f3f3f",
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  homePreviewInputText: {
    fontSize: 15,
    color: "#606060",
  },
  homeKeyboard: {
    marginTop: 14,
  },
  keyboardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  keyboardRowOffset: {
    paddingLeft: 12,
    paddingRight: 12,
  },
  keyboardRowCompact: {
    justifyContent: "flex-start",
  },
  keyCap: {
    width: 24,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  keyCapText: {
    fontSize: 11,
    lineHeight: 13,
    color: "#f0f0f0",
  },
  closeGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBar: {
    position: "absolute",
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  closeBarOne: {
    transform: [{ rotate: "45deg" }],
  },
  closeBarTwo: {
    transform: [{ rotate: "-45deg" }],
  },
  flowBarsGlyph: {
    width: 22,
    height: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  flowBar: {
    width: 2.2,
    backgroundColor: "#111111",
    borderRadius: 2,
  },
  flowBarShort: {
    height: 10,
  },
  flowBarTall: {
    height: 18,
  },
  flowBarMid: {
    height: 14,
  },
  flowBarShorter: {
    height: 9,
  },
  styleSafe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  styleScreen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  styleContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 140,
  },
  topBar: {
    height: 48,
    marginBottom: 42,
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f04f1f",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 40 }],
  },
  profileBadgeText: {
    fontSize: 16,
    lineHeight: 18,
    color: "#ffffff",
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 40 }],
  },
  segmentedWrap: {
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  segmentDivider: {
    borderRightWidth: 1,
    borderRightColor: "rgba(17, 17, 17, 0.08)",
  },
  segmentActive: {
    backgroundColor: "#25232a",
  },
  segmentText: {
    fontSize: 17,
    lineHeight: 20,
    color: "#4d4f58",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
    paddingLeft: 4,
  },
  appChipWrap: {
    marginRight: 0,
  },
  appChipOverlap: {
    marginLeft: -9,
  },
  appRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  appCore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    color: "rgba(255, 255, 255, 0.78)",
  },
  heroCard: {
    marginTop: 22,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 28,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: "#25232a",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    color: "#5c5763",
    textAlign: "center",
  },
  heroButton: {
    marginTop: 22,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#8a5cc2",
    alignItems: "center",
    justifyContent: "center",
  },
  heroButtonText: {
    color: "#f5f5f5",
    fontSize: 18,
    lineHeight: 20,
  },
  styleCard: {
    marginTop: 22,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  styleCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  styleCardTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  styleCardTitle: {
    fontSize: 28,
    lineHeight: 30,
    color: "#25232a",
  },
  styleCardEyebrow: {
    fontSize: 14,
    lineHeight: 18,
    color: "#77737f",
    marginBottom: 4,
  },
  styleCardSubtitle: {
    fontSize: 21,
    lineHeight: 24,
    color: "#25232a",
  },
  previewBubble: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#f1ebff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eccaf9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  previewAvatarText: {
    fontSize: 18,
    color: "#ffffff",
  },
  previewText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: "#2f2d34",
  },
  footerText: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
  },
  settingsSafe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  settingsContent: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 28,
  },
  settingsTopBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  settingsBackButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  settingsBackGlyph: {
    fontSize: 40,
    lineHeight: 40,
    color: "#202026",
    marginTop: -2,
  },
  settingsTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    lineHeight: 28,
    color: "#202026",
  },
  settingsTopSpacer: {
    width: 44,
    height: 44,
  },
  settingsSectionLabel: {
    marginBottom: 14,
    fontSize: 17,
    lineHeight: 20,
    color: "rgba(32, 32, 38, 0.6)",
    letterSpacing: 0,
  },
  settingsSectionSpacing: {
    marginTop: 28,
  },
  settingsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingsRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingsRowText: {
    flex: 1,
    paddingRight: 14,
  },
  settingsRowTitle: {
    fontSize: 21,
    lineHeight: 24,
    color: "#202026",
  },
  settingsRowSubtitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 21,
    color: "#7f7f86",
  },
  settingsChevron: {
    fontSize: 36,
    lineHeight: 36,
    color: "#1f1f24",
    fontWeight: "400",
    marginTop: -2,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  settingsToggleSpacer: {
    height: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  toggleRowText: {
    flex: 1,
    paddingRight: 18,
  },
  toggleRowTitle: {
    fontSize: 21,
    lineHeight: 24,
    color: "#202026",
  },
  toggleRowDescription: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: "#84848b",
  },
  toggleTrack: {
    width: 82,
    height: 40,
    borderRadius: 20,
    padding: 4,
    justifyContent: "center",
  },
  toggleTrackOn: {
    backgroundColor: "#743e99",
  },
  toggleTrackOff: {
    backgroundColor: "#efe3ff",
  },
  toggleThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  toggleThumbOff: {
    alignSelf: "flex-start",
  },
  settingsVersion: {
    marginTop: 30,
    fontSize: 16,
    lineHeight: 20,
    color: "rgba(32, 32, 38, 0.4)",
  },
  accountSafe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  accountContent: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 28,
  },
  accountTopBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  accountBackButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  accountBackGlyph: {
    fontSize: 40,
    lineHeight: 40,
    color: "#1f1f24",
    marginTop: -2,
  },
  accountTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 25,
    lineHeight: 28,
    color: "#1f1f24",
    paddingLeft: 8,
  },
  accountTopSpacer: {
    width: 44,
    height: 44,
  },
  accountProfileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  accountSignOutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    minHeight: 70,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  accountSignOutText: {
    fontSize: 19,
    lineHeight: 22,
    color: "#1f1f24",
  },
  editModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  editModalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  editModalCardWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  editModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#f8dfc1",
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: "#1c1c22",
    marginBottom: 18,
  },
  editFieldGroup: {
    marginBottom: 18,
  },
  editFieldLabel: {
    fontSize: 17,
    lineHeight: 20,
    color: "#8d5d07",
    marginBottom: 8,
  },
  editField: {
    height: 58,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#996312",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 18,
    fontSize: 19,
    color: "#1c1c22",
  },
  editModalActions: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editModalActionButton: {
    minWidth: 82,
    height: 42,
    marginLeft: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editModalActionText: {
    fontSize: 18,
    lineHeight: 20,
    color: "#1c1c22",
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  drawerScrimHitArea: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.26)",
  },
  drawerPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 10, height: 0 },
    elevation: 18,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 86,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  drawerProfileCard: {
    backgroundColor: "#f3f3f3",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
  },
  drawerAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#f04f1f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  drawerAvatarText: {
    fontSize: 50,
    lineHeight: 54,
    color: "#ffffff",
  },
  drawerName: {
    fontSize: 28,
    lineHeight: 32,
    color: "#1b1b21",
    textAlign: "center",
  },
  drawerPlanPill: {
    minWidth: 104,
    height: 44,
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#1f1f27",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerPlanText: {
    fontSize: 18,
    lineHeight: 20,
    color: "#1f1f27",
  },
  drawerMenuGroup: {
    paddingTop: 6,
  },
  drawerMenuItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
  },
  drawerMenuIcon: {
    width: 30,
    height: 30,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  drawerMenuLabel: {
    fontSize: 18,
    lineHeight: 22,
    color: "#19191f",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#e0e0e5",
    marginVertical: 12,
  },
  drawerIssueGlyph: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBubbleOutline: {
    width: 16,
    height: 11,
    borderRadius: 4,
    borderWidth: 1.8,
    borderColor: "#9a9aa2",
    backgroundColor: "transparent",
  },
  drawerBubbleTail: {
    position: "absolute",
    left: 6,
    bottom: 4,
    width: 5,
    height: 5,
    backgroundColor: "#9a9aa2",
    transform: [{ rotate: "45deg" }],
  },
  drawerIssueMark: {
    position: "absolute",
    top: 1,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 13,
    color: "#9a9aa2",
    fontWeight: "700",
  },
  drawerFeedbackGlyph: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerFeedbackLine: {
    position: "absolute",
    left: 5,
    top: 8,
    width: 8,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: "#9a9aa2",
  },
  drawerFeedbackLineShort: {
    position: "absolute",
    left: 5,
    top: 12,
    width: 5,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: "#9a9aa2",
  },
  drawerSettingsGlyph: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerSettingsRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: "#9a9aa2",
  },
  drawerSettingsCenter: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#9a9aa2",
  },
  drawerSettingsSpoke: {
    position: "absolute",
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: "#9a9aa2",
  },
  drawerSettingsSpokeTop: {
    top: 1,
    left: 11,
  },
  drawerSettingsSpokeRight: {
    top: 10,
    right: 1,
  },
  drawerSettingsSpokeBottom: {
    bottom: 1,
    left: 11,
  },
  drawerSettingsSpokeLeft: {
    top: 10,
    left: 1,
  },
  drawerAccountGlyph: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAccountHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#9a9aa2",
    marginBottom: 2,
  },
drawerAccountBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#9a9aa2",
  },
  drawerSignOutGlyph: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerSignOutDoor: {
    position: "absolute",
    left: 2,
    top: 5,
    width: 9,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.8,
    borderRightWidth: 0,
    borderColor: "#9a9aa2",
  },
  drawerSignOutShaft: {
    position: "absolute",
    left: 7,
    top: 11.5,
    width: 14,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: "#9a9aa2",
  },
  drawerSignOutTip: {
    position: "absolute",
    right: 1,
    top: 8.5,
    width: 5,
    height: 5,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    borderTopColor: "#9a9aa2",
    borderRightColor: "#9a9aa2",
    transform: [{ rotate: "45deg" }],
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    backgroundColor: "#f3ecdc",
    borderTopWidth: 1,
    borderTopColor: "#ececec",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconSlot: {
    width: 66,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    lineHeight: 14,
    color: "#6b6d75",
  },
  styleGlyph: {
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 0,
    color: "#4d4f58",
  },
  styleGlyphActive: {
    color: "#2f3138",
  },
  homeGlyph: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoof: {
    position: "absolute",
    top: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  homeBase: {
    position: "absolute",
    bottom: 4,
    width: 15,
    height: 9,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRadius: 2,
  },
  homeDoor: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 5,
    borderRadius: 1,
  },
});
