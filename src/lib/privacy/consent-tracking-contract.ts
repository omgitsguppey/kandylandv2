export const CONSENT_TRACKING_VERSION = "2026-05-consent-tracking-v1";

export const CONSENT_MODE_VALUES = [
  "unknown",
  "necessary_only",
  "minimal_analytics",
  "full_analytics",
  "full_behavioral",
] as const;

export type ConsentMode = (typeof CONSENT_MODE_VALUES)[number];

export const TRACKING_CAPABILITY_VALUES = [
  "required_security",
  "required_session",
  "required_account",
  "payment_integrity",
  "product_usage_minimal",
  "performance_analytics",
  "behavioral_analytics",
  "personalization",
  "external_analytics",
  "debug_diagnostics",
] as const;

export type TrackingCapability = (typeof TRACKING_CAPABILITY_VALUES)[number];

export const CONSENT_DECISION_VALUES = [
  "accept_all",
  "minimal",
  "decline_optional",
  "customize",
] as const;

export type ConsentDecision = (typeof CONSENT_DECISION_VALUES)[number];

export const CONSENT_SOURCE_VALUES = [
  "banner",
  "account_settings",
  "legacy_default",
  "unknown",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCE_VALUES)[number];

export const CONSENT_TRACKING_STORAGE_KEYS = {
  localStorage: "kandydrops.privacy.settings",
  cookie: "kandydrops_analytics_consent",
  eventName: "kandydrops-privacy-updated",
} as const;

export type ConsentTrackingSnapshot = {
  consentMode: ConsentMode;
  consentDecision: ConsentDecision | null;
  consentSource: ConsentSource;
  consentPolicyVersion: typeof CONSENT_TRACKING_VERSION;
  consentUpdatedAt: number;
  anonymousAnalyticsEnabled: boolean;
  identifiedAnalyticsEnabled: boolean;
  allowRecommendations: boolean;
  showInAnonymousStats: boolean;
  honorGlobalPrivacyControl: boolean;
};

export type ConsentUpgradeEffect = {
  decision: ConsentDecision;
  consentMode: ConsentMode;
  source: ConsentSource;
  enablesMinimalProductAnalytics: boolean;
  enablesPerformanceAnalytics: boolean;
  enablesBehavioralTracking: boolean;
  enablesExternalAnalytics: boolean;
  enablesPersonalization: boolean;
};
