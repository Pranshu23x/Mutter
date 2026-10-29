import { useCallback, useEffect, useState } from "react";
import { AppState, Dimensions, PixelRatio, Platform } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FloatingBubble from "@increase21/rn-floating-bubble";

const BUBBLE_SIZE_DP = 44;
// Default landing spot for the bubble: docked to the right edge near the top of the
// screen (clear of the keyboard, which covers the bottom when a text field is focused).
// The native side snaps it flush to the edge.
const BUBBLE_TOP_GAP_DP = 140; // below the status bar and most app headers
const BUBBLE_OPACITY_KEY = "@mutter/bubble-opacity";
const BUBBLE_ENABLED_KEY = "@mutter/bubble-enabled";
const DEFAULT_BUBBLE_OPACITY = 0.9;
const DEFAULT_BUBBLE_OPTIONS = {
  size: BUBBLE_SIZE_DP,
  color: 0xFF0A0A0A,
  useLauncherIcon: true,
};
// Just the dotted "mt" mark on a transparent background; the native bubble tints it
// charcoal and draws it inside its own lavender squircle.
const BUBBLE_ICON_ASSET = require("./assets/mutter-bubble-mark.png");
const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

let bubbleIconPromise;

function getTopRightBubbleX() {
  const windowWidthDp = Dimensions.get("window").width;
  return Math.round((windowWidthDp - BUBBLE_SIZE_DP) * PixelRatio.get());
}

function getTopBubbleY() {
  return Math.round(BUBBLE_TOP_GAP_DP * PixelRatio.get());
}

async function getBubbleIconBase64() {
  if (!bubbleIconPromise) {
    bubbleIconPromise = (async () => {
      const asset = Asset.fromModule(BUBBLE_ICON_ASSET);
      await asset.downloadAsync();
      return FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    })();
  }

  try {
    return await bubbleIconPromise;
  } catch (error) {
    bubbleIconPromise = undefined;
    throw error;
  }
}

async function buildBubbleOptions(opacity) {
  const options = {
    ...DEFAULT_BUBBLE_OPTIONS,
    initialX: getTopRightBubbleX(),
    initialY: getTopBubbleY(),
    opacity,
  };

  try {
    options.icon = await getBubbleIconBase64();
    options.useLauncherIcon = false;
  } catch {
    // Fall back to the configured launcher icon if the bundled asset cannot be read.
  }

  return options;
}

