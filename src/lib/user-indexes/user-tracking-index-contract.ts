export type UserTrackingConfidenceLabel = "insufficient" | "directional" | "usable" | "strong" | "verified";

export type UserTrackingDataAvailabilityReason =
  | "available"
  | "privacy_limited"
  | "insufficient_signal"
  | "guest_only"
  | "legacy_fallback"
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

export type UserValueIndex = {
  userId: string;
  verifiedSpendUsd: number;
  purchaseCount: number;
  paidGdPurchased: number;
  rewardGdEarned: number;
  unlockCountAfterPurchase: number;
  valueScore: number;
  valueTier: "observer" | "warm" | "buyer" | "repeat_buyer" | "vip";
  sourceTruth: "server_transaction" | "materialized" | "legacy_fallback";
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
  validWatchTimeMs: number;
  viewedFileCount: number;
  completedFileCount: number;
  openedDropCount: number;
  unwrappedDropCount: number;
  watchScoreSource: "watch_session_rollup" | "partial_watch" | "legacy_page_duration";
  watchConfidence: number;
  issues: string[];
  updatedAtMs: number;
};

export type IdentityLineageIndex = {
  identityLinkId: string;
  userId: string;
  anonymousVisitorId: string;
  sessionIds: string[];
  linkedAtMs: number;
  consentState: "granted" | "denied" | "partial" | "not_required" | "unknown";
  mergeAllowed: boolean;
  confidence: number;
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
} as const;
