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
            expect(isBundleGumdropAmount(Number.MIN_SAFE_INTEGER)).toBe(false);
        });

        it("returns false for values > 100000", () => {
            expect(isBundleGumdropAmount(100001)).toBe(false);
            expect(isBundleGumdropAmount(200000)).toBe(false);
            expect(isBundleGumdropAmount(Number.MAX_SAFE_INTEGER)).toBe(false);
        });

        it("returns false for values not divisible by 1000", () => {
            expect(isBundleGumdropAmount(5500)).toBe(false);
            expect(isBundleGumdropAmount(5001)).toBe(false);
        });

        it("returns false for non-integers and invalid types at runtime", () => {
            expect(isBundleGumdropAmount(5000.5)).toBe(false);
            expect(isBundleGumdropAmount(NaN)).toBe(false);
            expect(isBundleGumdropAmount(Infinity)).toBe(false);
            expect(isBundleGumdropAmount(null as any)).toBe(false);
            expect(isBundleGumdropAmount(undefined as any)).toBe(false);
            expect(isBundleGumdropAmount("5000" as any)).toBe(false);
            expect(isBundleGumdropAmount({} as any)).toBe(false);
            expect(isBundleGumdropAmount([] as any)).toBe(false);
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
        it("returns minimum package amount (100) for non-finite values or values <= 0", () => {
            expect(resolvePreferredGumdropAmount(NaN)).toBe(100);
            expect(resolvePreferredGumdropAmount(Infinity)).toBe(100);
            expect(resolvePreferredGumdropAmount(-Infinity)).toBe(100);
            expect(resolvePreferredGumdropAmount(0)).toBe(100);
            expect(resolvePreferredGumdropAmount(-50)).toBe(100);
        });

        it("returns 100 for values between 1 and 100", () => {
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

        describe("with custom packages (dynamic pricing scenarios)", () => {
            const CUSTOM_PACKAGES = [
                { drops: 300, priceUsd: 3, label: "Basic" },
                { drops: 1200, priceUsd: 10, label: "Advanced" },
                { drops: 4000, priceUsd: 30, label: "Pro" }
            ];

            it("returns lowest custom package amount for values <= 0 or non-finite", () => {
                expect(resolvePreferredGumdropAmount(0, CUSTOM_PACKAGES)).toBe(300);
                expect(resolvePreferredGumdropAmount(-50, CUSTOM_PACKAGES)).toBe(300);
                expect(resolvePreferredGumdropAmount(NaN, CUSTOM_PACKAGES)).toBe(300);
            });

            it("finds the exact or next highest package amount from custom array", () => {
                expect(resolvePreferredGumdropAmount(100, CUSTOM_PACKAGES)).toBe(300);
                expect(resolvePreferredGumdropAmount(300, CUSTOM_PACKAGES)).toBe(300);
                expect(resolvePreferredGumdropAmount(301, CUSTOM_PACKAGES)).toBe(1200);
                expect(resolvePreferredGumdropAmount(1200, CUSTOM_PACKAGES)).toBe(1200);
                expect(resolvePreferredGumdropAmount(2500, CUSTOM_PACKAGES)).toBe(4000);
                expect(resolvePreferredGumdropAmount(4000, CUSTOM_PACKAGES)).toBe(4000);
            });

            it("handles unsorted custom packages correctly", () => {
                const unsortedPackages = [
                    { drops: 2000, priceUsd: 15, label: "Mid" },
                    { drops: 500, priceUsd: 5, label: "Small" },
                    { drops: 3500, priceUsd: 25, label: "Large" }
                ];
                expect(resolvePreferredGumdropAmount(0, unsortedPackages)).toBe(500);
                expect(resolvePreferredGumdropAmount(250, unsortedPackages)).toBe(500);
                expect(resolvePreferredGumdropAmount(1000, unsortedPackages)).toBe(2000);
                expect(resolvePreferredGumdropAmount(3000, unsortedPackages)).toBe(3500);
            });

            it("falls back to calculated bundle amounts if missingAmount exceeds all custom packages", () => {
                expect(resolvePreferredGumdropAmount(4500, CUSTOM_PACKAGES)).toBe(5000);
                expect(resolvePreferredGumdropAmount(5500, CUSTOM_PACKAGES)).toBe(6000);
            });

            it("handles empty package array gracefully, defaulting to 100 for non-finite and falling back to bundles", () => {
                expect(resolvePreferredGumdropAmount(NaN, [])).toBe(100);
                expect(resolvePreferredGumdropAmount(0, [])).toBe(100);
                expect(resolvePreferredGumdropAmount(100, [])).toBe(5000);
                expect(resolvePreferredGumdropAmount(5500, [])).toBe(6000);
            });

            it("filters out invalid packages", () => {
                const mixedPackages = [
                    { drops: NaN, priceUsd: 1, label: "Invalid" },
                    { drops: 0, priceUsd: 1, label: "Invalid 0" },
                    { drops: -100, priceUsd: 1, label: "Invalid negative" },
                    { drops: 500, priceUsd: 5, label: "Valid Small" },
                ];
                expect(resolvePreferredGumdropAmount(100, mixedPackages)).toBe(500);
                expect(resolvePreferredGumdropAmount(0, mixedPackages)).toBe(500);
            });
        });
    });
});