export function useFloatingBubbleController() {
  const [isShowing, setIsShowing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [opacity, setOpacityState] = useState(DEFAULT_BUBBLE_OPACITY);
  const [enabled, setEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState("checking");
  const [textInputPermissionState, setTextInputPermissionState] = useState("checking");

  useEffect(() => {
    (async () => {
      const [values, hasOverlayPermission, hasTextInputPermission] = await Promise.all([
        AsyncStorage.multiGet([BUBBLE_OPACITY_KEY, BUBBLE_ENABLED_KEY]),
        FloatingBubble.hasPermission(),
        FloatingBubble.hasTextInputPermission(),
      ]);
      const storedOpacity = values[0][1];
      const storedEnabled = values[1][1];
      const parsedOpacity = Number(storedOpacity);
      if (storedOpacity !== null && Number.isFinite(parsedOpacity)) {
        setOpacityState(Math.min(1, Math.max(0.25, parsedOpacity)));
      }
      setPermissionState(hasOverlayPermission ? "granted" : "denied");
      setTextInputPermissionState(hasTextInputPermission ? "granted" : "denied");
      const shouldEnable = hasOverlayPermission && storedEnabled === "true";
      setEnabled(shouldEnable);
      if (!shouldEnable || !hasTextInputPermission) {
        await FloatingBubble.hide().catch(() => {});
        setIsShowing(false);
      }
    })().catch(() => setPermissionState("denied"));
  }, []);

  const refreshPermission = useCallback(async () => {
    if (Platform.OS !== "android") {
      setPermissionState("unavailable");
      return false;
    }

    const granted = await FloatingBubble.hasPermission();
    setPermissionState(granted ? "granted" : "denied");
    if (!granted) {
      setEnabled(false);
    }
    return granted;
  }, []);

  const refreshTextInputPermission = useCallback(async () => {
    if (Platform.OS !== "android") {
      setTextInputPermissionState("unavailable");
      return false;
    }

    const granted = await FloatingBubble.hasTextInputPermission();
    setTextInputPermissionState(granted ? "granted" : "denied");
    return granted;
  }, []);

  const refresh = useCallback(async () => {
    if (Platform.OS !== "android") {
      setIsShowing(false);
      return false;
    }

    try {
      const showing = await FloatingBubble.isShowing();
      setIsShowing(showing);
      return showing;
    } catch {
      setIsShowing(false);
      return false;
    }
  }, []);

  const show = useCallback(async (requestedOpacity = opacity) => {
    if (Platform.OS !== "android") {
      return false;
    }

    setIsBusy(true);
    try {
      const hasPermission = await FloatingBubble.hasPermission();
      const granted = hasPermission || (await FloatingBubble.requestPermission());
      if (!granted) {
        return false;
      }

      const options = await buildBubbleOptions(requestedOpacity);
      await FloatingBubble.configure(options);

      if (await FloatingBubble.isShowing()) {
        setIsShowing(true);
        return true;
      }

      await FloatingBubble.show(options);
      setIsShowing(true);
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [opacity]);

  useEffect(() => {
    if (!enabled || permissionState !== "granted") {
      return;
    }

    buildBubbleOptions(opacity)
      .then((options) => FloatingBubble.configure(options))
      .catch(() => {});
  }, [enabled, opacity, permissionState]);

  const setOpacity = useCallback(async (nextOpacity) => {
    const nextValue = Math.min(1, Math.max(0.25, Number(nextOpacity)));
    if (!Number.isFinite(nextValue)) {
      return;
    }

    setOpacityState(nextValue);
    await AsyncStorage.setItem(BUBBLE_OPACITY_KEY, String(nextValue));

    if (isShowing) {
      await show(nextValue);
    }
  }, [isShowing, show]);

  const hide = useCallback(async () => {
    if (Platform.OS !== "android") {
      return false;
    }

    setIsBusy(true);
    try {
      await FloatingBubble.hide();
      setIsShowing(false);
      return true;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const configureVoiceSession = useCallback(async (baseUrl, token, persona = "Work") => {
    if (Platform.OS !== "android" || !baseUrl || !token) {
      return false;
    }
    await FloatingBubble.configureVoiceSession(baseUrl, token, persona);
    return true;
  }, []);

  // Overlay and text-input are two distinct Android permissions granted from two
  // distinct Settings screens — kept as separate functions so each onboarding step can
  // trigger only its own permission, instead of one tap silently cascading into both.
  // Neither of these makes the bubble visible on its own — see activateBubble below,
  // which is only called once the whole onboarding flow is actually done. Otherwise the
  // bubble would pop up after just the overlay step, before text-input is even asked for.
  // Each opens its Settings page and returns. The real state is re-read when the user
  // comes back (the AppState listener below), so nothing polls or holds the button in
  // a "waiting" state while they're away, and returning without granting makes the
  // button usable again straight away.
  const enableOverlay = useCallback(async () => {
    if (Platform.OS !== "android") {
      return false;
    }

    if (await FloatingBubble.hasPermission()) {
      setPermissionState("granted");
      return true;
    }
    setPermissionState("requesting");
    // Resolves when the user comes back from Settings; the grant can land a moment
    // after the app resumes, so re-check briefly before settling on the answer.
    let granted = await FloatingBubble.requestPermission().catch(() => false);
    for (let attempt = 0; attempt < 3 && !granted; attempt += 1) {
      await wait(300);
      granted = await FloatingBubble.hasPermission();
    }
    setPermissionState(granted ? "granted" : "denied");
    return granted;
  }, []);

  const requestTextInputPermission = useCallback(async () => {
    if (Platform.OS !== "android") {
      return false;
    }

    if (await FloatingBubble.hasTextInputPermission()) {
      setTextInputPermissionState("granted");
      return true;
    }
    setTextInputPermissionState("requesting");
    await FloatingBubble.requestTextInputPermission();
    return false;
  }, []);

  // Sideloaded installs on Android 13+ must "Allow restricted settings" in App info
  // before the accessibility toggle works; Play Store installs never need this.
  const [needsRestrictedUnlock, setNeedsRestrictedUnlock] = useState(false);
  useEffect(() => {
    FloatingBubble.needsRestrictedSettingsUnlock?.()
      .then((value) => setNeedsRestrictedUnlock(Boolean(value)))
      .catch(() => {});
  }, []);

  // Actually shows the bubble — call this once, after the whole permission sequence is
  // finished (or skipped), not from the individual permission steps themselves.
  const activateBubble = useCallback(async () => {
    if (Platform.OS !== "android") {
      return false;
    }

    const granted = await FloatingBubble.hasPermission();
    if (!granted) {
      setPermissionState("denied");
      setEnabled(false);
      await AsyncStorage.removeItem(BUBBLE_ENABLED_KEY);
      return false;
    }

    setIsBusy(true);
    try {
      const options = await buildBubbleOptions(opacity);
      await FloatingBubble.configure(options);
      setPermissionState("granted");
      await AsyncStorage.setItem(BUBBLE_ENABLED_KEY, "true");
      setEnabled(true);
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [opacity]);

  // Combined convenience path for call sites that still want "grant whatever's left in
  // one go" (e.g. HomeBannerCard's single catch-all button) — the onboarding wizard
  // calls enableOverlay/requestTextInputPermission/activateBubble separately instead.
  const enable = useCallback(async () => {
    const overlayGranted = await enableOverlay();
    if (!overlayGranted) {
      return false;
    }
    await requestTextInputPermission();
    return activateBubble();
  }, [enableOverlay, requestTextInputPermission, activateBubble]);

  useEffect(() => {
    const handleAppState = async (state) => {
      if (state === "active") {
        await Promise.all([
          refreshPermission(),
          refreshTextInputPermission(),
          refresh(),
        ]);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [refresh, refreshPermission, refreshTextInputPermission]);

  return {
    enable,
    enableOverlay,
    requestTextInputPermission,
    activateBubble,
    enabled,
    hide,
    configureVoiceSession,
    isBusy,
    isShowing,
    needsRestrictedUnlock,
    opacity,
    permissionState,
    refresh,
    refreshPermission,
    refreshTextInputPermission,
    show,
    setOpacity,
    textInputPermissionState,
  };
}
