import type {
  AdminAnalyticsModuleRangeMap,
  AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import type {
  AnalyticsTruthSourceSummary,
  AnalyticsTruthSummary,
} from "@/lib/admin-analytics-truth";
import type { AdminUserMetricsSnapshot } from "@/lib/admin-user-metrics-contract";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import type { UserBehaviorTruthRollup } from "@/lib/behavioral/user-score-contract";
import type { UserBehaviorRollup } from "@/lib/user-behavior-rollup-contract";
import type { UserEngagementScoreResult } from "@/lib/behavioral/user-engagement-score";
import type { UserValueScoreResult } from "@/lib/behavioral/user-value-score";
import type { WatchTimeDiagnosticEstimate } from "@/lib/behavioral/watch-time-estimation";
import type { WatchTimeRollupIssue, WatchTimeRollupSource } from "@/lib/watch-time-rollup-contract";
import type { UserProfile } from "@/types/db";
import type { TransactionSourceClass } from "@/lib/commerce/transaction-source-of-funds-contract";
import type {
  LaunchCriticalFamilySourceState,
  LaunchCriticalRecoveryCoverageReport,
  LaunchRecoverySourceGateBlocker,
  LaunchHistoryDisplaySummaryState,
  LaunchHistoryDayRecoveryState,
  RecoveredLaunchMetricState,
  RecoveryMetricPolicyProofBoundary,
} from "@/lib/analytics/recovery-timeline-spine";

export type ViewTab = "operations" | "audience" | "commerce";
export type RangeOption = AdminAnalyticsRangeOption;

export interface RealtimePoint {
  minute: number;
  users: number;
  views: number;
}

export interface HistoricalPoint {
  date: string;
  rawDate: string;
  users: number;
  views: number;
  sessions: number;
  newUsers: number;
  avgSessionDuration: number;
  engagementRate: number;
  sourceTruth?: RecoveredLaunchMetricState["sourceTruth"];
  freshnessState?: RecoveredLaunchMetricState["freshnessState"];
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
}

export interface EventBreakdownItem {
  eventName: string;
  count: number;
}

export interface DeviceMixItem {
  device: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export type DeviceMixRow = {
  deviceCategory: "mobile" | "desktop" | "tablet" | "unknown";
  sessions: number;
  sessionSharePct: number;
  engagedSessions: number | null;
  engagementRatePct: number | null;
  avgSessionSeconds?: number | null;
  bounceRatePct?: number | null;
  views?: number | null;
  purchases?: number | null;
  purchaseRatePct?: number | null;
  unwraps?: number | null;
  watchSeconds?: number | null;
  sourceTruth: string;
  confidenceState: "verified" | "partial" | "estimated" | "unknown";
  freshnessState?: RecoveredLaunchMetricState["freshnessState"];
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
  recommendation: string;
};

export type DeviceMixPanelState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth: "ga4" | "first_party" | "mixed" | "fallback" | "unknown";
  freshnessState: "live" | "recent" | "stale" | "partial" | "unknown";
  totalSessions: number;
  classifiedSessions: number;
  unknownSessions: number;
  engagementDefinition: string;
  rows: DeviceMixRow[];
  warnings: string[];
  designImplications: string[];
};

export interface GeoItem {
  country: string;
  city: string;
  users: number;
}

export type RegionDemandRow = {
  city: string | null;
  region?: string | null;
  country: string | null;
  rawCount: number;
  adjustedCount: number;
  adminInternalCount: number;
  unknownIdentityCount: number;
  externalUserCount: number;
  sharePct: number;
  adjustedSharePct: number;
  sourceTruth?: RecoveredLaunchMetricState["sourceTruth"];
  freshnessState?: RecoveredLaunchMetricState["freshnessState"];
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
  demandState: "verified_external" | "mixed_with_internal" | "mostly_internal" | "unknown_location" | "review";
  explanation: string;
};

export type RegionDemandPanelState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth: "ga4" | "first_party" | "mixed" | "unknown";
  freshnessState: "live" | "recent" | "stale" | "partial" | "unknown";
  filterMode: "raw" | "external_only" | "admin_excluded" | "comparison";
  countUnit: "views" | "sessions" | "users" | "events" | "mixed";
  rawTotal: number;
  adjustedTotal: number;
  internalExcludedCount: number;
  rows: RegionDemandRow[];
  warnings: string[];
};

export interface PageItem {
  path: string;
  views: number;
  avgTime: number;
  engagementRate: number;
}

export type TopPathRow = {
  path: string;
  label: string;
  routeGroup:
    | "home"
    | "drops"
    | "dashboard"
    | "creator"
    | "legal"
    | "support"
    | "admin"
    | "auth"
    | "unknown";
  views: number;
  viewSharePct: number;
  avgTimeSeconds: number | null;
  avgTimeDisplay: string;
  engagementRatePct: number | null;
  bounceRatePct?: number | null;
  uniqueUsers?: number | null;
  sessions?: number | null;
  sourceTruth: string;
  confidenceState: "verified" | "partial" | "estimated" | "unknown";
  freshnessState?: RecoveredLaunchMetricState["freshnessState"];
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
  issueState: "healthy" | "review" | "warning" | "unknown";
  explanation: string;
};

export type TopPathsPanelState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth: "ga4" | "first_party" | "mixed" | "fallback" | "unknown";
  freshnessState: "live" | "recent" | "stale" | "partial" | "unknown";
  totalPathCount: number;
  totalViews: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  rows: TopPathRow[];
  warnings: string[];
};

export interface TopDropItem {
  dropId: string;
  dropTitle?: string;
  creatorName?: string;
  views: number;
  unlocks: number;
}

export type TopDropConversionRow = {
  dropId: string;
  shortDropId: string;
  dropTitle: string;
  creatorName?: string;
  dropIdentityState: "resolved" | "fallback_id" | "missing";
  views: number;
  unwraps: number;
  unwrapRatePct: number | null;
  unwrapRateDisplay: string;
  revenueUsd?: number | null;
  gumdropsSpent?: number | null;
  sourceTruth: string;
  freshnessState: RecoveredLaunchMetricState["freshnessState"] | "live" | "recent" | "stale" | "partial" | "unknown";
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
  explanation: string;
  adminDropHref?: string;
};

