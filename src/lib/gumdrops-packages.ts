export interface GumdropPackageDefinition {
    drops: number;
    priceUsd: number;
    label: string;
    bonus?: string;
}

export const FIXED_GUMDROP_PACKAGES: GumdropPackageDefinition[] = [
    { drops: 100, priceUsd: 1, label: "Sugar Rush Pack" },
    { drops: 550, priceUsd: 5, label: "Sweet Pack", bonus: "+50 Bonus" },
    { drops: 1100, priceUsd: 10, label: "Kandy Bag Pack", bonus: "+100 Bonus" },
    { drops: 2500, priceUsd: 20, label: "Kandy Land Pack", bonus: "+500 Bonus" },
];

export function isBundleGumdropAmount(drops: number) {
    return Number.isInteger(drops)
        && drops >= 5000
        && drops <= 100000
        && drops % 1000 === 0;
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

export function resolvePreferredGumdropAmount(
    missingAmount: number,
    packages: GumdropPackageDefinition[] = FIXED_GUMDROP_PACKAGES
) {
    const validPackages = packages.filter(pkg => Number.isFinite(pkg.drops) && pkg.drops > 0);
    const sortedPackages = [...validPackages].sort((a, b) => a.drops - b.drops);
    const minPackage = sortedPackages.length > 0 ? sortedPackages[0].drops : 100;

    if (!Number.isFinite(missingAmount) || missingAmount <= 0) {
        return minPackage;
    }

    for (const pkg of sortedPackages) {
        if (pkg.drops >= missingAmount) {
            return pkg.drops;
        }
    }

    return Math.min(100000, Math.max(5000, Math.ceil(missingAmount / 1000) * 1000));
}
