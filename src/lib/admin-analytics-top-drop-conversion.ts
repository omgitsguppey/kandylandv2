import type {
  HistoricalAnalyticsResponse,
  RangeOption,
  TopDropConversionRow,
  TopDropConversionState,
  TopDropItem,
} from "@/types/admin-analytics";
import { safeRate } from "@/lib/deterministic-admin-truth";
import { buildRecoveredLaunchMetricState } from "@/lib/analytics/recovery-timeline-spine";

export type AdminAnalyticsTopDropConversionModel = TopDropConversionState & {
  selectedRange: RangeOption;
  chartRows: Array<TopDropConversionRow & { chartLabel: string }>;
  visibleRows: TopDropConversionRow[];
  visibleStart: number;
  visibleEnd: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pageCount: number;
  denominatorCopy: string;
  sourceCopy: string;
};

const DEFAULT_PAGE_SIZE = 10;

function shortDropId(dropId: string) {
  if (!dropId) return "missing";
  return dropId.length > 8 ? `${dropId.slice(0, 4)}...${dropId.slice(-4)}` : dropId;
}

export function formatTopDropUnwrapRate(unwraps: number, views: number) {
  return safeRate({
    numerator: unwraps,
    denominator: views,
    numeratorSource: "drop_metadata_plus_rollups",
    denominatorSource: "drop_metadata_plus_rollups",
    numeratorRange: "selected_range",
    denominatorRange: "selected_range",
    label: "Top drop unwrap conversion",
  }).display;
}

function normalizeRow(drop: TopDropItem): TopDropConversionRow {
  const dropTitle = typeof drop.dropTitle === "string" && drop.dropTitle.trim().length > 0
    ? drop.dropTitle.trim()
    : "Unknown drop";
  const dropIdentityState = dropTitle === "Unknown drop" || dropTitle === drop.dropId
    ? "fallback_id"
    : "resolved";
  const views = Math.max(0, Number(drop.views) || 0);
  const unwraps = Math.max(0, Number(drop.unlocks) || 0);
  const recoveryMetadata = buildTopDropConversionRecoveryMetadata({
    views,
    unwraps,
    dropId: drop.dropId,
    generatedAtMs: null,
  });
  const unwrapRate = safeRate({
    numerator: unwraps,
    denominator: views,
    numeratorSource: "drop_metadata_plus_rollups",
    denominatorSource: "drop_metadata_plus_rollups",
    numeratorRange: "selected_range",
    denominatorRange: "selected_range",
    label: "Top drop unwrap conversion",
  });
  return {
    dropId: drop.dropId,
    shortDropId: shortDropId(drop.dropId),
    dropTitle,
    creatorName: drop.creatorName,
    dropIdentityState,
    views,
    unwraps,
    unwrapRatePct: unwrapRate.valuePct,
    unwrapRateDisplay: unwrapRate.display,
    revenueUsd: null,
    gumdropsSpent: null,
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
    explanation: views > 0
      ? `Unwrap conversion uses unwraps divided by validated drop views for the selected range. ${unwrapRate.reason}`
      : "Unwrap conversion is unavailable because this row has no validated view denominator.",
    adminDropHref: `/admin/drops?dropId=${encodeURIComponent(drop.dropId)}`,
  };
}

function buildTopDropConversionRecoveryMetadata(input: {
  views: number;
  unwraps: number;
  dropId: string;
  generatedAtMs: number | null;
}) {
  const sourceObserved = input.views > 0 || input.unwraps > 0;
  const eventName = input.views > 0 ? "drop_preview_opened" : "drop_unlocked";
  return buildRecoveredLaunchMetricState({
    eventName,
    sourceObserved,
    sourceTruth: "first_party_event_fact",
    evidenceKind: sourceObserved ? "observed" : "missing",
    route: "admin_analytics_top_drop_conversion",
    objectId: input.dropId,
    timestampMs: input.generatedAtMs,
  });
}

function buildFallbackState(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
}): TopDropConversionState {
  const rows = (input.response?.topDrops ?? []).map(normalizeRow);
  return {
    generatedAtUtc: input.response?.generatedAtMs
      ? new Date(input.response.generatedAtMs).toISOString()
      : new Date(0).toISOString(),
    range: input.selectedRange,
    sourceTruth: rows.length > 0 ? "fallback" : "unknown",
    freshnessState: rows.length > 0 ? "partial" : "unknown",
    denominatorLabel: "validated views",
    numeratorLabel: "unwraps",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalRows: rows.length,
    rows,
    warnings: rows.length > 0
      ? ["Top Drop Conversion is using legacy top drop rows; source details are partial."]
      : ["No drop conversion rows were available for this range."],
  };
}

export function buildAdminAnalyticsTopDropConversionModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  page: number;
  pageSize: number;
}): AdminAnalyticsTopDropConversionModel {
  const baseState = input.response?.topDropConversionState ?? buildFallbackState(input);
  const pageSize = input.pageSize > 0 ? input.pageSize : baseState.pageSize || DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(baseState.rows.length / pageSize));
  const page = Math.min(Math.max(1, input.page || 1), pageCount);
  const visibleStart = (page - 1) * pageSize;
  const visibleRows = baseState.rows.slice(visibleStart, visibleStart + pageSize);
  return {
    ...baseState,
    selectedRange: input.selectedRange,
    page,
    pageSize,
    totalRows: baseState.totalRows || baseState.rows.length,
    visibleRows,
    visibleStart,
    visibleEnd: visibleStart + visibleRows.length,
    hasPreviousPage: page > 1,
    hasNextPage: page < pageCount,
    pageCount,
    chartRows: visibleRows.slice(0, 8).map((row) => ({
      ...row,
      chartLabel: row.dropTitle.length > 18 ? `${row.dropTitle.slice(0, 18)}...` : row.dropTitle,
    })),
    denominatorCopy: `${baseState.denominatorLabel} source: drop rollups or validated drop counters for the selected range.`,
    sourceCopy: baseState.sourceTruth === "drop_metadata_plus_rollups"
      ? "Drop names come from metadata; unwrap counts come from access/drop rollups."
      : "Drop conversion source is partial. Review source and freshness before treating rates as authoritative.",
  };
}
