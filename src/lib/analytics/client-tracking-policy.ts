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

  if (input.debug === true || eventName.startsWith("debug_") || eventName.startsWith("source_only_")) {
    return "debug_only";
  }
  if (input.externalEvidence === true || eventName.startsWith("ga4_") || eventName.startsWith("posthog_")) {
    return "external_evidence";
  }
  if (eventName.startsWith("security_") || eventName.startsWith("confirmed_") || eventName.startsWith("heuristic_")) {
    return "required_security";
  }
  if (eventName.startsWith("auth_") || eventName === "identity_linked" || eventName.startsWith("password_reset_")) {
    return "required_account";
  }
  if (
    eventName.includes("purchase")
    || eventName.includes("checkout")
    || eventName.includes("payment")
    || eventName.includes("paypal")
    || eventName.includes("gumdrop_balance")
  ) {
    return "payment_integrity";
  }
  if (
    hasBehaviorType(eventType)
    || eventName.startsWith("semantic_")
    || eventName.includes("clicked")
    || eventName.includes("viewed")
    || eventName.includes("opened")
    || eventName.includes("hover")
    || eventName.includes("scroll")
    || eventName.includes("visibility")
    || eventName.includes("watch")
    || eventName.includes("creator_")
    || eventName.includes("fan_pass")
    || eventName.includes("booking")
    || eventName.includes("request")
    || eventName.includes("chat")
  ) {
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
  const coreIntegrityEvent =
    eventKind === "required_security"
    || eventKind === "required_account"
    || eventKind === "payment_integrity";
  const enabled = trackingState === "enabled";
  const debugOnly = trackingState === "debug_only" || eventKind === "debug_only";
  const behaviorAllowed = enabled && eventKind !== "external_evidence" && !debugOnly;

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
      mayQueue: enabled,
      mayPersist: false,
      maySendExternal: enabled,
      diagnosticsCanBeSampled: enabled,
      reason: enabled ? "external_evidence_enabled" : "external_evidence_blocked",
      privacySettings,
    };
  }

  if (debugOnly) {
    return {
      trackingState: "debug_only",
      eventKind,
      mayQueue: false,
      mayPersist: false,
      maySendExternal: false,
      diagnosticsCanBeSampled: trackingState === "enabled",
      reason: "debug_only_not_product_truth",
      privacySettings,
    };
  }

  return {
    trackingState,
    eventKind,
    mayQueue: behaviorAllowed,
    mayPersist: behaviorAllowed,
    maySendExternal: enabled && eventKind !== "behavior_signal",
    diagnosticsCanBeSampled: enabled,
    reason: behaviorAllowed ? "tracking_enabled" : "behavior_tracking_disabled",
    privacySettings,
  };
}

export function shouldAllowClientBehaviorEvent(input: Parameters<typeof buildClientTrackingDecision>[0]) {
  const decision = buildClientTrackingDecision(input);
  return decision.mayQueue && decision.mayPersist;
}
