import {
  CONSENT_MODE_VALUES,
  CONSENT_TRACKING_VERSION,
  type ConsentDecision,
  type ConsentMode,
  type ConsentSource,
  type ConsentTrackingSnapshot,
  type ConsentUpgradeEffect,
  type TrackingCapability,
} from "./consent-tracking-contract";

export type { ConsentDecision, ConsentMode, ConsentSource, TrackingCapability } from "./consent-tracking-contract";

export type ConsentModeInput = Partial<ConsentTrackingSnapshot> & {
  globalPrivacyControl?: boolean;
};

const CONSENT_MODE_SET = new Set<ConsentMode>(CONSENT_MODE_VALUES);
const MINIMAL_PRODUCT_LIVENESS_EVENTS = new Set([
  "page_viewed",
  "semantic_page_viewed",
  "home_page_viewed",
  "dashboard_viewed",
  "drops_page_viewed",
  "drop_card_impression",
  "drop_preview_opened",
  "daily_task_surface_viewed",
  "daily_tasks_viewed",
  "daily_task_guidance_opened",
  "task_guidance_viewed",
  "task_guidance_tapped",
  "task_guidance_dismissed",
  "task_guidance_completed",
  "task_card_expanded",
  "task_help_opened",
  "auth_session_established",
  "wallet_opened",
  "creator_profile_viewed",
  "notification_prompt_banner_viewed",
  "settings_surface_viewed",
  "user_settings_viewed",
  "chat_surface_viewed",
  "chat_thread_opened",
]);

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isConsentMode(value: unknown): value is ConsentMode {
  return CONSENT_MODE_SET.has(value as ConsentMode);
}

export function normalizeConsentMode(value: unknown): ConsentMode {
  return isConsentMode(value) ? value : "unknown";
}

export function resolveConsentMode(snapshot?: ConsentModeInput | null): ConsentMode {
  if (!snapshot) return "unknown";
  if (snapshot.honorGlobalPrivacyControl !== false && snapshot.globalPrivacyControl === true) {
    return "necessary_only";
  }

  const explicitMode = normalizeConsentMode(snapshot.consentMode);
  if (explicitMode !== "unknown") return explicitMode;

  if (snapshot.allowRecommendations === true) {
    return "full_behavioral";
  }
  if (snapshot.identifiedAnalyticsEnabled === true) {
    return "full_analytics";
  }
  if (snapshot.anonymousAnalyticsEnabled === true) {
    return "minimal_analytics";
  }
  if (!snapshot.consentUpdatedAt) return "unknown";

  return "necessary_only";
}

export function getConsentUpgradeEffect(
  decision: ConsentDecision,
  source: ConsentSource = "banner",
): ConsentUpgradeEffect {
  if (decision === "accept_all") {
    return {
      decision,
      consentMode: "full_behavioral",
      source,
      enablesMinimalProductAnalytics: true,
      enablesPerformanceAnalytics: true,
      enablesBehavioralTracking: true,
      enablesExternalAnalytics: true,
      enablesPersonalization: true,
    };
  }

  if (decision === "minimal") {
    return {
      decision,
      consentMode: "minimal_analytics",
      source,
      enablesMinimalProductAnalytics: true,
      enablesPerformanceAnalytics: true,
      enablesBehavioralTracking: false,
      enablesExternalAnalytics: false,
      enablesPersonalization: false,
    };
  }

  return {
    decision,
    consentMode: "necessary_only",
    source,
    enablesMinimalProductAnalytics: false,
    enablesPerformanceAnalytics: false,
    enablesBehavioralTracking: false,
    enablesExternalAnalytics: false,
    enablesPersonalization: false,
  };
}

export function buildConsentSettingsFromDecision(
  decision: ConsentDecision,
  source: ConsentSource = "banner",
): Partial<ConsentTrackingSnapshot> {
  const effect = getConsentUpgradeEffect(decision, source);
  return {
    consentMode: effect.consentMode,
    consentDecision: decision,
    consentSource: source,
    consentPolicyVersion: CONSENT_TRACKING_VERSION,
    anonymousAnalyticsEnabled: effect.enablesMinimalProductAnalytics || effect.enablesBehavioralTracking,
    identifiedAnalyticsEnabled: effect.enablesBehavioralTracking,
    allowRecommendations: effect.enablesPersonalization,
    showInAnonymousStats: effect.enablesMinimalProductAnalytics || effect.enablesBehavioralTracking,
    honorGlobalPrivacyControl: true,
  };
}

