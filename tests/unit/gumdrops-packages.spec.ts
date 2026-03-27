import { describe, expect, it } from "vitest";
import { isBundleGumdropAmount, FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";

describe("isBundleGumdropAmount", () => {
    it("returns true for exact drops in FIXED_GUMDROP_PACKAGES", () => {
        FIXED_GUMDROP_PACKAGES.forEach((pkg) => {
            expect(isBundleGumdropAmount(pkg.drops)).toBe(true);
        });
    });

    it("returns false for amounts not in FIXED_GUMDROP_PACKAGES", () => {
        expect(isBundleGumdropAmount(50)).toBe(false);
        expect(isBundleGumdropAmount(200)).toBe(false);
        expect(isBundleGumdropAmount(1000)).toBe(false);
        expect(isBundleGumdropAmount(3000)).toBe(false);
    });

    it("returns false for invalid numbers or boundary cases", () => {
        expect(isBundleGumdropAmount(0)).toBe(false);
        expect(isBundleGumdropAmount(-100)).toBe(false);
        expect(isBundleGumdropAmount(100.5)).toBe(false);
        expect(isBundleGumdropAmount(NaN)).toBe(false);
    });
});