export type TopDropConversionState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth: "drop_metadata_plus_rollups" | "telemetry" | "mixed" | "fallback" | "unknown";
  freshnessState: "live" | "recent" | "stale" | "partial" | "unknown";
  denominatorLabel: "views" | "previews" | "validated views" | "drop detail views";
  numeratorLabel: "unwraps";
  page: number;
  pageSize: number;
  totalRows: number;
  rows: TopDropConversionRow[];
  warnings: string[];
};

export interface CommerceFeedItem {
  id: string;
  type?: string;
  status?: string;
  amount?: number;
  deliveredGumDrops?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  rewardSource?: string;
  ledgerSource?: string;
  sourceTruth?: string;
  purchasedAmountSpent?: number;
  rewardAmountSpent?: number;
  cost?: number;
  description?: string;
  timestamp?: number;
  timestampMs?: number;
  userId?: string;
  username?: string;
  userPhoto?: string;
}

export type RecentCommerceFeedRow = {
  transactionId: string;
  displayTitle: string;
  actorDisplayName: string;
  username?: string;
  shortUserId: string;
  amountGd: number;
  amountDisplay: string;
  direction: "credit" | "debit" | "neutral";
  sourceOfFunds:
    | "reward_free"
    | "paid"
    | "paid_bonus"
    | "creator_spend"
    | "drop_unwrap"
    | "admin_adjustment"
    | "unknown"
    | TransactionSourceClass;
  sourceLabel: string;
  status: "completed" | "pending" | "failed" | "reversed";
  createdAtUtc: string;
  ageLabel: string;
  sourceTruth: RecoveredLaunchMetricState["sourceTruth"];
  freshnessState: RecoveredLaunchMetricState["freshnessState"];
  confidenceScore: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason: RecoveredLaunchMetricState["mathReason"];
  userPhoto?: string;
  explanation: string;
};

export type RecentCommerceFeedState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth: RecoveredLaunchMetricState["sourceTruth"] | "server_transactions" | "commerce_snapshot" | "mixed" | "unknown";
  freshnessState: RecoveredLaunchMetricState["freshnessState"] | "live" | "recent" | "stale" | "unknown";
  rowCount: number;
  lastTransactionAtUtc: string | null;
  rows: RecentCommerceFeedRow[];
  warnings: string[];
};

export type CommerceMetricCard = {
  id:
    | "revenue"
    | "completed_purchases"
    | "checkout_starts"
    | "gd_spent"
    | "adjusted_profit"
    | "yield_per_100_gd"
    | "wallet_opens"
    | "promo_impact";
  label: string;
  value: string | number;
  scope: "lifetime" | "rolling_30d" | "selected_range" | "cache_snapshot" | "unknown";
  rangeStartUtc?: string | null;
  rangeEndUtc?: string | null;
  sourceTruth:
    | "payment_transactions"
    | "commerce_rollup"
    | "checkout_telemetry"
    | "unlock_ledger"
    | "gumdrop_ledger"
    | "wallet_telemetry"
    | "platform_economy"
    | "mixed"
    | "unknown";
  freshnessState: "live" | "delayed" | "stale" | "partial" | "unknown";
  formula?: string;
  numerator?: number | null;
  denominator?: number | null;
  warnings: string[];
  explanation: string;
};

export type CommerceSnapshotState = {
  generatedAtUtc: string;
  selectedRange: string;
  cacheState: "live" | "delayed" | "stale" | "partial" | "unknown";
  cards: CommerceMetricCard[];
  rangeConsistency: {
    allSameRange: boolean;
    mismatchedCards: string[];
    warning: string | null;
  };
  treasuryWarnings: string[];
};

export interface SecurityItem {
  uid: string;
  username: string;
  photoURL?: string;
  ripAttempts: number;
  lastViolation: string | null;
  lastViolationReason: string;
  lastViolationDropId?: string | null;
}

export interface RawEventItem {
  type: string;
  detail?: string;
  componentName?: string;
  dropId?: string;
  dropTitle?: string;
  watchSeconds?: number;
  targetText?: string;
  targetTag?: string;
  targetId?: string;
  scrollDepthPercent?: number;
  path: string;
  uid: string;
  username?: string;
  userPhoto?: string;
  timestamp: number;
}

export interface AuthBreakdownItem {
  method: string;
  attempts: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  successRate: number;
}

export interface AuthOutcomeFailureBreakdownItem {
  failureCode: string;
  count: number;
  explanation: string;
}

export interface AuthMethodOutcome {
  method: "email_sign_in" | "email_sign_up" | "google_sign_in";
  attempts: number;
  successes: number;
  failures: number;
  unfinished: number;
  successRatePct: number;
  avgFinishMs: number | null;
  weakestReason?: string;
  failureBreakdown: AuthOutcomeFailureBreakdownItem[];
  state: "live" | "review" | "error" | "stale";
}

export interface AuthLifecycleOutcome {
  name: "registration_completed" | "navigation_session_established";
  count: number;
  state: "live" | "review" | "error";
  explanation: string;
}

export interface AuthOutcomeSummary {
  generatedAtUtc: string;
  range: string;
  sourceMode?: "canonical_attempt_chain" | "legacy_event_counts" | "unavailable";
  attempts: number;
  successes: number;
  failures: number;
  unfinished: number;
  successRatePct: number;
  avgFinishMs: number | null;
  timingState: "available" | "missing_starts" | "missing_finishes" | "unavailable";
  lastAuthEventAtUtc: string | null;
  methods: AuthMethodOutcome[];
  lifecycleOutcomes: AuthLifecycleOutcome[];
}

export interface CountBucketItem {
  label: string;
  count: number;
}

