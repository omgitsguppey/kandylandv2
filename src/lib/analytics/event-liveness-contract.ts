import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { FeatureRegistrationId } from "@/lib/features/feature-registration-contract";

export const EVENT_LIVENESS_AUDIT_VERSION = "2026.05.event-liveness.1";
export const EXPECTED_DAILY_VISITORS_BASELINE = 100;

export type EventVisibilityStatus =
  | "public_visible"
  | "logged_in_visible"
  | "creator_visible"
  | "admin_only"
  | "hidden"
  | "disabled"
  | "future_feature";

export type ExpectedTrafficClass =
  | "high_daily"
  | "normal_daily"
  | "occasional"
  | "rare"
  | "admin_only"
  | "future_only";

export type ExpectedRecentWindow = "1h" | "24h" | "7d" | "none";

export type EventLivenessStatus =
  | "observed_recently"
  | "observed_stale"
  | "not_observed_but_expected"
  | "not_observed_and_not_expected"
  | "source_ready_waiting_for_activity"
  | "source_missing"
  | "materializer_missing"
  | "translation_missing"
  | "hydration_missing"
  | "disabled_intentionally"
  | "future_only_quiet";

export type EventLivenessLastSeenSource = {
  eventName: string;
  lastSeenAtUtc?: string | null;
  source:
    | "analytics_event_facts"
    | "analytics_event_stats"
    | "materialized_summary"
    | "admin_truth_snapshot"
    | "event_fact_summary"
    | "operator_revenue_smoke"
    | "unavailable";
  sourcePath?: string;
};

export type EventLivenessSourceReadiness = {
  status: "source_ready_waiting_for_activity";
  source: "event_translation_bridge";
  sourcePath: string;
  clearsRuntimeProof: false;
  clearsProviderProof: false;
  clearsAdminTruthProof: false;
};

export type EventLivenessInput = {
  eventName: string;
  featureId: FeatureRegistrationId | string;
  surface: string;
  visibilityStatus: EventVisibilityStatus;
  expectedTrafficClass?: ExpectedTrafficClass;
  expectedRecentWindow?: ExpectedRecentWindow;
  expectedDailyVisitorsBaseline?: number;
  lastSeenAtUtc?: string | null;
  lastSeenSource?: EventLivenessLastSeenSource | null;
  lastSeenSources?: readonly EventLivenessLastSeenSource[];
  sourceReadiness?: EventLivenessSourceReadiness | null;
  nowUtc?: string;
  translationMapped?: boolean;
  materializerMapped?: boolean;
  hydrationMapped?: boolean;
  debugVisible?: boolean;
  featureLive?: boolean;
  failureEvent?: boolean;
  successPathObserved?: boolean;
  formalProviderGated?: boolean;
  operatorConfirmedRevenueSignal?: boolean;
};

export type EventLivenessDebugVisibility = {
  lane: "Event liveness";
  defaultVisible: boolean;
  hiddenFromDefaultWarnings: boolean;
  drilldownTarget: string;
};

export type EventLivenessScoreImpact = Record<PublicBetaHealthDimension, number>;

export type EventLivenessClassification = EventLivenessInput & {
  expectedTrafficClass: ExpectedTrafficClass;
  expectedRecentWindow: ExpectedRecentWindow;
  livenessStatus: EventLivenessStatus;
  lastSeenAtUtc: string | null;
  lastSeenSource: EventLivenessLastSeenSource | null;
  sourceReadiness: EventLivenessSourceReadiness | null;
  scoreImpact: EventLivenessScoreImpact;
  debugVisibility: EventLivenessDebugVisibility;
  nextAction: string;
  reason: string;
};

export type EventLivenessDebugLane = {
  label: "Event liveness";
  expectedLiveEvents: number;
  observedRecently: number;
  suspiciousIdleEvents: number;
  sourceReadyWaitingForActivity: number;
  sourceMissing: number;
  materializerMissing: number;
  translationMissing: number;
  hydrationMissing: number;
  quietFutureCatalogCount: number;
  quietFutureCatalogDefaultOpen: false;
  defaultShowsRawCatalogRows: false;
  actionableGroupsVisible: true;
};

export type EventLivenessSummary = {
  reportKey: "event-liveness-audit";
  version: typeof EVENT_LIVENESS_AUDIT_VERSION;
  generatedAtUtc: string;
  currentHead?: string;
  expectedDailyVisitorsBaseline: number;
  rawQuietFutureCount: number;
  trueFutureOnlyQuietCount: number;
  suspiciousIdleCount: number;
  sourceReadyWaitingForActivityCount: number;
  sourceMissingCount: number;
  materializerMissingCount: number;
  translationMissingCount: number;
  hydrationMissingCount: number;
  observedRecentlyCount: number;
  commonVisibleEventsWithNoRecentLiveness: EventLivenessClassification[];
  classifications: EventLivenessClassification[];
  debugLane: EventLivenessDebugLane;
  scoreBefore: Record<PublicBetaHealthDimension, number>;
  scoreAfter: Record<PublicBetaHealthDimension, number>;
  scoreImpactByDimension: Record<PublicBetaHealthDimension, {
    before: number;
    after: number;
    reason: string;
  }>;
  scoreFeedsDebug: true;
  productionReadsRequired: false;
  fakeActivityUsed: false;
  validationFailures: string[];
};

export const EVENT_LIVENESS_SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];
