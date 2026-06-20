import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  buildGuestTrafficRecoveryMetricState,
  type RecoveredLaunchMetricState,
} from "@/lib/analytics/recovery-timeline-spine";
import type {
  AudienceSnapshotDiagnostics,
  AudienceSnapshotState,
  HistoricalAnalyticsResponse,
  HistoricalPoint,
  RangeOption,
} from "@/types/admin-analytics";

type AudienceSource =
  | "ga_total"
  | "identified_first_party"
  | "estimated_guest_traffic"
  | "first_party_anonymous"
  | "server_confirmed"
  | "stale_snapshot"
  | "waiting"
  | "unavailable"
  | "ga_metric"
  | "mixed_ga_first_party";

type AudienceMetric = {
  value: number | null;
  source: AudienceSource;
  label: string;
  truthState: AdminSurfaceState;
};

type AudienceEstimateMetadata = {
  sourceTruth: "ga4_evidence_only" | "event_estimate" | "server_estimate" | "legacy" | "unknown";
  canonicalSourceTruth: RecoveredLaunchMetricState["sourceTruth"];
  sourceFreshnessState: RecoveredLaunchMetricState["freshnessState"];
  evidenceKind: RecoveredLaunchMetricState["evidenceKind"];
  formula: string | null;
  confidencePct: number | null;
  confidenceScore: number;
  confidenceBand: RecoveredLaunchMetricState["confidenceBand"];
  freshnessState: "live" | "refresh_due" | "stale" | "unknown";
  lastUpdatedAtUtc: string | null;
  dedupeKey: string;
  dedupeDimensions: RecoveredLaunchMetricState["dedupeDimensions"];
  lateArrivalWindowDays: RecoveredLaunchMetricState["lateArrivalWindowDays"];
  productTruthEligible: boolean;
  missingVsZeroState: RecoveredLaunchMetricState["missingVsZeroState"];
  explanation: string;
};

export type AdminAnalyticsAudienceSnapshotModel = AudienceSnapshotState & {
  selectedRange: RangeOption;
  totalUsersSource: AudienceSource;
  identifiedUsersSource: AudienceSource;
  guestVisitsSource: AudienceSource;
  sessionsSource: AudienceSource;
  viewsSource: AudienceSource;
  avgSessionSource: AudienceSource;
  engagementRateSource: AudienceSource;
  totalUsers: AudienceMetric;
  identifiedUsers: AudienceMetric;
  identifiedViews: AudienceMetric;
  guestVisits: AudienceMetric;
  sessions: AudienceMetric;
  views: AudienceMetric;
  avgSession: AudienceMetric;
  engagementRate: AudienceMetric;
  guestEstimateFormula: string | null;
  guestEstimateFormulaUsed: boolean;
  guestEstimateClamped: boolean;
  guestEstimateWarning: string | null;
  guestEstimateMetadata: AudienceEstimateMetadata;
  backendCacheStatus: HistoricalAnalyticsResponse["cacheState"] | "waiting" | "unavailable";
  lastValidatedAt: number | null;
  refreshStatus: "running" | "complete" | "failed" | "waiting";
  serverConfirmed: boolean;
  firstPartyAnonymousBatchAvailability: "available" | "missing" | "unknown";
  firstPartyIdentifiedAvailability: "available" | "missing" | "unknown";
  gaDailyTableAvailability: "unknown_from_data_api_route";
  gaIntradayTableAvailability: "unknown_from_data_api_route";
  chartSeries: Array<{
    key: keyof HistoricalPoint;
    label: string;
    source: AudienceSource;
    stroke: string;
  }>;
  chartHeightClass: string;
  badgeOverflowProtectionEnabled: true;
  fakeZeroPrevented: boolean;
  continuitySummary: string;
  missingSourceCount: number;
  visibleCopy: string[];
};

function metric(
  value: number | null,
  source: AudienceSource,
  label: string,
  truthState: AdminSurfaceState,
): AudienceMetric {
  return { value, source, label, truthState };
}

function toUtcIso(dayKey: string | undefined) {
  return dayKey ? new Date(`${dayKey}T00:00:00.000Z`).toISOString() : undefined;
}

function mapFreshnessState(
  input: "fresh" | "stale" | "missing" | "unknown" | undefined,
): "live" | "stale" | "missing" | "unknown" {
  switch (input) {
    case "fresh":
      return "live";
    case "stale":
      return "stale";
    case "missing":
      return "missing";
    default:
      return "unknown";
  }
}

