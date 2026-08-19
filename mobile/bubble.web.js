export function useFloatingBubbleController() {
  return {
    enable: async () => false,
    enabled: false,
    hide: async () => false,
    configureVoiceSession: async () => false,
    isBusy: false,
    isShowing: false,
    opacity: 0.55,
    permissionState: "unavailable",
    refresh: async () => false,
    refreshPermission: async () => false,
    setOpacity: async () => false,
    show: async () => false,
    toggle: async () => false,
  };
}
