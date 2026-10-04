"use client";

import { type ComponentProps, useEffect, useMemo, useState } from "react";

import { KandyTreasuryOperationsCanvas } from "@/components/creative-tim/kandydrops/admin-economy/KandyTreasuryOperationsCanvas";
import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import type {
    PlatformEconomyDriftRecord,
    PlatformEconomyOfferRecord,
    PlatformEconomyPackageRecord,
    PlatformEconomyPromoRecord,
    PlatformEconomyRedemptionRecord,
    PlatformEconomyTreasurySummary,
} from "@/lib/platform-economy";

import { PlatformEconomyStrip } from "./PlatformEconomyStrip";
import {
    collectEconomyWarnings,
    createLoadingSlice,
    type EconomySliceState,
    type PlatformEconomyDashboardState,
} from "./types";

type TreasuryStripSourceState = ComponentProps<typeof PlatformEconomyStrip>["sourceState"];

function getTreasuryStripSourceState(
    slice: EconomySliceState<PlatformEconomyTreasurySummary>,
    isLocalAdminUiTestSession: boolean,
): TreasuryStripSourceState {
    if (isLocalAdminUiTestSession) return "source_missing";
    if (slice.error) return "failed";
    if (slice.loading && slice.data == null) return "collecting";
    if (slice.data?.freshnessState === "review") return "review";
    if (slice.data == null) return "source_missing";
    return "live";
}

const ECONOMY_ENDPOINTS = [
    ["treasury", "/api/admin/economy/treasury"],
    ["packages", "/api/admin/economy/packages"],
    ["promos", "/api/admin/economy/promos"],
    ["offers", "/api/admin/economy/offers"],
    ["redemptions", "/api/admin/economy/redemptions"],
    ["drift", "/api/admin/economy/drift"],
] as const satisfies ReadonlyArray<readonly [keyof PlatformEconomyDashboardState, string]>;

function createInitialState(): PlatformEconomyDashboardState {
    return {
        treasury: createLoadingSlice<PlatformEconomyTreasurySummary>(),
        packages: createLoadingSlice<PlatformEconomyPackageRecord[]>(),
        promos: createLoadingSlice<PlatformEconomyPromoRecord[]>(),
        offers: createLoadingSlice<PlatformEconomyOfferRecord[]>(),
        redemptions: createLoadingSlice<PlatformEconomyRedemptionRecord[]>(),
        drift: createLoadingSlice<PlatformEconomyDriftRecord[]>(),
    };
}

function createSourceMissingSlice<T>(): EconomySliceState<T> {
    return {
        loading: false,
        error: null,
        data: null,
    };
}

function createSourceMissingState(): PlatformEconomyDashboardState {
    return {
        treasury: createSourceMissingSlice<PlatformEconomyTreasurySummary>(),
        packages: createSourceMissingSlice<PlatformEconomyPackageRecord[]>(),
        promos: createSourceMissingSlice<PlatformEconomyPromoRecord[]>(),
        offers: createSourceMissingSlice<PlatformEconomyOfferRecord[]>(),
        redemptions: createSourceMissingSlice<PlatformEconomyRedemptionRecord[]>(),
        drift: createSourceMissingSlice<PlatformEconomyDriftRecord[]>(),
    };
}

export function PlatformEconomyConsole() {
    const { user } = useAuth();
    const [state, setState] = useState<PlatformEconomyDashboardState>(createInitialState);
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (isLocalAdminUiTestSession) {
                setState(createSourceMissingState());
                return;
            }

            setState(createInitialState());

            ECONOMY_ENDPOINTS.forEach(([key, url]) => {
                void (async () => {
                    try {
                        const response = await authFetch(url);
                        const body = await response.json();
                        if (!response.ok || body.success !== true) {
                            throw new Error(body.error || "Failed to load " + key);
                        }
                        const data = body[key];
                        const isWarningRecord = (record: unknown): record is { warnings: unknown[]; walletRows?: unknown } =>
                            Boolean(record && typeof record === "object" && Array.isArray((record as { warnings?: unknown }).warnings));
                        const validSource = key === "treasury"
                            ? isWarningRecord(data) && Array.isArray(data.walletRows)
                                && data.walletRows.every((row: { sourceWarnings?: unknown } | null) => row && Array.isArray(row.sourceWarnings))
                            : Array.isArray(data) && (key === "drift" || data.every(isWarningRecord));
                        if (!validSource) {
                            throw new Error("No verified " + key + " source was returned.");
                        }
                        if (cancelled) return;
                        setState((current) => ({
                            ...current,
                            [key]: {
                                loading: false,
                                error: null,
                                data,
                            },
                        }));
                    } catch (error) {
                        if (cancelled) return;
                        setState((current) => ({
                            ...current,
                            [key]: {
                                loading: false,
                                error: error instanceof Error ? error.message : "Failed to load " + key,
                                data: null,
                            },
                        }));
                    }
                })();
            });
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [isLocalAdminUiTestSession]);

    const warningSummary = useMemo(() => collectEconomyWarnings(state), [state]);
    const treasurySourceState = getTreasuryStripSourceState(state.treasury, isLocalAdminUiTestSession);

    return (
        <KandyTreasuryOperationsCanvas
            state={state}
            warningSummary={warningSummary}
            isLocalAdminUiTestSession={isLocalAdminUiTestSession}
            treasurySourceState={treasurySourceState}
        />
    );
}