export function classifyTrackingCapability(eventTypeOrName: string): TrackingCapability {
  const value = normalized(eventTypeOrName);

  if (MINIMAL_PRODUCT_LIVENESS_EVENTS.has(value)) {
    return "product_usage_minimal";
  }

  if (
    value.startsWith("security_")
    || value.startsWith("confirmed_")
    || value.startsWith("heuristic_")
    || value.includes("rate_limit")
  ) {
    return "required_security";
  }
  if (value.startsWith("auth_") || value.startsWith("password_reset_") || value.includes("consent")) {
    return "required_account";
  }
  if (
    value.includes("purchase")
    || value.includes("checkout")
    || value.includes("payment")
    || value.includes("paypal")
    || value.includes("gumdrop_balance")
  ) {
    return "payment_integrity";
  }
  if (value.includes("performance") || value.includes("web_vital")) {
    return "performance_analytics";
  }
  if (value.startsWith("ga4_") || value.startsWith("posthog_") || value.includes("external")) {
    return "external_analytics";
  }
  if (value.startsWith("debug_") || value.startsWith("source_only_")) {
    return "debug_diagnostics";
  }
  if (!value.startsWith("semantic_") && (value === "page_viewed" || value.endsWith("_page_viewed") || value === "privacy_page_viewed")) {
    return "product_usage_minimal";
  }
  if (
    value === "page_view"
    || value === "page_leave"
    || value === "click"
    || value === "hover"
    || value === "scroll"
    || value === "visibility"
    || value.startsWith("semantic_")
    || value.includes("clicked")
    || value.includes("viewed")
    || value.includes("opened")
    || value.includes("hover")
    || value.includes("scroll")
    || value.includes("visibility")
    || value.includes("watch")
    || value.includes("creator_")
    || value.includes("fan_pass")
    || value.includes("booking")
    || value.includes("request")
    || value.includes("drop_")
  ) {
    return "behavioral_analytics";
  }

  return "product_usage_minimal";
}

export function canUseBehavioralSignals(consentMode: ConsentMode) {
  return consentMode === "full_behavioral";
}

export function canUseExternalAnalytics(consentMode: ConsentMode) {
  return consentMode === "full_analytics" || consentMode === "full_behavioral";
}

export function canPersistIdentityLink(consentMode: ConsentMode) {
  return consentMode === "full_analytics" || consentMode === "full_behavioral";
}

export function canTrackCapability(capability: TrackingCapability, consentMode: ConsentMode) {
  if (
    capability === "required_security"
    || capability === "required_session"
    || capability === "required_account"
    || capability === "payment_integrity"
  ) {
    return true;
  }

  if (consentMode === "unknown" || consentMode === "necessary_only") {
    return false;
  }

  if (capability === "product_usage_minimal" || capability === "performance_analytics") {
    return consentMode === "minimal_analytics"
      || consentMode === "full_analytics"
      || consentMode === "full_behavioral";
  }

  if (capability === "behavioral_analytics" || capability === "personalization") {
    return canUseBehavioralSignals(consentMode);
  }

  if (capability === "external_analytics") {
    return canUseExternalAnalytics(consentMode);
  }

  if (capability === "debug_diagnostics") {
    return consentMode === "full_analytics" || consentMode === "full_behavioral";
  }

  return false;
}

export function canTrackEvent(eventTypeOrName: string, consentMode: ConsentMode) {
  return canTrackCapability(classifyTrackingCapability(eventTypeOrName), consentMode);
}

export function getConsentTelemetryReason(eventTypeOrName: string, consentMode: ConsentMode) {
  const capability = classifyTrackingCapability(eventTypeOrName);
  if (canTrackCapability(capability, consentMode)) {
    return `allowed_${capability}`;
  }
  if (consentMode === "unknown") {
    return "blocked_until_consent_decision";
  }
  if (consentMode === "minimal_analytics" && capability === "behavioral_analytics") {
    return "blocked_behavioral_requires_full_consent";
  }
  if (capability === "external_analytics") {
    return "blocked_external_analytics_without_full_consent";
  }
  return `blocked_${capability}`;
}