function resolveMetricTruthState(input: {
  loading: boolean;
  error?: Error;
  freshness: "live" | "refresh_due" | "stale" | "missing" | "unknown";
  sourceState: AudienceSnapshotState["sourceState"];
  estimated?: boolean;
}): AdminSurfaceState {
  if (input.loading) {
    return "loading";
  }

  if (input.error) {
    return "failed";
  }

  if (input.sourceState === "missing" || input.freshness === "missing") {
    return "unavailable";
  }

  if (input.sourceState === "stale" || input.freshness === "stale") {
    return "stale";
  }

  if (input.freshness === "refresh_due") {
    return "cached";
  }

  if (input.estimated || input.sourceState === "estimated" || input.sourceState === "gap_detected" || input.sourceState === "partial") {
    return "degraded";
  }

  return "cached";
}

function resolveBaseSourceState(input: {
  response?: HistoricalAnalyticsResponse;
  diagnostics?: AudienceSnapshotDiagnostics;
  guestEstimateUsed: boolean;
  loading: boolean;
}): AudienceSnapshotState["sourceState"] {
  if (!input.response) {
    return "missing";
  }

  const missingFirstPartyDays = input.diagnostics
    ? input.diagnostics.expectedDayKeys.filter((dayKey) => !input.diagnostics?.firstPartyPresentDayKeys.includes(dayKey))
    : [];

  if (missingFirstPartyDays.length > 0) {
    return "gap_detected";
  }

  if (input.response.cacheState === "stale") {
    return "stale";
  }

  if (input.guestEstimateUsed) {
    return "estimated";
  }

  if ((input.diagnostics?.gaPresentDayKeys.length ?? 0) > 0 && (input.diagnostics?.firstPartyPresentDayKeys.length ?? 0) > 0) {
    return "mixed";
  }

  return "verified";
}

function buildContinuity(input: {
  diagnostics?: AudienceSnapshotDiagnostics;
}): AudienceSnapshotState["continuity"] {
  const diagnostics = input.diagnostics;
  const expectedDays = diagnostics?.expectedDayKeys ?? [];
  const firstPartyPresentDays = diagnostics?.firstPartyPresentDayKeys ?? [];
  const recentWindowDayKeys = diagnostics?.recentWindowDayKeys ?? [];
  const missingDays = expectedDays.filter((dayKey) => !firstPartyPresentDays.includes(dayKey));
  const recentGapDays = recentWindowDayKeys.filter((dayKey) => !firstPartyPresentDays.includes(dayKey));
  const gapSeverity: AudienceSnapshotState["continuity"]["gapSeverity"] =
    recentGapDays.length >= 2 ? "error" : missingDays.length > 0 ? "review" : "none";

  return {
    expectedDays: expectedDays.length,
    presentDays: firstPartyPresentDays.filter((dayKey) => expectedDays.includes(dayKey)).length,
    missingDays,
    recentGapDays,
    gapStartUtc: toUtcIso(missingDays[0]),
    gapEndUtc: toUtcIso(missingDays[missingDays.length - 1]),
    gapSeverity,
  };
}

function buildRecovery(input: {
  diagnostics?: AudienceSnapshotDiagnostics;
  sourceState: AudienceSnapshotState["sourceState"];
  guestEstimateUsed: boolean;
  estimatedGuestVisits: number | null;
  totalViews: number | null;
}): AudienceSnapshotState["recovery"] {
  const diagnostics = input.diagnostics;
  const recoveredDays = diagnostics?.recoveredByGaDayKeys ?? [];
  const unrecoveredDays = diagnostics?.unrecoveredDayKeys ?? [];
  const estimatedSharePct = input.totalViews && input.totalViews > 0 && input.estimatedGuestVisits && input.estimatedGuestVisits > 0
    ? Math.round((input.estimatedGuestVisits / input.totalViews) * 100)
    : 0;

  let mode: AudienceSnapshotState["recovery"]["mode"] = "none";
  if (unrecoveredDays.length > 0) {
    mode = recoveredDays.length > 0 ? "partial_first_party" : "unavailable";
  } else if (recoveredDays.length > 0) {
    mode = input.guestEstimateUsed ? "estimated_guest_bridge" : "ga_bridge";
  }

  let explanation = "No traffic continuity recovery was needed for this range.";
  if (mode === "ga_bridge") {
    explanation = `Recovered from GA totals for ${recoveredDays.length}/${recoveredDays.length} missing first-party day${recoveredDays.length === 1 ? "" : "s"}; first-party event sample is still missing on those days.`;
  } else if (mode === "estimated_guest_bridge") {
    explanation = `GA totals bridge missing first-party days and guest visits remain estimated because consented guest batches are unavailable for part of this range.`;
  } else if (mode === "partial_first_party") {
    explanation = `Some first-party days were recovered from GA totals, but ${unrecoveredDays.length} day${unrecoveredDays.length === 1 ? "" : "s"} remain unrecovered.`;
  } else if (mode === "unavailable") {
    explanation = `Traffic continuity is missing and no GA or guest-estimate bridge exists for ${unrecoveredDays.length} day${unrecoveredDays.length === 1 ? "" : "s"}.`;
  }

  return {
    mode,
    recoveredDays,
    unrecoveredDays,
    estimatedSharePct,
    explanation,
  };
}

