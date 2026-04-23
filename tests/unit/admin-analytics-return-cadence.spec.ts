import { describe, expect, it } from "vitest";

import {
  ADMIN_ANALYTICS_RETURN_CADENCE_SOURCE_FIELD,
  buildAdminAnalyticsReturnCadenceSummary,
  normalizeAdminAnalyticsReturnCadenceSegments,
} from "@/lib/admin-analytics-return-cadence";

describe("admin analytics return cadence helpers", () => {
  it("normalizes canonical repeat visit segments and derives returner summary", () => {
    const segments = normalizeAdminAnalyticsReturnCadenceSegments({
      repeatVisitSegments: [
        { label: "1 day", count: 12, users: 12 },
        { label: "2 days", count: 7, users: 7 },
        { label: "3-4 days", count: 3, users: 3 },
      ],
    });

    expect(segments).toEqual([
      { label: "1 day", count: 12, users: 12 },
      { label: "2 days", count: 7, users: 7 },
      { label: "3-4 days", count: 3, users: 3 },
    ]);

    expect(buildAdminAnalyticsReturnCadenceSummary(segments)).toEqual({
      trackedUsers: 22,
      uniqueReturners: 10,
      returnerConversionRate: 10 / 22,
    });
  });

  it("returns an empty set when the canonical field is absent", () => {
    expect(
      normalizeAdminAnalyticsReturnCadenceSegments(undefined),
    ).toEqual([]);
    expect(
      normalizeAdminAnalyticsReturnCadenceSegments({}),
    ).toEqual([]);
  });

  it("fails loudly in development when repeat visit segments drift", () => {
    expect(() =>
      normalizeAdminAnalyticsReturnCadenceSegments({
        repeatVisitSegments: [
          { label: "2 days", count: 4 } as never,
        ],
      }),
    ).toThrow(
      `Admin analytics ${ADMIN_ANALYTICS_RETURN_CADENCE_SOURCE_FIELD}[0] drifted from the canonical contract.`,
    );
  });
});
