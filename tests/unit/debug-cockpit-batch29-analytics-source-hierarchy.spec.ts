import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch29AnalyticsSourceHierarchyReport } from "@/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy";

describe("debug cockpit batch 29 analytics source hierarchy", () => {
  it("locks chart readiness, GA4 semantics, source detail, copy, and consumer alignment", () => {
    const report = buildDebugCockpitBatch29AnalyticsSourceHierarchyReport({
      ga4AvailabilityStatusBefore: "reports_available",
      ga4AvailabilityStatusAfter: "reports_loaded_empty",
      chartReadinessStatusBefore: "ready",
      chartReadinessStatusAfter: "source_disagreement",
      sourceAgreementStatus: "failed",
      validationCopyContradictionsBefore: 1,
      validationCopyContradictionsAfter: 0,
      passAllowedContradictionsBefore: 1,
      passAllowedContradictionsAfter: 0,
      analyticsTabSourceStatus: "source_agreement_failed",
      consumerSourceMismatches: ["admin_analytics_charts"],
      blockedAnalyticsConsumers: ["admin_analytics_charts", "admin_analytics_overview"],
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
    });

    expect(report.chartReadinessStatusAfter).toBe("source_disagreement");
    expect(report.ga4AvailabilityStatusAfter).toBe("reports_loaded_empty");
    expect(report.validationCopyContradictionsAfter).toBe(0);
    expect(report.passAllowedContradictionsAfter).toBe(0);
    expect(report.sourceAgreementDetails.comparedSources).toEqual(["first_party", "ga4", "historical_snapshot", "legacy_support"]);
    expect(report.secondSourceAnalyticsConsumers).toEqual([
      "admin_analytics_device_mix",
      "admin_analytics_region_demand",
      "admin_analytics_top_paths",
    ]);
    expect(report.blockedAnalyticsConsumers).not.toContain("admin_analytics_device_mix");
    expect(report.sourceAgreementDetails.blockedConsumerDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        consumer: "admin_analytics_device_mix",
        allowedDisplayState: "second_source_only",
      }),
    ]));
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(report.scoreDimensions).toContain("chartReadinessHierarchy");
  });
});
