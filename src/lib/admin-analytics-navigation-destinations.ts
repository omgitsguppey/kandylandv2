import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  HistoricalAnalyticsResponse,
  NavigationDestinationRow,
  NavigationDestinationsState,
  RangeOption,
} from "@/types/admin-analytics";

export type AdminNavigationDestinationsModel = NavigationDestinationsState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  sourceModeLabel: string;
  visibleCopy: string[];
  fakeZeroPrevented: boolean;
  expectedEventsLabel: string;
  missingSourceCount: number;
  chartRows: Array<{
    key: string;
    label: string;
    value: number;
    sourceTruth: NavigationDestinationRow["sourceTruth"];
  }>;
};

const EMPTY_STATE: NavigationDestinationsState = {
  generatedAtUtc: new Date(0).toISOString(),
  range: "30d",
  sourceMode: "unavailable",
  totalNavigationEvents: 0,
  explicitTapCount: 0,
  fallbackViewCount: 0,
  destinations: [],
  missingReason:
    "Navigation tap tracking is not instrumented. Expected events: navigation_click, semantic_target_clicked with destination.",
  warnings: [],
};

function mapTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  sourceMode: NavigationDestinationsState["sourceMode"];
  overviewTruthState?: AdminSurfaceState;
}) {
  if (input.loading && !input.hasResponse) {
    return "loading" satisfies AdminSurfaceState;
  }
  if (input.sourceMode === "unavailable") {
    return "unavailable" satisfies AdminSurfaceState;
  }
  if (input.sourceMode === "destination_views_only" || input.sourceMode === "mixed_fallback") {
    return "degraded" satisfies AdminSurfaceState;
  }
  return input.overviewTruthState === "live" ? "live" : "cached";
}

function getSourceModeLabel(sourceMode: NavigationDestinationsState["sourceMode"]) {
  switch (sourceMode) {
    case "tap_events":
      return "Explicit taps";
    case "mixed_fallback":
      return "Mixed fallback";
    case "destination_views_only":
      return "Fallback destination visits";
    default:
      return "Unavailable";
  }
}

export function buildAdminAnalyticsNavigationDestinationsModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
  overviewTruthState?: AdminSurfaceState;
}): AdminNavigationDestinationsModel {
  const state = input.response?.navigationDestinationsState ?? {
    ...EMPTY_STATE,
    generatedAtUtc: input.response?.generatedAtMs
      ? new Date(input.response.generatedAtMs).toISOString()
      : EMPTY_STATE.generatedAtUtc,
    range: input.selectedRange,
  };

  const truthState = mapTruthState({
    loading: input.loading,
    hasResponse: Boolean(input.response),
    sourceMode: state.sourceMode,
    overviewTruthState: input.overviewTruthState,
  });

  const visibleCopy: string[] = [];
  if (state.sourceMode === "tap_events") {
    visibleCopy.push("Showing destination activity from explicit navigation taps.");
  }
  if (state.sourceMode === "mixed_fallback") {
    visibleCopy.push("Showing explicit navigation taps first, with destination-view fallback where tap coverage is incomplete.");
  }
  if (state.sourceMode === "destination_views_only") {
    visibleCopy.push("No explicit navigation tap events found. Showing destination visits from page-view fallback.");
  }
  if (state.sourceMode === "unavailable") {
    visibleCopy.push(
      state.missingReason ?? "No navigation tap or destination-view events found in this range.",
    );
  }
  state.warnings.forEach((warning) => {
    if (!visibleCopy.includes(warning)) {
      visibleCopy.push(warning);
    }
  });

  return {
    ...state,
    selectedRange: input.selectedRange,
    truthState,
    sourceModeLabel: getSourceModeLabel(state.sourceMode),
    visibleCopy,
    fakeZeroPrevented:
      state.sourceMode === "unavailable" && state.totalNavigationEvents === 0,
    expectedEventsLabel:
      "Expected events: navigation_click, semantic_target_clicked with destination, notification_action_clicked.",
    missingSourceCount:
      state.sourceMode === "tap_events"
        ? 0
        : state.sourceMode === "mixed_fallback"
          ? 1
          : state.sourceMode === "destination_views_only"
            ? 1
            : 2,
    chartRows: state.destinations.map((row) => ({
      key: row.destinationPath,
      label: row.destinationLabel,
      value: row.count,
      sourceTruth: row.sourceTruth,
    })),
  };
}
