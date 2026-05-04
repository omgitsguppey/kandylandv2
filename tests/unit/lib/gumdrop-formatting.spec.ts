import { describe, expect, it } from "vitest";
import { formatCompactGd, resolveWalletBalanceSplit } from "@/lib/gumdrop-formatting";

describe("formatCompactGd", () => {
  it.each([
    [999, "999"],
    [1000, "1k"],
    [1500, "1.5k"],
    [1900, "1.9k"],
    [2000, "2k"],
    [5000, "5k"],
    [80962, "81k"],
    [-20, "0"],
    [Number.NaN, "0"],
  ])("formats %s without two decimal places", (input, expected) => {
    expect(formatCompactGd(input)).toBe(expected);
  });
});

describe("resolveWalletBalanceSplit", () => {
  it("uses explicit source-aware purchased and reward balances", () => {
    expect(resolveWalletBalanceSplit({
      gumDropsBalance: 80962,
      gumDropsPurchasedBalance: 5000,
      gumDropsRewardBalance: 75962,
    })).toEqual({
      freeGd: 75962,
      paidGd: 5000,
      totalGd: 80962,
    });
  });

  it("uses the canonical legacy fallback when split fields are missing", () => {
    expect(resolveWalletBalanceSplit({
      gumDropsBalance: 1500,
    })).toEqual({
      freeGd: 0,
      paidGd: 1500,
      totalGd: 1500,
    });
  });
});