export interface ReturnCadenceSegment extends CountBucketItem {
  users: number;
}

export type ReturnCadenceState = {
  generatedAtUtc: string;
  range: string;
  sourceTruth:
    | "materialized_user_activity"
    | "identified_event_facts"
    | "auth_sessions"
    | "mixed_fallback"
    | "missing";
  freshnessState: "live" | "partial" | "stale" | "missing" | "unknown";
  trackedAuthenticatedUsers: number;
  uniqueReturners: number;
  conversionPct: number;
  buckets: {
    oneDay: number;
    twoDays: number;
    threeToFourDays: number;
    fivePlusDays: number;
  };
  denominatorExplanation: string;
  missingReason?: string;
  warnings: string[];
};

export interface SurfaceMixItem {
  key: string;
  label: string;
  activeUsers: number;
  lastSeenAt: number;
}

export interface RealtimeActiveUserItem {
  uid: string;
  username: string;
  displayName?: string;
  userIdentityState?: "resolved" | "fallback_uid" | "missing" | "guest";
  lastSeenAt: number;
  lastEventName: string;
  lastPagePath: string;
  lastDropTitle: string;
  lastSemanticScopeLabel: string;
  lastComponentName: string;
  lastEventModules: string;
  actorType?: "guest" | "identified";
  sourceLabel?: string;
  truthLabel?: "live" | "fallback";
  sessionKey?: string;
  lastActionPurpose?: "identity_linkage" | "meaningful_activity" | "viewer_activity" | "admin_activity" | "unknown";
  sourceTruth?: "presence" | "event_fact" | "snapshot" | "estimated";
}

export interface OnboardingStepStatItem {
  stepKey: string;
  stepTitle: string;
  stepIndex: number;
  starts: number;
  completions: number;
  avgDurationMs: number;
}

export interface SemanticCategorySummaryItem {
  key: string;
  label: string;
  viewCount: number;
  viewDurationMs: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  exitCount: number;
  clickCount: number;
  hoverCount: number;
  pagesVisited: number;
  signInCount: number;
  returnCount: number;
  logoutCount: number;
  watchSecondsTotal: number;
  watchSessionCount: number;
  avgViewSeconds: number;
  engagedRate: number;
}

export interface DestinationMixItem {
  destination: string;
  count: number;
}

export type NavigationDestinationRow = {
  destinationPath: string;
  destinationLabel: string;
  count: number;
  uniqueActors?: number | null;
  sourceTruth:
    | "explicit_tap"
    | "semantic_target"
    | "notification_action"
    | "viewer_related"
    | "page_view_fallback";
  lastSeenAtUtc: string | null;
  freshnessState: "live" | "recent" | "stale" | "unknown";
  topSourceEvents: string[];
  explanation: string;
};

export type NavigationDestinationsState = {
  generatedAtUtc: string;
  range: string;
  sourceMode: "tap_events" | "mixed_fallback" | "destination_views_only" | "unavailable";
  totalNavigationEvents: number;
  explicitTapCount: number;
  fallbackViewCount: number;
  destinations: NavigationDestinationRow[];
  missingReason?: string;
  warnings: string[];
};

export interface TaskLeaderboardItem {
  taskId: string;
  title: string;
  assigned: number;
  started: number;
  completed: number;
  failed: number;
  rewardTotal: number;
  avgDurationMs: number;
  timedCompletionCount?: number;
  completionRate: number;
}

export interface PackagePerformanceItem {
  label: string;
  starts: number;
  purchases: number;
  failures: number;
  revenueUsd: number;
  drops: number;
  conversionRate: number;
  abandonmentRate: number;
}

export type PackagePerformanceRow = {
  packageId: string;
  packageLabel: string;
  priceUsd: number | null;
  basePaidGd: number | null;
  bonusPaidGd: number;
  totalGd: number | null;
  effectiveUsdPer100Gd: number | null;
  checkoutStarts: number;
  completedPurchases: number;
  conversionRatePct: number | null;
  revenueUsd: number;
  paidGdIssued: number;
  bonusGdIssued: number;
  promoDiscountUsd: number;
  sourceTruth:
    | "server_transactions"
    | "checkout_telemetry"
    | "commerce_rollup"
    | "platform_economy"
    | "mixed"
    | "missing";
  freshnessState: "live" | "partial" | "stale" | "unknown";
  performanceState: "healthy" | "review" | "no_data" | "missing_package_mapping";
  explanation: string;
};

export type PackagePerformanceState = {
  generatedAtUtc: string;
  range: string;
  sourceState: "live" | "partial" | "stale" | "missing" | "unknown";
  packageCount: number;
  rows: PackagePerformanceRow[];
  totals: {
    checkoutStarts: number;
    completedPurchases: number;
    revenueUsd: number;
    paidGdIssued: number;
    bonusGdIssued: number;
  };
  warnings: string[];
};

export type ContentConversionRow = {
  groupKey: string;
  groupLabel: string;
  groupingDimension: "contentType" | "flavor" | "creator" | "priceBand" | "unknown";
  dropCount: number;
  previewCount: number;
  unlockCount: number;
  unlockRatePct: number | null;
  viewerOpenCount?: number | null;
  watchSeconds?: number | null;
  completionRatePct?: number | null;
  revenueUsd?: number | null;
  gumdropsSpent?: number | null;
  sourceTruth: string;
  freshnessState: RecoveredLaunchMetricState["freshnessState"] | "live" | "partial" | "stale" | "unknown";
  confidenceScore?: RecoveredLaunchMetricState["confidenceScore"];
  confidenceBand?: RecoveredLaunchMetricState["confidenceBand"];
  evidenceKind?: RecoveredLaunchMetricState["evidenceKind"];
  dedupeKey?: RecoveredLaunchMetricState["dedupeKey"];
  dedupeDimensions?: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays?: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible?: RecoveredLaunchMetricState["productTruthEligible"];
  missingVsZeroState?: RecoveredLaunchMetricState["missingVsZeroState"];
  mathReason?: RecoveredLaunchMetricState["mathReason"];
  conversionState: "healthy" | "review" | "no_data" | "missing_metadata";
  explanation: string;
};

