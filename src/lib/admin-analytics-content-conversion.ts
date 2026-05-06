import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  ContentConversionRow,
  ContentConversionState,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

export type ContentConversionGroupingKey =
  | "contentType"
  | "flavor"
  | "creator"
  | "priceBand";

export type AdminAnalyticsContentConversionModel = ContentConversionState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  sourceLabel: string;
  visibleCopy: string[];
  overallUnlockRatePct: number | null;
  missingMetadataCount: number;
  availableGroupingKeys: Array<{
    value: ContentConversionGroupingKey;
    label: string;
  }>;
  rowsByDimension: Record<ContentConversionGroupingKey, ContentConversionRow[]>;
  fakeZeroPrevented: boolean;
};

const EMPTY_STATE: ContentConversionState = {
  generatedAtUtc: new Date(0).toISOString(),
  range: "30d",
  sourceState: "missing",
  sourceTruth: "missing",
  totalPreviews: 0,
  totalUnlocks: 0,
  totalViewerOpens: 0,
  totalWatchSeconds: 0,
  rows: [],
  warnings: ["No preview/unwrap/drop metadata source available for this range."],
};

function mapTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  sourceState: ContentConversionState["sourceState"];
}): AdminSurfaceState {
  if (input.loading && !input.hasResponse) return "loading";
  if (!input.hasResponse || input.sourceState === "missing") return "unavailable";
  if (input.sourceState === "stale") return "stale";
  if (input.sourceState === "partial" || input.sourceState === "unknown") return "degraded";
  return "cached";
}

function formatSourceLabel(sourceTruth: ContentConversionState["sourceTruth"]) {
  switch (sourceTruth) {
    case "drop_metadata_plus_telemetry":
      return "Drop metadata + preview/unwrap telemetry";
    case "drop_metadata_plus_unlock_rollups":
      return "Drop metadata + unwrap/access rollups";
    case "telemetry_only":
      return "Telemetry only";
    case "rollup_only":
      return "Unwrap/access rollups only";
    default:
      return "Missing";
  }
}

function sortRows(rows: ContentConversionRow[]) {
  return [...rows].sort(
    (left, right) =>
      right.previewCount - left.previewCount
      || right.unlockCount - left.unlockCount
      || left.groupLabel.localeCompare(right.groupLabel),
  );
}

export function buildAdminAnalyticsContentConversionModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
}): AdminAnalyticsContentConversionModel {
  const state = input.response?.contentConversionState ?? {
    ...EMPTY_STATE,
    generatedAtUtc: input.response?.generatedAtMs
      ? new Date(input.response.generatedAtMs).toISOString()
      : EMPTY_STATE.generatedAtUtc,
    range: input.selectedRange,
  };

  const rowsByDimension: Record<ContentConversionGroupingKey, ContentConversionRow[]> = {
    contentType: sortRows(state.rows.filter((row) => row.groupingDimension === "contentType")),
    flavor: sortRows(state.rows.filter((row) => row.groupingDimension === "flavor")),
    creator: sortRows(state.rows.filter((row) => row.groupingDimension === "creator")),
    priceBand: sortRows(state.rows.filter((row) => row.groupingDimension === "priceBand")),
  };
  const overallUnlockRatePct = state.totalPreviews > 0
    ? (state.totalUnlocks / state.totalPreviews) * 100
    : null;
  const visibleCopy = [
    state.sourceTruth === "drop_metadata_plus_unlock_rollups"
      ? "Content conversion is using access rollup fallback because unwrap telemetry is missing."
      : "Content conversion joins drop metadata with preview, unwrap, and optional viewer/watch sources.",
    ...state.warnings,
  ];

  return {
    ...state,
    selectedRange: input.selectedRange,
    truthState: mapTruthState({
      loading: input.loading,
      hasResponse: Boolean(input.response),
      sourceState: state.sourceState,
    }),
    sourceLabel: formatSourceLabel(state.sourceTruth),
    visibleCopy,
    overallUnlockRatePct,
    missingMetadataCount: state.rows.filter((row) => row.conversionState === "missing_metadata").length,
    availableGroupingKeys: [
      { value: "contentType", label: "Content type" },
      { value: "flavor", label: "Flavor" },
      { value: "creator", label: "Creator" },
      { value: "priceBand", label: "Price band" },
    ],
    rowsByDimension,
    fakeZeroPrevented: state.sourceState === "missing" && state.totalPreviews === 0 && state.totalUnlocks === 0,
  };
}