function buildVisibleCopy(input: {
  hasResponse: boolean;
  loading: boolean;
  state: AudienceSnapshotState["sourceState"];
  continuity: AudienceSnapshotState["continuity"];
  recovery: AudienceSnapshotState["recovery"];
  guestEstimateUsed: boolean;
}): string[] {
  if (!input.hasResponse) {
    return [input.loading ? "Waiting for audience snapshot." : "Audience snapshot unavailable."];
  }

  const lines = [
    "Audience uses GA site totals plus first-party activity.",
  ];

  if (input.continuity.recentGapDays.length > 0) {
    lines.push(
      `Traffic gap detected: first-party data missing ${input.continuity.recentGapDays[0]} through ${input.continuity.recentGapDays[input.continuity.recentGapDays.length - 1]}.`,
    );
  } else if (input.continuity.missingDays.length > 0) {
    lines.push(`First-party views are missing for ${input.continuity.missingDays.length} day${input.continuity.missingDays.length === 1 ? "" : "s"} in this range.`);
  }

  if (input.guestEstimateUsed) {
    lines.push("Guest visits are estimated because consented guest batches are unavailable.");
  }

  if (input.recovery.mode !== "none") {
    lines.push(input.recovery.explanation);
  }

  return lines;
}

export function buildAdminAnalyticsAudienceSnapshotModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsAudienceSnapshotModel {
  const { selectedRange, response, loading, error } = input;
  const totals = response?.totals;
  const guestTraffic = response?.guestTraffic;
  const sourceHealth = response?.analyticsSourceHealth;
  const diagnostics = response?.audienceSnapshotDiagnostics;
  const guestQualityDiagnostics = response?.guestQualityDiagnostics;
  const hasResponse = Boolean(response);
  const guestEstimateFormula =
    guestQualityDiagnostics?.estimatedFormula
    ?? (guestTraffic?.truthLabel === "estimated" ? "max(exact guest visits, GA total views - identified first-party views)" : null);
  const guestEstimateFormulaUsed = Boolean(guestEstimateFormula && guestTraffic?.truthLabel === "estimated");
  const rawGuestEstimate = guestTraffic ? guestTraffic.totalViews - guestTraffic.identifiedViews : null;
  const guestEstimateClamped = rawGuestEstimate !== null && rawGuestEstimate < 0;
  const sourceState = resolveBaseSourceState({
    response,
    diagnostics,
    guestEstimateUsed: guestEstimateFormulaUsed,
    loading,
  });
  const continuity = buildContinuity({ diagnostics });
  const recovery = buildRecovery({
    diagnostics,
    sourceState,
    guestEstimateUsed: guestEstimateFormulaUsed,
    estimatedGuestVisits: guestTraffic?.estimatedGuestViews ?? null,
    totalViews: totals?.views ?? null,
  });
  const generatedAtUtc = response?.generatedAtMs
    ? new Date(response.generatedAtMs).toISOString()
    : new Date(0).toISOString();
  const gaFreshnessState = mapFreshnessState(sourceHealth?.availability.ga4.freshnessState);
  const firstPartyFreshnessState = mapFreshnessState(sourceHealth?.availability.historicalSnapshot.freshnessState);
  const guestEstimateFreshnessState: AudienceEstimateMetadata["freshnessState"] =
    response?.cacheState === "stale"
      ? "stale"
      : response?.cacheState === "refresh_due" || response?.staleButVerified
        ? "refresh_due"
        : response
          ? "live"
          : "unknown";
  const guestTrafficRecoveryMetric = buildGuestTrafficRecoveryMetricState({
    truthLabel: guestTraffic?.truthLabel ?? "unknown",
    generatedAtUtc: guestQualityDiagnostics?.estimatedLastUpdatedAtUtc ?? diagnostics?.gaLastSeenAtUtc ?? generatedAtUtc,
    sourcePath: guestQualityDiagnostics?.estimatedSourceTruth ?? "audience_guest_estimate",
    fromCache: guestEstimateFreshnessState === "refresh_due",
    sourceObserved: hasResponse && guestTraffic?.truthLabel !== "unknown",
  });
  const guestVisitsValue = guestTraffic
    ? guestTraffic.truthLabel === "exact"
      ? guestTraffic.exactGuestViews
      : guestTraffic.estimatedGuestViews
    : null;
  const guestVisitsSource: AudienceSource = guestTraffic
    ? guestTraffic.truthLabel === "exact"
      ? "first_party_anonymous"
      : "estimated_guest_traffic"
    : hasResponse
      ? "unavailable"
      : loading
        ? "waiting"
        : "unavailable";
  const guestVisitsTruthState = resolveMetricTruthState({
    loading,
    error,
    freshness: guestVisitsSource === "unavailable" ? "missing" : guestEstimateFreshnessState,
    sourceState,
    estimated: guestVisitsSource === "estimated_guest_traffic",
  });
  const visibleCopy = buildVisibleCopy({
    hasResponse,
    loading,
    state: sourceState,
    continuity,
    recovery,
    guestEstimateUsed: guestEstimateFormulaUsed,
  });
  const missingSourceCount = [
    gaFreshnessState === "missing",
    firstPartyFreshnessState === "missing",
    guestQualityDiagnostics?.state === "no_sample" || guestQualityDiagnostics?.state === "unknown",
  ].filter(Boolean).length;
  const continuitySummary = continuity.missingDays.length > 0
    ? `Traffic gap detected: first-party data missing ${continuity.missingDays[0]}${continuity.missingDays.length > 1 ? ` to ${continuity.missingDays[continuity.missingDays.length - 1]}` : ""}. GA totals available for ${recovery.recoveredDays.length}/${continuity.missingDays.length} missing days${guestEstimateFormulaUsed ? "; guest visits are estimated." : "."}`
    : "Traffic continuity is intact for the selected range.";

  return {
    selectedRange,
    generatedAtUtc,
    range: selectedRange,
    sourceState,
    ga: {
      totalUsers: totals?.users ?? null,
      sessions: totals?.sessions ?? null,
      views: totals?.views ?? null,
      engagementRatePct: totals?.engagementRate ?? null,
      avgSessionSeconds: totals?.avgSessionDuration ?? null,
      lastSeenAtUtc: diagnostics?.gaLastSeenAtUtc ?? sourceHealth?.availability.ga4.lastSeenAtUtc ?? null,
      freshnessState: gaFreshnessState,
    },
    firstParty: {
      identifiedViews: guestTraffic?.identifiedViews ?? 0,
      guestBatchViews: guestTraffic?.truthLabel === "exact" ? guestTraffic.exactGuestViews : guestTraffic?.exactGuestViews ?? null,
      guestEstimatedVisits: guestTraffic?.truthLabel === "estimated" ? guestTraffic.estimatedGuestViews : guestTraffic?.estimatedGuestViews ?? null,
      authenticatedEvents: guestTraffic?.identifiedViews ?? 0,
      lastSeenAtUtc: diagnostics?.firstPartyLastSeenAtUtc ?? sourceHealth?.availability.historicalSnapshot.lastSeenAtUtc ?? null,
      freshnessState: firstPartyFreshnessState,
    },
    continuity,
    recovery,
    totalUsersSource: hasResponse ? "ga_total" : loading ? "waiting" : "unavailable",
    identifiedUsersSource: "unavailable",
    guestVisitsSource,
    sessionsSource: hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
    viewsSource: hasResponse ? "mixed_ga_first_party" : loading ? "waiting" : "unavailable",
    avgSessionSource: hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
    engagementRateSource: hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
    totalUsers: metric(
      totals?.users ?? null,
      hasResponse ? "ga_total" : loading ? "waiting" : "unavailable",
      hasResponse ? "GA4 users | selected range" : loading ? "Waiting for audience snapshot" : "Unavailable",
      resolveMetricTruthState({
        loading,
        error,
        freshness: gaFreshnessState,
        sourceState,
      }),
    ),
    identifiedUsers: metric(
      null,
      "unavailable",
      "Identified user count is not modeled in this route",
      "unavailable",
    ),
    identifiedViews: metric(
      guestTraffic?.identifiedViews ?? null,
      guestTraffic ? "identified_first_party" : loading ? "waiting" : "unavailable",
      continuity.missingDays.length > 0
        ? `First-party views missing for ${continuity.missingDays.length} day${continuity.missingDays.length === 1 ? "" : "s"}`
        : "Identified first-party views",
      resolveMetricTruthState({
        loading,
        error,
        freshness: firstPartyFreshnessState,
        sourceState,
      }),
    ),
    guestVisits: metric(
      guestVisitsValue,
      guestVisitsSource,
      guestVisitsSource === "estimated_guest_traffic"
        ? "Estimated guest visits"
        : guestVisitsSource === "first_party_anonymous"
          ? "Guest visits from consented batches"
          : loading
            ? "Waiting for audience snapshot"
            : "Unavailable",
      guestVisitsTruthState,
    ),
    sessions: metric(
      totals?.sessions ?? null,
      hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
      totals?.views !== undefined && totals?.views !== null
        ? `${totals.views.toLocaleString()} GA views`
        : "GA sessions | selected range",
      resolveMetricTruthState({
        loading,
        error,
        freshness: gaFreshnessState,
        sourceState,
      }),
    ),
    views: metric(
      totals?.views ?? null,
      hasResponse ? "mixed_ga_first_party" : loading ? "waiting" : "unavailable",
      guestEstimateFormulaUsed
        ? "GA views with first-party gap recovery visible"
        : "GA views | selected range",
      resolveMetricTruthState({
        loading,
        error,
        freshness: gaFreshnessState,
        sourceState,
        estimated: guestEstimateFormulaUsed,
      }),
    ),
    avgSession: metric(
      totals?.avgSessionDuration ?? null,
      hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
      "Average GA session",
      resolveMetricTruthState({
        loading,
        error,
        freshness: gaFreshnessState,
        sourceState,
      }),
    ),
    engagementRate: metric(
      totals?.engagementRate ?? null,
      hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable",
      "GA engagement rate",
      resolveMetricTruthState({
        loading,
        error,
        freshness: gaFreshnessState,
        sourceState,
      }),
    ),
    guestEstimateFormula,
    guestEstimateFormulaUsed,
    guestEstimateClamped,
    guestEstimateWarning: guestEstimateClamped
      ? "GA total views were below identified first-party views; the guest estimate was clamped to zero."
      : null,
    guestEstimateMetadata: {
      sourceTruth: guestQualityDiagnostics?.estimatedSourceTruth ?? "unknown",
      canonicalSourceTruth: guestTrafficRecoveryMetric.sourceTruth,
      sourceFreshnessState: guestTrafficRecoveryMetric.freshnessState,
      evidenceKind: guestTrafficRecoveryMetric.evidenceKind,
      formula: guestEstimateFormula,
      confidencePct: guestQualityDiagnostics?.estimatedConfidencePct ?? null,
      confidenceScore: guestTrafficRecoveryMetric.confidenceScore,
      confidenceBand: guestTrafficRecoveryMetric.confidenceBand,
      freshnessState: guestEstimateFreshnessState,
      lastUpdatedAtUtc: guestQualityDiagnostics?.estimatedLastUpdatedAtUtc ?? diagnostics?.gaLastSeenAtUtc ?? null,
      dedupeKey: guestTrafficRecoveryMetric.dedupeKey,
      dedupeDimensions: guestTrafficRecoveryMetric.dedupeDimensions,
      lateArrivalWindowDays: guestTrafficRecoveryMetric.lateArrivalWindowDays,
      productTruthEligible: guestTrafficRecoveryMetric.productTruthEligible,
      missingVsZeroState: guestTrafficRecoveryMetric.missingVsZeroState,
      explanation: guestEstimateFormulaUsed
        ? "Estimated because consented guest batches are unavailable for part of this range."
        : "Exact consented guest batches are available for this range.",
    },
    backendCacheStatus: response?.cacheState ?? (loading ? "waiting" : "unavailable"),
    lastValidatedAt: response?.generatedAtMs ?? null,
    refreshStatus: loading ? "running" : error ? "failed" : response ? "complete" : "waiting",
    serverConfirmed: hasResponse && !error,
    firstPartyAnonymousBatchAvailability: guestTraffic
      ? guestTraffic.qualityAvailable
        ? "available"
        : "missing"
      : "unknown",
    firstPartyIdentifiedAvailability: guestTraffic
      ? guestTraffic.identifiedViews > 0 || guestTraffic.identifiedSessions > 0
        ? "available"
        : "missing"
      : "unknown",
    gaDailyTableAvailability: "unknown_from_data_api_route",
    gaIntradayTableAvailability: "unknown_from_data_api_route",
    chartSeries: [
      { key: "users", label: "GA4 users", source: "ga_total", stroke: "#ffffff" },
      { key: "views", label: "GA views", source: "mixed_ga_first_party", stroke: "#b28cff" },
    ],
    chartHeightClass: "h-44 md:h-64",
    badgeOverflowProtectionEnabled: true,
    fakeZeroPrevented: !hasResponse,
    continuitySummary,
    missingSourceCount,
    visibleCopy,
  };
}
