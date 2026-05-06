import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsDeviceMixModel } from "@/lib/admin-analytics-device-mix";

describe("buildAdminAnalyticsDeviceMixModel", () => {
  it("uses total session denominator to compute device share", () => {
    const model = buildAdminAnalyticsDeviceMixModel({
      selectedRange: "30d",
      loading: false,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        totals: { users: 0, views: 0, sessions: 10154, newUsers: 0, avgSessionDuration: 20, engagementRate: 0.17 },
        devices: [
          { device: "mobile", users: 0, sessions: 9019, engagementRate: 0.33 },
          { device: "desktop", users: 0, sessions: 997, engagementRate: 0.07 },
          { device: "tablet", users: 0, sessions: 138, engagementRate: 0.28 },
        ],
        analyticsSourceHealth: {
          range: "30d",
          generatedAtUtc: "2026-05-06T12:00:00.000Z",
          availability: {
            ga4: {
              status: "pass",
              freshnessState: "fresh",
              confidence: 1,
              sampleCount: 10154,
              lastSeenAtUtc: "2026-05-06T12:00:00.000Z",
              passAllowed: true,
              reason: "ok",
            },
            historicalSnapshot: {
              status: "pass",
              freshnessState: "fresh",
              confidence: 1,
              sampleCount: 1,
              lastSeenAtUtc: "2026-05-06T12:00:00.000Z",
              passAllowed: true,
              reason: "ok",
            },
            legacySupport: {
              status: "unknown",
              freshnessState: "unknown",
              confidence: null,
              sampleCount: null,
              lastSeenAtUtc: null,
              passAllowed: true,
              reason: "n/a",
            },
          },
          continuity: {
            expectedDays: 30,
            presentDays: 30,
            missingDays: [],
            recentGapDays: [],
            lastCompleteDayUtc: null,
            gapSeverity: "none",
            gapReason: "none",
          },
          sourceAgreement: {
            comparedSources: [],
            disagreementCount: 0,
            maxDeltaPct: null,
            state: "not_enough_sources",
          },
          chartReadiness: {
            state: "ready",
            reason: "ok",
          },
        },
      },
    });

    expect(model.totalSessions).toBe(10154);
    expect(model.rows[0]?.deviceCategory).toBe("mobile");
    expect(model.rows[0]?.sessionSharePct).toBeCloseTo(9019 / 10154, 4);
    expect(model.engagementDefinition).toContain("GA engaged sessions");
  });

  it("surfaces an unknown device bucket when classified sessions do not cover the denominator", () => {
    const model = buildAdminAnalyticsDeviceMixModel({
      selectedRange: "7d",
      loading: false,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        totals: { users: 0, views: 0, sessions: 100, newUsers: 0, avgSessionDuration: 20, engagementRate: 0.17 },
        devices: [
          { device: "mobile", users: 0, sessions: 80, engagementRate: 0.33 },
        ],
      },
    });

    expect(model.unknownSessions).toBe(20);
    expect(model.rows.some((row) => row.deviceCategory === "unknown")).toBe(true);
    expect(model.warnings[0]).toContain("Device classification is partial");
  });
});
