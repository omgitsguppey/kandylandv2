import { describe, expect, it } from "vitest";

import {
  buildMetricDisplayExplanation,
  classifyMetricDisplayState,
  formatMetricValue,
  shouldShowCollecting,
  shouldShowEstimated,
  shouldShowStale,
  shouldShowZero,
} from "@/lib/math/metric-display-accuracy";
import {
  buildMetricDisplayAccuracyReport,
  classifyMetricDisplayAccuracyDirtyFile,
  validateMetricDisplayAccuracyReport,
} from "../../scripts/agent/validate-metric-display-accuracy";

describe("metric display accuracy", () => {
  it("shows zero only when a bounded source proves zero", () => {
    expect(shouldShowZero({ value: 0, provenZero: true, sourceConnected: true })).toBe(true);
    expect(shouldShowZero({ value: 0, provenZero: false, sourceConnected: true })).toBe(false);

    expect(formatMetricValue({
      metricId: "creator_views",
      value: 0,
      provenZero: false,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "unknown",
      audience: "creator",
    })).toMatchObject({
      state: "collecting",
      displayValue: "Collecting",
      userFacingLabel: "Not enough activity yet",
      exactLooking: false,
    });

    expect(formatMetricValue({
      metricId: "creator_views",
      value: 0,
      provenZero: true,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "exact",
      audience: "creator",
    })).toMatchObject({
      state: "proven_zero",
      displayValue: "0",
      exactLooking: true,
    });
  });

  it("keeps disconnected and unavailable metrics from displaying as zero", () => {
    expect(classifyMetricDisplayState({
      metricId: "drop_clicks",
      value: 0,
      provenZero: false,
      sourceConnected: false,
      sourcePathExists: false,
      confidence: "unknown",
      audience: "admin",
    })).toBe("not_connected");

    expect(formatMetricValue({
      metricId: "drop_clicks",
      value: 0,
      provenZero: false,
      sourceConnected: false,
      sourcePathExists: false,
      confidence: "unknown",
      audience: "admin",
    })).toMatchObject({
      state: "not_connected",
      displayValue: "Not connected",
      adminConfidenceLabel: "unknown confidence",
    });
  });

  it("marks inferred and weak data as estimated without leaking technical jargon to users", () => {
    const userMetric = formatMetricValue({
      metricId: "creator_revenue",
      value: 12_50,
      unit: "currency_cents",
      provenZero: false,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "inferred",
      audience: "creator",
    });

    expect(shouldShowEstimated({ confidence: "inferred" })).toBe(true);
    expect(userMetric).toMatchObject({
      state: "estimated",
      displayValue: "$12.50",
      qualifier: "Estimated",
      exactLooking: false,
    });
    expect(`${userMetric.userFacingLabel} ${userMetric.qualifier}`).not.toMatch(/inferred|weak|sourceTruth|materializer/iu);

    const adminMetric = formatMetricValue({
      metricId: "creator_revenue",
      value: 12_50,
      unit: "currency_cents",
      provenZero: false,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "weak",
      audience: "admin",
      sourceTruth: "legacy_or_unknown",
    });
    expect(adminMetric.adminConfidenceLabel).toBe("weak confidence");
    expect(adminMetric.sourceTruthLabel).toBe("legacy_or_unknown");
  });

  it("adds freshness labels for stale creator and admin dashboard metrics", () => {
    const nowMs = Date.UTC(2026, 4, 26, 12, 0, 0);
    const stale = formatMetricValue({
      metricId: "creator_fans",
      value: 32,
      provenZero: false,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "exact",
      audience: "creator",
      updatedAtMs: nowMs - (2 * 60 * 60 * 1000),
      nowMs,
    });

    expect(shouldShowStale({ updatedAtMs: stale.updatedAtMs, nowMs, audience: "creator" })).toBe(true);
    expect(stale).toMatchObject({
      state: "stale",
      freshnessLabel: "Updated 2h ago",
    });
  });

  it("explains canonical creator dashboard and wallet display sources", () => {
    expect(buildMetricDisplayExplanation({ metricId: "creator_fans" })).toContain("followers/fans canonical count");
    expect(buildMetricDisplayExplanation({ metricId: "creator_drops" })).toContain("creator-owned or assigned-to-creator drops");
    expect(buildMetricDisplayExplanation({ metricId: "wallet_balance" })).toContain("paid GD, bonus GD, and reward GD source buckets");

    expect(formatMetricValue({
      metricId: "wallet_balance",
      value: 140,
      unit: "gumdrops",
      provenZero: false,
      sourceConnected: true,
      sourcePathExists: true,
      confidence: "exact",
      audience: "user",
      walletSourceBuckets: { paidGd: 100, paidBonusGd: 20, rewardGd: 20 },
    })).toMatchObject({
      sourceBucketLabels: ["paid GD: 100", "bonus GD: 20", "reward GD: 20"],
    });
  });

  it("builds validator evidence for display accuracy surfaces", () => {
    const report = buildMetricDisplayAccuracyReport({
      currentHead: "test-head",
      dirtyFiles: [
        "src/lib/math/metric-display-accuracy.ts",
        "src/components/PurchaseModal.tsx",
        "src/app/api/paypal/capture/route.ts",
      ],
      openPrs: [],
      scoreBefore: 89.19,
    });

    expect(report).toMatchObject({
      reportKey: "metric-display-accuracy",
      currentHead: "test-head",
      productionReadsPerformed: false,
      deployPerformed: false,
      paymentRuntimeChanged: false,
      gumdropMathChanged: false,
      debugLane: {
        label: "Metric display accuracy",
        misleadingZeroRisk: 0,
        weakConfidenceExactDisplayRisk: 0,
      },
    });
    expect(validateMetricDisplayAccuracyReport(report)).toEqual([
      "src/app/api/paypal/capture/route.ts is unclassified for metric display accuracy.",
    ]);
    expect(classifyMetricDisplayAccuracyDirtyFile("src/lib/math/metric-display-accuracy.ts")).toBe("current_source_change");
    expect(classifyMetricDisplayAccuracyDirtyFile("src/components/PurchaseModal.tsx")).toBe("metric_display_consumer_expected");
    expect(classifyMetricDisplayAccuracyDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
    expect(shouldShowCollecting({ value: null, sourceConnected: true, sourcePathExists: true })).toBe(true);
  });
});
