import type { AdminSurfaceState } from "@/lib/admin-parity";
import { buildRecoveredLaunchMetricState } from "@/lib/analytics/recovery-timeline-spine";
import type {
  HistoricalAnalyticsResponse,
  RangeOption,
  RegionDemandPanelState,
  RegionDemandRow,
} from "@/types/admin-analytics";

export type AdminAnalyticsRegionDemandModel = RegionDemandPanelState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  sourceLabel: string;
  freshnessLabel: string;
  visibleCopy: string[];
};

const EMPTY_STATE: RegionDemandPanelState = {
  generatedAtUtc: new Date(0).toISOString(),
  range: "30d",
  sourceTruth: "unknown",
  freshnessState: "unknown",
  filterMode: "comparison",
  countUnit: "mixed",
  rawTotal: 0,
  adjustedTotal: 0,
  internalExcludedCount: 0,
  rows: [],
  warnings: [],
};

function mapTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  freshnessState: RegionDemandPanelState["freshnessState"];
  sourceTruth: RegionDemandPanelState["sourceTruth"];
}) {
  if (input.loading && !input.hasResponse) {
    return "loading" satisfies AdminSurfaceState;
  }
  if (!input.hasResponse) {
    return "unavailable" satisfies AdminSurfaceState;
  }
  if (input.freshnessState === "stale") {
    return "stale" satisfies AdminSurfaceState;
  }
  if (input.freshnessState === "partial" || input.sourceTruth === "mixed" || input.sourceTruth === "unknown") {
    return "degraded" satisfies AdminSurfaceState;
  }
  return "cached" satisfies AdminSurfaceState;
}

function formatSourceLabel(sourceTruth: RegionDemandPanelState["sourceTruth"]) {
  switch (sourceTruth) {
    case "ga4":
      return "GA4 geography";
    case "first_party":
      return "First-party geography";
    case "mixed":
      return "GA4 geography with admin-surface exclusion";
    default:
      return "Unknown";
  }
}

function formatFreshnessLabel(freshnessState: RegionDemandPanelState["freshnessState"]) {
  switch (freshnessState) {
    case "live":
      return "Recent";
    case "recent":
      return "Recent";
    case "stale":
      return "Stale";
    case "partial":
      return "Partial";
    default:
      return "Unknown";
  }
}

function formatUnitLabel(countUnit: RegionDemandPanelState["countUnit"], count: number) {
  const label = count === 1
    ? countUnit.replace(/s$/u, "")
    : countUnit;
  return `${count.toLocaleString()} ${label}`;
}

function normalizeFallbackRow(
  row: { city: string; country: string; users: number },
  generatedAtMs: number | null | undefined,
): RegionDemandRow {
  const city = row.city && row.city !== "Unknown" ? row.city : null;
  const country = row.country && row.country !== "Unknown" ? row.country : null;
  const rawCount = Math.max(0, row.users);
  const recoveryMetadata = buildRegionDemandRecoveryMetadata({
    rawCount,
    objectId: `${country ?? "unknown_country"}:${city ?? "unknown_city"}`,
    generatedAtMs,
  });
  return {
    city,
    region: null,
    country,
    rawCount,
    adjustedCount: rawCount,
    adminInternalCount: 0,
    unknownIdentityCount: rawCount,
    externalUserCount: rawCount,
    sharePct: 0,
    adjustedSharePct: 0,
    sourceTruth: recoveryMetadata.sourceTruth,
    freshnessState: recoveryMetadata.freshnessState,
    confidenceScore: recoveryMetadata.confidenceScore,
    confidenceBand: recoveryMetadata.confidenceBand,
    evidenceKind: recoveryMetadata.evidenceKind,
    dedupeKey: recoveryMetadata.dedupeKey,
    dedupeDimensions: recoveryMetadata.dedupeDimensions,
    lateArrivalWindowDays: recoveryMetadata.lateArrivalWindowDays,
    productTruthEligible: recoveryMetadata.productTruthEligible,
    missingVsZeroState: recoveryMetadata.missingVsZeroState,
    mathReason: recoveryMetadata.mathReason,
    demandState: !city || !country ? "unknown_location" : "review",
    explanation: !city || !country
      ? "Unknown city/country is a data-quality bucket, not reliable external demand."
      : "Raw GA geography is available, but route-level admin exclusion did not hydrate for this range.",
  };
}

function buildRegionDemandRecoveryMetadata(input: {
  rawCount: number;
  objectId: string;
  generatedAtMs: number | null | undefined;
}) {
  const sourceObserved = input.rawCount > 0;
  return buildRecoveredLaunchMetricState({
    eventName: "page_view",
    sourceObserved,
    sourceTruth: sourceObserved ? "ga4_evidence_only" : "source_missing",
    evidenceKind: sourceObserved ? "modeled" : "missing",
    route: "admin_analytics_region_demand",
    objectId: input.objectId,
    timestampMs: input.generatedAtMs ?? null,
  });
}

export function buildAdminAnalyticsRegionDemandModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
}): AdminAnalyticsRegionDemandModel {
  const fallbackRows = (input.response?.geo ?? []).map((row) => normalizeFallbackRow(row, input.response?.generatedAtMs));
  const fallbackRawTotal = fallbackRows.reduce((sum, row) => sum + row.rawCount, 0);
  const fallbackAdjustedTotal = fallbackRows.reduce((sum, row) => sum + row.adjustedCount, 0);
  const state = input.response?.regionDemandPanelState ?? {
    ...EMPTY_STATE,
    generatedAtUtc: input.response?.generatedAtMs
      ? new Date(input.response.generatedAtMs).toISOString()
      : EMPTY_STATE.generatedAtUtc,
    range: input.selectedRange,
    sourceTruth: fallbackRows.length > 0 ? "ga4" : "unknown",
    freshnessState: input.response?.cacheState === "stale" ? "stale" : fallbackRows.length > 0 ? "partial" : "unknown",
    countUnit: fallbackRows.length > 0 ? "users" : "mixed",
    rawTotal: fallbackRawTotal,
    adjustedTotal: fallbackAdjustedTotal,
    rows: fallbackRows.map((row) => ({
      ...row,
      sharePct: fallbackRawTotal > 0 ? row.rawCount / fallbackRawTotal : 0,
      adjustedSharePct: fallbackAdjustedTotal > 0 ? row.adjustedCount / fallbackAdjustedTotal : 0,
    })),
    warnings: fallbackRows.length > 0
      ? [
        "Counts are GA4 users because route-level geography fallback did not hydrate.",
        "Adjusted demand excludes proven admin-surface traffic only.",
        "Raw geography is shown, but internal/admin traffic could not be separated in this fallback lane.",
      ]
      : ["No region geography source is available for this range."],
  };

  const visibleCopy = [
    "Raw geography with internal/admin traffic separated from external demand.",
    `Counts use ${state.countUnit} for the selected range.`,
    "Adjusted demand excludes proven admin-surface traffic only.",
    ...state.warnings,
  ];

  return {
    ...state,
    selectedRange: input.selectedRange,
    truthState: mapTruthState({
      loading: input.loading,
      hasResponse: Boolean(input.response),
      freshnessState: state.freshnessState,
      sourceTruth: state.sourceTruth,
    }),
    sourceLabel: formatSourceLabel(state.sourceTruth),
    freshnessLabel: formatFreshnessLabel(state.freshnessState),
    visibleCopy,
  };
}

export function formatRegionDemandCount(
  countUnit: RegionDemandPanelState["countUnit"],
  count: number,
) {
  return formatUnitLabel(countUnit, count);
}
