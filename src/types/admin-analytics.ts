import type {
  AdminAnalyticsModuleRangeMap,
  AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import type {
  AnalyticsTruthSourceSummary,
  AnalyticsTruthSummary,
} from "@/lib/admin-analytics-truth";

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
  status: "pass" | "warn" | "fail";
  detail: string;
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
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  data?: HistoricalPoint[];
  totals?: {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
    engagementRate: number;
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
  repeatVisitSegments?: CountBucketItem[];
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
}

export interface RealtimeAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  totalActive?: number;
  deepTrackerActive?: number;
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