export type ContentConversionState = {
  generatedAtUtc: string;
  range: string;
  sourceState: "live" | "partial" | "stale" | "missing" | "unknown";
  sourceTruth:
    | "drop_metadata_plus_telemetry"
    | "drop_metadata_plus_unlock_rollups"
    | "telemetry_only"
    | "rollup_only"
    | "missing";
  totalPreviews: number;
  totalUnlocks: number;
  totalViewerOpens?: number;
  totalWatchSeconds?: number;
  rows: ContentConversionRow[];
  warnings: string[];
};

export interface UnlockCategoryItem {
  label: string;
  previews: number;
  unlocks: number;
  unlockRate: number;
}

export interface ContentTagDemandItem {
  tag: string;
  count: number;
}

export interface ViewerOverviewItem {
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  watchScoreSource?: string;
  watchScoreConfidence?: string;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  avgLoadMs: number;
  assetCompletionRate: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
}

export interface ViewerDropInsightItem {
  dropId: string;
  dropTitle: string;
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  watchScoreSource?: string;
  watchScoreConfidence?: string;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  assetStarts: number;
  assetCompletions: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
  avgLoadMs: number;
}

export interface ViewerUserOptionItem {
  uid: string;
  username: string;
  viewCount: number;
  sessionCount: number;
  totalWatchSeconds: number;
  lastSeenAtMs?: number;
}

export interface WatchCaptureTransportCountItem {
  transport: "fetch" | "keepalive_fetch" | "replay_fetch" | "unknown";
  count: number;
}

export interface WatchCaptureHealthItem {
  sessionCount: number;
  fullCaptureCount: number;
  degradedSessionCount: number;
  replayRecoveredCount: number;
  gapDetectedCount: number;
  flushDegradedCount: number;
  closeMissingCount: number;
  degradedRate: number;
  averageGapMs: number;
  averageHiddenSeconds: number;
  averageWaitSeconds: number;
  averageSeekCount: number;
  averagePlaybackRate: number;
  mutedSessionCount: number;
  transportBreakdown: WatchCaptureTransportCountItem[];
  lastSeenAtMs: number;
  warnings: string[];
}

export interface ValidationItem {
  label: string;
  status: "pass" | "warn" | "fail" | "unavailable" | "stale" | "unknown";
  detail: string;
  operatorSummary?: string;
  whyItMatters?: string;
  checkKey?: string;
  title?: string;
  source?: string;
  sourceDetails?: string;
  selectedRange?: string;
  lastValidatedAt?: number;
  freshnessState?: "fresh" | "stale" | "unknown";
  confidence?: number | null;
  requiredSourcesPresent?: boolean;
  sampleRequired?: boolean;
  sampleCount?: number;
  passAllowed?: boolean;
  passBlockedReason?: string | null;
  action?: string;
  recommendedNextCheck?: string;
  technicalEvidence?: string;
  fullDetails?: string;
  eventSource?: string;
  sampleSource?: string;
  blockedReason?: string;
  implemented?: boolean;
  required?: boolean;
  eventNames?: string[];
  failureClusters?: Array<{
    source: string;
    reasonCode: string;
    count: number;
    firstSeenAtUtc: string;
    lastSeenAtUtc: string;
    affectedRoute?: string;
    severity?: "info" | "warning" | "error" | "blocking";
    current?: boolean;
    routeAttribution?: "known" | "unknown" | "inferred" | "missing";
    likelyOwner?: string;
    suggestedAction: string;
  }>;
  moduleCoverage?: AnalyticsModuleCoverage;
}

export interface AnalyticsModuleCoverageItem {
  moduleId: string;
  moduleLabel: string;
  status: "verified" | "partial" | "empty" | "stale" | "failed" | "optional";
  severity: "info" | "review" | "error";
  requiredForBeta: boolean;
  sourceCount: number;
  expectedSources: string[];
  requiredSources: string[];
  acceptedSubstituteSources: string[];
  optionalSources: string[];
  externalEvidenceOnlySources: string[];
  internalCanonicalSources: string[];
  presentSources: string[];
  presentAcceptedSources: string[];
  missingSources: string[];
  missingRequiredSources: string[];
  missingOptionalSources: string[];
  missingExternalOnlySources: string[];
  sampleCount: number;
  evidenceSamples: number;
  lastSeenAtUtc: string | null;
  dependentPanels: string[];
  validators: string[];
  nextValidator: string;
  nextAction: string;
  blockedReason?: string;
  coverageWeight?: number;
  scoreContribution?: number;
  passPolicy?: string;
  blockPolicy?: string;
}

export interface AnalyticsModuleCoverage {
  range: string;
  generatedAtUtc: string;
  totalModules: number;
  requiredModules: number;
  optionalModules: number;
  verifiedModules: number;
  partialModules: number;
  emptyModules: number;
  verifiedRequired: number;
  partialRequired: number;
  emptyRequired: number;
  verifiedOptional: number;
  partialOptional: number;
  emptyOptional: number;
  requiredGaps: number;
  optionalGaps: number;
  requiredGapModules: string[];
  optionalGapModules: string[];
  sampledModules: number;
  evidenceSamples: number;
  parityScore: number;
  optionalParityScore: number;
  parityScoreFormula: string;
  passAllowed: boolean;
  blockedReason?: "required_source_missing" | "module_empty" | "module_partial" | "unknown" | string;
  modules: AnalyticsModuleCoverageItem[];
}

export interface DataValidationPanelState {
  status: "loading" | "loaded" | "not_validated" | "stale" | "failed" | "unavailable";
  checkCount: number | null;
  failCount: number | null;
  warnCount: number | null;
  staleCount: number | null;
  blockedPassCount: number | null;
  range: string;
  cacheState: "hit" | "miss" | "stale" | "unknown" | "not_loaded";
  lastValidatedAtUtc: string | null;
  generatedAtUtc: string | null;
  sourcePath: string;
  loadError?: string;
  nextAction: string;
}

