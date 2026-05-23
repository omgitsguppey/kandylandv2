export type SupportPolicySurfaceId =
  | "faq"
  | "support"
  | "policies"
  | "privacy_policy"
  | "data_export"
  | "account_recovery_support";

export type SupportPolicySurfaceStatus =
  | "implemented"
  | "action_backed"
  | "consolidated"
  | "support_fallback"
  | "not_configured"
  | "broken";

export type SupportPolicyFeatureRegistrationId =
  | "support"
  | "user_dashboard"
  | "cookie_consent_privacy";

export type SupportPolicySurface = {
  id: SupportPolicySurfaceId;
  label: string;
  canonicalRoute: string;
  routeSource: string;
  backendRouteOrAction: string;
  accountSettingsSettingId: string;
  featureRegistrationId: SupportPolicyFeatureRegistrationId;
  debugVisibility: string;
  status: SupportPolicySurfaceStatus;
  supportFallbackRoute: string;
  duplicateRoutes: readonly string[];
  userFacingTruth: string;
};

export const SUPPORT_POLICY_SURFACE_CONTRACT_VERSION = "2026.05.support-policy-surface.1";

export const SUPPORT_POLICY_DEBUG_LANE = {
  laneId: "support_policy_surface_health",
  label: "Support and policy surface health",
  sourceOwner: "support-policy",
  sourceOfTruth: "src/lib/support-policy/support-policy-surface-contract.ts",
  drilldownTarget: "/admin/debug?tab=advanced#support-policy-surface-health",
  rawDetailsDefaultOpen: false,
} as const;

export const SUPPORT_POLICY_SURFACES: readonly SupportPolicySurface[] = [
  {
    id: "faq",
    label: "FAQ",
    canonicalRoute: "/faq",
    routeSource: "src/app/faq/page.tsx",
    backendRouteOrAction: "static FAQ route with faq-data.ts",
    accountSettingsSettingId: "faq",
    featureRegistrationId: "support",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "implemented",
    supportFallbackRoute: "/dashboard/support",
    duplicateRoutes: [],
    userFacingTruth: "FAQ is implemented as a working help route.",
  },
  {
    id: "support",
    label: "Support",
    canonicalRoute: "/dashboard/support",
    routeSource: "src/app/dashboard/support/page.tsx",
    backendRouteOrAction: "/api/support/threads",
    accountSettingsSettingId: "support",
    featureRegistrationId: "support",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "implemented",
    supportFallbackRoute: "/faq",
    duplicateRoutes: [],
    userFacingTruth: "Signed-in support opens the in-site support inbox.",
  },
  {
    id: "policies",
    label: "Policies",
    canonicalRoute: "/privacy",
    routeSource: "src/app/(legal)/privacy/page.tsx",
    backendRouteOrAction: "/privacy",
    accountSettingsSettingId: "policies",
    featureRegistrationId: "cookie_consent_privacy",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "consolidated",
    supportFallbackRoute: "/dashboard/support",
    duplicateRoutes: [],
    userFacingTruth: "Policies currently consolidate to the canonical Privacy Policy route instead of a duplicated placeholder page.",
  },
  {
    id: "privacy_policy",
    label: "Privacy Policy",
    canonicalRoute: "/privacy",
    routeSource: "src/app/(legal)/privacy/page.tsx",
    backendRouteOrAction: "/privacy",
    accountSettingsSettingId: "privacy_policy",
    featureRegistrationId: "cookie_consent_privacy",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "implemented",
    supportFallbackRoute: "/dashboard/support",
    duplicateRoutes: [],
    userFacingTruth: "Privacy Policy is implemented as the canonical legal/privacy route.",
  },
  {
    id: "data_export",
    label: "Download My Data",
    canonicalRoute: "/settings",
    routeSource: "src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx",
    backendRouteOrAction: "/api/user/data",
    accountSettingsSettingId: "download_my_data",
    featureRegistrationId: "user_dashboard",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "action_backed",
    supportFallbackRoute: "/dashboard/support",
    duplicateRoutes: [],
    userFacingTruth: "Download My Data is an authenticated Account Settings action backed by the user data export route.",
  },
  {
    id: "account_recovery_support",
    label: "Account recovery support",
    canonicalRoute: "/dashboard/support",
    routeSource: "src/components/Support/SupportInbox.tsx",
    backendRouteOrAction: "/api/support/threads and /api/support/threads/guest",
    accountSettingsSettingId: "support",
    featureRegistrationId: "support",
    debugVisibility: SUPPORT_POLICY_DEBUG_LANE.laneId,
    status: "support_fallback",
    supportFallbackRoute: "/faq",
    duplicateRoutes: [],
    userFacingTruth: "Account recovery and account help use the support inbox, with FAQ guidance as the fallback surface.",
  },
];

export function getBrokenSupportPolicySurfaces() {
  return SUPPORT_POLICY_SURFACES.filter((surface) => surface.status === "broken");
}

export function getNotConfiguredSupportPolicySurfaces() {
  return SUPPORT_POLICY_SURFACES.filter((surface) => surface.status === "not_configured");
}

export function getDuplicateSupportPolicyRoutesWithoutRedirect() {
  return SUPPORT_POLICY_SURFACES.flatMap((surface) =>
    surface.duplicateRoutes.map((route) => ({
      surfaceId: surface.id,
      route,
      canonicalRoute: surface.canonicalRoute,
    }))
  );
}

export function getSupportPolicySurfaceDebugSummary() {
  const broken = getBrokenSupportPolicySurfaces();
  const notConfigured = getNotConfiguredSupportPolicySurfaces();
  const duplicateRoutes = getDuplicateSupportPolicyRoutesWithoutRedirect();

  return {
    laneId: SUPPORT_POLICY_DEBUG_LANE.laneId,
    surfaceCount: SUPPORT_POLICY_SURFACES.length,
    brokenCount: broken.length,
    notConfiguredCount: notConfigured.length,
    duplicateRouteCount: duplicateRoutes.length,
    supportFallbackReady: SUPPORT_POLICY_SURFACES.every((surface) => Boolean(surface.supportFallbackRoute)),
    status: broken.length || duplicateRoutes.length ? "degraded" : "source_ready",
  };
}
