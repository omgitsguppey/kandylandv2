import { describe, expect, it } from "vitest";

import { buildLaunchAnalyticsSourceAgreementFailureDetail } from "@/lib/analytics/source-agreement-detail";

describe("source agreement failure detail", () => {
  it("reports compared sources, disagreement size, tolerance, blocked consumers, and exact next actions", () => {
    const detail = buildLaunchAnalyticsSourceAgreementFailureDetail({
      comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
      tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
      blockedConsumers: ["admin_analytics_charts", "debug_data_validation"],
    });

    expect(detail.comparedSources).toEqual(["first_party", "ga4", "historical_snapshot", "legacy_support"]);
    expect(detail.sourceAgreementStatus).toBe("failed");
    expect(detail.missingDaysBySource.first_party).toEqual(["2026-05-02", "2026-05-03"]);
    expect(detail.disagreementCount).toBeGreaterThan(0);
    expect(detail.maxDeltaPct).toBeGreaterThan(25);
    expect(detail.toleranceThresholds.failDeltaPct).toBe(25);
    expect(detail.blockedConsumers).toContain("admin_analytics_charts");
    expect(detail.nextAction).not.toMatch(/^retry$/iu);
    expect(detail.nextAction).toMatch(/first-party/i);
  });
});
