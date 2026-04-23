import type {
  HistoricalAnalyticsResponse,
  ReturnCadenceSegment,
} from "@/types/admin-analytics";

export const ADMIN_ANALYTICS_RETURN_CADENCE_SOURCE_FIELD =
  "repeatVisitSegments" as const;

export interface AdminAnalyticsReturnCadenceSummary {
  trackedUsers: number;
  uniqueReturners: number;
  returnerConversionRate: number;
}

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
