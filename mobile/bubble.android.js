import { useCallback, useEffect, useState } from "react";
import { AppState, Dimensions, PixelRatio, Platform } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FloatingBubble from "@increase21/rn-floating-bubble";

const BUBBLE_SIZE_DP = 44;
const BUBBLE_BOTTOM_GAP_DP = 96;
const BUBBLE_OPACITY_KEY = "@mutter/bubble-opacity";
const BUBBLE_ENABLED_KEY = "@mutter/bubble-enabled";
const DEFAULT_BUBBLE_OPACITY = 0.9;
const DEFAULT_BUBBLE_OPTIONS = {
  size: BUBBLE_SIZE_DP,
  color: 0xFF0A0A0A,
  initialX: Math.round(16 * PixelRatio.get()),
  initialY: 0,
  useLauncherIcon: true,
};
const BUBBLE_ICON_ASSET = require("./assets/mutter-bubble-logo-dark.png");
const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

let bubbleIconPromise;

function getBottomBubbleY() {
  const windowHeightDp = Dimensions.get("window").height;
  return Math.max(
    0,
    Math.round(
      (windowHeightDp - BUBBLE_BOTTOM_GAP_DP - BUBBLE_SIZE_DP) * PixelRatio.get()
    )
  );
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
    initialY: getBottomBubbleY(),
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

  const enable = useCallback(async () => {
    if (Platform.OS !== "android") {
      return false;
    }

    setIsBusy(true);
    setPermissionState("requesting");
    try {
      let granted = await FloatingBubble.hasPermission();
      if (!granted) {
        await FloatingBubble.requestPermission();

        // Android returns from Settings asynchronously; verify the real state
        // instead of trusting the settings activity result.
        for (let attempt = 0; attempt < 5 && !granted; attempt += 1) {
          await wait(250);
          granted = await FloatingBubble.hasPermission();
        }
      }

      if (!granted) {
        setPermissionState("denied");
        setEnabled(false);
        await AsyncStorage.removeItem(BUBBLE_ENABLED_KEY);
        return false;
      }

      const options = await buildBubbleOptions(opacity);
      await FloatingBubble.configure(options);
      setPermissionState("granted");
      await AsyncStorage.setItem(BUBBLE_ENABLED_KEY, "true");
      setEnabled(true);

      const hasTextInputPermission = await FloatingBubble.hasTextInputPermission();
      setTextInputPermissionState(hasTextInputPermission ? "granted" : "denied");
      if (!hasTextInputPermission) {
        setTextInputPermissionState("requesting");
        await FloatingBubble.requestTextInputPermission();
      }
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [opacity]);

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
    enabled,
    hide,
    configureVoiceSession,
    isBusy,
    isShowing,
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
