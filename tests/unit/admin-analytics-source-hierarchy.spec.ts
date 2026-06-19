import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsSourceHierarchy } from "@/lib/analytics/admin-analytics-source-hierarchy";

describe("admin analytics source hierarchy", () => {
  it("blocks Analytics tab consumers when Debug source agreement failed without inventing consumer mismatch", () => {
    const hierarchy = buildAdminAnalyticsSourceHierarchy({
      chartReadinessState: "source_disagreement",
      sourceAgreementState: "failed",
      analyticsTabHasData: false,
      debugHasData: true,
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
    });

    expect(hierarchy.status).toBe("source_agreement_failed");
    expect(hierarchy.consumerSourceMismatches).toEqual([]);
    expect(hierarchy.consumers.find((consumer) => consumer.consumerId === "admin_analytics_charts")).toMatchObject({
      chartReadinessRequired: true,
      sourceAgreementRequired: true,
      fallbackAllowed: true,
      emptyStateAllowed: true,
      blockerReason: "source_agreement_failed",
      displayState: "source_missing",
    });
    expect(hierarchy.consumers.find((consumer) => consumer.consumerId === "admin_analytics_device_mix")).toMatchObject({
      sourceUsed: "ga4_external_evidence",
      blockerReason: "source_agreement_failed",
      displayState: "second_source_only",
    });
    expect(hierarchy.consumers.find((consumer) => consumer.consumerId === "public_beta_score_evidence")).toMatchObject({
      blockerReason: "source_agreement_failed",
      displayState: "chart_promotion_blocked",
    });
    expect(JSON.stringify(hierarchy)).not.toContain("source agreement failed");
    expect(JSON.stringify(hierarchy)).toContain("source_agreement_failed");
    expect(hierarchy.nextAction).toContain("Review source details in Debug");
  });

  it("keeps consumer source mismatch for an Analytics-only local fallback with no source blocker", () => {
    const hierarchy = buildAdminAnalyticsSourceHierarchy({
      chartReadinessState: "ready",
      sourceAgreementState: "pass",
      analyticsTabHasData: false,
      debugHasData: true,
      sourceUsedByAnalyticsTab: "local_fallback_empty_state",
    });

    expect(hierarchy.status).toBe("consumer_source_mismatch");
    expect(hierarchy.consumerSourceMismatches).toEqual([
      "admin_analytics_overview",
      "admin_analytics_charts",
      "admin_analytics_device_mix",
      "admin_analytics_region_demand",
      "admin_analytics_top_paths",
      "admin_analytics_insight_cards",
    ]);
    expect(hierarchy.blockedAnalyticsConsumers).toEqual([
      "admin_analytics_overview",
      "admin_analytics_charts",
      "admin_analytics_device_mix",
      "admin_analytics_region_demand",
      "admin_analytics_top_paths",
      "admin_analytics_insight_cards",
    ]);
    expect(hierarchy.consumers.filter((consumer) => consumer.displayState === "consumer_source_mismatch")).toHaveLength(6);
  });
});
