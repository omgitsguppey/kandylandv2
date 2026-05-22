import { buildGuestUserIdentityLinkId } from "@/lib/analytics/analytics-identity-link";
import {
  canPersistIdentityLink,
  canUseBehavioralSignals,
  normalizeConsentMode,
  type ConsentMode,
} from "@/lib/privacy/consent-tracking-policy";
import {
  ACTOR_KINDS,
  IDENTITY_STATES,
  LINK_REASON_VALUES,
  type ActorKind,
  type DoubleCountGuardResult,
  type EventIdentityEnvelope,
  type IdentityConfidence,
  type IdentityContext,
  type IdentityHandoffInput,
  type IdentityLinkCandidate,
  type IdentityState,
  type LegacyIdentityClassification,
  type LinkReason,
  type UnavailableGuestReason,
} from "./identity-handoff-contract";

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function lower(value: unknown) {
  return cleanString(value)?.toLowerCase() ?? "";
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function normalizeActorKind(value: unknown): ActorKind | null {
  return isOneOf(value, ACTOR_KINDS) ? value : null;
}

function normalizeIdentityState(value: unknown): IdentityState | null {
  return isOneOf(value, IDENTITY_STATES) ? value : null;
}

function normalizeLinkReason(value: unknown): LinkReason {
  return isOneOf(value, LINK_REASON_VALUES) ? value : "login";
}

function roleSet(input: Pick<IdentityHandoffInput, "roles" | "claims">) {
  const roles = new Set((input.roles ?? []).map((role) => role.toLowerCase()));
  const claims = input.claims ?? {};
  if (claims.admin === true || claims.owner === true) roles.add("admin");
  if (claims.creator === true || typeof claims.creatorId === "string" || typeof claims.creatorUid === "string") {
    roles.add("creator");
  }
  return roles;
}

function isProjection(input: IdentityHandoffInput) {
  const actorKind = normalizeActorKind(input.actorKind);
  const projectionMode = lower(input.projectionMode);
  const performedAs = lower(input.performedAs);
  return actorKind === "admin_projection"
    || projectionMode.includes("projection")
    || projectionMode.includes("admin_view")
    || performedAs === "admin_view_as_creator"
    || performedAs === "admin_on_behalf"
    || performedAs === "owner_override";
}

function resolveActorKind(input: IdentityHandoffInput, state: IdentityState): ActorKind {
  const explicitActor = normalizeActorKind(input.actorKind);
  if (explicitActor) return explicitActor;
  if (state === "legacy_unknown") return "legacy_unknown";
  if (isProjection(input)) return "admin_projection";
  if (input.systemGenerated === true) return "system";
  if (state === "admin_authenticated") return "admin";
  if (state === "creator_logged_in") return "creator_user";
  if (state === "logged_in_unlinked" || state === "logged_in_linked_guest" || state === "signup_completed_unlinked") {
    return "signed_in_user";
  }
  return "guest";
}

function resolveUnavailableGuestReason(input: {
  actorKind: ActorKind;
  guestId: string | null;
  consentMode: ConsentMode;
  legacyUnknown?: boolean | null;
}): UnavailableGuestReason {
  if (input.guestId) return null;
  if (input.legacyUnknown || input.actorKind === "legacy_unknown") return "guest_id_unavailable_legacy";
  if (input.actorKind === "guest" && (input.consentMode === "necessary_only" || input.consentMode === "unknown")) {
    return "guest_id_unavailable_due_to_consent";
  }
  if (input.actorKind === "guest") return "guest_id_not_created";
  return null;
}

function confidenceFor(input: {
  actorKind: ActorKind;
  state: IdentityState;
  userId: string | null;
  guestId: string | null;
  linkId: string | null;
}): IdentityConfidence {
  if (input.state === "legacy_unknown" || input.actorKind === "legacy_unknown") return "unknown";
  if (input.state === "logged_in_linked_guest" && input.userId && input.guestId && input.linkId) return "linked";
  if (input.actorKind === "admin" || input.actorKind === "system" || input.actorKind === "creator_user") return "exact";
  if (input.userId) return "exact";
  if (input.guestId) return "weak";
  return "unknown";
}

function includeInUserBehavior(input: {
  actorKind: ActorKind;
  state: IdentityState;
  consentMode: ConsentMode;
}) {
  if (
    input.actorKind === "admin"
    || input.actorKind === "admin_projection"
    || input.actorKind === "system"
    || input.actorKind === "legacy_unknown"
    || input.state === "legacy_unknown"
  ) {
    return false;
  }
  return canUseBehavioralSignals(input.consentMode);
}

export function resolveCurrentIdentityState(input: IdentityHandoffInput): IdentityState {
  const explicitState = normalizeIdentityState(input.identityState);
  if (explicitState) return explicitState;
  if (input.legacyUnknown) return "legacy_unknown";
  if (input.systemGenerated === true) return "legacy_unknown";
  if (isProjection(input)) return "admin_authenticated";

  const roles = roleSet(input);
  if (roles.has("admin") || normalizeActorKind(input.actorKind) === "admin") return "admin_authenticated";
  if (roles.has("creator") || normalizeActorKind(input.actorKind) === "creator_user") return "creator_logged_in";

  const userId = cleanString(input.userId);
  const guestId = cleanString(input.guestId);
  const linkId = cleanString(input.linkId);
  const transition = lower(input.authTransition);

  if (!userId && transition === "signup_started") return "signup_started";
  if (userId && transition === "signup_completed" && !linkId) return "signup_completed_unlinked";
  if (userId && (linkId || (guestId && transition === "login_completed" && linkId))) return "logged_in_linked_guest";
  if (userId) return "logged_in_unlinked";

  const consentMode = normalizeConsentMode(input.consentMode);
  if (consentMode === "full_behavioral") return "guest_full_behavioral";
  if (consentMode === "minimal_analytics" || consentMode === "full_analytics") return "guest_minimal_analytics";
  if (consentMode === "necessary_only") return "guest_necessary_only";
  return "guest_unknown_consent";
}

export function buildGuestIdentityContext(input: IdentityHandoffInput): IdentityContext {
  return buildIdentityContext({
    ...input,
    userId: null,
  });
}

export function buildSignedInIdentityContext(input: IdentityHandoffInput): IdentityContext {
  return buildIdentityContext(input);
}

function buildIdentityContext(input: IdentityHandoffInput): IdentityContext {
  const consentMode = normalizeConsentMode(input.consentMode);
  const identityState = resolveCurrentIdentityState({ ...input, consentMode });
  const actorKind = resolveActorKind(input, identityState);
  const guestId = cleanString(input.guestId);
  const userId = cleanString(input.userId);
  const linkId = cleanString(input.linkId);
  const sessionId = cleanString(input.sessionId) ?? "unknown_session";
  const identityConfidence = confidenceFor({ actorKind, state: identityState, userId, guestId, linkId });
  const includeBehavior = includeInUserBehavior({ actorKind, state: identityState, consentMode });

  return {
    actorKind,
    identityState,
    identityConfidence,
    consentMode,
    sessionId,
    guestId,
    userId,
    linkId,
    unavailableGuestReason: resolveUnavailableGuestReason({
      actorKind,
      guestId,
      consentMode,
      legacyUnknown: input.legacyUnknown,
    }),
    includeInUserBehavior: includeBehavior,
    ...(actorKind === "creator_user"
      ? { creatorRoleMetadata: { role: "creator" as const, countedAsUserBehavior: true as const } }
      : {}),
  };
}

export function buildIdentityLinkCandidate(input: {
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  consentMode?: ConsentMode | string | null;
  reason?: LinkReason | string | null;
}): IdentityLinkCandidate {
  const guestId = cleanString(input.guestId);
  const userId = cleanString(input.userId);
  const sessionId = cleanString(input.sessionId);
  const consentMode = normalizeConsentMode(input.consentMode);
  const reason = normalizeLinkReason(input.reason);
  const hasRequiredIdentity = Boolean(guestId && userId && sessionId);
  const canLink = hasRequiredIdentity && canPersistIdentityLink(consentMode);
  const linkId = hasRequiredIdentity
    ? buildGuestUserIdentityLinkId({ guestId: guestId!, userId: userId!, sessionId: sessionId! })
    : null;

  return {
    guestId,
    userId,
    sessionId,
    linkId,
    reason,
    consentMode,
    canLink,
    personLevelBehaviorAllowed: canLink && canUseBehavioralSignals(consentMode),
    blockedReason: !hasRequiredIdentity
      ? "missing_guest_or_user_identity"
      : canLink
        ? null
        : "consent_blocks_identity_link",
  };
}

export function shouldLinkGuestToUser(input: IdentityLinkCandidate | Parameters<typeof buildIdentityLinkCandidate>[0]) {
  const candidate = "canLink" in input ? input : buildIdentityLinkCandidate(input);
  return candidate.canLink;
}

export function buildEventIdentityEnvelope(input: IdentityHandoffInput & {
  eventName: string;
  linkReason?: LinkReason | string | null;
}): EventIdentityEnvelope {
  const context = buildIdentityContext(input);
  const linkCandidate = context.guestId && context.userId
    ? buildIdentityLinkCandidate({
      guestId: context.guestId,
      userId: context.userId,
      sessionId: context.sessionId,
      consentMode: context.consentMode,
      reason: input.linkReason,
    })
    : null;

  return {
    ...context,
    eventName: input.eventName,
    ...(input.linkReason ? { linkReason: normalizeLinkReason(input.linkReason) } : {}),
    linkCandidate,
  };
}

export function preventGuestUserDoubleCount(input: {
  eventId: string;
  actorKind: ActorKind | string;
  identityState: IdentityState | string;
  guestId?: string | null;
  userId?: string | null;
  linkId?: string | null;
  sessionId?: string | null;
}): DoubleCountGuardResult {
  const actorKind = normalizeActorKind(input.actorKind) ?? "legacy_unknown";
  const identityState = normalizeIdentityState(input.identityState) ?? "legacy_unknown";
  const guestId = cleanString(input.guestId);
  const userId = cleanString(input.userId);
  const sessionId = cleanString(input.sessionId);

  if (actorKind === "admin_projection" || actorKind === "admin") {
    return {
      eventId: input.eventId,
      canonicalCountKey: "excluded:admin_projection",
      countAsGuest: false,
      countAsUser: false,
      includeInUserBehavior: false,
      suppressedDuplicateKey: null,
      reason: "admin_projection_excluded",
    };
  }

  if (actorKind === "system") {
    return {
      eventId: input.eventId,
      canonicalCountKey: "excluded:system",
      countAsGuest: false,
      countAsUser: false,
      includeInUserBehavior: false,
      suppressedDuplicateKey: null,
      reason: "system_excluded",
    };
  }

  if (actorKind === "legacy_unknown" || identityState === "legacy_unknown") {
    return {
      eventId: input.eventId,
      canonicalCountKey: "excluded:legacy_unknown",
      countAsGuest: false,
      countAsUser: false,
      includeInUserBehavior: false,
      suppressedDuplicateKey: null,
      reason: "legacy_unknown_excluded",
    };
  }

  if (identityState === "logged_in_linked_guest" && userId) {
    return {
      eventId: input.eventId,
      canonicalCountKey: `user:${userId}`,
      countAsGuest: false,
      countAsUser: true,
      includeInUserBehavior: true,
      suppressedDuplicateKey: guestId ? `guest:${guestId}` : null,
      reason: "linked_guest_attributed_to_user",
    };
  }

  if (userId) {
    return {
      eventId: input.eventId,
      canonicalCountKey: `user:${userId}`,
      countAsGuest: false,
      countAsUser: true,
      includeInUserBehavior: true,
      suppressedDuplicateKey: null,
      reason: "user_only",
    };
  }

  if (guestId || sessionId) {
    return {
      eventId: input.eventId,
      canonicalCountKey: `guest:${guestId ?? sessionId}`,
      countAsGuest: true,
      countAsUser: false,
      includeInUserBehavior: true,
      suppressedDuplicateKey: null,
      reason: "guest_only",
    };
  }

  return {
    eventId: input.eventId,
    canonicalCountKey: "excluded:identity_unavailable",
    countAsGuest: false,
    countAsUser: false,
    includeInUserBehavior: false,
    suppressedDuplicateKey: null,
    reason: "identity_unavailable",
  };
}

export function classifyLegacyIdentity(input: {
  eventName?: string | null;
  userId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
}): LegacyIdentityClassification {
  return {
    actorKind: "legacy_unknown",
    identityState: "legacy_unknown",
    identityConfidence: "unknown",
    userId: null,
    guestId: null,
    sessionId: cleanString(input.sessionId),
    canPromoteToExactUser: false,
    recoveryReason: "legacy_recovery",
  };
}
