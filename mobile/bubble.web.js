export function useFloatingBubbleController() {
  return {
    hide: async () => false,
    isBusy: false,
    isShowing: false,
    refresh: async () => false,
    show: async () => false,
    toggle: async () => false,
  };
}
