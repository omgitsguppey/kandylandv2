import type {
  AdminMetricSnapshotSourceMode,
  AdminMetricSnapshotTruthState,
  SnapshotRefreshStatus,
} from "@/lib/analytics/admin-metric-snapshot";
import {
  buildLaunchHistoryDisplaySummaryState,
  type LaunchHistoryDisplaySummaryCoverageInput,
  type LaunchHistoryDisplaySummaryState,
  type RecoveredLaunchMetricState,
} from "@/lib/analytics/recovery-timeline-spine";

export type AdminAnalyticsVisibleValueSource =
  | "verified_snapshot"
  | "realtime_upgrade"
  | "unavailable";

export type AdminAnalyticsEvidenceSourceKind =
  | AdminAnalyticsVisibleValueSource
  | AdminMetricSnapshotSourceMode
  | "vendor_evidence"
  | "debug_parity"
  | "export_only"
  | "debug_only"
  | "recovery_review_only"
  | "needs_review";

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
  status?: "live" | "realtime" | "partial" | "snapshot" | "failed" | "waiting" | string | null;
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

export type AdminAnalyticsOverviewDisplayState =
  | "ready"
  | "cached"
  | "refresh_due"
  | "partial"
  | "unavailable"
  | "loading";

export type AdminAnalyticsOverviewExactness =
  | "exact"
  | "derived"
  | "estimated"
  | "unavailable";

type AdminAnalyticsLaunchRecoveryCoverage = LaunchHistoryDisplaySummaryCoverageInput & {
  displaySummary?: LaunchHistoryDisplaySummaryState | null;
};

export type AdminAnalyticsLaunchRecoverySummary = LaunchHistoryDisplaySummaryState;

export type AdminAnalyticsRecoveryPanelSourceTruth =
  | RecoveredLaunchMetricState["sourceTruth"]
  | "ga4"
  | "first_party"
  | "mixed"
  | "fallback"
  | "unknown";

export type AdminAnalyticsRecoveryPanelFreshnessState =
  | RecoveredLaunchMetricState["freshnessState"]
  | "live"
  | "recent"
  | "stale"
  | "partial"
  | "unknown";

type RecoveryPanelRowLike = {
  sourceTruth?: string | null;
  freshnessState?: string | null;
};

export function resolveAdminAnalyticsLaunchRecoverySummary(input: {
  launchHistoryCoverage?: AdminAnalyticsLaunchRecoveryCoverage | null;
  sourceAgreementState?: string | null;
}): AdminAnalyticsLaunchRecoverySummary {
  const coverage = input.launchHistoryCoverage ?? null;
  const sourceAgreementState = input.sourceAgreementState ?? "not_enough_sources";

  return coverage?.displaySummary ?? buildLaunchHistoryDisplaySummaryState({
    launchHistoryCoverage: coverage,
    sourceAgreementState,
  });
}

export function hasAdminAnalyticsLaunchRecoveryEvidence(summary: AdminAnalyticsLaunchRecoverySummary) {
  const sourceRoleCounts = summary.sourceRoleCounts ?? {};
  const evidenceRoleCount = Object.entries(sourceRoleCounts)
    .filter(([role]) => role !== "missing_source")
    .reduce((sum, [, count]) => sum + (Number.isFinite(count) ? count : 0), 0);

  return evidenceRoleCount > 0 ||
    Boolean(summary.sourceWindowLabel) ||
    summary.coverageDenominatorKind === "evidence_window" ||
    summary.coverageDenominatorKind === "approved_launch_range";
}

export function resolveAdminAnalyticsRecoveryPanelSourceTruth(input: {
  hasResponse: boolean;
  rows: RecoveryPanelRowLike[];
  fallbackSourceTruth?: string | null;
}): AdminAnalyticsRecoveryPanelSourceTruth {
  if (!input.hasResponse) return "source_missing";

  const rowSources = new Set(input.rows.map((row) => row.sourceTruth).filter(Boolean));
  const hasFirstParty = rowSources.has("first_party_event_fact") ||
    rowSources.has("server_ledger") ||
    rowSources.has("watch_session_rollup") ||
    rowSources.has("admin_action_fact");
  const hasSecondSource = rowSources.has("ga4_evidence_only") || rowSources.has("legacy_directional_only");

  if (hasFirstParty && hasSecondSource) return "mixed";
  if (hasFirstParty) return "first_party_event_fact";
  if (rowSources.has("ga4_evidence_only")) return "ga4_evidence_only";
  if (rowSources.has("legacy_directional_only")) return "legacy_directional_only";
  if (rowSources.has("source_missing") && rowSources.size === 1) return "source_missing";

  switch (input.fallbackSourceTruth) {
    case "ga4":
      return "ga4_evidence_only";
    case "first_party":
      return "first_party_event_fact";
    case "mixed":
    case "fallback":
      return input.fallbackSourceTruth;
    default:
      return "source_missing";
  }
}

