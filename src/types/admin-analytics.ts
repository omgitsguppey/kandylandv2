import type {
  AdminAnalyticsModuleRangeMap,
  AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import type {
  AnalyticsTruthSourceSummary,
  AnalyticsTruthSummary,
} from "@/lib/admin-analytics-truth";
import type { AdminUserMetricsSnapshot } from "@/lib/admin-user-metrics-contract";
import type { UserBehaviorRollup } from "@/lib/user-behavior-rollup-contract";
import type { UserEngagementScoreResult } from "@/lib/behavioral/user-engagement-score";
import type { UserValueScoreResult } from "@/lib/behavioral/user-value-score";
import type { WatchTimeDiagnosticEstimate } from "@/lib/behavioral/watch-time-estimation";
import type { WatchTimeRollupIssue, WatchTimeRollupSource } from "@/lib/watch-time-rollup-contract";
import type { UserProfile } from "@/types/db";

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

export interface GeoItem {
  country: string;
  city: string;
  users: number;
}

export interface PageItem {
  path: string;
  views: number;
  avgTime: number;
  engagementRate: number;
}

export interface TopDropItem {
  dropId: string;
  views: number;
  unlocks: number;
}

export interface CommerceFeedItem {
  id: string;
  type?: string;
  status?: string;
  amount?: number;
  cost?: number;
  description?: string;
  timestamp?: number;
  username?: string;
  userPhoto?: string;
}

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

export interface CountBucketItem {
  label: string;
  count: number;
}

export interface ReturnCadenceSegment extends CountBucketItem {
  users: number;
}

export interface SurfaceMixItem {
  key: string;
  label: string;
  activeUsers: number;
  lastSeenAt: number;
}

export interface RealtimeActiveUserItem {
  uid: string;
  username: string;
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
  freshnessState: "fresh" | "stale" | "missing" | "unknown";
  confidence: number | null;
  sampleCount: number | null;
  lastSeenAtUtc: string | null;
  passAllowed: boolean;
  reason: string;
}

export interface AnalyticsSourceHealth {
  range: "7d" | "30d" | "90d" | string;
  generatedAtUtc: string;
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
    disagreementCount: number;
    maxDeltaPct: number | null;
    state: "pass" | "review" | "failed" | "not_enough_sources";
  };
  chartReadiness: {
    state: "ready" | "partial" | "gap_detected" | "unavailable";
    reason: string;
  };
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
  cacheState?: "miss" | "fresh" | "stale";
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
  commerce?: {
    revenueUsd: number;
    adjustedProfitUsd?: number;
    bonusValueUsd?: number;
    deliveredGumDrops?: number;
    bonusGumDrops?: number;
    effectiveUsdPer100Gd?: number;
    gdSpent: number;
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
  onboardingDurationBuckets?: CountBucketItem[];
  repeatVisitSegments?: ReturnCadenceSegment[];
  destinationMix?: DestinationMixItem[];
  notificationFunnel?: CountBucketItem[];
  notificationActions?: Array<{ label: string; value: number }>;
  taskPipeline?: CountBucketItem[];
  taskLeaderboard?: TaskLeaderboardItem[];
  taskDurationBuckets?: CountBucketItem[];
  reminderReasons?: CountBucketItem[];
  packagePerformance?: PackagePerformanceItem[];
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
}

export interface RealtimeAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  totalActive?: number;
  deepTrackerActive?: number;
  cacheState?: "miss" | "fresh" | "stale";
  cacheAgeMs?: number;
  cacheSourceLabel?: string;
  cacheRevalidating?: boolean;
  staleButVerified?: boolean;
  retainedBeyondStaleTtl?: boolean;
  liveTruthLabel?: "live" | "cached" | "stale" | "fallback" | "partial" | "failed";
  liveSourceLabel?: string;
  activeUsersTruthLabel?: "live" | "cached" | "stale" | "fallback" | "partial" | "failed";
  activeUsersSourceLabel?: string;
  data?: RealtimePoint[];
  activeUsers?: RealtimeActiveUserItem[];
  surfaceMix?: SurfaceMixItem[];
  watchCaptureHealth?: WatchCaptureHealthItem;
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
  metricsSnapshot?: AdminUserMetricsSnapshot;
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
  creatorOpsByUser?: Record<string, any>;
  verification?: any;
  error?: string;
};

