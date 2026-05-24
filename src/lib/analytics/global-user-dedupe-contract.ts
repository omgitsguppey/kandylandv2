import type {
  IdentityConfidence,
  IdentityState,
} from "@/lib/analytics/identity-handoff-contract";

export const GLOBAL_USER_DEDUPE_CONTRACT_VERSION = "2026.05.global-user-dedupe.1";

export const GLOBAL_USER_DEDUPE_SCOPES = [
  "event",
  "session",
  "person",
  "global",
  "materializer",
  "export",
] as const;

export type GlobalUserDedupeScope = (typeof GLOBAL_USER_DEDUPE_SCOPES)[number];

export type GlobalAggregationPolicy = "count_once" | "exclude_projection" | "archive_only";
export type UserAggregationPolicy = "best_identity_wins" | "linked_user_wins" | "exclude_unknown_legacy";
export type SqlAggregationPolicy = "preserve_raw_fact_normalized_summary" | "normalized_summary_only";
export type ReplaySafetyPolicy = "idempotency_key_required" | "event_id_or_idempotency_key" | "unsafe_missing_key";

export type DuplicateRisk =
  | "none"
  | "linked_guest_user_duplicate_risk_suppressed"
  | "retry_replay_suppressed"
  | "unknown_legacy_archived"
  | "identity_confidence_too_low"
  | "missing_identity_context";

export type DedupeDecisionReason =
  | "count_unique_action_once"
  | "linked_guest_attributed_to_user"
  | "retry_replay_not_counted"
  | "unknown_legacy_archived"
  | "identity_confidence_too_low"
  | "missing_identity_context";

export interface GlobalUserDedupeInput {
  eventId: string;
  sessionId?: string | null;
  guestId?: string | null;
  userId?: string | null;
  linkedPersonId?: string | null;
  linkId?: string | null;
  eventName: string;
  featureId?: string | null;
  surface?: string | null;
  identityState?: IdentityState | string | null;
  identityConfidence?: IdentityConfidence | string | null;
  dedupeScope?: GlobalUserDedupeScope | null;
  idempotencyKey?: string | null;
  replayOfEventId?: string | null;
  retryAttempt?: number | null;
  legacyUnknown?: boolean | null;
}

export interface AggregationCountDecision {
  count: boolean;
  policy: string;
  dedupeKey: string;
  reason: DedupeDecisionReason;
}

export interface GlobalUserParityFields {
  globalAggregationPolicy: GlobalAggregationPolicy;
  userAggregationPolicy: UserAggregationPolicy;
  sqlAggregationPolicy: SqlAggregationPolicy;
  replaySafety: ReplaySafetyPolicy;
  duplicateRisk: DuplicateRisk;
  identityConfidence: IdentityConfidence;
}

export interface GlobalUserDedupeDebugDecision {
  lane: "Global vs user dedupe";
  defaultVisible: boolean;
  explanation: string;
  nextAction: string;
}

export interface GlobalUserDedupeDecision {
  input: GlobalUserDedupeInput;
  dedupeScope: GlobalUserDedupeScope;
  dedupeKey: string;
  global: AggregationCountDecision;
  guest: AggregationCountDecision;
  user: AggregationCountDecision;
  linkedPerson: AggregationCountDecision;
  sql: AggregationCountDecision;
  globalUserParity: GlobalUserParityFields;
  duplicateRisk: DuplicateRisk;
  suppressedDuplicateKeys: string[];
  debug: GlobalUserDedupeDebugDecision;
}

export interface GlobalUserDedupeDebugLane {
  label: "Global vs user dedupe";
  duplicateRiskCount: number;
  linkedGuestUserDedupeHealth: "healthy" | "degraded";
  globalUserMismatchCount: number;
  sqlExportParityStatus: "mapped" | "missing";
  unknownLegacyCount: number;
  rawDetailsDefaultOpen: false;
}
