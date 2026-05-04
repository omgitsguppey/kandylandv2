import { DEVICE_LAYOUT_CLASSES } from "./device-layout-contract";

export const DEVICE_UI_DRY_AUDIT_REPORT_PATH = "agent/state/device-ui-dry-audit.generated.json" as const;

export const DEVICE_UI_DISPLAY_MODES = ["browser", "standalone-pwa"] as const;

export type DeviceUiDisplayMode = (typeof DEVICE_UI_DISPLAY_MODES)[number];

export type DeviceUiDeviceProfileId =
    | "xs-phone"
    | "phone"
    | "large-phone"
    | "small-tablet"
    | "tablet"
    | "large-tablet"
    | "desktop"
    | "wide-desktop"
    | "ultra-wide";

export type DeviceUiSurfaceId =
    | "home_guest_hero"
    | "dashboard"
    | "drops_page"
    | "featured_carousel"
    | "drop_card_grid"
    | "full_page_drop_preview"
    | "wallet_modal"
    | "experiences_page"
    | "daily_checkin"
    | "chat_inbox"
    | "chat_thread"
    | "creator_profile"
    | "creator_experiences"
    | "notifications_panel"
    | "support_page"
    | "settings_page"
    | "my_kandydrops_library";

export type DeviceUiDryCategory =
    | "top_nav"
    | "bottom_nav"
    | "safe_area"
    | "viewport_unit"
    | "keyboard_focus"
    | "chat_shell"
    | "modal_density"
    | "wallet_density"
    | "drop_grid"
    | "preview_cta"
    | "touch_target"
    | "breakpoint"
    | "vertical_sprawl"
    | "debug_truth"
    | "image_loading"
    | "content_protection";

export type DeviceUiDrySeverity = "info" | "minor" | "moderate" | "major" | "critical";

export const DEVICE_UI_SEVERITY_PENALTY: Record<DeviceUiDrySeverity, number> = {
    info: 0,
    minor: -2,
    moderate: -5,
    major: -10,
    critical: -25,
};

export const DEVICE_UI_DEVICE_PROFILES = DEVICE_LAYOUT_CLASSES.map((profile) => {
    const id = profile.id as DeviceUiDeviceProfileId;
    return {
        id,
        minWidthPx: profile.minWidthPx,
        maxWidthPx: profile.maxWidthPx,
        oneColumnOnly: id === "xs-phone" || id === "phone",
        bottomNavRequired: id === "xs-phone" || id === "phone" || id === "large-phone",
        touchFirst: id === "xs-phone" || id === "phone" || id === "large-phone" || id === "small-tablet",
        strictVerticalDensity: id === "xs-phone" || id === "phone" || id === "large-phone",
        maxWidthRequired: id === "desktop" || id === "wide-desktop" || id === "ultra-wide",
        structuralExpectation:
            id === "xs-phone"
                ? "one-column only with strict mobile density and bottom nav reservation"
                : id === "phone"
                  ? "one-column phone lane with bottom nav and safe-area reservation"
                  : id === "large-phone"
                    ? "iPhone Pro Max class lane with limited two-card grids and bottom nav"
                    : id === "small-tablet"
                      ? "touch-first tablet lane with cautious two-column layout"
                      : id === "tablet"
                        ? "two-pane allowed with documented nav adaptation"
                        : id === "large-tablet"
                          ? "sidebar/top-tab allowed without stretched phone layout"
                          : id === "desktop"
                            ? "wider grids with desktop max-width discipline"
                            : id === "wide-desktop"
                              ? "wide layout with max-width caps"
                              : "ultra-wide layout with strict max-width caps",
    };
});

export const DEVICE_UI_SURFACES: Array<{
    id: DeviceUiSurfaceId;
    files: string[];
    primaryDeviceProfiles?: DeviceUiDeviceProfileId[];
}> = [
    { id: "home_guest_hero", files: ["src/components/Hero.tsx"] },
    { id: "dashboard", files: ["src/app/dashboard/page.tsx", "src/components/CoreLayoutWrapper.tsx"] },
    { id: "drops_page", files: ["src/app/drops/DropsClient.tsx"] },
    { id: "featured_carousel", files: ["src/components/FeaturedCarousel.tsx"] },
    { id: "drop_card_grid", files: ["src/components/DropGrid.tsx", "src/components/DropCard.tsx", "src/components/DropCardLayout.tsx"] },
    {
        id: "full_page_drop_preview",
        files: [
            "src/app/drops/[id]/preview/page.tsx",
            "src/app/drops/[id]/preview/loading.tsx",
            "src/components/Drops/LockedDropPreviewClient.tsx",
            "src/components/Drops/LockedDropPreviewView.tsx",
            "src/lib/locked-drop-preview-truth.ts",
        ],
    },
    { id: "wallet_modal", files: ["src/components/PurchaseModal.tsx"] },
    { id: "experiences_page", files: ["src/app/experiences/ExperiencesClient.tsx"] },
    { id: "daily_checkin", files: ["src/components/Dashboard/DailyCheckIn.tsx"] },
    { id: "chat_inbox", files: ["src/components/Chat/ChatExperience.tsx", "src/lib/user-mobile-shell.ts"] },
    { id: "chat_thread", files: ["src/components/Chat/ChatExperience.tsx", "src/lib/user-mobile-shell.ts"] },
    { id: "creator_profile", files: ["src/app/creators/[username]/CreatorProfileClient.tsx", "src/components/Creators/CreatorProfileHeader.tsx"] },
    { id: "creator_experiences", files: ["src/components/Creators/CreatorExperiencesPanel.tsx"] },
    { id: "notifications_panel", files: ["src/components/Navigation/NotificationBell.tsx"] },
    { id: "support_page", files: ["src/app/support/page.tsx", "src/app/dashboard/support/page.tsx", "src/components/Feedback/ReportBugButton.tsx"] },
    { id: "settings_page", files: ["src/app/dashboard/settings/page.tsx"] },
    {
        id: "my_kandydrops_library",
        files: [
            "src/app/dashboard/my-kandydrops/page.tsx",
            "src/components/Dashboard/OwnedDropGalleryCard.tsx",
            "src/components/Dashboard/CollectionList.tsx",
        ],
    },
];

export const MOBILE_DEVICE_PROFILE_IDS: DeviceUiDeviceProfileId[] = ["xs-phone", "phone", "large-phone"];
export const TOUCH_DEVICE_PROFILE_IDS: DeviceUiDeviceProfileId[] = ["xs-phone", "phone", "large-phone", "small-tablet"];
export const DESKTOP_DEVICE_PROFILE_IDS: DeviceUiDeviceProfileId[] = ["desktop", "wide-desktop", "ultra-wide"];
export const ALL_DEVICE_PROFILE_IDS = DEVICE_UI_DEVICE_PROFILES.map((profile) => profile.id);

export const DEVICE_UI_FORBIDDEN_COMMANDS = [
    "playwright",
    "cypress",
    "lighthouse",
    "npm run check",
    "npm run check:ui:audits",
    "npm run check:ui:continuity",
] as const;

export function getDeviceUiStatus(score: number, criticalCount: number) {
    if (criticalCount > 0) return "fail";
    if (score >= 95) return "clean";
    if (score >= 90) return "pass";
    if (score >= 80) return "warning";
    if (score >= 70) return "beta-risk";
    return "fail";
}
