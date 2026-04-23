import { describe, expect, it } from "vitest";
import {
  deriveGumdropEconomics,
  getBundlePresentation,
  GUMDROPS_PER_USD,
  PAYPAL_DOMESTIC_PERCENT_FEE,
  PAYPAL_FIXED_FEE_USD,
  PAYPAL_INTERNATIONAL_SURCHARGE,
} from "@/lib/gumdrop-economics";

describe("getBundlePresentation", () => {
  it("returns Sugar Rush Pack for 100", () => {
    expect(getBundlePresentation(100)).toEqual({
      bundleLabel: "Sugar Rush Pack",
      bundleKey: "sugar_rush_pack",
      bundleTier: "entry",
      baseAmount: 100,
      bonus: 0,
      hasBonus: false,
    });
  });

  it("returns Sweet Pack for 550", () => {
    expect(getBundlePresentation(550)).toEqual({
      bundleLabel: "Sweet Pack",
      bundleKey: "sweet_pack",
      bundleTier: "bonus",
      baseAmount: 500,
      bonus: 50,
      hasBonus: true,
    });
  });

  it("returns Kandy Bag Pack for 1100", () => {
    expect(getBundlePresentation(1100)).toEqual({
      bundleLabel: "Kandy Bag Pack",
      bundleKey: "kandy_bag_pack",
      bundleTier: "bonus",
      baseAmount: 1000,
      bonus: 100,
      hasBonus: true,
    });
  });

  it("returns Kandy Land Pack for 2500", () => {
    expect(getBundlePresentation(2500)).toEqual({
      bundleLabel: "Kandy Land Pack",
      bundleKey: "kandy_land_pack",
      bundleTier: "bonus",
      baseAmount: 2000,
      bonus: 500,
      hasBonus: true,
    });
  });

  it("returns King Size Bundle for small custom amounts with no bonus", () => {
    expect(getBundlePresentation(600)).toEqual({
      bundleLabel: "King Size Bundle",
      bundleKey: "bundle_600",
      bundleTier: "custom",
      baseAmount: 600,
      bonus: 0,
      hasBonus: false,
    });
  });

  it("returns King Size Bundle for large custom amounts with a bonus", () => {
    expect(getBundlePresentation(6000)).toEqual({
      bundleLabel: "King Size Bundle",
      bundleKey: "bundle_6000",
      bundleTier: "bundle",
      baseAmount: 3000,
      bonus: 3000,
      hasBonus: true,
    });
  });
});

