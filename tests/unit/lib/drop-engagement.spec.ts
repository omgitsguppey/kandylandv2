import { describe, expect, it } from "vitest";

import { getDropViewCount, toNonNegativeInteger } from "@/lib/drop-engagement";

describe("drop-engagement", () => {
  describe("toNonNegativeInteger", () => {
    it("returns whole numbers unchanged", () => {
      expect(toNonNegativeInteger(12)).toBe(12);
    });

    it("floors positive decimal values after numeric coercion", () => {
      expect(toNonNegativeInteger("12.9")).toBe(12);
      expect(toNonNegativeInteger(true)).toBe(1);
    });

    it("clamps negative values to zero", () => {
      expect(toNonNegativeInteger(-1)).toBe(0);
      expect(toNonNegativeInteger("-9.7")).toBe(0);
    });

    it("returns zero for non-finite and non-numeric values", () => {
      expect(toNonNegativeInteger(undefined)).toBe(0);
      expect(toNonNegativeInteger("not-a-number")).toBe(0);
      expect(toNonNegativeInteger(Number.POSITIVE_INFINITY)).toBe(0);
      expect(toNonNegativeInteger(Number.NaN)).toBe(0);
    });
  });

  describe("getDropViewCount", () => {
    it("returns the larger normalized count between views and clicks", () => {
      expect(getDropViewCount({
        totalViews: "18.7",
        totalClicks: 12,
      })).toBe(18);
    });

    it("uses click count when it exceeds total views", () => {
      expect(getDropViewCount({
        totalViews: 3,
        totalClicks: "9.2",
      })).toBe(9);
    });

    it("falls back to zero when both values are invalid", () => {
      expect(getDropViewCount({
        totalViews: "bad-value",
        totalClicks: undefined,
      })).toBe(0);
    });
  });
});
