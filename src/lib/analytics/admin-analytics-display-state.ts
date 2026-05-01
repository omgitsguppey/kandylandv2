import type {
  AdminMetricSnapshotSourceMode,
  AdminMetricSnapshotTruthState,
  SnapshotRefreshStatus,
} from "@/lib/analytics/admin-metric-snapshot";

export type AdminAnalyticsVisibleValueSource =
  | "verified_snapshot"
  | "realtime_upgrade"
  | "unavailable";

export type AdminAnalyticsDisplaySnapshotState = {
  exists: boolean;
  sourceMode?: AdminMetricSnapshotSourceMode | null;
  truthState?: AdminMetricSnapshotTruthState | null;
  lastVerifiedAt?: string | number | null;
  stale?: boolean | null;
  hasValues?: boolean | null;
  sourceLabel?: string | null;
  unavailableReason?: string | null;
};

export type AdminAnalyticsDisplayRealtimeState = {
  status?: "live" | "realtime" | "partial" | "polled" | "failed" | "waiting" | string | null;
  hasData?: boolean | null;
  sourceMode?: AdminMetricSnapshotSourceMode | null;
  truthState?: AdminMetricSnapshotTruthState | null;
  error?: string | null;
  graphAvailable?: boolean | null;
};

export type AdminAnalyticsDisplayRefreshState = {
  status?: SnapshotRefreshStatus | "running" | "waiting" | null;
};

export type AdminAnalyticsDisplayErrorState = {
  realtimeError?: string | null;
  snapshotError?: string | null;
  refreshError?: string | null;
};

export type AdminAnalyticsDisplayModuleConfig = {
  moduleKey: string;
  title: string;
  refreshAvailable?: boolean;
  metricValue?: unknown;
  serverConfirmedZero?: boolean;
  graphSourceAvailable?: boolean | null;
};

export type AdminAnalyticsDisplayState = {
  visibleValueSource: AdminAnalyticsVisibleValueSource;
  sourceMode: AdminMetricSnapshotSourceMode;
  truthState: AdminMetricSnapshotTruthState;
  shouldRenderSnapshot: boolean;
  shouldRenderRealtimeUpgrade: boolean;
  shouldShowUnavailable: boolean;
  visibleMessage: string;
  debugReason: string;
  refreshAvailable: boolean;
  fakeZeroPrevented: boolean;
  realtimeBlocksFirstRender: boolean;
  graphMissingButSnapshotRendered: boolean;
};

function isRefreshRunning(status: AdminAnalyticsDisplayRefreshState["status"]) {
  return status === "refreshing" || status === "queued" || status === "running";
}

function normalizeSnapshotSourceMode(
  snapshot: AdminAnalyticsDisplaySnapshotState,
): AdminMetricSnapshotSourceMode {
  if (snapshot.sourceMode === "live" || snapshot.sourceMode === "intraday") {
    return snapshot.sourceMode;
  }
  if (snapshot.sourceMode === "fallback" || snapshot.sourceMode === "estimated" || snapshot.sourceMode === "mixed") {
    return snapshot.sourceMode;
  }
  if (snapshot.stale === true || snapshot.truthState === "stale") {
    return "stale_cache";
  }
  return snapshot.sourceMode === "stale_cache" ? "stale_cache" : "verified_cache";
}

function normalizeSnapshotTruthState(
  snapshot: AdminAnalyticsDisplaySnapshotState,
  refreshRunning: boolean,
): AdminMetricSnapshotTruthState {
  if (refreshRunning) {
    return "refreshing";
  }
  if (snapshot.truthState && snapshot.truthState !== "unavailable") {
    return snapshot.truthState;
  }
  if (snapshot.stale === true || snapshot.sourceMode === "stale_cache") {
    return "stale";
  }
  return "verified";
}

function normalizeRealtimeSourceMode(
  realtimeState: AdminAnalyticsDisplayRealtimeState,
): AdminMetricSnapshotSourceMode {
  if (realtimeState.sourceMode) {
    return realtimeState.sourceMode;
  }
  return realtimeState.status === "polled" ? "fallback" : "live";
}

