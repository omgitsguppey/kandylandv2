import { describe, expect, test } from "vitest";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";

describe("deriveGumdropEconomics", () => {
  test("calculates economics correctly for a standard transaction", () => {
    // 100 drops, $1 gross revenue
    const result = deriveGumdropEconomics(100, 1.00);

    expect(result.deliveredGumDrops).toBe(100);
    expect(result.grossRevenueUsd).toBe(1.00);
    expect(result.grossRevenueCents).toBe(100);

    // PayPal fees: (1.00 * 0.0349) + 0.49 = 0.5249 -> 0.52
    expect(result.paypalFeeUsd).toBe(0.52);
    expect(result.paypalFeeCents).toBe(52);

    // Net revenue: 1.00 - 0.52 = 0.48
    expect(result.netRevenueUsd).toBe(0.48);
    expect(result.netRevenueCents).toBe(48);

    expect(result.paidGumDrops).toBe(100); // 1.00 * 100
    expect(result.bonusGumDrops).toBe(0);

    expect(result.retailValueUsd).toBe(1.00);
    expect(result.retailValueCents).toBe(100);

    expect(result.bonusValueUsd).toBe(0);
    expect(result.bonusValueCents).toBe(0);

    expect(result.adjustedProfitUsd).toBe(0.48); // 0.48 - 0
    expect(result.adjustedProfitCents).toBe(48);

    expect(result.discountUsd).toBe(0);
    expect(result.discountCents).toBe(0);

    expect(result.effectiveUsdPer100Gd).toBe(1.00);
    expect(result.effectiveCentsPer100Gd).toBe(100);

    expect(result.effectiveYieldRatio).toBe(1); // 1.00 / 1.00
  });

  test("calculates economics correctly for an international transaction", () => {
    // 550 drops, $5 gross revenue
    const result = deriveGumdropEconomics(550, 5.00, { isInternationalSale: true });

    // PayPal fees: (5.00 * (0.0349 + 0.015)) + 0.49 = (5.00 * 0.0499) + 0.49 = 0.2495 + 0.49 = 0.7395 -> 0.74
    expect(result.paypalFeeUsd).toBe(0.74);
    expect(result.netRevenueUsd).toBe(4.26); // 5.00 - 0.74

    expect(result.paidGumDrops).toBe(500); // 5.00 * 100
    expect(result.bonusGumDrops).toBe(50); // 550 - 500
  });

  test("allows overriding paypalFeeUsd and netRevenueUsd", () => {
    const result = deriveGumdropEconomics(1000, 10.00, {
      paypalFeeUsd: 0.50,
      netRevenueUsd: 9.50,
    });

    expect(result.paypalFeeUsd).toBe(0.50);
    expect(result.netRevenueUsd).toBe(9.50);
  });

  test("calculates bonus drops correctly when delivered drops exceed paid drops", () => {
    // 1100 delivered drops, $10 revenue => 1000 paid drops
    const result = deriveGumdropEconomics(1100, 10.00);

    expect(result.deliveredGumDrops).toBe(1100);
    expect(result.paidGumDrops).toBe(1000); // 10.00 * 100
    expect(result.bonusGumDrops).toBe(100); // 1100 - 1000

    expect(result.retailValueUsd).toBe(11.00);
    expect(result.bonusValueUsd).toBe(1.00);

    // Net Revenue: 10.00 - Paypal Fee
    // Paypal Fee: (10.00 * 0.0349) + 0.49 = 0.349 + 0.49 = 0.839 -> 0.84
    // Net Revenue: 10.00 - 0.84 = 9.16
    expect(result.netRevenueUsd).toBe(9.16);

    // Adjusted Profit: 9.16 - 1.00 = 8.16
    expect(result.adjustedProfitUsd).toBe(8.16);

    // Discount: 11.00 - 10.00 = 1.00
    expect(result.discountUsd).toBe(1.00);
  });

  test("handles zero drops and zero revenue gracefully", () => {
    const result = deriveGumdropEconomics(0, 0);

    expect(result.deliveredGumDrops).toBe(0);
    expect(result.grossRevenueUsd).toBe(0);
    expect(result.paypalFeeUsd).toBe(0);
    expect(result.netRevenueUsd).toBe(0);
    expect(result.paidGumDrops).toBe(0);
    expect(result.bonusGumDrops).toBe(0);
    expect(result.adjustedProfitUsd).toBe(0);
    expect(result.effectiveYieldRatio).toBe(0);
  });

  test("normalizes negative inputs to zero", () => {
    const result = deriveGumdropEconomics(-100, -5.00);

    expect(result.deliveredGumDrops).toBe(0);
    expect(result.grossRevenueUsd).toBe(0);
    expect(result.paypalFeeUsd).toBe(0);
    expect(result.netRevenueUsd).toBe(0);
  });

  test("calculates economics correctly for a higher tier bundle", () => {
    // 2500 drops, $20 revenue => 2000 paid drops
    const result = deriveGumdropEconomics(2500, 20.00);

    expect(result.deliveredGumDrops).toBe(2500);
    expect(result.paidGumDrops).toBe(2000);
    expect(result.bonusGumDrops).toBe(500);

    // Effective yield ratio: gross (20.00) / retail (25.00) = 0.8
    expect(result.effectiveYieldRatio).toBe(0.8);

    // Effective USD per 100 GD: 20.00 / (2500/100) = 20.00 / 25 = 0.8
    expect(result.effectiveUsdPer100Gd).toBe(0.8);
  });
});
