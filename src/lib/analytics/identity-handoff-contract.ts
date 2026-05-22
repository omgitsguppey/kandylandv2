import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const ACTOR_KINDS = [
  "guest",
  "signed_in_user",
  "creator_user",
  "admin",
  "admin_projection",
  "system",
  "legacy_unknown",
] as const;

export type ActorKind = (typeof ACTOR_KINDS)[number];

export const IDENTITY_STATES = [
  "guest_unknown_consent",
  "guest_necessary_only",
  "guest_minimal_analytics",
  "guest_full_behavioral",
  "signup_started",
  "signup_completed_unlinked",
  "logged_in_unlinked",
  "logged_in_linked_guest",
  "creator_logged_in",
  "admin_authenticated",
  "legacy_unknown",
] as const;

export type IdentityState = (typeof IDENTITY_STATES)[number];

export const IDENTITY_CONFIDENCE_VALUES = [
  "exact",
  "linked",
  "inferred",
  "weak",
  "unknown",
] as const;

export type IdentityConfidence = (typeof IDENTITY_CONFIDENCE_VALUES)[number];

export const LINK_REASON_VALUES = [
  "signup",
  "login",
  "consent_upgrade",
  "session_restore",
  "legacy_recovery",
] as const;

export type LinkReason = (typeof LINK_REASON_VALUES)[number];

export type UnavailableGuestReason =
  | "guest_id_unavailable_due_to_consent"
  | "guest_id_unavailable_legacy"
  | "guest_id_not_created"
  | null;

export interface IdentityHandoffInput {
  actorKind?: ActorKind | string | null;
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  linkId?: string | null;
  identityState?: IdentityState | string | null;
  consentMode?: ConsentMode | string | null;
  roles?: readonly string[] | null;
  claims?: Record<string, unknown> | null;
  authTransition?: "signup_started" | "signup_completed" | "login_completed" | "logout" | string | null;
  projectionMode?: string | null;
  performedAs?: string | null;
  systemGenerated?: boolean | null;
  legacyUnknown?: boolean | null;
}

export interface IdentityContext {
  actorKind: ActorKind;
  identityState: IdentityState;
  identityConfidence: IdentityConfidence;
  consentMode: ConsentMode;
  sessionId: string;
  guestId: string | null;
  userId: string | null;
  linkId: string | null;
  unavailableGuestReason: UnavailableGuestReason;
  includeInUserBehavior: boolean;
  creatorRoleMetadata?: {
    role: "creator";
    countedAsUserBehavior: true;
  };
}

export interface IdentityLinkCandidate {
  guestId: string | null;
  userId: string | null;
  sessionId: string | null;
  linkId: string | null;
  reason: LinkReason;
  consentMode: ConsentMode;
  canLink: boolean;
  personLevelBehaviorAllowed: boolean;
  blockedReason: "missing_guest_or_user_identity" | "consent_blocks_identity_link" | null;
}

export interface EventIdentityEnvelope extends IdentityContext {
  eventName: string;
  linkReason?: LinkReason;
  linkCandidate?: IdentityLinkCandidate | null;
}

export interface DoubleCountGuardResult {
  eventId: string;
  canonicalCountKey: string;
  countAsGuest: boolean;
  countAsUser: boolean;
  includeInUserBehavior: boolean;
  suppressedDuplicateKey: string | null;
  reason:
    | "linked_guest_attributed_to_user"
    | "guest_only"
    | "user_only"
    | "admin_projection_excluded"
    | "legacy_unknown_excluded"
    | "system_excluded"
    | "identity_unavailable";
}

export interface LegacyIdentityClassification {
  actorKind: "legacy_unknown";
  identityState: "legacy_unknown";
  identityConfidence: "unknown";
  userId: null;
  guestId: null;
  sessionId: string | null;
  canPromoteToExactUser: false;
  recoveryReason: "legacy_recovery";
}
