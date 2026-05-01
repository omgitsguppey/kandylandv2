import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, HistoricalPoint, RangeOption } from "@/types/admin-analytics";

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

export type AdminAnalyticsAudienceSnapshotModel = {
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
  visibleCopy: string[];
};

function resolveBaseTruthState(input: {
  response?: HistoricalAnalyticsResponse;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
  guestEstimateUsed: boolean;
}): AdminSurfaceState {
  if (!input.response) {
    return input.loading ? "loading" : "unavailable";
  }

  if (input.error || input.response.cacheState === "stale") {
    return "stale";
  }

  if (input.guestEstimateUsed) {
    return "degraded";
  }

  return input.overviewTruthState ?? (input.response.cacheState === "fresh" ? "cached" : "live");
}

function metric(
  value: number | null,
  source: AudienceSource,
  label: string,
  truthState: AdminSurfaceState,
): AudienceMetric {
  return { value, source, label, truthState };
}

export function buildAdminAnalyticsAudienceSnapshotModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsAudienceSnapshotModel {
  const { selectedRange, response, loading, error, overviewTruthState } = input;
  const totals = response?.totals;
  const guestTraffic = response?.guestTraffic;
  const hasResponse = Boolean(response);
  const rawGuestEstimate =
    guestTraffic ? guestTraffic.totalViews - guestTraffic.identifiedViews : null;
  const guestEstimateClamped = rawGuestEstimate !== null && rawGuestEstimate < 0;
  const guestEstimateFormulaUsed =
    guestTraffic?.truthLabel === "estimated" ||
    guestTraffic?.sourceLabel === "ga_total_minus_identified_first_party";
  const baseTruthState = resolveBaseTruthState({
    response,
    loading,
    error,
    overviewTruthState,
    guestEstimateUsed: guestEstimateFormulaUsed,
  });
  const unavailableTruthState: AdminSurfaceState = loading ? "loading" : "unavailable";
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
  const guestTruthState: AdminSurfaceState =
    guestVisitsSource === "estimated_guest_traffic"
      ? "degraded"
      : guestVisitsSource === "unavailable"
        ? unavailableTruthState
        : baseTruthState;
  const visibleCopy = hasResponse
    ? guestEstimateFormulaUsed
      ? [
          "Audience uses GA totals plus first-party activity.",
          "Guest traffic is estimated until anonymous batches arrive.",
        ]
      : ["Audience uses validated GA and first-party activity for this range."]
    : [loading ? "Waiting for first snapshot." : "Audience unavailable."];

  const totalUsersSource: AudienceSource = hasResponse ? "ga_total" : loading ? "waiting" : "unavailable";
  const sessionsSource: AudienceSource = hasResponse ? "mixed_ga_first_party" : loading ? "waiting" : "unavailable";
  const viewsSource: AudienceSource = hasResponse ? "mixed_ga_first_party" : loading ? "waiting" : "unavailable";
  const gaMetricSource: AudienceSource = hasResponse ? "ga_metric" : loading ? "waiting" : "unavailable";

  return {
    selectedRange,
    totalUsersSource,
    identifiedUsersSource: "unavailable",
    guestVisitsSource,
    sessionsSource,
    viewsSource,
    avgSessionSource: gaMetricSource,
    engagementRateSource: gaMetricSource,
    totalUsers: metric(
      totals?.users ?? null,
      totalUsersSource,
      hasResponse ? "GA total users" : loading ? "Waiting for first snapshot" : "Unavailable",
      hasResponse ? baseTruthState : unavailableTruthState,
    ),
    identifiedUsers: metric(
      null,
      "unavailable",
      "Identified user count unavailable in this route",
      "unavailable",
    ),
    identifiedViews: metric(
      guestTraffic?.identifiedViews ?? null,
      guestTraffic ? "identified_first_party" : loading ? "waiting" : "unavailable",
      guestTraffic ? "Identified first-party views" : loading ? "Waiting for first snapshot" : "Unavailable",
      guestTraffic ? baseTruthState : unavailableTruthState,
    ),
    guestVisits: metric(
      guestVisitsValue,
      guestVisitsSource,
      guestVisitsSource === "estimated_guest_traffic"
        ? "Estimated guest visits"
        : guestVisitsSource === "first_party_anonymous"
          ? "Guest visits"
          : loading
            ? "Waiting for first snapshot"
            : "Unavailable",
      guestTruthState,
    ),
    sessions: metric(
      totals?.sessions ?? null,
      sessionsSource,
      hasResponse ? "Sessions from GA with first-party fallback" : loading ? "Waiting for first snapshot" : "Unavailable",
      hasResponse ? baseTruthState : unavailableTruthState,
    ),
    views: metric(
      totals?.views ?? null,
      viewsSource,
      hasResponse ? "Views from GA with first-party fallback" : loading ? "Waiting for first snapshot" : "Unavailable",
      hasResponse ? baseTruthState : unavailableTruthState,
    ),
    avgSession: metric(
      totals?.avgSessionDuration ?? null,
      gaMetricSource,
      hasResponse ? "GA average session duration" : loading ? "Waiting for first snapshot" : "Unavailable",
      hasResponse ? baseTruthState : unavailableTruthState,
    ),
    engagementRate: metric(
      totals?.engagementRate ?? null,
      gaMetricSource,
      hasResponse ? "GA engagement rate" : loading ? "Waiting for first snapshot" : "Unavailable",
      hasResponse ? baseTruthState : unavailableTruthState,
    ),
    guestEstimateFormula: guestEstimateFormulaUsed
      ? "max(exact guest visits, GA total views - identified first-party views)"
      : null,
    guestEstimateFormulaUsed,
    guestEstimateClamped,
    guestEstimateWarning: guestEstimateClamped
      ? "GA total views were below identified first-party views; guest estimate was clamped at zero."
      : null,
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
      { key: "users", label: "GA users", source: "ga_total", stroke: "#ffffff" },
      { key: "views", label: "Views", source: "mixed_ga_first_party", stroke: "#b28cff" },
    ],
    chartHeightClass: "h-44 md:h-64",
    badgeOverflowProtectionEnabled: true,
    fakeZeroPrevented: !hasResponse,
    visibleCopy,
  };
}
