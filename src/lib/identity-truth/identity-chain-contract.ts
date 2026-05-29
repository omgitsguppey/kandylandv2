import type { ActorKind, IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import { buildGuestUserIdentityLinkId } from "@/lib/analytics/analytics-identity-link";

export const IDENTITY_CHAIN_CONTRACT_VERSION = "2026.05.identity-chain.1";

export const CANONICAL_IDENTITY_STATES = [
  "guest_unknown",
  "guest_known",
  "signed_in_user",
  "linked_guest_to_user",
  "creator_user",
  "admin_projection",
  "system",
  "legacy_unknown",
] as const;

export type CanonicalIdentityState = (typeof CANONICAL_IDENTITY_STATES)[number];
export type IdentitySourceTruth = "client_session" | "auth_context" | "event_envelope" | "identity_link" | "server_auth" | "legacy_recovery";
export type IdentityPrivacyClass = "telemetry_operational" | "telemetry_behavioral" | "user_private" | "admin_private" | "legacy_unknown";
export type IdentityCountScope = "global" | "guest" | "signed_in_user" | "linked_person" | "creator_role" | "admin_projection" | "system_only" | "excluded";

export interface IdentityChainInput {
  eventId: string;
  actorKind?: ActorKind | string | null;
  guestId?: string | null;
  sessionId?: string | null;
  consentState?: string | null;
  userId?: string | null;
  linkedPersonId?: string | null;
  linkId?: string | null;
  role?: string | null;
  identityState?: CanonicalIdentityState | string | null;
  identityConfidence?: IdentityConfidence | string | null;
  sourceTruth?: IdentitySourceTruth | string | null;
  privacyClass?: IdentityPrivacyClass | string | null;
}

export interface IdentityChainDecision {
  eventId: string;
  actorKind: ActorKind | "guest";
  identityState: CanonicalIdentityState;
  identityConfidence: IdentityConfidence;
  guestId: string | null;
  sessionId: string;
  userId: string | null;
  linkedPersonId: string | null;
  linkId: string | null;
  role: string | null;
  sourceTruth: IdentitySourceTruth;
  privacyClass: IdentityPrivacyClass;
  dedupeKey: string;
  journeyContinuityKey: string;
  countScopes: IdentityCountScope[];
  countsAsUserBehavior: boolean;
  explanation: string;
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isIdentityState(value: unknown): value is CanonicalIdentityState {
  return typeof value === "string" && CANONICAL_IDENTITY_STATES.includes(value as CanonicalIdentityState);
}

function normalizeIdentityState(input: IdentityChainInput): CanonicalIdentityState {
  if (isIdentityState(input.identityState)) return input.identityState;
  if (input.actorKind === "admin_projection" || clean(input.role) === "admin_projection") return "admin_projection";
  if (input.actorKind === "system") return "system";
  if (input.actorKind === "legacy_unknown") return "legacy_unknown";
  if (input.actorKind === "creator_user" || clean(input.role) === "creator") return "creator_user";
  if (clean(input.userId) && clean(input.guestId)) return "linked_guest_to_user";
  if (clean(input.userId)) return "signed_in_user";
  if (clean(input.guestId)) return "guest_known";
  return "guest_unknown";
}

function normalizeConfidence(input: IdentityChainInput, state: CanonicalIdentityState): IdentityConfidence {
  if (input.identityConfidence === "exact" || input.identityConfidence === "linked" || input.identityConfidence === "inferred" || input.identityConfidence === "weak" || input.identityConfidence === "unknown") {
    return input.identityConfidence;
  }
  if (state === "legacy_unknown") return "unknown";
  if (state === "linked_guest_to_user") return clean(input.linkId) || clean(input.linkedPersonId) ? "linked" : "inferred";
  if (state === "signed_in_user" || state === "creator_user" || state === "admin_projection" || state === "system") return "exact";
  if (state === "guest_known") return "weak";
  return "unknown";
}

function sourceTruth(input: IdentityChainInput): IdentitySourceTruth {
  return input.sourceTruth === "auth_context"
    || input.sourceTruth === "event_envelope"
    || input.sourceTruth === "identity_link"
    || input.sourceTruth === "server_auth"
    || input.sourceTruth === "legacy_recovery"
    ? input.sourceTruth
    : "client_session";
}

function privacyClass(input: IdentityChainInput, state: CanonicalIdentityState): IdentityPrivacyClass {
  if (input.privacyClass === "telemetry_behavioral" || input.privacyClass === "user_private" || input.privacyClass === "admin_private" || input.privacyClass === "legacy_unknown") {
    return input.privacyClass;
  }
  if (state === "admin_projection") return "admin_private";
  if (state === "legacy_unknown") return "legacy_unknown";
  return "telemetry_operational";
}

function countScopes(input: IdentityChainInput, state: CanonicalIdentityState, confidence: IdentityConfidence): IdentityCountScope[] {
  if (state === "admin_projection") return ["admin_projection"];
  if (state === "system") return ["system_only"];
  if (state === "legacy_unknown") return ["excluded"];
  if (state === "linked_guest_to_user" && confidence === "linked") return ["global", "signed_in_user", "linked_person"];
  if (state === "linked_guest_to_user") return ["global", "signed_in_user"];
  if (state === "creator_user") return ["global", "signed_in_user", "creator_role"];
  if (state === "signed_in_user") return ["global", "signed_in_user"];
  if (state === "guest_known") return ["global", "guest"];
  return clean(input.sessionId) ? ["global", "guest"] : ["excluded"];
}

export function resolveIdentityChain(input: IdentityChainInput): IdentityChainDecision {
  const state = normalizeIdentityState(input);
  const confidence = normalizeConfidence(input, state);
  const guestId = clean(input.guestId);
  const userId = clean(input.userId);
  const sessionId = clean(input.sessionId) ?? "unknown_session";
  const linkId = clean(input.linkId)
    ?? (state === "linked_guest_to_user" && guestId && userId && confidence === "linked"
      ? buildGuestUserIdentityLinkId({ guestId, userId, sessionId })
      : null);
  const linkedPersonId = clean(input.linkedPersonId) ?? (userId && state !== "legacy_unknown" ? userId : null);
  const scopes = countScopes({ ...input, linkId }, state, confidence);
  const actorKind = state === "creator_user"
    ? "creator_user"
    : state === "admin_projection"
      ? "admin_projection"
      : state === "system"
        ? "system"
        : userId
          ? "signed_in_user"
          : "guest";

  return {
    eventId: input.eventId,
    actorKind,
    identityState: state,
    identityConfidence: confidence,
    guestId,
    sessionId,
    userId,
    linkedPersonId,
    linkId,
    role: clean(input.role),
    sourceTruth: sourceTruth(input),
    privacyClass: privacyClass(input, state),
    dedupeKey: [input.eventId, linkId ?? userId ?? guestId ?? sessionId].join(":"),
    journeyContinuityKey: linkId ?? userId ?? guestId ?? sessionId,
    countScopes: scopes,
    countsAsUserBehavior: scopes.some((scope) => scope === "guest" || scope === "signed_in_user" || scope === "linked_person" || scope === "creator_role"),
    explanation: state === "creator_user"
      ? "Creator role is a signed-in user role overlay and does not create a second person."
      : state === "linked_guest_to_user"
        ? "Linked guest-to-user events count once globally and once for the linked person when deterministic link evidence exists."
        : state === "admin_projection"
          ? "Admin projection events are audit activity and never user behavior."
          : "Identity count decision follows canonical identity chain scope rules.",
  };
}

export function validateIdentityChainContract() {
  const failures: string[] = [];
  const admin = resolveIdentityChain({ eventId: "admin", actorKind: "admin_projection", sessionId: "s" });
  const creator = resolveIdentityChain({ eventId: "creator", actorKind: "creator_user", userId: "u", sessionId: "s", role: "creator" });
  const weakLinked = resolveIdentityChain({ eventId: "weak", guestId: "g", userId: "u", sessionId: "s", identityState: "linked_guest_to_user" });
  if (admin.countsAsUserBehavior) failures.push("admin projection counts as user behavior.");
  if (creator.countScopes.filter((scope) => scope === "signed_in_user").length !== 1 || creator.countScopes.includes("linked_person")) failures.push("creator role creates duplicate person.");
  if (weakLinked.countScopes.includes("linked_person")) failures.push("guest-to-user link lacks deterministic evidence.");
  if (!admin.explanation || !creator.explanation || !weakLinked.explanation) failures.push("count decision lacks explanation.");
  return failures;
}
