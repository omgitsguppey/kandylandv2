import { describe, expect, it } from "vitest";

import {
  buildCommerceMetricsFromRollup,
  buildEmptyCommerceMetrics,
} from "@/lib/admin-user-commerce";

describe("admin user commerce read model", () => {
  it("recomputes bonus value from aggregate package effective rate", () => {
    const result = buildCommerceMetricsFromRollup({
      grossRevenueUsdTotal: 20,
      netRevenueUsdTotal: 18.81,
      paypalFeeUsdTotal: 1.19,
      revenueCentsTotal: 2000,
      deliveredGumDropsTotal: 2500,
      paidGumDropsTotal: 2000,
      bonusGumDropsTotal: 500,
      purchaseTransactionCount: 1,
    });

    expect(result).toMatchObject({
      grossRevenueUsd: 20,
      deliveredGumDrops: 2500,
      bonusGumDrops: 500,
      effectiveUsdPer100Gd: 0.8,
      bonusValueUsd: 4,
      adjustedProfitUsd: 14.81,
      commerceTruthLabel: "stale",
      commerceSourceLabel: "analytics_rollup_recomputed_display",
      commerceEmptyReason: null,
    });
  });

  it("uses a truthful empty state for users with no purchases", () => {
    expect(buildEmptyCommerceMetrics()).toMatchObject({
      grossRevenueUsd: 0,
      bonusValueUsd: 0,
      adjustedProfitUsd: 0,
      commerceTruthLabel: "unknown",
      commerceSourceLabel: "none",
      commerceEmptyReason: "No completed GumDrops purchases found.",
    });
    expect(buildCommerceMetricsFromRollup({})).toMatchObject({
      grossRevenueUsd: 0,
      bonusValueUsd: 0,
      adjustedProfitUsd: 0,
      commerceTruthLabel: "unknown",
      commerceEmptyReason: "No completed GumDrops purchases found.",
    });
  });
});
