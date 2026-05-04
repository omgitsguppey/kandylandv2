import { describe, expect, it } from "vitest";

import {
  buildUserValueScoreInputFromActivityDays,
  computeUserValueScore,
} from "@/lib/behavioral/user-value-score";

describe("user-value-score", () => {
  it("keeps paid value above free-only conversion intent", () => {
    const buyer = computeUserValueScore({
      totalSpendUsd: 74.97,
      purchaseCount: 3,
      paidGdPurchased: 7000,
      bonusGdDelivered: 700,
      rewardGdEarned: 120,
      freeGdEarned30d: 80,
      unwrapsAfterPurchase: 11,
      daysSinceLastPurchase: 4,
    });

    const freeOnly = computeUserValueScore({
      totalSpendUsd: 0,
      purchaseCount: 0,
      paidGdPurchased: 0,
      bonusGdDelivered: 0,
      rewardGdEarned: 850,
      freeGdEarned30d: 500,
      unwrapsAfterPurchase: 0,
      daysSinceLastPurchase: null,
    });

    expect(buyer.valueScore).toBeGreaterThan(freeOnly.valueScore);
    expect(["buyer", "repeat_buyer", "VIP"]).toContain(buyer.valueTier);
    expect(freeOnly.valueTier).toBe("observer");
  });

  it("does not treat bonus gumdrops as revenue", () => {
    const result = computeUserValueScore({
      totalSpendUsd: 9.99,
      purchaseCount: 1,
      paidGdPurchased: 1000,
      bonusGdDelivered: 5000,
      rewardGdEarned: 0,
      freeGdEarned30d: 0,
      unwrapsAfterPurchase: 2,
      daysSinceLastPurchase: 2,
    });

    expect(result.totalSpendUsd).toBe(9.99);
    expect(result.bonusGdDelivered).toBe(5000);
    expect(result.topReasons.some((reason) => reason.code === "total_spend")).toBe(true);
  });

  it("builds unwraps-after-purchase and 30d free signal from daily records", () => {
    const nowMs = Date.UTC(2026, 4, 4);
    const input = buildUserValueScoreInputFromActivityDays({
      nowMs,
      days: [
        {
          timestampMs: nowMs - (40 * 24 * 60 * 60 * 1000),
          grossRevenueUsd: 4.99,
          purchaseCount: 1,
          paidGdPurchased: 500,
          bonusGdDelivered: 50,
          rewardGdEarned: 20,
          unwrappedCount: 1,
        },
        {
          timestampMs: nowMs - (10 * 24 * 60 * 60 * 1000),
          grossRevenueUsd: 0,
          purchaseCount: 0,
          paidGdPurchased: 0,
          bonusGdDelivered: 0,
          rewardGdEarned: 120,
          unwrappedCount: 3,
        },
        {
          timestampMs: nowMs - (2 * 24 * 60 * 60 * 1000),
          grossRevenueUsd: 9.99,
          purchaseCount: 1,
          paidGdPurchased: 1000,
          bonusGdDelivered: 100,
          rewardGdEarned: 80,
          unwrappedCount: 4,
        },
      ],
    });

    expect(input).toEqual({
      totalSpendUsd: 14.98,
      purchaseCount: 2,
      paidGdPurchased: 1500,
      bonusGdDelivered: 150,
      rewardGdEarned: 220,
      freeGdEarned30d: 200,
      unwrapsAfterPurchase: 8,
      daysSinceLastPurchase: 2,
    });
  });

  it("returns deterministic top reasons and repeat purchase likelihood", () => {
    const result = computeUserValueScore({
      totalSpendUsd: 149.95,
      purchaseCount: 6,
      paidGdPurchased: 15000,
      bonusGdDelivered: 1800,
      rewardGdEarned: 100,
      freeGdEarned30d: 60,
      unwrapsAfterPurchase: 23,
      daysSinceLastPurchase: 1,
    });

    expect(result.valueScore).toBeGreaterThanOrEqual(60);
    expect(["repeat_buyer", "VIP"]).toContain(result.valueTier);
    expect(result.topReasons).toHaveLength(3);
    expect(result.repeatPurchaseLikelihood).toBeGreaterThan(0.5);
  });
});
