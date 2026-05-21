import {
  canTrackCapability,
  canUseExternalAnalytics,
  classifyTrackingCapability,
  getConsentTelemetryReason,
  resolveConsentMode,
  type ConsentMode,
  type TrackingCapability,
} from "@/lib/privacy/consent-tracking-policy";

export const CLIENT_TRACKING_STATES = [
  "enabled",
  "disabled",
  "consent_denied",
  "unknown",
  "debug_only",
] as const;

export type ClientTrackingState = (typeof CLIENT_TRACKING_STATES)[number];

export const CLIENT_TRACKING_EVENT_KINDS = [
  "required_security",
  "required_account",
  "payment_integrity",
  "product_usage",
  "behavior_signal",
  "external_evidence",
  "debug_only",
] as const;

export type ClientTrackingEventKind = (typeof CLIENT_TRACKING_EVENT_KINDS)[number];

export type ClientTrackingPolicyPrivacySnapshot = {
  consentMode?: ConsentMode;
  anonymousAnalyticsEnabled?: boolean;
  identifiedAnalyticsEnabled?: boolean;
  allowRecommendations?: boolean;
  showInAnonymousStats?: boolean;
  honorGlobalPrivacyControl?: boolean;
  consentUpdatedAt?: number;
  globalPrivacyControl?: boolean;
};

export type ClientTrackingDecision = {
  trackingState: ClientTrackingState;
  eventKind: ClientTrackingEventKind;
  mayQueue: boolean;
  mayPersist: boolean;
  maySendExternal: boolean;
  diagnosticsCanBeSampled: boolean;
  reason: string;
  privacySettings: ClientTrackingPolicyPrivacySnapshot;
};

type ClientTrackingEventInput = {
  eventName?: string | null;
  eventType?: string | null;
  type?: string | null;
  externalEvidence?: boolean | null;
  debug?: boolean | null;
};

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasBehaviorType(value: string) {
  return value === "page_view"
    || value === "page_leave"
    || value === "click"
    || value === "hover"
    || value === "scroll"
    || value === "visibility";
}

export function resolveClientTrackingState(
  privacySettings: ClientTrackingPolicyPrivacySnapshot | null | undefined,
): ClientTrackingState {
  if (!privacySettings) {
    return "unknown";
  }

  if (privacySettings.honorGlobalPrivacyControl !== false && privacySettings.globalPrivacyControl === true) {
    return "consent_denied";
  }

  if (privacySettings.anonymousAnalyticsEnabled === true || privacySettings.identifiedAnalyticsEnabled === true) {
    return "enabled";
  }

  return "disabled";
}

export function classifyClientTrackingEvent(input: ClientTrackingEventInput): ClientTrackingEventKind {
  const eventName = normalized(input.eventName);
  const eventType = normalized(input.eventType ?? input.type);
  const capability = classifyTrackingCapability(eventName || eventType);

  if (input.debug === true || eventName.startsWith("debug_") || eventName.startsWith("source_only_")) {
    return "debug_only";
  }
  if (input.externalEvidence === true || eventName.startsWith("ga4_") || eventName.startsWith("posthog_")) {
    return "external_evidence";
  }
  if (capability === "required_security") {
    return "required_security";
  }
  if (capability === "required_account") {
    return "required_account";
  }
  if (capability === "payment_integrity") {
    return "payment_integrity";
  }
  if (capability === "behavioral_analytics" || hasBehaviorType(eventType)) {
    return "behavior_signal";
  }

  return "product_usage";
}

export function buildClientTrackingDecision(input: {
  eventName?: string | null;
  eventType?: string | null;
  type?: string | null;
  privacySettings?: ClientTrackingPolicyPrivacySnapshot | null;
  externalEvidence?: boolean | null;
  debug?: boolean | null;
}): ClientTrackingDecision {
  const privacySettings = input.privacySettings ?? {};
  const trackingState = resolveClientTrackingState(privacySettings);
  const eventKind = classifyClientTrackingEvent(input);
  const consentMode = resolveConsentMode(privacySettings);
  const capabilityByKind: Record<ClientTrackingEventKind, TrackingCapability> = {
    required_security: "required_security",
    required_account: "required_account",
    payment_integrity: "payment_integrity",
    product_usage: "product_usage_minimal",
    behavior_signal: "behavioral_analytics",
    external_evidence: "external_analytics",
    debug_only: "debug_diagnostics",
  };
  const capability = capabilityByKind[eventKind];
  const coreIntegrityEvent =
    eventKind === "required_security"
    || eventKind === "required_account"
    || eventKind === "payment_integrity";
  const allowedByConsent = canTrackCapability(capability, consentMode);
  const externalAllowed = canUseExternalAnalytics(consentMode);
  const debugOnly = trackingState === "debug_only" || eventKind === "debug_only";

  if (coreIntegrityEvent) {
    return {
      trackingState,
      eventKind,
      mayQueue: true,
      mayPersist: true,
      maySendExternal: false,
      diagnosticsCanBeSampled: trackingState !== "consent_denied",
      reason: "required_integrity_event",
      privacySettings,
    };
  }

  if (eventKind === "external_evidence") {
    return {
      trackingState,
      eventKind,
      mayQueue: externalAllowed,
      mayPersist: false,
      maySendExternal: externalAllowed,
      diagnosticsCanBeSampled: externalAllowed,
      reason: externalAllowed ? "external_evidence_enabled" : getConsentTelemetryReason(input.eventName ?? input.eventType ?? "", consentMode),
      privacySettings,
    };
  }

  if (debugOnly) {
    return {
      trackingState: "debug_only",
      eventKind,
      mayQueue: allowedByConsent,
      mayPersist: false,
      maySendExternal: false,
      diagnosticsCanBeSampled: allowedByConsent,
      reason: "debug_only_not_product_truth",
      privacySettings,
    };
  }

  return {
    trackingState,
    eventKind,
    mayQueue: allowedByConsent,
    mayPersist: allowedByConsent,
    maySendExternal: eventKind !== "behavior_signal" && externalAllowed,
    diagnosticsCanBeSampled: allowedByConsent,
    reason: allowedByConsent ? `tracking_enabled_${consentMode}` : getConsentTelemetryReason(input.eventName ?? input.eventType ?? "", consentMode),
    privacySettings,
  };
}

export function shouldAllowClientBehaviorEvent(input: Parameters<typeof buildClientTrackingDecision>[0]) {
  const decision = buildClientTrackingDecision(input);
  return decision.mayQueue && decision.mayPersist;
}
