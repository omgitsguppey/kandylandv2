import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsCommerceSnapshotModel } from "@/lib/admin-analytics-commerce-snapshot";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

describe("buildAdminAnalyticsCommerceSnapshotModel", () => {
  it("classifies completed purchase revenue and exposes formulas", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      generatedAtMs: 1_771_000_000_000,
      cacheState: "fresh",
      commerce: {
        revenueUsd: 337,
        adjustedProfitUsd: 196.28,
        bonusValueUsd: 113.83,
        deliveredGumDrops: 56_000,
        bonusGumDrops: 8_000,
        effectiveUsdPer100Gd: 0.6017,
        gdSpent: 84_100,
      },
      funnel: {
        authModalOpens: 0,
        authSignIns: 0,
        authSignUps: 0,
        previewOpens: 0,
        viewerOpens: 0,
        assetSwitches: 0,
        unlocks: 0,
        shares: 0,
        walletOpens: 462,
        checkoutStarts: 69,
        purchases: 47,
        checkIns: 0,
        experienceViews: 0,
      },
    };

    const model = buildAdminAnalyticsCommerceSnapshotModel({
      selectedRange: "30d",
      response,
      commerce: response.commerce,
      funnel: response.funnel,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.revenueValue).toBe(337);
    expect(model.revenueSource).toBe("completed_purchase_records");
    expect(model.purchaseCompletionsSource).toBe("completed_purchase_records");
    expect(model.checkoutConversionValue).toBeCloseTo(47 / 69);
    expect(model.adjustedProfitFormula).toContain("paymentFees");
    expect(model.yieldPer100GdFormula).toBe("revenue / (deliveredGd / 100)");
    expect(model.visibleCopy.join(" ")).toContain("Promo and bonus GD are excluded from revenue.");
    expect(model.fakeZeroPrevented.revenue).toBe(false);
  });

  it("prevents fake zeros while waiting and avoids divide-by-zero conversion", () => {
    const waiting = buildAdminAnalyticsCommerceSnapshotModel({
      selectedRange: "7d",
      loading: true,
    });
    const zeroCheckoutResponse: HistoricalAnalyticsResponse = {
      success: true,
      commerce: {
        revenueUsd: 0,
        adjustedProfitUsd: 0,
        gdSpent: 0,
      },
      funnel: {
        authModalOpens: 0,
        authSignIns: 0,
        authSignUps: 0,
        previewOpens: 0,
        viewerOpens: 0,
        assetSwitches: 0,
        unlocks: 0,
        shares: 0,
        walletOpens: 0,
        checkoutStarts: 0,
        purchases: 0,
        checkIns: 0,
        experienceViews: 0,
      },
    };
    const confirmedZero = buildAdminAnalyticsCommerceSnapshotModel({
      selectedRange: "7d",
      response: zeroCheckoutResponse,
      commerce: zeroCheckoutResponse.commerce,
      funnel: zeroCheckoutResponse.funnel,
      loading: false,
    });

    expect(waiting.revenueValue).toBeNull();
    expect(waiting.metrics.revenue.label).toBe("Revenue (selected range)");
    expect(waiting.fakeZeroPrevented.revenue).toBe(true);
    expect(confirmedZero.revenueValue).toBe(0);
    expect(confirmedZero.checkoutConversionValue).toBeNull();
    expect(confirmedZero.fakeZeroPrevented.revenue).toBe(false);
  });
});
