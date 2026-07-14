import type { ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION } from "@/lib/analytics/identity-link-contract";
import type { BehavioralConsentState } from "@/lib/behavioral/behavioral-timeline-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";
import type { PersonMetricCounts } from "@/lib/analytics/person-metrics-contract";

export type UserTrackingConfidenceLabel = "insufficient" | "directional" | "usable" | "strong" | "verified";

export type UserTrackingDataAvailabilityReason =
  | "available"
  | "privacy_limited"
  | "insufficient_signal"
  | "guest_only"
  | "legacy_fallback"
  | "materializer_missing"
  | "materializer_stale"
  | "source_disagreement";

export type UserTrackingIndex = {
  userId: string;
  updatedAtMs: number;
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
  sourceTruth: "canonical" | "materialized" | "legacy_fallback";
  confidence: number;
  confidenceLabel: UserTrackingConfidenceLabel;
  dataAvailabilityReason: UserTrackingDataAvailabilityReason;
  actionCounts: {
    total: number;
    meaningful: number;
    drops: number;
    watch: number;
    wallet: number;
    purchase: number;
    creator: number;
    chat: number;
    support: number;
    notification: number;
  };
  lastSeenAtMs: number;
  lastMeaningfulActionAtMs: number;
  sourceBreakdown: Record<string, number>;
  personMetricCounts: PersonMetricCounts;
  issues: string[];
};

export type GuestTrackingIndex = Omit<UserTrackingIndex, "userId"> & {
  anonymousVisitorId: string;
};

export type UserEntityAffinityIndex = {
  userId: string;
  topCreators: Array<{ creatorId: string; score: number; reasons: string[] }>;
  topCategories: Array<{ category: string; score: number; reasons: string[] }>;
  topDrops: Array<{ dropId: string; score: number; reasons: string[] }>;
  suppressions: Array<{ entityType: string; entityId: string; score: number; reason: string }>;
  updatedAtMs: number;
};

export type UserIndexMetricAvailability = "available" | "partial" | "source_missing";

export type UserValueIndex = {
  userId: string;
  verifiedSpendUsd: number | null;
  purchaseCount: number;
  paidGdPurchased: number | null;
  rewardGdEarned: number | null;
  unlockCountAfterPurchase: number | null;
  valueScore: number | null;
  valueTier: "observer" | "warm" | "buyer" | "repeat_buyer" | "vip" | null;
  sourceTruth: "server_transaction" | "behavioral_timeline_projection" | "legacy_fallback" | "source_missing";
  dataAvailabilityReason: UserIndexMetricAvailability;
  issues: string[];
  updatedAtMs: number;
};

export type UserJourneyIndex = {
  userId?: string;
  anonymousVisitorId?: string;
  sessionIds: string[];
  firstSeenAtMs: number;
  signedUpAtMs?: number;
  onboardedAtMs?: number;
  firstPurchaseAtMs?: number;
  firstUnlockAtMs?: number;
  firstMessageAtMs?: number;
  guestToUserLinked: boolean;
  identityLinkId?: string;
  funnelStage:
    | "guest"
    | "signed_up"
    | "onboarded"
    | "checked_in"
    | "previewed"
    | "purchased"
    | "unwrapped"
    | "viewed"
    | "messaged";
  updatedAtMs: number;
};

export type UserNotificationIndex = {
  userId: string;
  notificationReadCount: number;
  notificationOpenCount: number;
  lastNotificationReadAtMs: number;
  updatedAtMs: number;
};

export type UserContentConsumptionIndex = {
  userId: string;
  validWatchTimeMs: number | null;
  viewedFileCount: number;
  completedFileCount: number | null;
  openedDropCount: number;
  unwrappedDropCount: number;
  watchScoreSource: "watch_session_rollup" | "partial_watch" | "legacy_page_duration" | "source_missing";
  watchConfidence: number;
  dataAvailabilityReason: UserIndexMetricAvailability;
  issues: string[];
  updatedAtMs: number;
};

export type IdentityLineageIndex = {
  identityLinkId: string;
  ownerKeyVersion: typeof ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION;
  userId: string;
  anonymousVisitorId: string;
  sessionIds: string[];
  linkedAtMs: number;
  consentState: BehavioralConsentState;
  consentMode: ConsentMode;
  mergeAllowed: boolean;
  personLevelBehaviorAllowed: boolean;
  confidence: number;
  linkageConfidenceSource:
    | "full_behavioral_consent"
    | "identity_link_allowed_behavior_blocked"
    | "blocked_by_consent_mode";
  updatedAtMs: number;
};

export const USER_INDEX_COLLECTIONS = {
  userTrackingIndexes: "user_tracking_indexes",
  guestTrackingIndexes: "guest_tracking_indexes",
  userEntityAffinityIndexes: "user_entity_affinity_indexes",
  userValueIndexes: "user_value_indexes",
  userJourneyIndexes: "user_journey_indexes",
  userNotificationIndexes: "user_notification_indexes",
  userContentConsumptionIndexes: "user_content_consumption_indexes",
  identityLineageIndexes: "identity_lineage_indexes",
  userIndexMaterializerRequests: "user_index_materializer_requests",
  userIndexMaterializerWindows: "user_index_materializer_windows",
  userIndexMaterializerState: "user_index_materializer_state",
  userIndexShadowPublications: "user_index_shadow_publications",
} as const;

