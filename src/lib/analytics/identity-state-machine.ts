import type { AnalyticsConsentState } from "@/lib/analytics/analytics-event-contract";
import {
  canPersistIdentityLink,
  canUseBehavioralSignals,
  normalizeConsentMode,
  type ConsentMode,
} from "@/lib/privacy/consent-tracking-policy";

export const IDENTITY_HANDOFF_STATES = [
  "guest_unknown_consent",
  "guest_necessary_only",
  "guest_minimal",
  "guest_behavioral",
  "signup_pending",
  "user_logged_in",
  "user_logged_in_linked_guest",
  "creator_user",
  "admin_projection",
  "legacy_unknown",
] as const;

export type IdentityHandoffState = (typeof IDENTITY_HANDOFF_STATES)[number];

export const IDENTITY_HANDOFF_TRANSITIONS = [
  "page_visit",
  "consent_accept_all",
  "consent_minimal",
  "consent_decline",
  "signup_start",
  "signup_success",
  "login_success",
  "logout",
  "consent_changed",
  "account_deleted",
] as const;

export type IdentityHandoffTransition = (typeof IDENTITY_HANDOFF_TRANSITIONS)[number];

export type IdentityHandoffInput = {
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  identityLinkId?: string | null;
  consentMode?: ConsentMode | string | null;
  transition?: IdentityHandoffTransition | string | null;
  actorType?: string | null;
  projectionMode?: string | null;
  legacyUnknown?: boolean;
};

export type IdentityHandoffTransitionResult = {
  state: IdentityHandoffState;
  previousState: IdentityHandoffState;
  transition: IdentityHandoffTransition;
  guestId: string | null;
  userId: string | null;
  sessionId: string | null;
  identityLinkId: string | null;
  consentMode: ConsentMode;
  personLevelBehaviorAllowed: boolean;
};

export type IdentityHandoffEventContext = {
  guestId?: string;
  userId?: string;
  sessionId: string;
  identityLinkId?: string;
  consentMode: ConsentMode;
  identityState: IdentityHandoffState;
  personLevelBehaviorAllowed: boolean;
  identityLinkPersistenceAllowed: boolean;
};

export function resolveIdentityHandoffState(input: IdentityHandoffInput): IdentityHandoffState {
  if (input.legacyUnknown) {
    return "legacy_unknown";
  }

  const actorType = `${input.actorType ?? ""}`.toLowerCase();
  const projectionMode = `${input.projectionMode ?? ""}`.toLowerCase();
  if (actorType === "admin" || actorType === "owner_admin" || projectionMode.includes("projection") || projectionMode.includes("admin_view")) {
    return "admin_projection";
  }
  if (actorType === "creator") {
    return "creator_user";
  }
  if (input.transition === "signup_start") {
    return "signup_pending";
  }

  const userId = input.userId?.trim();
  const identityLinkId = input.identityLinkId?.trim();
  if (userId && identityLinkId) {
    return "user_logged_in_linked_guest";
  }
  if (userId) {
    return "user_logged_in";
  }

  const consentMode = normalizeConsentMode(input.consentMode);
  if (consentMode === "full_behavioral") return "guest_behavioral";
  if (consentMode === "minimal_analytics") return "guest_minimal";
  if (consentMode === "necessary_only") return "guest_necessary_only";
  return "guest_unknown_consent";
}

export function transitionIdentityHandoffState(
  previousState: IdentityHandoffState,
  transition: IdentityHandoffTransition,
  input: Omit<IdentityHandoffInput, "transition"> = {},
): IdentityHandoffTransitionResult {
  const consentMode = normalizeConsentMode(input.consentMode);
  const state = resolveIdentityHandoffState({
    ...input,
    transition,
    legacyUnknown: transition === "account_deleted" ? false : input.legacyUnknown,
  });

  return {
    state: transition === "logout" || transition === "account_deleted"
      ? resolveIdentityHandoffState({ consentMode })
      : state,
    previousState,
    transition,
    guestId: input.guestId?.trim() || null,
    userId: input.userId?.trim() || null,
    sessionId: input.sessionId?.trim() || null,
    identityLinkId: input.identityLinkId?.trim() || null,
    consentMode,
    personLevelBehaviorAllowed: Boolean(input.userId && input.identityLinkId && canUseBehavioralSignals(consentMode)),
  };
}

export function consentModeToIdentityLinkConsentState(consentMode: ConsentMode): AnalyticsConsentState {
  if (consentMode === "full_behavioral") return "granted";
  if (consentMode === "full_analytics") return "partial";
  return "denied";
}

export function resolveIdentityLinkConfidence(consentMode: ConsentMode) {
  if (consentMode === "full_behavioral") {
    return {
      mergeAllowed: true,
      personLevelBehaviorAllowed: true,
      linkageConfidence: 0.95,
      linkageConfidenceSource: "full_behavioral_consent" as const,
    };
  }
  if (canPersistIdentityLink(consentMode)) {
    return {
      mergeAllowed: true,
      personLevelBehaviorAllowed: false,
      linkageConfidence: 0.8,
      linkageConfidenceSource: "identity_link_allowed_behavior_blocked" as const,
    };
  }

  return {
    mergeAllowed: false,
    personLevelBehaviorAllowed: false,
    linkageConfidence: 0,
    linkageConfidenceSource: "blocked_by_consent_mode" as const,
  };
}

export function buildIdentityHandoffEventContext(input: IdentityHandoffInput): IdentityHandoffEventContext {
  const consentMode = normalizeConsentMode(input.consentMode);
  const identityState = resolveIdentityHandoffState({ ...input, consentMode });
  const sessionId = input.sessionId?.trim() || "unknown_session";
  const identityLinkId = input.identityLinkId?.trim() || undefined;
  const userId = input.userId?.trim() || undefined;
  const guestId = input.guestId?.trim() || undefined;

  return {
    ...(guestId ? { guestId } : {}),
    ...(userId ? { userId } : {}),
    sessionId,
    ...(identityLinkId ? { identityLinkId } : {}),
    consentMode,
    identityState,
    personLevelBehaviorAllowed: Boolean(userId && identityLinkId && canUseBehavioralSignals(consentMode)),
    identityLinkPersistenceAllowed: canPersistIdentityLink(consentMode),
  };
}