export interface AnalyticsSourceHealthSourceCheck {
  status: "pass" | "review" | "fail" | "unknown";
  freshnessState: "fresh" | "refresh_due" | "stale" | "missing" | "unknown";
  confidence: number | null;
  sampleCount: number | null;
  lastSeenAtUtc: string | null;
  passAllowed: boolean;
  reason: string;
}

export interface AnalyticsSourceHealth {
  range: "7d" | "30d" | "90d" | string;
  generatedAtUtc: string;
  launchHistoryCoverage?: {
    displaySummary: LaunchHistoryDisplaySummaryState;
    rangeProof: {
      expectedRangeSource:
        | "all_range_historical_route"
        | "all_range_historical_export"
        | "admin_truth_sample"
        | "fixture_only_local_window"
        | "local_source_window"
        | "unknown";
      coverageWindowKind:
        | "all_range_historical_route"
        | "all_range_historical_export"
        | "admin_truth_sample"
        | "fixture_only_local_window"
        | "local_source_window"
        | "unknown";
      allLaunchRangeProven: boolean;
      formalRangeStartDayKey: string | null;
      formalRangeEndDayKey: string | null;
      formalExpectedDayCount: number;
      evidenceDayCount: number;
      unprovenRanges: string[];
      reason: string;
    };
    rangeStartDayKey: string | null;
    rangeEndDayKey: string | null;
    firstRecoveredDayKey: string | null;
    lastRecoveredDayKey: string | null;
    expectedDayCount: number;
    recoveredDayCount: number;
    evidenceObservedDayCount?: number;
    productTruthRecoveredDayCount?: number;
    secondSourceOnlyDayCount?: number;
    fallbackOnlyDayCount?: number;
    preLaunchIgnoredDayCount: number;
    sourceDayCounts: {
      firstParty: number;
      ga4: number;
      historicalSnapshot: number;
      legacySupport: number;
    };
    firstPartyCoverage: {
      state: "available" | "partial" | "source_missing";
      coveredDayCount: number;
      missingRanges: string[];
      canPromoteProductTruth: boolean;
      reason: string;
    };
    eventFamilyCoverage: {
      canonicalMappedFamilyCount: number;
      canonicalMappingCoveragePercent: number;
      observedFirstPartyFamilyCount: number;
      observedFirstPartyCoveragePercent: number;
      sourceCoverageStatus: "pass" | "blocked";
      holdbackValidation: LaunchCriticalRecoveryCoverageReport["holdbackValidation"];
      familySourceStates: LaunchCriticalFamilySourceState[];
    };
    sourceGateBlockers?: LaunchRecoverySourceGateBlocker[];
    recoveryPolicy: {
      dedupeRules: LaunchCriticalRecoveryCoverageReport["dedupeRules"];
      productTruthPolicy: LaunchCriticalRecoveryCoverageReport["productTruthPolicy"];
      modelingPolicy: LaunchCriticalRecoveryCoverageReport["modelingPolicy"];
      proofBoundary: RecoveryMetricPolicyProofBoundary;
    };
    missingRanges: string[];
    duplicateRanges: string[];
    sourceOverlapRanges: string[];
    days: LaunchHistoryDayRecoveryState[];
    state: "available" | "partial" | "source_missing";
    reason: string;
  };
  availability: {
    ga4: AnalyticsSourceHealthSourceCheck;
    historicalSnapshot: AnalyticsSourceHealthSourceCheck;
    legacySupport: AnalyticsSourceHealthSourceCheck;
  };
  continuity: {
    expectedDays: number;
    presentDays: number;
    missingDays: string[];
    recentGapDays: string[];
    lastCompleteDayUtc: string | null;
    gapSeverity: "none" | "info" | "review" | "error";
    gapReason: string;
  };
  sourceAgreement: {
    comparedSources: string[];
    failedSources?: string[];
    comparedMetrics?: string[];
    tolerance?: string;
    confidence?: number | null;
    disagreementCount: number;
    maxDeltaPct: number | null;
    state: "pass" | "review" | "failed" | "not_enough_sources";
    classifications?: Array<
      | "identity_mismatch"
      | "event_translation_mismatch"
      | "date_range_mismatch"
      | "internal_traffic_mismatch"
      | "route_normalization_mismatch"
      | "duplicate_event"
      | "missing_materializer"
      | "external_source_gap"
      | "stale_generated_evidence"
      | "not_enough_sources"
    >;
    reason?: string;
    nextAction?: string;
  };
  chartReadiness: {
    state: "ready" | "partial" | "source_disagreement" | "gap_detected" | "unavailable";
    reason: string;
  };
}

export interface TelemetryParityValidation {
  range: string;
  generatedAtUtc: string;
  canonicalAuthenticatedEventCount: number;
  canonicalSampleCount: number;
  sampleCoveragePct: number;
  sampleSource: string;
  eventSource: string;
  status: "pass" | "review" | "fail";
  blockedReason?: "required_sample_missing" | "materializer_failed" | "range_mismatch" | "source_mismatch" | "analytics_refresh_failures_present" | "low_confidence" | "route_unknown_diagnostics" | "ingest_identified_failures" | "unknown";
  failureClusters: Array<{
    source: string;
    reasonCode: string;
    count: number;
    firstSeenAtUtc: string;
    lastSeenAtUtc: string;
    affectedRoute?: string;
    severity?: "info" | "warning" | "error" | "blocking";
    current?: boolean;
    routeAttribution?: "known" | "unknown" | "inferred" | "missing";
    likelyOwner?: string;
    suggestedAction: string;
  }>;
}

export interface ComponentContextItem {
  key: string;
  label: string;
  count: number;
  uniqueUsers: number;
  experienceCount: number;
  lastSeenAt: number;
  exampleEvent: string;
}