export function resolveAdminAnalyticsRecoveryPanelFreshnessState(input: {
  hasResponse: boolean;
  rows: RecoveryPanelRowLike[];
  cacheState?: string | null;
  fallbackFreshnessState?: string | null;
}): AdminAnalyticsRecoveryPanelFreshnessState {
  if (!input.hasResponse) return "source_missing";

  const rowFreshness = new Set(input.rows.map((row) => row.freshnessState).filter(Boolean));
  if (rowFreshness.has("external_evidence_required")) return "external_evidence_required";
  if (rowFreshness.has("source_missing") && rowFreshness.size === 1) return "source_missing";
  if (input.cacheState === "stale" || input.cacheState === "refresh_due" || input.fallbackFreshnessState === "stale") {
    return "refresh_due";
  }
  if (rowFreshness.has("late_arrival_window")) return "late_arrival_window";
  if (rowFreshness.has("source_current")) return "source_current";
  if (rowFreshness.has("cached")) return "cached";

  switch (input.fallbackFreshnessState) {
    case "live":
    case "recent":
      return "cached";
    case "partial":
    case "unknown":
      return input.fallbackFreshnessState;
    default:
      return rowFreshness.size > 0 ? "partial" : "source_missing";
  }
}

export function resolveAdminAnalyticsOverviewMetricState(input: {
  primaryValue: number | null;
  truthState: string | null | undefined;
  sourceTruth: string | null | undefined;
  loading?: boolean;
}): {
  displayState: AdminAnalyticsOverviewDisplayState;
  exactness: AdminAnalyticsOverviewExactness;
} {
  if (input.loading) {
    return {
      displayState: "loading",
      exactness: "unavailable",
    };
  }

  if (input.primaryValue === null || input.truthState === "unavailable" || input.truthState === "failed") {
    return {
      displayState: "unavailable",
      exactness: "unavailable",
    };
  }

  if (input.truthState === "stale") {
    return {
      displayState: "refresh_due",
      exactness: input.sourceTruth === "server_transactions" ? "derived" : "exact",
    };
  }

  if (
    input.sourceTruth === "last_verified_snapshot" ||
    input.sourceTruth === "verified_snapshot" ||
    input.sourceTruth === "historical_snapshot" ||
    input.sourceTruth === "commerce_rollup"
  ) {
    return {
      displayState: "cached",
      exactness: "exact",
    };
  }

  if (input.sourceTruth === "device_sample" || input.sourceTruth === "telemetry_sample") {
    return {
      displayState: "partial",
      exactness: "derived",
    };
  }

  if (
    input.truthState === "degraded" ||
    input.truthState === "fallback" ||
    input.sourceTruth === "server_transactions"
  ) {
    return {
      displayState: "partial",
      exactness: input.sourceTruth === "estimated" ? "estimated" : "derived",
    };
  }

  if (input.sourceTruth === "device_sample" || input.sourceTruth === "telemetry_sample") {
    return {
      displayState: "ready",
      exactness: "derived",
    };
  }

  return {
    displayState: "ready",
    exactness: "exact",
  };
}

export function resolveAdminAnalyticsOverviewFreshnessState(
  freshnessState: string | null | undefined,
): "live" | "recent" | "not_observed" | "unknown" {
  switch (freshnessState) {
    case "live":
      return "live";
    case "source_current":
    case "late_arrival_window":
    case "review":
    case "cached":
    case "refresh_due":
    case "stale":
      return "recent";
    case "source_missing":
    case "external_evidence_required":
    case "blocked":
    case "unavailable":
      return "not_observed";
    default:
      return "unknown";
  }
}

export function formatAdminAnalyticsEvidenceSourceLabel(
  sourceKind: AdminAnalyticsEvidenceSourceKind | string | null | undefined,
) {
  switch (sourceKind) {
    case "verified_snapshot":
    case "verified_cache":
    case "live":
    case "intraday":
      return "Verified snapshot";
    case "stale_cache":
      return "Verified snapshot, refresh due";
    case "estimated":
    case "vendor_evidence":
      return "Estimated from vendor analytics";
    case "debug_parity":
      return "Vendor debug parity";
    case "export_only":
      return "Export-only evidence";
    case "fallback":
    case "mixed":
    case "realtime_upgrade":
      return "Current activity source";
    case "debug_only":
      return "Debug-only recovery evidence";
    case "recovery_review_only":
    case "needs_review":
      return "Needs review before promotion";
    case "unavailable":
    default:
      return "Unavailable until source samples exist";
  }
}

