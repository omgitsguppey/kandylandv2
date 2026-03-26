import { describe, expect, it } from "vitest";
import {
    isBundleGumdropAmount,
    resolveExpectedGumdropPrice,
    resolvePreferredGumdropAmount,
    FIXED_GUMDROP_PACKAGES
} from "@/lib/gumdrops-packages";

describe("gumdrops-packages", () => {
    describe("isBundleGumdropAmount", () => {
        it("returns true for valid bundle amounts", () => {
            expect(isBundleGumdropAmount(5000)).toBe(true);
            expect(isBundleGumdropAmount(10000)).toBe(true);
            expect(isBundleGumdropAmount(100000)).toBe(true);
        });

        it("returns false for values < 5000", () => {
            expect(isBundleGumdropAmount(4999)).toBe(false);
            expect(isBundleGumdropAmount(100)).toBe(false);
            expect(isBundleGumdropAmount(0)).toBe(false);
            expect(isBundleGumdropAmount(-5000)).toBe(false);
        });

        it("returns false for values > 100000", () => {
            expect(isBundleGumdropAmount(100001)).toBe(false);
            expect(isBundleGumdropAmount(200000)).toBe(false);
        });

        it("returns false for values not divisible by 1000", () => {
            expect(isBundleGumdropAmount(5500)).toBe(false);
            expect(isBundleGumdropAmount(5001)).toBe(false);
        });

        it("returns false for non-integers", () => {
            expect(isBundleGumdropAmount(5000.5)).toBe(false);
            expect(isBundleGumdropAmount(NaN)).toBe(false);
            expect(isBundleGumdropAmount(Infinity)).toBe(false);
        });
    });

    describe("resolveExpectedGumdropPrice", () => {
        it("returns expected price for valid bundle amounts", () => {
            expect(resolveExpectedGumdropPrice(5000)).toBe("25.00");
            expect(resolveExpectedGumdropPrice(10000)).toBe("50.00");
            expect(resolveExpectedGumdropPrice(100000)).toBe("500.00");
        });

        it("returns expected price for fixed packages", () => {
            FIXED_GUMDROP_PACKAGES.forEach((pkg) => {
                expect(resolveExpectedGumdropPrice(pkg.drops)).toBe(pkg.priceUsd.toFixed(2));
            });
        });

        it("returns null for amounts that are neither fixed nor bundles", () => {
            expect(resolveExpectedGumdropPrice(5500)).toBe(null);
            expect(resolveExpectedGumdropPrice(4999)).toBe(null);
            expect(resolveExpectedGumdropPrice(100001)).toBe(null);
        });

        it("returns null for invalid inputs (non-integer or <= 0)", () => {
            expect(resolveExpectedGumdropPrice(0)).toBe(null);
            expect(resolveExpectedGumdropPrice(-100)).toBe(null);
            expect(resolveExpectedGumdropPrice(5000.5)).toBe(null);
            expect(resolveExpectedGumdropPrice(NaN)).toBe(null);
            expect(resolveExpectedGumdropPrice(Infinity)).toBe(null);
        });
    });

    describe("resolvePreferredGumdropAmount", () => {
        it("returns 100 for non-finite values or values <= 100", () => {
            expect(resolvePreferredGumdropAmount(NaN)).toBe(100);
            expect(resolvePreferredGumdropAmount(Infinity)).toBe(100);
            expect(resolvePreferredGumdropAmount(-Infinity)).toBe(100);
            expect(resolvePreferredGumdropAmount(0)).toBe(100);
            expect(resolvePreferredGumdropAmount(50)).toBe(100);
            expect(resolvePreferredGumdropAmount(100)).toBe(100);
        });

        it("returns 550 for values between 101 and 550", () => {
            expect(resolvePreferredGumdropAmount(101)).toBe(550);
            expect(resolvePreferredGumdropAmount(550)).toBe(550);
        });

        it("returns 1100 for values between 551 and 1100", () => {
            expect(resolvePreferredGumdropAmount(551)).toBe(1100);
            expect(resolvePreferredGumdropAmount(1100)).toBe(1100);
        });

        it("returns 2500 for values between 1101 and 2500", () => {
            expect(resolvePreferredGumdropAmount(1101)).toBe(2500);
            expect(resolvePreferredGumdropAmount(2500)).toBe(2500);
        });

        it("enforces a minimum of 5000 for calculated bundles and rounds up to nearest 1000", () => {
            expect(resolvePreferredGumdropAmount(2501)).toBe(5000); // Between 2500 and 5000
            expect(resolvePreferredGumdropAmount(4000)).toBe(5000);
            expect(resolvePreferredGumdropAmount(5000)).toBe(5000);

            expect(resolvePreferredGumdropAmount(5001)).toBe(6000);
            expect(resolvePreferredGumdropAmount(5500)).toBe(6000);
            expect(resolvePreferredGumdropAmount(5999)).toBe(6000);
            expect(resolvePreferredGumdropAmount(6000)).toBe(6000);
        });

        it("caps at 100000", () => {
            expect(resolvePreferredGumdropAmount(100000)).toBe(100000);
            expect(resolvePreferredGumdropAmount(100001)).toBe(100000);
            expect(resolvePreferredGumdropAmount(200000)).toBe(100000);
        });
    });
});