export interface UserJourneyItem {
  uid: string;
  username: string;
  actorType?: "guest" | "identified";
  eventCount: number;
  watchSeconds: number;
  lastSeenAt: number;
  primaryPath: string;
  journeyState?: "engaged" | "bounced" | "mixed" | "unknown";
}

export interface ExperienceContextItem {
  key: string;
  label: string;
  eventCount: number;
  uniqueUsers: number;
  watchSeconds: number;
  conversionCount: number;
}

export interface SecurityReasonItem {
  reason: string;
  label: string;
  severity: string;
  count: number;
  uniqueUsers: number;
  lastSeenAt: number;
}

export interface HistoricalAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  cacheState?: "miss" | "fresh" | "refresh_due" | "stale";
  cacheAgeMs?: number;
  cacheSourceLabel?: string;
  cacheValidationIssues?: string[];
  cacheRevalidating?: boolean;
  staleButVerified?: boolean;
  retainedBeyondStaleTtl?: boolean;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  verification?: unknown;
  data?: HistoricalPoint[];
  totals?: {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
    engagementRate: number;
  };
  guestTraffic?: {
    totalViews: number;
    totalSessions: number;
    identifiedViews: number;
    identifiedSessions: number;
    exactGuestViews: number;
    exactGuestSessions: number;
    estimatedGuestViews: number;
    estimatedGuestSessions: number;
    truthLabel: "exact" | "estimated" | "unknown";
    sourceLabel: string;
    qualityAvailable: boolean;
  };
  guestQualityDiagnostics?: {
    estimatedSourceTruth: "ga4_evidence_only" | "event_estimate" | "server_estimate" | "legacy" | "unknown";
    estimatedFormula: string | null;
    estimatedFormulaState: "available" | "missing";
    estimatedConfidencePct: number | null;
    estimatedLastUpdatedAtUtc: string | null;
    consentedGuestBatchCount: number;
    guestBatchCount: number;
    lastGuestBatchAtUtc: string | null;
    state: "available" | "no_sample" | "blocked_by_consent" | "ingest_missing" | "disabled" | "unknown";
    missingReason: string;
    nextAction: string;
    seriesState: "available" | "unavailable";
    seriesExplanation: string;
  };
  audienceSnapshotDiagnostics?: AudienceSnapshotDiagnostics;
  events?: Record<string, number>;
  eventBreakdown?: EventBreakdownItem[];
  devices?: DeviceMixItem[];
  funnel?: {
    authModalOpens: number;
    authSignIns: number;
    authSignUps: number;
    previewOpens: number;
    viewerOpens: number;
    assetSwitches: number;
    unlocks: number;
    shares: number;
    walletOpens: number;
    checkoutStarts: number;
    purchases: number;
    checkIns: number;
    experienceViews: number;
  };
  geo?: GeoItem[];
  pages?: PageItem[];
  topDrops?: TopDropItem[];
  topDropConversionState?: TopDropConversionState;
  commerce?: {
    revenueUsd: number;
    adjustedProfitUsd?: number;
    bonusValueUsd?: number;
    deliveredGumDrops?: number;
    bonusGumDrops?: number;
    effectiveUsdPer100Gd?: number;
    gdSpent: number;
    checkoutRangeStartUtc?: string | null;
    checkoutRangeEndUtc?: string | null;
    checkoutScope?: "lifetime" | "rolling_30d" | "selected_range" | "cache_snapshot" | "unknown";
    grossRevenueUsd?: number;
    paymentFeesUsd?: number;
    paidGdSpent?: number;
    paidBonusGdSpent?: number | null;
    rewardFreeGdSpent?: number;
    unknownSourceGdSpent?: number;
    promoDiscountUsd?: number;
    paidSourceDeliveredGd?: number;
    paidBaseDeliveredGd?: number;
    paidBonusDeliveredGd?: number;
    rewardDeliveredGd?: number;
    sourceBreakdownAvailable?: boolean;
    feed?: CommerceFeedItem[];
  };
  security?: SecurityItem[];
  securityReasons?: SecurityReasonItem[];
  onboardingStats?: {
    starts?: number;
    completions: number;
    avgDuration: number;
    completionRate?: number;
    startSource?: "tracked" | "completion_fallback" | "none";
  };
  onboardingStepStats?: OnboardingStepStatItem[];
  rawEvents?: RawEventItem[];
  componentContexts?: ComponentContextItem[];
  userJourneys?: UserJourneyItem[];
  experienceContexts?: ExperienceContextItem[];
  authBreakdown?: AuthBreakdownItem[];
  authOutcomeSummary?: AuthOutcomeSummary;
  onboardingDurationBuckets?: CountBucketItem[];
  repeatVisitSegments?: ReturnCadenceSegment[];
  returnCadenceState?: ReturnCadenceState;
  destinationMix?: DestinationMixItem[];
  navigationDestinationsState?: NavigationDestinationsState;
  deviceMixPanelState?: DeviceMixPanelState;
  topPathsPanelState?: TopPathsPanelState;
  regionDemandPanelState?: RegionDemandPanelState;
  commerceSnapshotState?: CommerceSnapshotState;
  packagePerformanceState?: PackagePerformanceState;
  notificationFunnel?: CountBucketItem[];
  notificationActions?: Array<{ label: string; value: number }>;
  taskPipeline?: CountBucketItem[];
  taskLeaderboard?: TaskLeaderboardItem[];
  taskDurationBuckets?: CountBucketItem[];
  reminderReasons?: CountBucketItem[];
  packagePerformance?: PackagePerformanceItem[];
  contentConversionState?: ContentConversionState;
  unlockCategoryMix?: UnlockCategoryItem[];
  watchDepthBuckets?: CountBucketItem[];
  contentJourney?: CountBucketItem[];
  contentTagDemand?: ContentTagDemandItem[];
  viewerOverview?: ViewerOverviewItem;
  viewerDropInsights?: ViewerDropInsightItem[];
  viewerUsers?: ViewerUserOptionItem[];
  watchCaptureHealth?: WatchCaptureHealthItem;
  viewerFilter?: string;
  semanticCategories?: SemanticCategorySummaryItem[];
  truthState?: AnalyticsTruthSummary;
  truthSources?: AnalyticsTruthSourceSummary[];
  validations?: ValidationItem[];
  dataValidation?: DataValidationPanelState;
  analyticsSourceHealth?: AnalyticsSourceHealth;
  telemetryParityValidation?: TelemetryParityValidation;
  analyticsModuleCoverage?: AnalyticsModuleCoverage;
}