export const USER_INDEX_MATERIALIZER_CONTRACT_VERSION = "2026.07.user-index-materializer.v3";
export const USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID = "activation";
export const USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN = 5;
export const USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT = 200;
export const USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY = 50;
export const USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS = 25;
export const USER_INDEX_MATERIALIZER_MAX_ATTEMPTS = 8;
export const USER_INDEX_MATERIALIZER_LINKED_COPY_WINDOW_MS = 10_000;
export const USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const USER_INDEX_MATERIALIZER_SHADOW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE = "materializer_subject_truncated" as const;

export type UserIndexMaterializerPublicationIssueCode =
  typeof USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE;

export type UserIndexMaterializerMode = "off" | "shadow" | "active";
export type UserIndexMaterializerSubjectKind = "user" | "guest";
export type UserIndexMaterializerRequestState =
  | "queued"
  | "leased"
  | "retry_wait"
  | "completed"
  | "failed"
  | "superseded";

export type UserIndexMaterializerOutboxRequest = {
  requestId: string;
  subjectKind: UserIndexMaterializerSubjectKind;
  subjectId: string;
  sourceFingerprint: string;
  materializerVersion: string;
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
  maxFacts: number;
  state: UserIndexMaterializerRequestState;
  attemptCount: number;
  nextAttemptAtMs: number;
  leaseOwner?: string | null;
  leaseExpiresAtMs?: number | null;
  pendingSourceWindowStartMs?: number | null;
  pendingSourceWindowEndMs?: number | null;
  processedThroughMs?: number | null;
  lastSafeErrorCode?: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  completedAtMs?: number | null;
  expiresAtMs: number;
};

export type UserIndexMaterializerExclusionCounts = {
  exactReplayExcludedCount: number;
  linkedCopyExcludedCount: number;
  identityConflictExcludedCount: number;
  lineageBlockedCount: number;
  adminExcludedCount: number;
  systemExcludedCount: number;
};

export type UserIndexMaterializerWindowReceipt = {
  windowId: string;
  mode: Exclude<UserIndexMaterializerMode, "off">;
  sourceFingerprint: string;
  materializerVersion: string;
  startedAtMs: number;
  completedAtMs: number;
  requestsClaimed: number;
  requestsCompleted: number;
  requestsFailed: number;
  leaseLostCount: number;
  factsRead: number;
  factsPublished: number;
  exclusions: UserIndexMaterializerExclusionCounts;
  truncatedSubjectCount: number;
  runtimeCapReached: boolean;
  clean: boolean;
  expiresAtMs: number;
};

export type UserIndexMaterializerActivationState = {
  documentId: string;
  sourceFingerprint: string;
  materializerVersion: string;
  consecutiveCleanShadowWindowIds: string[];
  latestShadowWindowId: string | null;
  latestShadowCompletedAtMs: number;
  latestShadowWindowClean: boolean;
  updatedAtMs: number;
};

export type UserIndexPublicationBundle =
  | {
    subjectKind: "user";
    subjectId: string;
    trackingIndex: UserTrackingIndex;
    entityAffinityIndex: UserEntityAffinityIndex;
    valueIndex: UserValueIndex;
    journeyIndex: UserJourneyIndex;
    notificationIndex: UserNotificationIndex;
    contentConsumptionIndex: UserContentConsumptionIndex;
  }
  | {
    subjectKind: "guest";
    subjectId: string;
    guestTrackingIndex: GuestTrackingIndex;
    journeyIndex: UserJourneyIndex;
  };

export type UserIndexShadowPublication = {
  requestId: string;
  subjectKind: UserIndexMaterializerSubjectKind;
  subjectId: string;
  sourceFingerprint: string;
  materializerVersion: string;
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
  publishedAtMs: number;
  factsRead: number;
  factsPublished: number;
  isPotentiallyTruncated: boolean;
  issueCodes: UserIndexMaterializerPublicationIssueCode[];
  exclusions: UserIndexMaterializerExclusionCounts;
  bundle: UserIndexPublicationBundle;
  expiresAtMs: number;
};

export type UserIndexMaterializerReadReason = "materializer_missing" | "source_missing";

export type UserIndexMaterializerReadResult<T> =
  | {
    status: "ready";
    source: "active_v2";
    reason: null;
    data: T;
  }
  | {
    status: "fallback";
    source: "legacy_fallback";
    reason: UserIndexMaterializerReadReason;
    data: T | null;
  };

export function parseUserIndexMaterializerMode(value: unknown): UserIndexMaterializerMode {
  return value === "shadow" || value === "active" ? value : "off";
}

export function isUserIndexMaterializerActivationReady(input: {
  state: UserIndexMaterializerActivationState | null | undefined;
  sourceFingerprint: string;
}) {
  const state = input.state;
  return Boolean(
    state
    && input.sourceFingerprint
    && state.sourceFingerprint === input.sourceFingerprint
    && state.materializerVersion === USER_INDEX_MATERIALIZER_CONTRACT_VERSION
    && state.latestShadowWindowClean
    && Array.isArray(state.consecutiveCleanShadowWindowIds)
    && state.consecutiveCleanShadowWindowIds.length >= 2
    && new Set(state.consecutiveCleanShadowWindowIds.slice(-2)).size === 2
    && state.latestShadowWindowId === state.consecutiveCleanShadowWindowIds.at(-1),
  );
}
