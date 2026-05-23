export const SETTINGS_CLIENT_PREFERENCE_CONTRACT_VERSION = "2026.05.stale-client-preferences.1";

export type ClientPreferenceClassification =
  | "canonical_backend_backed"
  | "local_ui_only_display_state"
  | "legacy_fallback"
  | "stale_bypass"
  | "unsafe_unknown";

export type ClientPreferenceStorageRole =
  | "consent_mirror"
  | "ui_draft"
  | "ui_dismissal"
  | "telemetry_dedupe"
  | "runtime_queue"
  | "backend_truth";

export type ClientPreferenceItem = {
  id: string;
  storageKeyOrPattern: string;
  storageKind: "localStorage" | "sessionStorage" | "cookie" | "memory" | "backend_route";
  storageRole: ClientPreferenceStorageRole;
  classification: ClientPreferenceClassification;
  canonicalTruth: string;
  backendRouteOrContract: string;
  consentPolicy: string;
  featureRegistrationId: string;
  debugVisibility: "settings_connection_health";
  canPersistAcrossSessions: boolean;
  mayHydrateSettingsTruth: false;
  staleBypassRisk: "none" | "low" | "medium" | "high";
  cleanupAction: string;
};

export const SETTINGS_CLIENT_PREFERENCE_DEBUG_LANE = {
  laneId: "settings_connection_health",
  sourceOwner: "settings",
  sourceOfTruth: "src/lib/settings/client-preferences-contract.ts",
  staleBypassPolicy: "Local browser storage may mirror consent or remember UI-only drafts/dismissals, but it cannot become account or creator settings truth.",
  rawDetailsDefaultOpen: false,
} as const;

export const SETTINGS_CLIENT_PREFERENCE_ITEMS: ClientPreferenceItem[] = [
  {
    id: "guest_privacy_consent_snapshot",
    storageKeyOrPattern: "kandydrops.privacy.settings",
    storageKind: "localStorage",
    storageRole: "consent_mirror",
    classification: "canonical_backend_backed",
    canonicalTruth: "Guest consent is mirrored locally and signed-in consent is sourced from users/{uid}.privacySettings.",
    backendRouteOrContract: "src/lib/privacy/consent-tracking-policy.ts + /api/privacy/consent + /api/user/profile",
    consentPolicy: "consent-tracking-policy",
    featureRegistrationId: "cookie_consent_privacy",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: true,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "low",
    cleanupAction: "Keep as consent mirror only; signed-in account settings must overwrite or sync through /api/user/profile.",
  },
  {
    id: "account_settings_form_state",
    storageKeyOrPattern: "React state in useProfileState",
    storageKind: "memory",
    storageRole: "ui_draft",
    classification: "canonical_backend_backed",
    canonicalTruth: "users/{uid} via AuthContext userProfile and /api/user/profile.",
    backendRouteOrContract: "/api/user/profile",
    consentPolicy: "consent-tracking-policy for privacy fields",
    featureRegistrationId: "user_dashboard",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: false,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "none",
    cleanupAction: "Keep as in-memory draft only; autosave persists through /api/user/profile.",
  },
  {
    id: "creator_settings_draft_state",
    storageKeyOrPattern: "React state in CreatorDashboardSettingsHub",
    storageKind: "memory",
    storageRole: "ui_draft",
    classification: "canonical_backend_backed",
    canonicalTruth: "users/{uid}.creatorSettings via /api/creator/settings.",
    backendRouteOrContract: "src/lib/creator-settings/creator-settings-contract.ts + /api/creator/settings",
    consentPolicy: "required account integrity; not optional behavioral tracking",
    featureRegistrationId: "creator_settings",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: false,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "none",
    cleanupAction: "Keep as in-memory draft only; save sections through the creator settings control plane.",
  },
  {
    id: "notification_prompt_dismissal",
    storageKeyOrPattern: "notification prompt dismissal keys",
    storageKind: "localStorage",
    storageRole: "ui_dismissal",
    classification: "local_ui_only_display_state",
    canonicalTruth: "users/{uid}.notificationSettings controls actual notification preference truth.",
    backendRouteOrContract: "/api/user/profile",
    consentPolicy: "required account integrity",
    featureRegistrationId: "user_dashboard",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: true,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "low",
    cleanupAction: "Allowed only for hiding the prompt; it cannot turn notifications on or off.",
  },
  {
    id: "task_guidance_pending_action",
    storageKeyOrPattern: "task guidance session key; legacy localStorage copy cleared",
    storageKind: "sessionStorage",
    storageRole: "ui_draft",
    classification: "local_ui_only_display_state",
    canonicalTruth: "Daily task completion and account state remain server/catalog truth.",
    backendRouteOrContract: "src/lib/task-guidance.ts",
    consentPolicy: "not a tracking preference",
    featureRegistrationId: "user_dashboard",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: false,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "none",
    cleanupAction: "Keep session-only and continue removing old localStorage copies.",
  },
  {
    id: "telemetry_identity_link_dedupe",
    storageKeyOrPattern: "kandydrops.identityLink.sent:*",
    storageKind: "localStorage",
    storageRole: "telemetry_dedupe",
    classification: "local_ui_only_display_state",
    canonicalTruth: "Identity links are submitted to /api/analytics/identity-link when consent permits.",
    backendRouteOrContract: "src/lib/analytics/analytics-identity-link.ts",
    consentPolicy: "identity handoff consent policy",
    featureRegistrationId: "analytics_telemetry",
    debugVisibility: "settings_connection_health",
    canPersistAcrossSessions: true,
    mayHydrateSettingsTruth: false,
    staleBypassRisk: "low",
    cleanupAction: "Allowed for duplicate submit prevention only; it cannot define person-level settings.",
  },
];

export function getStaleClientPreferenceBypasses() {
  return SETTINGS_CLIENT_PREFERENCE_ITEMS.filter((item) => item.classification === "stale_bypass" || item.storageRole === "backend_truth" || item.mayHydrateSettingsTruth);
}

export function getUnsafeClientPreferenceItems() {
  return SETTINGS_CLIENT_PREFERENCE_ITEMS.filter((item) => item.classification === "unsafe_unknown");
}

export function getSettingsClientPreferenceDebugSummary() {
  const staleBypasses = getStaleClientPreferenceBypasses();
  const unsafeUnknown = getUnsafeClientPreferenceItems();
  return {
    laneId: SETTINGS_CLIENT_PREFERENCE_DEBUG_LANE.laneId,
    status: staleBypasses.length > 0 || unsafeUnknown.length > 0 ? "degraded" : "source_ready",
    totalClientPreferenceItems: SETTINGS_CLIENT_PREFERENCE_ITEMS.length,
    staleBypassCount: staleBypasses.length,
    unsafeUnknownCount: unsafeUnknown.length,
    sourceOfTruth: SETTINGS_CLIENT_PREFERENCE_DEBUG_LANE.sourceOfTruth,
  } as const;
}