describe("deriveGumdropEconomics", () => {
  it("calculates standard domestic sale correctly (550 GD for $5.00)", () => {
    const gd = 550;
    const revenue = 5.00;
    const result = deriveGumdropEconomics(gd, revenue);

    // Expected values
    const expectedPaypalFee = (revenue * PAYPAL_DOMESTIC_PERCENT_FEE) + PAYPAL_FIXED_FEE_USD;
    const roundedPaypalFeeUsd = Math.round((expectedPaypalFee + Number.EPSILON) * 100) / 100;
    const netRevUsd = Math.round(((revenue - roundedPaypalFeeUsd) + Number.EPSILON) * 100) / 100;
    const retailValueUsd = 550 / GUMDROPS_PER_USD; // 5.50
    const effectiveUsdPer100Gd = Math.round(((5 / 5.5) + Number.EPSILON) * 100) / 100;
    const bonusValueUsd = 0.45; // 50 bonus GD valued at the package effective rate.

    expect(result.deliveredGumDrops).toBe(550);
    expect(result.grossRevenueUsd).toBe(5.00);
    expect(result.paidGumDrops).toBe(500); // 5 * 100
    expect(result.bonusGumDrops).toBe(50); // 550 - 500

    expect(result.paypalFeeUsd).toBe(roundedPaypalFeeUsd);
    expect(result.paypalFeeCents).toBe(Math.round(roundedPaypalFeeUsd * 100));

    expect(result.netRevenueUsd).toBe(netRevUsd);
    expect(result.netRevenueCents).toBe(Math.round(netRevUsd * 100));

    expect(result.retailValueUsd).toBe(retailValueUsd);
    expect(result.retailValueCents).toBe(Math.round(retailValueUsd * 100));

    expect(result.bonusValueUsd).toBe(bonusValueUsd);
    expect(result.bonusValueCents).toBe(Math.round(bonusValueUsd * 100));
    expect(result.bonusValueBasis).toBe("package_effective_rate");
    expect(result.retailAnchorUsdPer100Gd).toBe(1);

    const adjProfitUsd = Math.round(((netRevUsd - bonusValueUsd) + Number.EPSILON) * 100) / 100;
    expect(result.adjustedProfitUsd).toBe(adjProfitUsd);

    expect(result.effectiveUsdPer100Gd).toBe(effectiveUsdPer100Gd);
  });

  it("values bonus GumDrops at the package effective rate", () => {
    expect(deriveGumdropEconomics(550, 5.00)).toMatchObject({
      bonusGumDrops: 50,
      bonusValueUsd: 0.45,
      effectiveUsdPer100Gd: 0.91,
    });
    expect(deriveGumdropEconomics(1100, 10.00)).toMatchObject({
      bonusGumDrops: 100,
      bonusValueUsd: 0.91,
      effectiveUsdPer100Gd: 0.91,
      adjustedProfitUsd: 8.25,
    });
    expect(deriveGumdropEconomics(2500, 20.00)).toMatchObject({
      bonusGumDrops: 500,
      bonusValueUsd: 4.00,
      effectiveUsdPer100Gd: 0.8,
      adjustedProfitUsd: 14.81,
    });
  });

  it("calculates international sale correctly with surcharge", () => {
    const gd = 550;
    const revenue = 5.00;
    const result = deriveGumdropEconomics(gd, revenue, { isInternationalSale: true });

    const expectedPaypalFee = (revenue * (PAYPAL_DOMESTIC_PERCENT_FEE + PAYPAL_INTERNATIONAL_SURCHARGE)) + PAYPAL_FIXED_FEE_USD;
    const roundedPaypalFeeUsd = Math.round((expectedPaypalFee + Number.EPSILON) * 100) / 100;

    expect(result.paypalFeeUsd).toBe(roundedPaypalFeeUsd);
    expect(result.paypalFeeCents).toBe(Math.round(roundedPaypalFeeUsd * 100));
  });

  it("respects custom paypal fee and net revenue overrides", () => {
    const gd = 550;
    const revenue = 5.00;
    const result = deriveGumdropEconomics(gd, revenue, { paypalFeeUsd: 1.00, netRevenueUsd: 4.00 });

    expect(result.paypalFeeUsd).toBe(1.00);
    expect(result.paypalFeeCents).toBe(100);
    expect(result.netRevenueUsd).toBe(4.00);
    expect(result.netRevenueCents).toBe(400);

    const bonusValueUsd = 0.45; // 50 bonus GD at the $5 / 550 GD package rate
    expect(result.bonusValueUsd).toBe(bonusValueUsd);
    expect(result.adjustedProfitUsd).toBe(3.55); // 4.00 net - 0.45 bonus value
  });

  it("handles zero values", () => {
    const result = deriveGumdropEconomics(0, 0);

    expect(result.deliveredGumDrops).toBe(0);
    expect(result.grossRevenueUsd).toBe(0);
    expect(result.paidGumDrops).toBe(0);
    expect(result.bonusGumDrops).toBe(0);
    expect(result.paypalFeeUsd).toBe(0);
    expect(result.netRevenueUsd).toBe(0);
    expect(result.retailValueUsd).toBe(0);
    expect(result.adjustedProfitUsd).toBe(0);
    expect(result.effectiveUsdPer100Gd).toBe(0);
    expect(result.effectiveYieldRatio).toBe(0);
  });

  it("normalizes negative values to zero", () => {
    const result = deriveGumdropEconomics(-100, -5.00);

    expect(result.deliveredGumDrops).toBe(0);
    expect(result.grossRevenueUsd).toBe(0);
    expect(result.paidGumDrops).toBe(0);
    expect(result.bonusGumDrops).toBe(0);
    expect(result.paypalFeeUsd).toBe(0);
    expect(result.netRevenueUsd).toBe(0);
    expect(result.retailValueUsd).toBe(0);
    expect(result.adjustedProfitUsd).toBe(0);
    expect(result.effectiveUsdPer100Gd).toBe(0);
    expect(result.effectiveYieldRatio).toBe(0);
  });
});
