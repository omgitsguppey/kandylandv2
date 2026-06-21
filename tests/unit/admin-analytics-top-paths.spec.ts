import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsTopPathsModel } from "@/lib/admin-analytics-top-paths";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function buildResponse(overrides?: Partial<HistoricalAnalyticsResponse>): Partial<HistoricalAnalyticsResponse> {
  return {
    generatedAtMs: Date.UTC(2026, 4, 6, 12, 0, 0),
    cacheState: "fresh",
    totals: {
      users: 0,
      views: 0,
      sessions: 0,
      newUsers: 0,
      avgSessionDuration: 0,
      engagementRate: 0,
    },
    pages: [],
    analyticsSourceHealth: {
      range: "30d",
      generatedAtUtc: new Date(Date.UTC(2026, 4, 6, 12, 0, 0)).toISOString(),
      availability: {
        ga4: {
          status: "pass",
          freshnessState: "fresh",
          confidence: 1,
          sampleCount: 1,
          lastSeenAtUtc: new Date(Date.UTC(2026, 4, 6, 12, 0, 0)).toISOString(),
          passAllowed: true,
          reason: "available",
        },
        historicalSnapshot: {
          status: "pass",
          freshnessState: "fresh",
          confidence: 1,
          sampleCount: 1,
          lastSeenAtUtc: new Date(Date.UTC(2026, 4, 6, 12, 0, 0)).toISOString(),
          passAllowed: true,
          reason: "available",
        },
        legacySupport: {
          status: "review",
          freshnessState: "fresh",
          confidence: 0.5,
          sampleCount: 1,
          lastSeenAtUtc: new Date(Date.UTC(2026, 4, 6, 12, 0, 0)).toISOString(),
          passAllowed: true,
          reason: "available",
        },
      },
      continuity: {
        expectedDays: 30,
        presentDays: 30,
        missingDays: [],
        recentGapDays: [],
        lastCompleteDayUtc: new Date(Date.UTC(2026, 4, 6, 0, 0, 0)).toISOString(),
        gapSeverity: "none",
        gapReason: "complete",
      },
      sourceAgreement: {
        comparedSources: ["ga4"],
        disagreementCount: 0,
        maxDeltaPct: null,
        state: "not_enough_sources",
      },
      chartReadiness: {
        state: "ready",
        reason: "ready",
      },
    },
    ...overrides,
  };
}

describe("buildAdminAnalyticsTopPathsModel", () => {
  it("computes total views and share from the snapshot denominator", () => {
    const model = buildAdminAnalyticsTopPathsModel({
      response: buildResponse({
        pages: [
          { path: "/", views: 90, avgTime: 24, engagementRate: 0.34 },
          { path: "/drops", views: 10, avgTime: 82, engagementRate: 0.67 },
        ],
      }),
      selectedRange: "30d",
      loading: false,
    });

    expect(model.totalViews).toBe(100);
    expect(model.sourceTruth).toBe("ga4_evidence_only");
    expect(model.freshnessState).toBe("external_evidence_required");
    expect(model.sourceLabel).toBe("Vendor evidence only");
    expect(model.freshnessLabel).toBe("Source evidence required");
    expect(model.truthState).toBe("degraded");
    expect(model.rows[0]?.viewSharePct).toBeCloseTo(0.9, 5);
    expect(model.rows[1]?.viewSharePct).toBeCloseTo(0.1, 5);
    expect(model.rows[0]).toMatchObject({
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
      freshnessState: "external_evidence_required",
      confidenceState: "estimated",
      confidenceScore: 58,
      lateArrivalWindowDays: 12,
      productTruthEligible: false,
      missingVsZeroState: "source_present",
    });
    expect(model.rows[0]?.dedupeKey).toContain("launch_recovery|page_view");
  });

  it("assigns route groups for home, drops, dashboard, creator, and legal paths", () => {
    const model = buildAdminAnalyticsTopPathsModel({
      response: buildResponse({
        pages: [
          { path: "/", views: 10, avgTime: 24, engagementRate: 0.34 },
          { path: "/drops", views: 10, avgTime: 24, engagementRate: 0.34 },
          { path: "/dashboard", views: 10, avgTime: 24, engagementRate: 0.34 },
          { path: "/creators/apply", views: 10, avgTime: 24, engagementRate: 0.34 },
          { path: "/privacy", views: 10, avgTime: 0, engagementRate: 0.04 },
        ],
      }),
      selectedRange: "30d",
      loading: false,
    });

    expect(model.rows.map((row) => row.routeGroup)).toEqual([
      "home",
      "drops",
      "dashboard",
      "creator",
      "legal",
    ]);
  });

  it("flags high-volume low-engagement and zero-time rows with explanations", () => {
    const model = buildAdminAnalyticsTopPathsModel({
      response: buildResponse({
        pages: [
          { path: "/creators/apply", views: 508, avgTime: 1, engagementRate: 0.05 },
          { path: "/privacy", views: 462, avgTime: 0, engagementRate: 0.04 },
          { path: "/drops", views: 1555, avgTime: 82, engagementRate: 0.67 },
        ],
      }),
      selectedRange: "30d",
      loading: false,
    });

    expect(model.rows[0]?.issueState).toBe("warning");
    expect(model.rows[0]?.explanation).toContain("High view volume with low engagement");
    expect(model.rows[1]?.avgTimeDisplay).toBe("0s");
    expect(model.rows[1]?.explanation).toContain("legal/static path");
  });

  it("marks the snapshot as limited when it reaches the bounded path list", () => {
    const pages = Array.from({ length: 25 }, (_, index) => ({
      path: `/path-${index + 1}`,
      views: 25 - index,
      avgTime: 10,
      engagementRate: 0.2,
    }));

    const model = buildAdminAnalyticsTopPathsModel({
      response: buildResponse({ pages }),
      selectedRange: "30d",
      loading: false,
    });

    expect(model.snapshotLimited).toBe(true);
    expect(model.warnings.some((warning) => warning.includes("Top 25 snapshot only"))).toBe(true);
    expect(model.hasNextPage).toBe(true);
  });

  it("keeps zero-view path rows source-missing instead of verified zero", () => {
    const model = buildAdminAnalyticsTopPathsModel({
      response: buildResponse({
        pages: [
          { path: "/empty", views: 0, avgTime: 0, engagementRate: 0 },
        ],
      }),
      selectedRange: "30d",
      loading: false,
    });

    expect(model.rows[0]).toMatchObject({
      views: 0,
      sourceTruth: "source_missing",
      evidenceKind: "missing",
      freshnessState: "source_missing",
      confidenceState: "unknown",
      confidenceScore: 0,
      productTruthEligible: false,
      missingVsZeroState: "source_missing",
    });
    expect(model.sourceTruth).toBe("source_missing");
    expect(model.freshnessState).toBe("source_missing");
    expect(model.truthState).toBe("unavailable");
  });
});
