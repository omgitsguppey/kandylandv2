import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsSourceHierarchy } from "@/lib/analytics/admin-analytics-source-hierarchy";

describe("admin analytics source hierarchy", () => {
  it("blocks Analytics tab consumers when Debug source agreement failed", () => {
    const hierarchy = buildAdminAnalyticsSourceHierarchy({
      chartReadinessState: "source_disagreement",
      sourceAgreementState: "failed",
      analyticsTabHasData: false,
      debugHasData: true,
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
    });

    expect(hierarchy.consumerSourceMismatches).toContain("admin_analytics_charts");
    expect(hierarchy.consumers.find((consumer) => consumer.consumerId === "admin_analytics_charts")).toMatchObject({
      chartReadinessRequired: true,
      sourceAgreementRequired: true,
      fallbackAllowed: true,
      emptyStateAllowed: true,
      blockerReason: "source_agreement_failed",
    });
    expect(JSON.stringify(hierarchy)).toContain("source agreement failed");
  });
});
