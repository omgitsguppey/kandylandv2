export interface GumdropPackageDefinition {
    drops: number;
    priceUsd: number;
    label: string;
    bonus?: string;
}

export const FIXED_GUMDROP_PACKAGES: GumdropPackageDefinition[] = [
    { drops: 100, priceUsd: 1, label: "Starter Pack" },
    { drops: 550, priceUsd: 5, label: "Fan Pack", bonus: "+50 Bonus" },
    { drops: 1100, priceUsd: 10, label: "Premium Stash", bonus: "+100 Bonus" },
    { drops: 2500, priceUsd: 20, label: "Ultimate Kandy", bonus: "+500 Bonus" },
];

export function isBundleGumdropAmount(drops: number) {
  return FIXED_GUMDROP_PACKAGES.some((pkg) => pkg.drops === drops);
}

export function resolveExpectedGumdropPrice(drops: number): string | null {
    if (!Number.isInteger(drops) || drops <= 0) {
        return null;
    }

    if (isBundleGumdropAmount(drops)) {
        return ((drops / 1000) * 5).toFixed(2);
    }

    const matchingPackage = FIXED_GUMDROP_PACKAGES.find((entry) => entry.drops === drops);
    return matchingPackage ? matchingPackage.priceUsd.toFixed(2) : null;
}

export function resolvePreferredGumdropAmount(missingAmount: number) {
    if (!Number.isFinite(missingAmount) || missingAmount <= 100) {
        return 100;
    }

    if (missingAmount <= 550) {
        return 550;
    }

    if (missingAmount <= 1100) {
        return 1100;
    }

    if (missingAmount <= 2500) {
        return 2500;
    }

    return Math.min(100000, Math.max(5000, Math.ceil(missingAmount / 1000) * 1000));
}