export interface RealtimeAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  totalActive?: number;
  deepTrackerActive?: number;
  cacheState?: "miss" | "fresh" | "refresh_due" | "stale";
  cacheAgeMs?: number;
  cacheSourceLabel?: string;
  cacheRevalidating?: boolean;
  staleButVerified?: boolean;
  retainedBeyondStaleTtl?: boolean;
  liveTruthLabel?: "live" | "cached" | "refresh_due" | "stale" | "fallback" | "partial" | "failed";
  liveSourceLabel?: string;
  activeUsersTruthLabel?: "live" | "cached" | "refresh_due" | "stale" | "fallback" | "partial" | "failed";
  activeUsersSourceLabel?: string;
  data?: RealtimePoint[];
  activeUsers?: RealtimeActiveUserItem[];
  surfaceMix?: SurfaceMixItem[];
  watchCaptureHealth?: WatchCaptureHealthItem;
  guestAnalyticsSnapshot?: {
    generatedAtMs: number;
    refreshedAtMs: number;
    sourceWindowMs: number;
    sourceWindowLabel: string;
    guestBatchCount: number;
    guestEventCount: number;
    guestSessionCount: number;
    uniqueAnonymousVisitorCount: number;
    guestBounceCount: number;
    guestBounceRate: number | null;
    guestSamplesAvailable: boolean;
    guestTruthState: "live" | "refresh_due" | "stale" | "unavailable" | "needs_review";
    sourceCollectionsUsed: string[];
    sourceSampleCounts: Record<string, number>;
    notes: string[];
  } | null;
}

export interface AnalyticsPreferencesResponse {
  success: boolean;
  preferences?: {
    moduleRanges?: AdminAnalyticsModuleRangeMap;
  };
}

export type UserAnalytics = {
  uid: string;
  username: string;
  eventCount: number;
  sessionCount: number;
  viewCount: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  unwrapCount: number;
  purchaseCount: number;
  authSuccessCount: number;
  onboardingStartCount: number;
  onboardingCompletionCount: number;
  watchSecondsTotal: number;
  watchHours: number;
  avgLoadMs: number;
  lastSeenAt: number;
  grossRevenueUsd: number;
  grossRevenueCents: number;
  adjustedProfitUsd: number;
  adjustedProfitCents: number;
  retailValueUsd: number;
  bonusValueUsd: number;
  bonusGumDrops: number;
  deliveredGumDrops: number;
  paidGumDrops: number;
  averageOrderUsd: number;
  effectiveUsdPer100Gd: number;
  unlockSpendGdTotal: number;
  lastPurchaseAt: number;
  bundleYieldRatio: number;
  commerceTruthLabel?: "live" | "partial" | "stale" | "unknown";
  commerceSourceLabel?: string;
  commerceEmptyReason?: string | null;
  metricTruthLabel?: "live" | "partial" | "stale" | "unknown";
  metricSourceLabel?: string;
  metricIntegrityFailures?: string[];
  recoveredFromFacts?: boolean;
  engagementScore?: number;
  engagement?: UserEngagementScoreResult;
  valueScore?: number;
  value?: UserValueScoreResult;
  behaviorRollup?: UserBehaviorRollup;
  behaviorTruthRollup?: UserBehaviorTruthRollup;
  watchTimeSource?: WatchTimeRollupSource;
  watchTimeIssues?: WatchTimeRollupIssue[];
  watchTimeDiagnosticEstimate?: WatchTimeDiagnosticEstimate | null;
};

export type UsersSummary = {
  totalUsers: number;
  totalCreators: number;
  totalAdmins: number;
  verifiedUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  notificationsEnabledUsers: number;
  onboardingCompletedUsers: number;
  activeLast7Days: number;
  returnedInLast7Days?: number;
  totalEvents: number;
  totalUnwraps: number;
  totalPurchases: number;
  totalWatchHours: number;
  grossRevenueUsd: number;
  adjustedProfitUsd: number;
  bonusValueUsd: number;
  bonusGumDrops: number;
  deliveredGumDrops: number;
  paidGumDrops: number;
  unlockSpendGdTotal: number;
  averageOrderUsd: number;
  effectiveUsdPer100Gd: number;
  payingUsers: number;
  commerceTruthLabel?: "live" | "partial" | "stale" | "unknown";
  commerceSourceLabel?: string;
  commerceEmptyReason?: string | null;
  kpiCards: AdminUsersKpiCard[];
  metricsSnapshot?: AdminUserMetricsSnapshot;
  truthSnapshot?: AdminUserTruthSnapshot;
  creatorOps?: {
    creatorsWithFollowers: number;
    totalFollowers: number;
    totalAlertOptIns: number;
    activeSubscriptions: number;
    openRequests: number;
    bookedCalls: number;
    pendingPayouts: number;
    openThreads: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
    pendingCashoutGd: number;
  };
};

export type AdminUsersKpiCard = {
  id:
    | "total_users"
    | "active_now"
    | "returned_7d"
    | "unwraps"
    | "purchases"
    | "watch_time"
    | "revenue"
    | "settlement"
    | "paying_users"
    | "verified"
    | "push_enabled"
    | "onboarded";
  label: string;
  primaryValue: string | number;
  secondaryValue?: string;
  scope: "lifetime" | "rolling_7d" | "rolling_30d" | "current" | "settlement_window";
  sourceTruth:
    | "user_docs"
    | "active_user_snapshot"
    | "transactions"
    | "commerce_rollups"
    | "unlock_rollups"
    | "watch_sessions"
    | "push_profile"
    | "verification_profile"
    | "onboarding_facts"
    | "materialized_snapshot"
    | "partial";
  freshnessState: "live" | "review" | "degraded" | "stale" | "delayed" | "unknown";
  reasonCode?: string;
  explanation: string;
  generatedAtUtc: string;
  warnings: string[];
  sourceLabel?: string;
  formula?: string;
};

