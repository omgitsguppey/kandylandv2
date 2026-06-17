import type {
    PlatformEconomyDriftRecord,
    PlatformEconomyOfferRecord,
    PlatformEconomyPackageRecord,
    PlatformEconomyPromoRecord,
    PlatformEconomyRedemptionRecord,
    PlatformEconomyTreasurySummary,
    PlatformEconomyWarning,
} from "@/lib/platform-economy";

export type EconomySliceState<T> = {
    loading: boolean;
    error: string | null;
    data: T | null;
};

export type PlatformEconomyDashboardState = {
    treasury: EconomySliceState<PlatformEconomyTreasurySummary>;
    packages: EconomySliceState<PlatformEconomyPackageRecord[]>;
    promos: EconomySliceState<PlatformEconomyPromoRecord[]>;
    offers: EconomySliceState<PlatformEconomyOfferRecord[]>;
    redemptions: EconomySliceState<PlatformEconomyRedemptionRecord[]>;
    drift: EconomySliceState<PlatformEconomyDriftRecord[]>;
};

export type EconomyTabId = "treasury" | "packages" | "promos" | "offers" | "redemptions" | "drift" | "warnings";

export function createLoadingSlice<T>(): EconomySliceState<T> {
    return {
        loading: true,
        error: null,
        data: null,
    };
}

export function collectEconomyWarnings(state: PlatformEconomyDashboardState) {
    const warnings: PlatformEconomyWarning[] = [];

    state.treasury.data?.warnings.forEach((warning) => warnings.push(warning));
    state.treasury.data?.walletRows.forEach((row) => row.sourceWarnings.forEach((warning) => warnings.push(warning)));
    state.packages.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.promos.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.offers.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.redemptions.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));

    return warnings;
}
