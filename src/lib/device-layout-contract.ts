export const DEVICE_LAYOUT_CONTRACT_VERSION = "2026-05-public-beta" as const;

export const GOOGLE_MATERIAL_STRUCTURAL_BREAKPOINTS_PX = [
  480,
  600,
  840,
  960,
  1280,
  1440,
  1600,
] as const;

export const DEVICE_LAYOUT_BREAKPOINT_BOUNDARIES_PX = [
  0,
  360,
  480,
  600,
  840,
  960,
  1280,
  1440,
  1600,
] as const;

export const DEVICE_LAYOUT_CLASSES = [
  {
    id: "xs-phone",
    minWidthPx: 0,
    maxWidthPx: 359,
    structuralAnchor: "sub-360 phone safety lane",
  },
  {
    id: "phone",
    minWidthPx: 360,
    maxWidthPx: 479,
    structuralAnchor: "phone before the 480 Material boundary",
  },
  {
    id: "large-phone",
    minWidthPx: 480,
    maxWidthPx: 599,
    structuralAnchor: "480 Material compact boundary",
  },
  {
    id: "small-tablet",
    minWidthPx: 600,
    maxWidthPx: 839,
    structuralAnchor: "600 Material medium boundary",
  },
  {
    id: "tablet",
    minWidthPx: 840,
    maxWidthPx: 959,
    structuralAnchor: "840 Material expanded boundary",
  },
  {
    id: "large-tablet",
    minWidthPx: 960,
    maxWidthPx: 1279,
    structuralAnchor: "960 Material large expanded boundary",
  },
  {
    id: "desktop",
    minWidthPx: 1280,
    maxWidthPx: 1439,
    structuralAnchor: "1280 Material desktop boundary",
  },
  {
    id: "wide-desktop",
    minWidthPx: 1440,
    maxWidthPx: 1599,
    structuralAnchor: "1440 Material wide boundary",
  },
  {
    id: "ultra-wide",
    minWidthPx: 1600,
    maxWidthPx: null,
    structuralAnchor: "1600 Material ultra-wide boundary",
  },
] as const;

export type DeviceLayoutClass = (typeof DEVICE_LAYOUT_CLASSES)[number]["id"];

export const DEVICE_DISPLAY_MODES = [
  "browser",
  "standalone-pwa",
  "fullscreen",
  "unknown",
] as const;

export type DeviceDisplayMode = (typeof DEVICE_DISPLAY_MODES)[number];

export const DEVICE_LAYOUT_SHELL_TOKENS = {
  topNav: {
    behavior: "fixed-floating-glass",
    safeArea: "env(safe-area-inset-top)",
    cssVariable: "--root-shell-top-spacing",
  },
  phoneBottomNav: {
    behavior: "navigation-only",
    visualHeightPx: 56,
    cssVariable: "--user-mobile-bottom-nav-reserved-height",
    safeArea: "env(safe-area-inset-bottom)",
  },
  floatingControls: {
    cssToken: "USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET",
    rule: "Use shared bottom-nav reserved height plus safe breathing room.",
  },
  chat: {
    cssVariable: "--chat-visual-viewport-height",
    viewportUnit: "100dvh",
    ownership: "internal-scroll-owner",
  },
  dropPreview: {
    viewportUnit: "100dvh",
    ctaRule: "Sticky CTA sits above mobile bottom nav; bottom nav remains visible.",
  },
} as const;

export const DEVICE_LAYOUT_COMPONENT_SIZING = {
  minTouchTargetPx: 44,
  bottomNavVisualHeightPx: 56,
  bottomNavBreathingRoomPx: {
    min: 12,
    max: 16,
  },
  chatInputRowHeightPx: {
    min: 48,
    max: 52,
  },
  chatSendButtonPx: 48,
  chatPlusButtonPx: {
    min: 44,
    max: 48,
  },
  chatPriceLineMaxPx: 20,
  floatingButtonPx: {
    min: 44,
    max: 48,
  },
} as const;

export const DEVICE_LAYOUT_SHELL_RULES = [
  "Top navigation is fixed/floating glass and must reserve or account for safe-area top space.",
  "The phone user shell keeps the mobile bottom navigation visible.",
  "The mobile bottom navigation is navigation only, not an action bar.",
  "Public content must reserve bottom nav height plus safe area plus 12px-16px breathing room.",
  "Floating controls must use shared shell tokens instead of hardcoded bottom offsets.",
  "The chat route owns an internal viewport and cannot use document scroll as the layout owner.",
  "The full-page locked drop preview keeps bottom nav visible and its sticky CTA above it.",
] as const;

export const DEVICE_LAYOUT_REQUIRED_DEBUG_ATTRIBUTES = [
  "data-device-layout-contract",
  "data-display-mode",
  "data-device-layout-surface",
  "data-user-mobile-shell-route",
  "data-chat-shell-mode",
  "data-chat-viewport-owner",
  "data-drop-preview-page",
  "data-safe-preview-fields-only",
] as const;

export const DEVICE_LAYOUT_DOCTRINE_NOTE =
  "Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units. Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation. KandyDrops agents must use contract tokens and validators, not freestyle layout physics.";

export const DEVICE_LAYOUT_SOURCE_ANCHORS = {
  google: [
    "Material responsive layout breakpoints: 480, 600, 840, 960, 1280, 1440, 1600.",
    "PWA display modes and dynamic viewport units are structural runtime inputs.",
  ],
  apple: [
    "Respect safe areas and stable top-level navigation.",
    "Interactive controls must preserve a minimum 44px target.",
  ],
  kandydrops: [
    "Use src/lib/device-layout-contract.ts plus src/lib/user-mobile-shell.ts for public shell math.",
    "Use validators instead of per-screen hardcoded layout offsets.",
  ],
} as const;

type IOSNavigator = Navigator & { standalone?: boolean };

export function resolveDeviceLayoutClass(widthPx: number): DeviceLayoutClass {
  const normalizedWidth = Number.isFinite(widthPx) ? Math.max(0, Math.floor(widthPx)) : 0;
  const matchedClass = DEVICE_LAYOUT_CLASSES.find((layoutClass) => {
    if (layoutClass.maxWidthPx === null) {
      return normalizedWidth >= layoutClass.minWidthPx;
    }

    return normalizedWidth >= layoutClass.minWidthPx && normalizedWidth <= layoutClass.maxWidthPx;
  });

  return matchedClass?.id ?? "xs-phone";
}

export function detectDeviceDisplayMode(): DeviceDisplayMode {
  if (typeof window === "undefined") {
    return "unknown";
  }

  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as IOSNavigator).standalone === true
  ) {
    return "standalone-pwa";
  }

  if (window.matchMedia("(display-mode: browser)").matches) {
    return "browser";
  }

  return "browser";
}
