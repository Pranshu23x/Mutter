import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  PermissionsAndroid,
  Platform,
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
import { AuthProvider, useAuth } from "./auth/AuthContext";
import BrandMark from "./components/BrandMark";
import * as WebBrowser from "expo-web-browser";

export { BrandMark };

export const SCREEN_WIDTH = Dimensions.get("window").width;
export const DRAWER_WIDTH = Math.min(336, Math.round(SCREEN_WIDTH * 0.84));
const MICROPHONE_PERMISSION_REQUESTED_KEY = "@mutter/microphone-permission-requested";
const VOICE_PERSONA_KEY = "@mutter/voice-persona";
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

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
      theme="light"
      onHomePress={() => navigation.navigate(SCREENS.HOME)}
      onStylePress={() => navigation.navigate(SCREENS.STYLE)}
    />
  );
}

function MainTabs({
  onOpenProfile,
  onStartPersonalization,
  onPersonaChange,
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
            profileLetter={profileLetter}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { token, email, signOut, loading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plan, setPlan] = useState({ plan: "free", status: null });
  const [voicePersona, setVoicePersona] = useState("Personal");
  const [microphonePermissionState, setMicrophonePermissionState] = useState("checking");
  const bubble = useFloatingBubbleController();
  const startupPermissionsRequested = useRef(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/payments/subs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().catch(() => ({})))
      .then(setPlan)
      .catch(() => {});
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

  const planLabel =
    plan.plan === "pro" && plan.status === "active"
      ? "Pro"
      : plan.status === "authenticated"
        ? "Payment confirmed"
        : "Free";
  const profileLetter = (email || "M").trim().charAt(0).toUpperCase() || "M";
  const startCheckout = async (cycle) => {
    const res = await fetch(`${API_BASE_URL}/api/payments/create-subs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ billing_cycle: cycle }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to start subscription");
    }

    const url = `${API_BASE_URL}/checkout.html?subscription_id=${data.subscription_id}&key=${data.razorpay_key_id}&email=${encodeURIComponent(
      email || ""
    )}&cycle=${cycle}`;
    await WebBrowser.openBrowserAsync(url);
  };
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

  useEffect(() => {
    if (!token || loading || startupPermissionsRequested.current) {
      return;
    }

    startupPermissionsRequested.current = true;
    let active = true;

    (async () => {
      if (Platform.OS === "android") {
        const hasMicrophonePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        const microphonePromptWasShown = await AsyncStorage.getItem(
          MICROPHONE_PERMISSION_REQUESTED_KEY
        );

        if (hasMicrophonePermission) {
          setMicrophonePermissionState("granted");
        } else if (microphonePromptWasShown === "true") {
          setMicrophonePermissionState("denied");
        } else {
          setMicrophonePermissionState("requesting");
          await AsyncStorage.setItem(MICROPHONE_PERMISSION_REQUESTED_KEY, "true");
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
        }
      }

      if (!active) {
        return;
      }

      try {
        await bubble.enable();
      } catch {
        await bubble.refreshPermission().catch(() => {});
      }
    })();

    return () => {
      active = false;
    };
  }, [bubble.enable, bubble.refreshPermission, loading, token]);

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: "#f3ecdc", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#111111" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!token) {
    return <AuthScreen />;
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
                  <AccountRoute
                    onBack={() => props.navigation.goBack()}
                    onUpgrade={startCheckout}
                  />
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

  return (
    <AnimatedTouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }], opacity }]}
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
      <Text style={styles.homeBannerTitle}>Allow permissions</Text>
      <Text style={styles.homeBannerBody}>
        Allow overlay and text-input access so you can speak naturally and turn your thoughts into English in any chat.
      </Text>
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
  const navBackground = darkTheme ? "#000000" : "#f3ecdc";
  const navBorder = darkTheme ? "#111111" : "#ececec";
  const labelColor = darkTheme ? "#f9f9f9" : "#6b6d75";
  const activeLabelColor = darkTheme ? "#f9f9f9" : "#000000";
  const inactiveIconColor = darkTheme ? "#f9f9f9" : "#4d4f58";
  const activeSlotColor = darkTheme ? "rgba(249,249,249,0.12)" : "#e8e8e4";

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
      return <Text style={[styles.smallLetter, { color: accent }]}>M</Text>;
    case "whatsapp":
      return <Text style={[styles.smallLetter, { color: accent }]}>W</Text>;
    case "telegram":
      return <TelegramGlyph color={accent} />;
    case "slack":
      return <SlackGlyph />;
    case "teams":
      return <Text style={[styles.smallLetter, { color: accent }]}>T</Text>;
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
      return <NotesGlyph />;
    default:
      return null;
  }
}

function MessageGlyph({ color }) {
  return (
    <View style={styles.messageGlyph}>
      <View style={[styles.messageBody, { borderColor: color }]} />
      <View style={[styles.messageTail, { backgroundColor: color }]} />
    </View>
  );
}

function TelegramGlyph({ color }) {
  return <View style={[styles.telegramGlyph, { borderLeftColor: color }]} />;
}

function SlackGlyph() {
  return (
    <View style={styles.slackGlyph}>
      <View style={[styles.slackBar, { backgroundColor: "#e01e5a" }]} />
      <View style={[styles.slackBar, { backgroundColor: "#36c5f0" }]} />
      <View style={[styles.slackBar, { backgroundColor: "#2eb67d" }]} />
      <View style={[styles.slackBar, { backgroundColor: "#ecb22e" }]} />
    </View>
  );
}

function GmailGlyph() {
  return (
    <View style={styles.gmailGlyph}>
      <View style={[styles.gmailBar, { backgroundColor: "#ea4335" }]} />
      <View style={[styles.gmailBar, { backgroundColor: "#fbbc05" }]} />
      <View style={[styles.gmailBar, { backgroundColor: "#34a853" }]} />
      <View style={[styles.gmailBar, { backgroundColor: "#4285f4" }]} />
    </View>
  );
}

function OpenAIGlyph({ color }) {
  return (
    <View style={styles.openAiGlyph}>
      <View style={[styles.openAiPetal, styles.openAiPetal1, { backgroundColor: color }]} />
      <View style={[styles.openAiPetal, styles.openAiPetal2, { backgroundColor: color }]} />
      <View style={[styles.openAiPetal, styles.openAiPetal3, { backgroundColor: color }]} />
      <View style={[styles.openAiPetal, styles.openAiPetal4, { backgroundColor: color }]} />
      <View style={[styles.openAiPetal, styles.openAiPetal5, { backgroundColor: color }]} />
      <View style={[styles.openAiPetal, styles.openAiPetal6, { backgroundColor: color }]} />
      <View style={[styles.openAiCenter, { backgroundColor: color === "#ffffff" ? "#111111" : "#ffffff" }]} />
    </View>
  );
}

function OutlookGlyph({ color }) {
  return (
    <View style={styles.outlookGlyph}>
      <View style={[styles.outlookPanel, { borderColor: color }]} />
      <View style={[styles.outlookFold, { borderTopColor: color }]} />
      <View style={[styles.outlookLine, { backgroundColor: color }]} />
    </View>
  );
}

function MailGlyph({ color }) {
  return (
    <View style={styles.mailGlyph}>
      <View style={[styles.mailEnvelope, { borderColor: color }]} />
      <View style={[styles.mailFlapLeft, { backgroundColor: color }]} />
      <View style={[styles.mailFlapRight, { backgroundColor: color }]} />
    </View>
  );
}

function DocsGlyph() {
  return (
    <View style={styles.docsGlyph}>
      <View style={styles.docsSheet} />
      <View style={styles.docsFold} />
      <View style={styles.docsLine} />
      <View style={styles.docsLineSecond} />
      <View style={styles.docsLineThird} />
    </View>
  );
}

function NotesGlyph() {
  return (
    <View style={styles.notesGlyph}>
      <View style={styles.notesSheet} />
      <View style={styles.notesHeader} />
      <View style={styles.notesLine} />
      <View style={styles.notesLineSecond} />
    </View>
  );
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
  homeSafe: {
    flex: 1,
    backgroundColor: "#f3ecdc",
  },
  homeScreen: {
    flex: 1,
    backgroundColor: "#f3ecdc",
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
    transform: [{ translateY: 40 }],
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
  },
  homeSloganTitle: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "left",
    color: "#111111",
  },
  homeSloganBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    color: "#111111",
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
    backgroundColor: "#f3ecdc",
  },
  styleScreen: {
    flex: 1,
    backgroundColor: "#f3ecdc",
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
    backgroundColor: "#000000",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#000000",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  segmentDivider: {
    borderRightWidth: 1,
    borderRightColor: "#333333",
  },
  segmentActive: {
    backgroundColor: "#222222",
  },
  segmentText: {
    fontSize: 17,
    lineHeight: 20,
    color: "#ffffff",
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
  smallLetter: {
    fontSize: 17,
    lineHeight: 19,
  },
  messageGlyph: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBody: {
    width: 16,
    height: 12,
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  messageTail: {
    position: "absolute",
    left: 4,
    bottom: 2,
    width: 5,
    height: 5,
    transform: [{ rotate: "45deg" }],
  },
  telegramGlyph: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#2fa5f4",
    marginLeft: 3,
  },
  slackGlyph: {
    width: 20,
    height: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "center",
  },
  slackBar: {
    width: 6,
    height: 6,
    borderRadius: 2,
    margin: 1.2,
  },
  gmailGlyph: {
    width: 20,
    height: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 1,
  },
  gmailBar: {
    width: 3.4,
    height: 13,
    borderRadius: 1.6,
  },
  openAiGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  openAiPetal: {
    position: "absolute",
    width: 6,
    height: 10,
    borderRadius: 4,
  },
  openAiPetal1: { top: 1 },
  openAiPetal2: { top: 5, left: 10, transform: [{ rotate: "60deg" }] },
  openAiPetal3: { top: 11, left: 10, transform: [{ rotate: "120deg" }] },
  openAiPetal4: { top: 13, transform: [{ rotate: "180deg" }] },
  openAiPetal5: { top: 11, left: 0, transform: [{ rotate: "240deg" }] },
  openAiPetal6: { top: 5, left: 0, transform: [{ rotate: "300deg" }] },
  openAiCenter: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: "absolute",
  },
  outlookGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  outlookPanel: {
    width: 18,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.8,
    backgroundColor: "#ffffff",
  },
  outlookFold: {
    position: "absolute",
    right: 2,
    top: 3,
    width: 8,
    height: 8,
    borderTopWidth: 7,
    borderLeftWidth: 7,
    borderTopColor: "#ffffff",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  outlookLine: {
    position: "absolute",
    left: 4,
    bottom: 5,
    width: 12,
    height: 1.5,
    borderRadius: 1,
  },
  mailGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mailEnvelope: {
    width: 18,
    height: 13,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: "#ffffff",
  },
  mailFlapLeft: {
    position: "absolute",
    left: 4,
    top: 6,
    width: 8,
    height: 2,
    transform: [{ rotate: "34deg" }],
  },
  mailFlapRight: {
    position: "absolute",
    right: 4,
    top: 6,
    width: 8,
    height: 2,
    transform: [{ rotate: "-34deg" }],
  },
  docsGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  docsSheet: {
    width: 16,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#4285f4",
  },
  docsFold: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderTopColor: "#ffffff",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  docsLine: {
    position: "absolute",
    left: 5,
    top: 8,
    width: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  docsLineSecond: {
    position: "absolute",
    left: 5,
    top: 11,
    width: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  docsLineThird: {
    position: "absolute",
    left: 5,
    top: 14,
    width: 7,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  notesGlyph: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notesSheet: {
    width: 16,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
  notesHeader: {
    position: "absolute",
    top: 1,
    width: 16,
    height: 5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: "#f3cf4f",
  },
  notesLine: {
    position: "absolute",
    left: 4,
    top: 9,
    width: 9,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#d5d5d5",
  },
  notesLineSecond: {
    position: "absolute",
    left: 4,
    top: 12,
    width: 9,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#d5d5d5",
  },
  caption: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    color: "#8e8a90",
  },
  heroCard: {
    marginTop: 22,
    backgroundColor: "#f1ebff",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 28,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: "#2b2b30",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    color: "#2b2b30",
    textAlign: "center",
  },
  heroButton: {
    marginTop: 22,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#4b4752",
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
    backgroundColor: "#000000",
    borderRadius: 18,
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
    color: "#ffffff",
  },
  styleCardEyebrow: {
    fontSize: 14,
    lineHeight: 18,
    color: "#bdbdbd",
    marginBottom: 4,
  },
  styleCardSubtitle: {
    fontSize: 21,
    lineHeight: 24,
    color: "#ffffff",
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
    color: "#8e8e91",
  },
  settingsSafe: {
    flex: 1,
    backgroundColor: "#f3ecdc",
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
    color: "#1a1a1f",
    marginTop: -2,
  },
  settingsTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    lineHeight: 28,
    color: "#1b1b1f",
  },
  settingsTopSpacer: {
    width: 44,
    height: 44,
  },
  settingsSectionLabel: {
    marginBottom: 14,
    fontSize: 17,
    lineHeight: 20,
    color: "#7f7f86",
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
    color: "#8d8d93",
  },
  accountSafe: {
    flex: 1,
    backgroundColor: "#f3ecdc",
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
    color: "#1a1a1f",
    marginTop: -2,
  },
  accountTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 25,
    lineHeight: 28,
    color: "#1b1b1f",
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