export type AnalyticsOverviewCard = {
  id: "active_users" | "mobile_share" | "revenue" | "purchases";
  label: string;
  primaryValue: string | number | null;
  state: "live" | "snap" | "partial" | "waiting" | "stale" | "unavailable" | "error";
  sourceTruth:
    | "current_activity_snapshot"
    | "historical_snapshot"
    | "last_verified_snapshot"
    | "server_transactions"
    | "commerce_rollup"
    | "telemetry_sample"
    | "device_sample"
    | "missing";
  freshnessState: "live" | "recent" | "stale" | "not_observed" | "unknown";
  windowLabel: string;
  generatedAtUtc: string | null;
  explanation: string;
  warnings: string[];
};

export type AudienceSnapshotState = {
  generatedAtUtc: string;
  range: string;
  sourceState: "verified" | "mixed" | "estimated" | "partial" | "gap_detected" | "stale" | "missing";
  ga: {
    totalUsers: number | null;
    sessions: number | null;
    views: number | null;
    engagementRatePct: number | null;
    avgSessionSeconds: number | null;
    lastSeenAtUtc: string | null;
    freshnessState: "live" | "refresh_due" | "stale" | "missing" | "unknown";
  };
  firstParty: {
    identifiedViews: number;
    guestBatchViews: number | null;
    guestEstimatedVisits: number | null;
    authenticatedEvents: number;
    lastSeenAtUtc: string | null;
    freshnessState: "live" | "refresh_due" | "stale" | "missing" | "unknown";
  };
  continuity: {
    expectedDays: number;
    presentDays: number;
    missingDays: string[];
    recentGapDays: string[];
    gapStartUtc?: string;
    gapEndUtc?: string;
    gapSeverity: "none" | "review" | "error";
  };
  recovery: {
    mode: "none" | "ga_bridge" | "estimated_guest_bridge" | "partial_first_party" | "unavailable";
    recoveredDays: string[];
    unrecoveredDays: string[];
    estimatedSharePct: number;
    explanation: string;
  };
};

export type AudienceSnapshotDiagnostics = {
  expectedDayKeys: string[];
  recentWindowDayKeys: string[];
  gaPresentDayKeys: string[];
  firstPartyPresentDayKeys: string[];
  guestBatchPresentDayKeys: string[];
  guestEstimatedOnlyDayKeys: string[];
  recoveredByGaDayKeys: string[];
  unrecoveredDayKeys: string[];
  gaLastSeenAtUtc: string | null;
  firstPartyLastSeenAtUtc: string | null;
  guestBatchLastSeenAtUtc: string | null;
};

export type EventChainStep = {
  stepId: string;
  label: string;
  eventName: string;
  count: number;
  countUnit: "events" | "users" | "sessions";
  denominatorStepId?: string;
  denominatorCount?: number;
  ratioPct?: number | null;
  ratioMeaning:
    | "event_volume_ratio"
    | "sequential_conversion"
    | "not_comparable"
    | "supporting_ratio";
  state: "live" | "review" | "partial" | "unknown";
  explanation: string;
};

export type EventSupportingGroup = {
  groupId: string;
  label: string;
  eventName: string;
  count: number;
  countUnit: "events" | "users" | "sessions";
  state: "live" | "review" | "partial" | "unknown";
  explanation: string;
};

export type EventChainPanelState = {
  generatedAtUtc: string;
  mode: "event_volume_chain" | "user_funnel" | "partial_event_chain";
  denominatorMode: "prior_step_events" | "base_events" | "unique_users" | "sessions" | "unknown";
  sequential: boolean;
  uniqueActorsAvailable: boolean;
  warningCount: number;
  warnings: string[];
  steps: EventChainStep[];
  supportingEvents: EventSupportingGroup[];
};

export type AdminBehaviorLeaderboardFilter =
  | "all"
  | "returned_7d"
  | "purchasers"
  | "unwrappers"
  | "low_confidence";

export type AdminBehaviorLeaderboardRow = {
  userId: string;
  displayName: string;
  username?: string;
  shortUserId: string;
  userIdentityState: "resolved" | "fallback_uid" | "missing";
  engagementScore: number;
  valueScore?: number | null;
  behaviorConfidence: number;
  returnedInLast7d: boolean;
  lastSeenAtUtc: string | null;
  lastMeaningfulActionAtUtc: string | null;
  unlockCount: number;
  purchaseCount: number;
  watchSeconds: number;
  taskCompletions: number;
  notificationReads?: number;
  sourceTruth: "materialized_behavior" | "event_facts" | "rollup_fallback" | "partial";
  freshnessState: "live" | "review" | "stale" | "unknown";
  warnings: string[];
};

export type AdminBehaviorLeaderboardPanel = {
  generatedAtUtc: string;
  sourceFreshness: "live" | "review" | "stale" | "unknown";
  sourceTruth: "materialized_behavior" | "event_facts" | "rollup_fallback" | "partial";
  totalEligibleUsers: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminBehaviorLeaderboardFilter;
  rows: AdminBehaviorLeaderboardRow[];
  warnings: string[];
};

export type DropReference = {
  id: string;
  title: string;
  status: string;
  imageUrl?: string;
};

export type AdminUsersResponse = {
  success: boolean;
  users: UserProfile[];
  analyticsByUser: Record<string, UserAnalytics>;
  dropReferences: Record<string, DropReference>;
  summary: UsersSummary;
  behaviorLeaderboard?: AdminBehaviorLeaderboardPanel;
  creatorOpsByUser?: Record<string, any>;
  verification?: any;
  error?: string;
};