function metricNeedsFakeZeroPrevention(input: {
  metricValue: unknown;
  serverConfirmedZero?: boolean;
}) {
  if (input.metricValue === null || input.metricValue === undefined) {
    return true;
  }

  return input.metricValue === 0 && input.serverConfirmedZero !== true;
}

export function resolveAdminAnalyticsDisplayState(input: {
  latestVerifiedSnapshot?: AdminAnalyticsDisplaySnapshotState | null;
  realtimeState?: AdminAnalyticsDisplayRealtimeState | null;
  refreshState?: AdminAnalyticsDisplayRefreshState | null;
  errorState?: AdminAnalyticsDisplayErrorState | null;
  moduleConfig: AdminAnalyticsDisplayModuleConfig;
}): AdminAnalyticsDisplayState {
  const latestVerifiedSnapshot = input.latestVerifiedSnapshot ?? null;
  const realtimeState = input.realtimeState ?? {};
  const refreshState = input.refreshState ?? {};
  const errorState = input.errorState ?? {};
  const refreshRunning = isRefreshRunning(refreshState.status);
  const snapshotExists =
    latestVerifiedSnapshot?.exists === true &&
    latestVerifiedSnapshot.hasValues !== false;
  const realtimeFailed =
    realtimeState.status === "failed" ||
    Boolean(realtimeState.error || errorState.realtimeError);
  const realtimeHasData = realtimeState.hasData === true && !realtimeFailed;
  const fakeZeroPrevented = metricNeedsFakeZeroPrevention({
    metricValue: input.moduleConfig.metricValue,
    serverConfirmedZero: input.moduleConfig.serverConfirmedZero,
  });

  if (snapshotExists && latestVerifiedSnapshot) {
    const sourceMode = normalizeSnapshotSourceMode(latestVerifiedSnapshot);
    const truthState = normalizeSnapshotTruthState(latestVerifiedSnapshot, refreshRunning);
    const graphMissingButSnapshotRendered =
      input.moduleConfig.graphSourceAvailable === false;
    const visibleMessage = refreshRunning
      ? "Refresh running. Showing last verified snapshot."
      : realtimeFailed
        ? "Realtime delayed. Showing last verified snapshot."
        : "Showing last verified snapshot.";

    return {
      visibleValueSource: "verified_snapshot",
      sourceMode,
      truthState,
      shouldRenderSnapshot: true,
      shouldRenderRealtimeUpgrade: realtimeHasData,
      shouldShowUnavailable: false,
      visibleMessage,
      debugReason: realtimeFailed
        ? "latestVerifiedSnapshot exists, so realtime failure is an annotation only"
        : "latestVerifiedSnapshot is the first render path",
      refreshAvailable: input.moduleConfig.refreshAvailable !== false,
      fakeZeroPrevented,
      realtimeBlocksFirstRender: false,
      graphMissingButSnapshotRendered,
    };
  }

  if (realtimeHasData) {
    return {
      visibleValueSource: "realtime_upgrade",
      sourceMode: normalizeRealtimeSourceMode(realtimeState),
      truthState: realtimeState.truthState ?? "verified",
      shouldRenderSnapshot: false,
      shouldRenderRealtimeUpgrade: true,
      shouldShowUnavailable: false,
      visibleMessage: "Showing live data.",
      debugReason: "No verified snapshot exists; valid realtime data is available.",
      refreshAvailable: input.moduleConfig.refreshAvailable !== false,
      fakeZeroPrevented,
      realtimeBlocksFirstRender: false,
      graphMissingButSnapshotRendered: false,
    };
  }

  return {
    visibleValueSource: "unavailable",
    sourceMode: "unavailable",
    truthState: refreshRunning ? "refreshing" : realtimeFailed ? "failed" : "unavailable",
    shouldRenderSnapshot: false,
    shouldRenderRealtimeUpgrade: false,
    shouldShowUnavailable: true,
    visibleMessage: refreshRunning ? "Refresh running. No verified snapshot yet." : "No verified snapshot yet.",
    debugReason:
      errorState.snapshotError ??
      errorState.refreshError ??
      errorState.realtimeError ??
      "No verified snapshot or valid realtime data is available.",
    refreshAvailable: input.moduleConfig.refreshAvailable !== false,
    fakeZeroPrevented,
    realtimeBlocksFirstRender: false,
    graphMissingButSnapshotRendered: false,
  };
}
