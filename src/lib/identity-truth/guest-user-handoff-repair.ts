import { buildGuestUserIdentityLinkId } from "@/lib/analytics/analytics-identity-link";
import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import { normalizeConsentMode, type ConsentMode } from "@/lib/privacy/consent-tracking-policy";

export const GUEST_USER_HANDOFF_REPAIR_VERSION = "2026.05.guest-user-handoff.1";
export const HANDOFF_CONTINUITY_WINDOW_MS = 5 * 60 * 1000;
export const HANDOFF_DUPLICATE_WINDOW_MS = 10_000;

export interface HandoffInput {
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  linkId?: string | null;
  consentMode?: ConsentMode | string | null;
  authTransitionAtMs: number;
  guestLastEventAtMs?: number | null;
}

export interface HandoffDecision {
  status: "linked" | "inferred_guest_preserved" | "blocked_missing_identity" | "blocked_by_consent";
  linkId: string | null;
  identityConfidence: IdentityConfidence;
  preserveGuestHistory: boolean;
  canPromoteToExact: false;
  telemetryEvents: string[];
  debugLane: "identity_handoff";
  explanation: string;
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

export function resolveGuestIdentity(input: HandoffInput) {
  return {
    guestId: clean(input.guestId),
    sessionId: clean(input.sessionId) ?? "unknown_session",
    identityConfidence: clean(input.guestId) ? "weak" as const : "unknown" as const,
  };
}

export function resolveSignedInIdentity(input: HandoffInput) {
  return {
    userId: clean(input.userId),
    sessionId: clean(input.sessionId) ?? "unknown_session",
    identityConfidence: clean(input.userId) ? "exact" as const : "unknown" as const,
  };
}

export function preserveJourneyContinuity(input: {
  guestEventAtMs?: number | null;
  authTransitionAtMs?: number | null;
  sameSession: boolean;
}) {
  const guestAt = finiteMs(input.guestEventAtMs);
  const authAt = finiteMs(input.authTransitionAtMs);
  const withinWindow = guestAt !== null && authAt !== null && Math.abs(authAt - guestAt) <= HANDOFF_CONTINUITY_WINDOW_MS;
  return {
    continuous: input.sameSession || withinWindow,
    reason: input.sameSession ? "same_session" : withinWindow ? "auth_transition_window" : "outside_handoff_window",
  } as const;
}

export function linkGuestToUser(input: HandoffInput): HandoffDecision {
  const guestId = clean(input.guestId);
  const userId = clean(input.userId);
  const sessionId = clean(input.sessionId);
  const consentMode = normalizeConsentMode(input.consentMode);
  const continuity = preserveJourneyContinuity({
    guestEventAtMs: input.guestLastEventAtMs,
    authTransitionAtMs: input.authTransitionAtMs,
    sameSession: Boolean(sessionId && guestId && userId),
  });

  if (!guestId || !userId || !sessionId) {
    return {
      status: "blocked_missing_identity",
      linkId: null,
      identityConfidence: "unknown",
      preserveGuestHistory: Boolean(guestId || sessionId),
      canPromoteToExact: false,
      telemetryEvents: ["identity_handoff_attempted", "identity_handoff_failed"],
      debugLane: "identity_handoff",
      explanation: "Handoff failed without erasing guest history because guest, user, or session identity was missing.",
    };
  }

  if (consentMode === "necessary_only" || consentMode === "unknown") {
    return {
      status: "blocked_by_consent",
      linkId: null,
      identityConfidence: "weak",
      preserveGuestHistory: true,
      canPromoteToExact: false,
      telemetryEvents: ["identity_handoff_attempted", "identity_handoff_failed"],
      debugLane: "identity_handoff",
      explanation: "Consent blocks persistent identity linking; guest history remains guest-known.",
    };
  }

  const deterministicLinkId = clean(input.linkId);
  const linkId = deterministicLinkId ?? buildGuestUserIdentityLinkId({ guestId, userId, sessionId });
  return {
    status: deterministicLinkId ? "linked" : "inferred_guest_preserved",
    linkId,
    identityConfidence: deterministicLinkId ? "linked" : "inferred",
    preserveGuestHistory: continuity.continuous,
    canPromoteToExact: false,
    telemetryEvents: deterministicLinkId
      ? ["identity_handoff_attempted", "identity_handoff_completed"]
      : ["identity_handoff_attempted", "identity_handoff_failed"],
    debugLane: "identity_handoff",
    explanation: deterministicLinkId
      ? "Guest and signed-in identities are linked with deterministic evidence; continuity is preserved and duplicates are suppressed."
      : "Guest journey is preserved, but weak inferred handoff is not promoted to exact user truth.",
  };
}

export function suppressDuplicateHandoffAction(input: {
  guestEvent: { action: string; objectId?: string | null; occurredAtMs: number };
  signedInEvent: { action: string; objectId?: string | null; occurredAtMs: number };
}) {
  const sameAction = input.guestEvent.action === input.signedInEvent.action;
  const sameObject = clean(input.guestEvent.objectId) === clean(input.signedInEvent.objectId);
  const withinWindow = Math.abs(input.signedInEvent.occurredAtMs - input.guestEvent.occurredAtMs) <= HANDOFF_DUPLICATE_WINDOW_MS;
  return {
    suppress: sameAction && sameObject && withinWindow,
    reason: sameAction && sameObject && withinWindow ? "same_action_after_auth" : "distinct_action",
    dedupeKey: [input.guestEvent.action, clean(input.guestEvent.objectId) ?? "unknown", Math.floor(input.guestEvent.occurredAtMs / HANDOFF_DUPLICATE_WINDOW_MS)].join(":"),
  } as const;
}

export function classifyHandoffConfidence(input: HandoffDecision) {
  return input.identityConfidence;
}

export function explainHandoffDecision(input: HandoffDecision) {
  return input.explanation;
}

export function validateGuestUserHandoffRepair() {
  const failures: string[] = [];
  const linked = linkGuestToUser({
    guestId: "guest_validator",
    userId: "user_validator",
    sessionId: "session_validator",
    linkId: "link_validator",
    authTransitionAtMs: 1_000,
    guestLastEventAtMs: 900,
    consentMode: "minimal_analytics",
  });
  const weak = linkGuestToUser({
    guestId: "guest_weak",
    userId: "user_weak",
    sessionId: "session_weak",
    authTransitionAtMs: 1_000,
    guestLastEventAtMs: 900,
    consentMode: "minimal_analytics",
  });
  const duplicate = suppressDuplicateHandoffAction({
    guestEvent: { action: "semantic_page_viewed", objectId: "home", occurredAtMs: 1_000 },
    signedInEvent: { action: "semantic_page_viewed", objectId: "home", occurredAtMs: 1_500 },
  });
  if (!linked.preserveGuestHistory || linked.identityConfidence !== "linked") failures.push("deterministic link does not preserve guest history.");
  if (weak.canPromoteToExact || weak.identityConfidence === "exact") failures.push("weak guest identity promoted to exact.");
  if (!duplicate.suppress) failures.push("same handoff action is not duplicate-suppressed.");
  if (!linked.telemetryEvents.includes("identity_handoff_completed")) failures.push("handoff completed telemetry missing.");
  return failures;
}
