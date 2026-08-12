import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import FloatingBubble from "@increase21/rn-floating-bubble";

const BUBBLE_ICON =
  "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAQgSURBVHhe7Z0hbxRRFIWRldQh+QlIZH8CshKJBEGCJBgkEkkwIPEYJHJmGtKdVSsrNzvTBLnkLWAue8NJX9+8uZ3vJJ9qTvb23LMz86ai9+4hhBBCCCGEEEIIIYQQQgghhNCNdNntHq+a8WzV7J6uuvE1iKS8DrmNZzbT2Sstvb8YP/TduO27cQ95rNrhZ98Nn/tmeGKznpV+/Lh+sO7GL/YXgNtk+LZurh/Z7Kvr8K1vh6t/B4bbJl0RLtvx3O6gmtJ9yg55V/n08ev+5Ys3Lunn1lOKWZRg1WwfLumbn5Z8enrqkn5uPaVIV4Lqt4Ol3fPnVIDfDI3dyWRa0qX/L/MrwLhPR0a7m0l0OJocGeguM8cC9O343e6muDab/cnv8+mRge4wsyzA4SqwfWh3VFSHY9+RQe46cy3A5CeC9FbKDrEE5lqAvtk9tzsqqvSB/wwRgNxz/FwLkP5+YHdUVOkD7RARyF1grr8UFEAkd4G5/lJQAJHcBeb6S0EBRHIXmOsvBQUQyV1grr8UFEAkd4G5/lJQAJHcBeb6S7GYAtQ+x+f6S7GYAuQuoLa/FBRAXEBtfykogLiA2v5SUABxAbX9paAA4gJq+0tBAcQF1PaXggKIC6jtLwUFEBdQ25/7HsODAogLiO73oABigNH9HhRADDC634MCiAFG93tQADHA6H4PCiAGGN3vQQHEAKP7PSiAGGB0vwcFEAOM7vegAGKA0f0eFEAMMLrfgwKIAUb3e1AAMcDofg8KIAYY3e9BAcQAo/s9KIAYYHS/BwUQA4zu96AAYoDR/R4UQAwwut+DAogBRvd7UAAxwOh+DwogBhjd70EBxACj+z0ogBhgdL8HBRADjO73oABigNH9HhRADDC634MCiAFG93tQADHA6H4PCiAGGN3vQQHEAKP7PSiAGGB0vwcFEAOM7vegAGKA0f0eFEAMMLrfgwKIAUb3e1AAMcDofg8KIAYY3e9BAcQAo/s9KIAYYHS/BwUQA4zu96AAYoDR/R4UQAwwut+DAogBRvd7UAAxwOh+DwogBhjd70EBxACj+z0ogBhgdL8HBRADjO73oABigNH9HhRADDC632MxBcj9nzvR/R6LKQAchwIsHAqwcCjAwqEAC4cCLBwKsHAmL8BlO7yyQ0A9KhRgPLdDQD3SF9LuqKhWzXhmh4B6rJrdU7ujoto02/t2CKjHurl+ZHdUXH03fLODQBU2djeTaNUOz44MAxOz7sa3djeTqe+Gxg4EE9IOV5vN/sTuZTLxMFiXyR/+jqlvds/tYFCe9cX1O7uLauLF0OS8tzuorsPtoB2ujgwLt8c2PXzb7Gej9EDy52qwOTI83JR2uEqX/PT+xWY+W6WXE6kM6T013JzLbvfYZosQQgghhBBCCCGEEEIIIYTQf/ULg1PEfy1SsBcAAAAASUVORK5CYII=";

const DEFAULT_BUBBLE_OPTIONS = {
  size: 64,
  initialX: 0,
  initialY: 220,
  icon: BUBBLE_ICON,
  useLauncherIcon: false,
};

export function useFloatingBubbleController() {
  const [isShowing, setIsShowing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

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

  useEffect(() => {
    refresh();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const show = useCallback(async () => {
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

      await FloatingBubble.show(DEFAULT_BUBBLE_OPTIONS);
      setIsShowing(true);
      return true;
    } finally {
      setIsBusy(false);
    }
  }, []);

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

  const toggle = useCallback(async () => {
    if (isShowing) {
      return hide();
    }

    return show();
  }, [hide, isShowing, show]);

  return {
    hide,
    isBusy,
    isShowing,
    refresh,
    show,
    toggle,
  };
}
