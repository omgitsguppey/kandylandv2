import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsAudienceSnapshotModel } from "@/lib/admin-analytics-audience-snapshot";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

describe("buildAdminAnalyticsAudienceSnapshotModel", () => {
  it("labels GA users and estimated guest visits without fake zeros", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      generatedAtMs: 1_771_000_000_000,
      cacheState: "fresh",
      totals: {
        users: 1200,
        views: 1800,
        sessions: 1300,
        newUsers: 900,
        avgSessionDuration: 31,
        engagementRate: 0.23,
      },
      guestTraffic: {
        totalViews: 1800,
        totalSessions: 1300,
        identifiedViews: 400,
        identifiedSessions: 250,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 1400,
        estimatedGuestSessions: 1050,
        truthLabel: "estimated",
        sourceLabel: "ga_total_minus_identified_first_party",
        qualityAvailable: false,
      },
    };

    const model = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "30d",
      response,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.totalUsers.label).toBe("Total users");
    expect(model.totalUsersSource).toBe("ga_total");
    expect(model.guestVisits.label).toBe("Estimated guest visits");
    expect(model.guestEstimateFormulaUsed).toBe(true);
    expect(model.guestEstimateClamped).toBe(false);
    expect(model.fakeZeroPrevented).toBe(false);
    expect(model.chartSeries[0]).toMatchObject({
      key: "users",
      stroke: "#ffffff",
    });
  });

  it("prevents fake zero and reports clamped guest estimates", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      totals: {
        users: 10,
        views: 5,
        sessions: 4,
        newUsers: 1,
        avgSessionDuration: 12,
        engagementRate: 0.1,
      },
      guestTraffic: {
        totalViews: 5,
        totalSessions: 4,
        identifiedViews: 7,
        identifiedSessions: 5,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "estimated",
        sourceLabel: "ga_total_minus_identified_first_party",
        qualityAvailable: false,
      },
    };

    const clamped = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "7d",
      response,
      loading: false,
    });
    const waiting = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "7d",
      loading: true,
    });

    expect(clamped.guestEstimateClamped).toBe(true);
    expect(clamped.guestEstimateWarning).toContain("clamped");
    expect(waiting.totalUsers.value).toBeNull();
    expect(waiting.totalUsers.label).toBe("Waiting for first snapshot");
    expect(waiting.fakeZeroPrevented).toBe(true);
  });
});