export function formatAdminAnalyticsSourceTruthLabel(
  sourceTruth: string | null | undefined,
) {
  switch (sourceTruth) {
    case "analytics_event_facts":
    case "event_facts":
      return "Event facts";
    case "analytics_guest_batches":
      return "Guest batches";
    case "analytics_sessions":
      return "Analytics sessions";
    case "ga4":
      return "Vendor analytics";
    case "ga4_evidence_only":
      return "Vendor evidence only";
    case "first_party_event_fact":
      return "First-party event facts";
    case "server_ledger":
      return "Server ledger";
    case "watch_session_rollup":
      return "Watch session rollup";
    case "admin_action_fact":
      return "Admin action facts";
    case "legacy_directional_only":
      return "Legacy evidence only";
    case "hot_cache_snapshot":
      return "Hot cache snapshot";
    case "source_missing":
      return "Source missing";
    case "ga_estimate":
      return "Vendor estimate";
    case "ga_total_minus_identified_first_party":
      return "Vendor estimate minus signed-in traffic";
    case "event_estimate":
      return "Event estimate";
    case "server_estimate":
      return "Server estimate";
    case "legacy":
      return "Legacy evidence";
    case "unknown":
      return "Unknown source";
    case "mixed":
      return "Mixed sources";
    case "first_party":
      return "First-party events";
    case "server_transactions":
      return "Server transactions";
    case "commerce_snapshot":
      return "Commerce snapshot";
    case "payment_transactions":
      return "Payment records";
    case "checkout_telemetry":
      return "Checkout telemetry";
    case "gumdrop_ledger":
      return "GumDrop ledger";
    case "platform_economy":
      return "Platform Economy";
    case "wallet_telemetry":
      return "Wallet telemetry";
    case "drop_metadata_plus_unlock_rollups":
      return "Drop metadata plus unlock rollups";
    case "drop_metadata_plus_rollups":
      return "Drop metadata plus rollups";
    case "fallback":
      return "Fallback snapshot";
    case "verified_snapshot":
      return "Verified snapshot";
    case "last_verified_snapshot":
      return "Last verified snapshot";
    case "materialized_snapshot":
      return "Materialized snapshot";
    case "current_activity_snapshot":
      return "Current activity snapshot";
    case "historical_snapshot":
      return "Historical snapshot";
    case "telemetry_sample":
      return "Telemetry sample";
    case "device_sample":
      return "Device sample";
    case "missing":
    case "":
    case null:
    case undefined:
      return "Source missing";
    default:
      return sourceTruth.replace(/[_/]+/gu, " ");
  }
}

export function formatAdminAnalyticsSourceStateLabel(
  sourceState: string | null | undefined,
) {
  switch (sourceState) {
    case "source_current":
      return "Source current";
    case "late_arrival_window":
      return "Late arrivals possible";
    case "cached":
      return "Cached";
    case "refresh_due":
      return "Refresh due";
    case "source_missing":
      return "Source missing";
    case "external_evidence_required":
      return "External proof required";
    case "verified":
      return "Verified source";
    case "mixed":
      return "Mixed sources";
    case "estimated":
      return "Estimated source";
    case "partial":
      return "Partial source";
    case "gap_detected":
      return "Traffic gap detected";
    case "stale":
      return "Refresh due";
    case "missing":
    case "":
    case null:
    case undefined:
      return "Source missing";
    default:
      return sourceState.replace(/[_/]+/gu, " ");
  }
}

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
  if (
    snapshot.truthState === "stale" &&
    (snapshot.sourceMode === "stale_cache" || snapshot.stale === true)
  ) {
    return "verified";
  }
  if (snapshot.truthState && snapshot.truthState !== "unavailable") {
    return snapshot.truthState;
  }
  if (snapshot.stale === true || snapshot.sourceMode === "stale_cache") {
    return "verified";
  }
  return "verified";
}

function normalizeRealtimeSourceMode(
  realtimeState: AdminAnalyticsDisplayRealtimeState,
): AdminMetricSnapshotSourceMode {
  if (realtimeState.sourceMode) {
    return realtimeState.sourceMode;
  }
  return realtimeState.status === "snapshot" ? "fallback" : "live";
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
      ? "Refreshing cached snapshot."
      : "Cached snapshot.";

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
      visibleMessage: "Showing current activity source.",
      debugReason: "No verified snapshot exists; current activity source is available.",
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
    visibleMessage: refreshRunning ? "Refreshing. No verified snapshot yet." : "No verified snapshot yet. Refresh to check again.",
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
