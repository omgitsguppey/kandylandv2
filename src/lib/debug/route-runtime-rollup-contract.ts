import type { RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

export type RouteRuntimeCohort =
  | "admin"
  | "public"
  | "support"
  | "chat_native"
  | "chat_compat"
  | "creator"
  | "ai"
  | "analytics"
  | "system";

export type RouteRuntimeObservedState =
  | "observed_current"
  | "observed_stale"
  | "unseen_expected"
  | "unseen_not_expected"
  | "no_sample";

export type RouteRuntimeHealthState =
  | "healthy"
  | "warning"
  | "failed"
  | "stale"
  | "unseen"
  | "degraded"
  | "unknown";

export type RouteRuntimeSampleCounts = {
  success: number;
  clientError: number;
  serverError: number;
  slow: number;
  total: number;
};

export type RouteRuntimeRollupOptions = {
  nowMs?: number;
  staleAfterMs?: number;
  failActiveWindowMs?: number;
  expectedRouteKeys?: readonly string[];
  rawWarningCountOverride?: number;
  nativeChatErrorThreshold?: number;
  compatLegacyRemovalDate?: string;
  routeListenerStatus?: "current" | "delayed" | "failed" | "missing";
};

export type RouteRuntimeRouteClassification = {
  routeKey: string;
  routeName: string;
  method: string;
  cohort: RouteRuntimeCohort;
  observedState: RouteRuntimeObservedState;
  healthState: RouteRuntimeHealthState;
  sampleCounts: RouteRuntimeSampleCounts;
  lastObservedAtMs: number;
  lastFailureAtMs: number;
  freshnessState: "current" | "stale" | "unseen" | "unknown";
  failureIsCurrent: boolean;
  warningIsCurrent: boolean;
  slowIsCurrent: boolean;
  scoreImpact: number;
  nextAction: string;
};

export type RouteRuntimeWarningGroup = {
  groupId: string;
  label: string;
  count: number;
  current: boolean;
  routeKeys: string[];
};

export type RouteRuntimeCohortSummary = {
  cohort: RouteRuntimeCohort;
  trackedRoutes: number;
  observedRoutes: number;
  unseenRoutes: number;
  staleRoutes: number;
  currentFailCount: number;
  staleFailCount: number;
  samples: number;
  errorSamples: number;
  errorRate: number;
  errorRateLabel: string;
  errorThreshold: number;
  errorRateState: "under_threshold" | "over_threshold" | "no_samples";
  migrationStatus?: "native_current" | "legacy_visible_until_removal" | "not_applicable";
  legacyRemovalDate?: string;
  status: "healthy" | "warning" | "failed" | "legacy_visible_until_removal" | "no_sample";
  narrative: string;
  narrativeContradictionCount: number;
};

export type RouteRuntimeRollup = {
  trackedCount: number;
  observedCount: number;
  unseenCount: number;
  staleCount: number;
  currentFailCount: number;
  staleFailCount: number;
  warningGroupCount: number;
  rawWarningCount: number;
  slowSampleCount: number;
  currentSlowRouteCount: number;
  routeListenerStatus: "current" | "delayed" | "failed" | "missing";
  exactFailRoutes: RouteRuntimeRouteClassification[];
  warningGroups: RouteRuntimeWarningGroup[];
  cohorts: Record<RouteRuntimeCohort, RouteRuntimeCohortSummary>;
  records: RouteRuntimeRouteClassification[];
  reconciliation: {
    observedPlusUnseenMatchesTracked: boolean;
    mismatchCount: number;
  };
  status: "healthy" | "degraded" | "failed" | "unknown";
  explanation: string;
};

export type RouteRuntimeItemLike = RouteRuntimeHealthItem;
