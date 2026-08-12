import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
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
import HomeRoute from "./screens/HomeScreen";
import StyleRoute from "./screens/StyleScreen";
import SettingsRoute from "./screens/SettingsScreen";
import AccountRoute from "./screens/AccountScreen";

export const SCREEN_WIDTH = Dimensions.get("window").width;
export const DRAWER_WIDTH = Math.min(336, Math.round(SCREEN_WIDTH * 0.84));
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

export const STYLE_TABS = [
  {
    key: "personal",
    label: "Personal",
    caption: "This style applies in consumer messengers",
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
    caption: "This style applies in workplace messengers",
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
    caption: "This style applies in all major email apps",
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
    caption: "This style applies in all other apps",
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

function MainTabs({ onOpenDrawer }) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavigatorTabBar {...props} />}
    >
      <Tab.Screen name={SCREENS.HOME}>
        {() => <HomeRoute onOpenDrawer={onOpenDrawer} />}
      </Tab.Screen>
      <Tab.Screen name={SCREENS.STYLE}>
        {() => <StyleRoute onOpenDrawer={onOpenDrawer} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bubble = useFloatingBubbleController();

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer ref={navigationRef}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="MainTabs">
                {() => <MainTabs onOpenDrawer={openDrawer} />}
              </RootStack.Screen>
              <RootStack.Screen name={SCREENS.SETTINGS}>
                {(props) => <SettingsRoute onBack={() => props.navigation.goBack()} />}
              </RootStack.Screen>
              <RootStack.Screen name={SCREENS.ACCOUNT}>
                {(props) => <AccountRoute onBack={() => props.navigation.goBack()} />}
              </RootStack.Screen>
            </RootStack.Navigator>
          </NavigationContainer>

          <GlobalDrawer
            visible={drawerOpen}
            onClose={closeDrawer}
            onOpenSettings={goToSettings}
            onOpenAccount={goToAccount}
            bubbleVisible={bubble.isShowing}
            bubbleBusy={bubble.isBusy}
            onToggleBubble={async () => {
              closeDrawer();
              await bubble.toggle();
            }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function GlobalDrawer({
  visible,
  onClose,
  onOpenSettings,
  onOpenAccount,
  bubbleVisible,
  bubbleBusy,
  onToggleBubble,
}) {
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerTranslate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.timing(drawerTranslate, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!drawerMounted) {
      return;
    }

    Animated.parallel([
      Animated.timing(drawerTranslate, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && isMountedRef.current) {
        setDrawerMounted(false);
      }
    });
  }, [visible, drawerMounted, drawerTranslate, scrimOpacity]);

  const handleAccountPress = () => {
    onClose();
    onOpenAccount();
  };
  const handleSettingsPress = () => {
    onClose();
    onOpenSettings();
  };
  const handleBubblePress = async () => {
    if (bubbleBusy) {
      return;
    }

    await onToggleBubble();
  };

  if (!drawerMounted) {
    return null;
  }

  return (
    <View style={styles.drawerLayer} pointerEvents="box-none">
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
              <Text style={styles.drawerAvatarText}>P</Text>
            </View>
            <Text style={styles.drawerName}>Pranshu</Text>
            <Text style={styles.drawerEmail}>pranshukr006@gmail.com</Text>
            <SoftTouchableOpacity onPress={handleAccountPress} style={styles.drawerPlanPill}>
              <Text style={styles.drawerPlanText}>Basic</Text>
            </SoftTouchableOpacity>
          </View>

          <View style={styles.drawerMenuGroup}>
            <DrawerMenuItem icon="issue" label="Report an issue" onPress={onClose} />
            <DrawerMenuItem icon="feedback" label="Share feedback" onPress={onClose} />

            <View style={styles.drawerDivider} />

            <DrawerMenuItem icon="settings" label="Settings" onPress={handleSettingsPress} />
              <DrawerMenuItem
                icon="bubble"
                label={bubbleBusy ? "Bubble..." : bubbleVisible ? "Hide bubble" : "Show bubble"}
                onPress={handleBubblePress}
                disabled={bubbleBusy}
              />
              <DrawerMenuItem icon="account" label="Account" onPress={handleAccountPress} />
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

export function AccountOptionRow({ label, onPress }) {
  return (
    <SoftTouchableOpacity onPress={onPress} style={styles.accountOptionRow}>
      <Text style={styles.accountOptionLabel}>{label}</Text>
      <Text style={styles.accountOptionGlyph}>{"\u2197"}</Text>
    </SoftTouchableOpacity>
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

export function SettingsRow({ title, subtitle, showChevron = false }) {
  return (
    <SoftTouchableOpacity style={styles.settingsRow}>
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

export function HomeBannerCard() {
  return (
    <View style={styles.homeBannerCard}>
      <Text style={styles.homeBannerTitle}>Keep Mutter running</Text>
      <Text style={styles.homeBannerBody}>
        This helps Mutter stay ready when you need it. You can change this anytime.
      </Text>
      <SoftTouchableOpacity style={styles.homeBannerButton}>
        <Text style={styles.homeBannerButtonText}>Allow</Text>
      </SoftTouchableOpacity>
    </View>
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
        Open any app -> any text box -> tap Flow Bubble -> speak
      </Text>

      <View style={styles.homePreviewPanel}>
        <View style={styles.homePreviewTopRow}>
          <Text style={styles.homePreviewTitle}>Flow Bubble</Text>
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

export function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <View style={[styles.brandBar, styles.brandBarTall]} />
      <View style={[styles.brandBar, styles.brandBarShort]} />
      <View style={[styles.brandBar, styles.brandBarMid]} />
      <View style={[styles.brandBar, styles.brandBarShorter]} />
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

export function StyleCard({ title, subtitle, preview }) {
  return (
    <View style={styles.styleCard}>
      <View style={styles.styleCardHeader}>
        <View style={styles.styleCardTitleBlock}>
          <Text style={styles.styleCardTitle}>{title}</Text>
          <Text style={styles.styleCardSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.chevron}>{"\u203A"}</Text>
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
  const navBackground = darkTheme ? "#000000" : "#f9f9f9";
  const navBorder = darkTheme ? "#111111" : "#ececec";
  const labelColor = darkTheme ? "#f9f9f9" : "#6b6d75";
  const activeLabelColor = darkTheme ? "#f9f9f9" : "#32343b";
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
        label="Style"
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
    backgroundColor: "#f5f5f5",
  },
  homeScreen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  homeContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 124,
  },
  homeTopBar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  homeMenuButton: {
    width: 28,
    height: 28,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  homeBrandWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  homeTopSpacer: {
    width: 28,
    height: 28,
  },
  homeBannerCard: {
    borderRadius: 28,
    backgroundColor: "#ffd59f",
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: "center",
  },
  homeBannerTitle: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    color: "#4d4750",
    fontFamily: "serif",
  },
  homeBannerBody: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    color: "#4d4750",
  },
  homeBannerButton: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#4b4752",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  homeBannerButtonText: {
    fontSize: 18,
    lineHeight: 20,
    color: "#f4f4f2",
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
    fontFamily: "serif",
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
    fontWeight: "700",
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
    backgroundColor: "#f5f5f0",
  },
  styleScreen: {
    flex: 1,
    backgroundColor: "#f5f5f0",
  },
  styleContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 124,
  },
  topBar: {
    height: 48,
    marginBottom: 18,
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    left: 0,
    top: 3,
    width: 28,
    height: 28,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  menuLine: {
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#222222",
    marginVertical: 1.3,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    width: 18,
    height: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginRight: 8,
  },
  brandBar: {
    width: 2.2,
    borderRadius: 2,
    backgroundColor: "#111111",
  },
  brandBarTall: {
    height: 17,
  },
  brandBarShort: {
    height: 10,
  },
  brandBarMid: {
    height: 14,
  },
  brandBarShorter: {
    height: 9,
  },
  brandText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: "#111111",
  },
  segmentedWrap: {
    height: 66,
    borderRadius: 33,
    backgroundColor: "#e4e2df",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d7d5d2",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  segmentDivider: {
    borderRightWidth: 1,
    borderRightColor: "#d7d5d2",
  },
  segmentActive: {
    backgroundColor: "#d8d6d2",
  },
  segmentText: {
    fontSize: 17,
    lineHeight: 20,
    color: "#4d4e56",
  },
  segmentTextActive: {
    color: "#141418",
    fontWeight: "600",
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
    fontWeight: "700",
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
    backgroundColor: "#ffd59f",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 28,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: "#4d4750",
    textAlign: "center",
    fontFamily: "serif",
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    color: "#4f4b50",
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
    backgroundColor: "#ffffff",
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
    color: "#2b2b30",
    fontWeight: "700",
  },
  styleCardSubtitle: {
    fontSize: 21,
    lineHeight: 24,
    color: "#2b2b30",
  },
  chevron: {
    fontSize: 38,
    lineHeight: 38,
    color: "#57555d",
    marginTop: -2,
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
    backgroundColor: "#f5f5f5",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
  },
  accountSafe: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    fontWeight: "600",
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
  accountOptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  accountOptionRow: {
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountOptionLabel: {
    flex: 1,
    paddingRight: 12,
    fontSize: 19,
    lineHeight: 22,
    color: "#1f1f24",
  },
  accountOptionGlyph: {
    fontSize: 21,
    lineHeight: 21,
    color: "#8d8d93",
  },
  accountDivider: {
    height: 1,
    backgroundColor: "#ececec",
    marginLeft: 18,
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
    fontWeight: "500",
  },
  drawerName: {
    fontSize: 28,
    lineHeight: 32,
    color: "#1b1b21",
    fontWeight: "700",
  },
  drawerEmail: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 22,
    color: "#74747b",
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
    fontWeight: "500",
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
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    backgroundColor: "#f9f9f9",
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
    fontWeight: "700",
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
