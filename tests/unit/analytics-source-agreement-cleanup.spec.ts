import { describe, expect, it } from "vitest";

import { buildAnalyticsSourceAgreementStatus } from "@/lib/analytics/analytics-source-agreement-status";

describe("analytics source agreement cleanup", () => {
  it("allows chart_ready while retaining source_agreement_failed", () => {
    const status = buildAnalyticsSourceAgreementStatus({
      availability: "pass",
      continuity: "none",
      chartReadiness: "ready",
      sourceAgreement: "failed",
      comparedSources: ["ga4", "historical_snapshot", "legacy_support"],
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
      comparedMetrics: ["daily_bucket_presence"],
      tolerance: "10% day coverage delta review, 25% fail",
      confidence: 25,
    });

    expect(status.chartStatus).toBe("chart_ready");
    expect(status.agreementStatus).toBe("source_agreement_failed");
    expect(status.failedSources).toEqual(["ga4", "historical_snapshot", "legacy_support"]);
    expect(status.tolerance).toContain("25%");
    expect(status.nextAction).toMatch(/source agreement/i);
  });
});
