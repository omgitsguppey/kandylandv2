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

export type EconomyWarningSummary = {
    warnings: PlatformEconomyWarning[];
    sourceState: "verified" | "collecting" | "failed" | "source_missing";
    count: number | null;
};

export function createLoadingSlice<T>(): EconomySliceState<T> {
    return {
        loading: true,
        error: null,
        data: null,
    };
}

export function collectEconomyWarnings(state: PlatformEconomyDashboardState): EconomyWarningSummary {
    const warnings: PlatformEconomyWarning[] = [];

    state.treasury.data?.warnings.forEach((warning) => warnings.push(warning));
    state.treasury.data?.walletRows.forEach((row) => row.sourceWarnings.forEach((warning) => warnings.push(warning)));
    state.packages.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.promos.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.offers.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));
    state.redemptions.data?.forEach((record) => record.warnings.forEach((warning) => warnings.push(warning)));

    const sources = [state.treasury, state.packages, state.promos, state.offers, state.redemptions];
    const complete = sources.every((slice) => !slice.loading && !slice.error && slice.data !== null);
    const sourceState = complete ? "verified"
        : sources.some((slice) => slice.error) ? "failed"
        : sources.some((slice) => slice.loading) ? "collecting"
        : "source_missing";

    return { warnings, sourceState, count: complete || warnings.length > 0 ? warnings.length : null };
}
