import {
  canTrackEvent,
  classifyTrackingCapability,
  getConsentTelemetryReason,
  getConsentUpgradeEffect,
  resolveConsentMode,
  type ConsentDecision,
  type ConsentMode,
  type ConsentSource,
} from "@/lib/privacy/consent-tracking-policy";

export interface PrivacyConsentStateInput {
  consentMode?: ConsentMode;
  decision?: ConsentDecision;
  source?: ConsentSource;
  globalPrivacyControl?: boolean;
  guestId?: string | null;
  userId?: string | null;
}

export interface PrivacyConsentState {
  consentMode: ConsentMode;
  source: ConsentSource;
  guestToUserHandoff: boolean;
  explanation: string;
}

export interface ConsentEventInput {
  consent: PrivacyConsentState;
  eventName?: string;
}

export function resolveConsentState(input: PrivacyConsentStateInput): PrivacyConsentState {
  if (input.decision) {
    const effect = getConsentUpgradeEffect(input.decision, input.source ?? "banner");
    return {
      consentMode: effect.consentMode,
      source: effect.source,
      guestToUserHandoff: Boolean(input.guestId && input.userId),
      explanation: input.guestId && input.userId
        ? `guest_to_user_handoff:${effect.consentMode}`
        : `decision:${input.decision}:${effect.consentMode}`,
    };
  }
  const consentMode = resolveConsentMode({
    consentMode: input.consentMode,
    globalPrivacyControl: input.globalPrivacyControl,
    honorGlobalPrivacyControl: true,
  });
  return {
    consentMode,
    source: input.source ?? "unknown",
    guestToUserHandoff: Boolean(input.guestId && input.userId),
    explanation: input.guestId && input.userId ? `guest_to_user_handoff:${consentMode}` : `mode:${consentMode}`,
  };
}

export function canCollectTelemetry(input: ConsentEventInput) {
  return canTrackEvent(input.eventName ?? "page_viewed", input.consent.consentMode);
}

export function canCollectBehavioralEvent(input: ConsentEventInput) {
  return classifyTrackingCapability(input.eventName ?? "semantic_event") === "behavioral_analytics"
    && canTrackEvent(input.eventName ?? "semantic_event", input.consent.consentMode);
}

export function canCollectOperationalEvent(input: ConsentEventInput) {
  const capability = classifyTrackingCapability(input.eventName ?? "auth_session_established");
  return ["required_account", "required_session", "product_usage_minimal", "payment_integrity"].includes(capability)
    ? capability === "required_account" || capability === "required_session" || capability === "product_usage_minimal" || capability === "payment_integrity" || canTrackEvent(input.eventName ?? "auth_session_established", input.consent.consentMode)
    : false;
}

export function canCollectSecurityEvent(input: ConsentEventInput) {
  const name = input.eventName ?? "security_event";
  return classifyTrackingCapability(name) === "required_security" || canTrackEvent(name, input.consent.consentMode);
}

export function canUseForJourney(input: { consent: PrivacyConsentState }) {
  return input.consent.consentMode === "full_behavioral";
}

export function canUseForLiveEvidence(input: { consent: PrivacyConsentState; evidenceClass: "security" | "operational" | "behavioral" }) {
  if (input.evidenceClass === "security") return true;
  if (input.evidenceClass === "operational") return input.consent.consentMode !== "unknown";
  return canUseForJourney(input);
}

export function explainConsentDecision(input: ConsentEventInput) {
  const name = input.eventName ?? "event";
  const reason = getConsentTelemetryReason(name, input.consent.consentMode);
  return `${input.consent.explanation};${reason}`;
}

export function validateConsentInterpreterConsolidation() {
  const failures: string[] = [];
  const denied = resolveConsentState({ consentMode: "necessary_only" });
  const accepted = resolveConsentState({ decision: "accept_all", source: "banner", guestId: "guest", userId: "user" });
  if (!canCollectSecurityEvent({ consent: denied, eventName: "security_rate_limit_triggered" })) failures.push("Denied consent blocks security events.");
  if (!canCollectOperationalEvent({ consent: denied, eventName: "auth_session_established" })) failures.push("Denied consent blocks auth/session safety events.");
  if (canCollectBehavioralEvent({ consent: denied, eventName: "semantic_drop_viewed" })) failures.push("Denied consent permits behavioral tracking.");
  if (!canCollectBehavioralEvent({ consent: accepted, eventName: "semantic_drop_viewed" })) failures.push("Accepted cookies do not enable allowed behavioral tracking.");
  if (!accepted.guestToUserHandoff) failures.push("Guest consent handoff missing.");
  if (!explainConsentDecision({ consent: denied, eventName: "semantic_drop_viewed" })) failures.push("Consent decision lacks explanation.");
  return failures;
}

export function buildConsentInterpreterConsolidationReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateConsentInterpreterConsolidation();
  return {
    reportKey: "consent-interpreter-consolidation",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    consentRulesConsolidated: 6,
    delegatesTo: "src/lib/privacy/consent-tracking-policy.ts",
    validationFailures,
  };
}
