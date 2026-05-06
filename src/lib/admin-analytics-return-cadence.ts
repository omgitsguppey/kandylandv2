import type {
  HistoricalAnalyticsResponse,
  ReturnCadenceSegment,
  ReturnCadenceState,
  RangeOption,
} from "@/types/admin-analytics";
import type { AdminSurfaceState } from "@/lib/admin-parity";

export const ADMIN_ANALYTICS_RETURN_CADENCE_SOURCE_FIELD =
  "repeatVisitSegments" as const;

export interface AdminAnalyticsReturnCadenceSummary {
  trackedUsers: number;
  uniqueReturners: number;
  returnerConversionRate: number;
}

export type AdminAnalyticsReturnCadenceModel = ReturnCadenceState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  visibleCopy: string[];
  chartSegments: ReturnCadenceSegment[];
  sourceLabel: string;
  generatedAtLabel: string;
  fakeZeroPrevented: boolean;
};

function isSingleDaySegment(label: string) {
  return label.trim().toLowerCase() === "1 day";
}

function assertReturnCadenceSegmentShape(segment: unknown, index: number) {
  if (
    !segment ||
    typeof segment !== "object" ||
    typeof (segment as ReturnCadenceSegment).label !== "string" ||
    typeof (segment as ReturnCadenceSegment).count !== "number" ||
    typeof (segment as ReturnCadenceSegment).users !== "number"
  ) {
    throw new Error(
      `Admin analytics ${ADMIN_ANALYTICS_RETURN_CADENCE_SOURCE_FIELD}[${index}] drifted from the canonical contract.`,
    );
  }
}

export function normalizeAdminAnalyticsReturnCadenceSegments(
  response?: Partial<Pick<HistoricalAnalyticsResponse, "repeatVisitSegments">> | null,
): ReturnCadenceSegment[] {
  const rawSegments = response?.repeatVisitSegments;

  if (!Array.isArray(rawSegments)) {
    return [];
  }

  return rawSegments.map((segment, index) => {
    if (process.env.NODE_ENV !== "production") {
      assertReturnCadenceSegmentShape(segment, index);
    }

    return {
      label: typeof segment.label === "string" ? segment.label : "unknown",
      count: Math.max(0, Number(segment.count) || 0),
      users: Math.max(0, Number(segment.users) || 0),
    };
  });
}

export function buildAdminAnalyticsReturnCadenceSummary(
  segments: ReturnCadenceSegment[],
): AdminAnalyticsReturnCadenceSummary {
  const trackedUsers = segments.reduce(
    (sum, segment) => sum + Math.max(0, Number(segment.users) || 0),
    0,
  );
  const uniqueReturners = segments.reduce((sum, segment) => {
    if (isSingleDaySegment(segment.label)) {
      return sum;
    }

    return sum + Math.max(0, Number(segment.users) || 0);
  }, 0);

  return {
    trackedUsers,
    uniqueReturners,
    returnerConversionRate:
      trackedUsers > 0 ? uniqueReturners / trackedUsers : 0,
  };
}

function mapReturnCadenceTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  freshnessState: ReturnCadenceState["freshnessState"];
  sourceTruth: ReturnCadenceState["sourceTruth"];
  overviewTruthState?: AdminSurfaceState;
}): AdminSurfaceState {
  if (input.loading && !input.hasResponse) {
    return "loading";
  }
  if (!input.hasResponse && input.sourceTruth === "missing") {
    return "unavailable";
  }
  if (input.freshnessState === "stale") {
    return "stale";
  }
  if (input.freshnessState === "missing") {
    return "unavailable";
  }
  if (input.sourceTruth === "mixed_fallback") {
    return "degraded";
  }
  return input.overviewTruthState === "live" ? "live" : "cached";
}

function buildLegacyState(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  segments: ReturnCadenceSegment[];
  selectedRange: RangeOption;
}): ReturnCadenceState {
  const summary = buildAdminAnalyticsReturnCadenceSummary(input.segments);
  const generatedAtUtc = input.response?.generatedAtMs
    ? new Date(input.response.generatedAtMs).toISOString()
    : new Date(0).toISOString();
  const trackedAuthenticatedUsers = summary.trackedUsers;
  return {
    generatedAtUtc,
    range: input.selectedRange,
    sourceTruth: trackedAuthenticatedUsers > 0 ? "identified_event_facts" : "missing",
    freshnessState: trackedAuthenticatedUsers > 0 ? "partial" : "missing",
    trackedAuthenticatedUsers,
    uniqueReturners: summary.uniqueReturners,
    conversionPct: summary.returnerConversionRate,
    buckets: {
      oneDay: input.segments.find((segment) => segment.label === "1 day")?.users ?? 0,
      twoDays: input.segments.find((segment) => segment.label === "2 days")?.users ?? 0,
      threeToFourDays: input.segments.find((segment) => segment.label === "3-4 days")?.users ?? 0,
      fivePlusDays: input.segments.find((segment) => segment.label === "5+ days")?.users ?? 0,
    },
    denominatorExplanation:
      "Conversion = unique returners / tracked authenticated users. Unique returners are users active on 2+ distinct days in the selected range.",
    missingReason: trackedAuthenticatedUsers === 0
      ? "Return cadence source missing. No verified zero should be displayed."
      : undefined,
    warnings: trackedAuthenticatedUsers > 0
      ? ["Return cadence is using identified activity fallback because the cadence snapshot has not hydrated."]
      : [],
  };
}

export function buildAdminAnalyticsReturnCadenceModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsReturnCadenceModel {
  const segments = normalizeAdminAnalyticsReturnCadenceSegments(input.response);
  const state = input.response?.returnCadenceState
    ? input.response.returnCadenceState
    : buildLegacyState({
      response: input.response,
      segments,
      selectedRange: input.selectedRange,
    });
  const truthState = mapReturnCadenceTruthState({
    loading: input.loading,
    hasResponse: Boolean(input.response),
    freshnessState: state.freshnessState,
    sourceTruth: state.sourceTruth,
    overviewTruthState: input.overviewTruthState,
  });
  const visibleCopy: string[] = [];
  if (state.sourceTruth === "mixed_fallback") {
    visibleCopy.push(
      "Return cadence is using identified activity fallback because the cadence snapshot has not hydrated.",
    );
  }
  if (state.sourceTruth === "missing") {
    visibleCopy.push("Return cadence source missing. No verified zero should be displayed.");
  }
  if (state.missingReason && !visibleCopy.includes(state.missingReason)) {
    visibleCopy.push(state.missingReason);
  }
  if (state.warnings.length === 0 && state.sourceTruth !== "missing") {
    visibleCopy.push("Authenticated users are grouped by distinct active days in the selected range.");
  }
  const sourceLabel =
    state.sourceTruth === "materialized_user_activity"
      ? "Materialized user activity"
      : state.sourceTruth === "identified_event_facts"
        ? "Identified event facts"
        : state.sourceTruth === "auth_sessions"
          ? "Auth sessions"
          : state.sourceTruth === "mixed_fallback"
            ? "Mixed authenticated activity fallback"
            : "Missing";
  return {
    ...state,
    selectedRange: input.selectedRange,
    truthState,
    visibleCopy,
    chartSegments: segments,
    sourceLabel,
    generatedAtLabel:
      state.generatedAtUtc === new Date(0).toISOString()
        ? "Unavailable"
        : state.generatedAtUtc,
    fakeZeroPrevented:
      state.sourceTruth === "missing" && state.trackedAuthenticatedUsers === 0,
  };
}
