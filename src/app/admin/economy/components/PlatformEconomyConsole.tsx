"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { authFetch } from "@/lib/authFetch";
import type { PlatformEconomyDriftRecord, PlatformEconomyOfferRecord, PlatformEconomyPackageRecord, PlatformEconomyPromoRecord, PlatformEconomyRedemptionRecord, PlatformEconomyTreasurySummary } from "@/lib/platform-economy";

import { PlatformEconomyStrip } from "./PlatformEconomyStrip";
import { collectEconomyWarnings, createLoadingSlice, type EconomyTabId, type PlatformEconomyDashboardState } from "./types";

const TABS: Array<{ id: EconomyTabId; label: string }> = [
    { id: "treasury", label: "Treasury" },
    { id: "packages", label: "Packages" },
    { id: "promos", label: "Promos" },
    { id: "offers", label: "Offers" },
    { id: "redemptions", label: "Redemptions" },
    { id: "drift", label: "Drift" },
    { id: "warnings", label: "Warnings" },
];

function formatUsd(value: number | null | undefined) {
    return value == null ? "—" : `$${value.toFixed(2)}`;
}

function formatRate(value: number | null | undefined) {
    return value == null ? "—" : `$${value.toFixed(2)} / 100 GD`;
}

function formatWindow(start: string | null | undefined, end: string | null | undefined) {
    if (!start && !end) return "No window";
    return `${start ? new Date(start).toLocaleDateString() : "now"} → ${end ? new Date(end).toLocaleDateString() : "open"}`;
}

function StatusChip({ value }: { value: string }) {
    return <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-gray-300">{value}</span>;
}

function SectionCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
    return (
        <section className="rounded-[1.25rem] border border-white/10 bg-black/20 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="text-xs text-gray-500">{detail}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

const ECONOMY_ENDPOINTS = [
    ["treasury", "/api/admin/economy/treasury"],
    ["packages", "/api/admin/economy/packages"],
    ["promos", "/api/admin/economy/promos"],
    ["offers", "/api/admin/economy/offers"],
    ["redemptions", "/api/admin/economy/redemptions"],
    ["drift", "/api/admin/economy/drift"],
] as const satisfies ReadonlyArray<readonly [keyof PlatformEconomyDashboardState, string]>;

export function PlatformEconomyConsole() {
    const [tab, setTab] = useState<EconomyTabId>("treasury");
    const [state, setState] = useState<PlatformEconomyDashboardState>({
        treasury: createLoadingSlice<PlatformEconomyTreasurySummary>(),
        packages: createLoadingSlice<PlatformEconomyPackageRecord[]>(),
        promos: createLoadingSlice<PlatformEconomyPromoRecord[]>(),
        offers: createLoadingSlice<PlatformEconomyOfferRecord[]>(),
        redemptions: createLoadingSlice<PlatformEconomyRedemptionRecord[]>(),
        drift: createLoadingSlice<PlatformEconomyDriftRecord[]>(),
    });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setState({
                treasury: createLoadingSlice<PlatformEconomyTreasurySummary>(),
                packages: createLoadingSlice<PlatformEconomyPackageRecord[]>(),
                promos: createLoadingSlice<PlatformEconomyPromoRecord[]>(),
                offers: createLoadingSlice<PlatformEconomyOfferRecord[]>(),
                redemptions: createLoadingSlice<PlatformEconomyRedemptionRecord[]>(),
                drift: createLoadingSlice<PlatformEconomyDriftRecord[]>(),
            });

            const requests = ECONOMY_ENDPOINTS.map(async ([key, url]) => {
                try {
                    const response = await authFetch(url);
                    const body = await response.json();
                    if (!response.ok || !body.success) {
                        throw new Error(body.error || `Failed to load ${key}`);
                    }
                    if (cancelled) return;
                    setState((current) => ({
                        ...current,
                        [key]: {
                            loading: false,
                            error: null,
                            data: body[key] ?? null,
                        },
                    }));
                } catch (error) {
                    if (cancelled) return;
                    setState((current) => ({
                        ...current,
                        [key]: {
                            loading: false,
                            error: error instanceof Error ? error.message : `Failed to load ${key}`,
                            data: null,
                        },
                    }));
                }
            });

            await Promise.all(requests);
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const warnings = useMemo(() => collectEconomyWarnings(state), [state]);

    return (
        <div className="space-y-3">
            <PlatformEconomyStrip treasury={state.treasury.data} warningCount={warnings.length} />

            <div className="flex flex-wrap gap-1.5 rounded-[1.1rem] border border-white/10 bg-black/20 p-1.5">
                {TABS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        onClick={() => setTab(entry.id)}
                        className={tab === entry.id
                            ? "rounded-full bg-brand-purple px-3 py-1.5 text-xs font-semibold text-black"
                            : "rounded-full px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white"}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>

            {tab === "treasury" && (
                <SectionCard title="Treasury" detail="Canonical balance split, rate floor, and wallet source drilldown.">
                    {state.treasury.error ? <div className="text-sm text-red-300">{state.treasury.error}</div> : null}
                    <div className="grid gap-2">
                        {state.treasury.data?.walletRows.map((row) => (
                            <div key={row.userId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <Link href={row.adminUserHref} className="truncate text-sm font-medium text-white hover:text-brand-purple">{row.displayName}</Link>
                                        <div className="text-[11px] text-gray-500">{row.shortUserId}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={`total ${row.totalGd.toLocaleString()} GD`} />
                                        <StatusChip value={`paid ${row.paidGd.toLocaleString()}`} />
                                        <StatusChip value={`reward ${row.rewardFreeGd.toLocaleString()}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {tab === "packages" && (
                <SectionCard title="Packages" detail="Code-backed package truth, effective rate, and floor warnings.">
                    <div className="grid gap-2">
                        {state.packages.data?.map((pkg) => (
                            <div key={pkg.packageId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{pkg.label}</div>
                                        <div className="text-[11px] text-gray-500">{pkg.packageId}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={formatUsd(pkg.priceUsd)} />
                                        <StatusChip value={`${pkg.basePaidGd} paid`} />
                                        <StatusChip value={`${pkg.bonusPaidGd} bonus`} />
                                        <StatusChip value={`${pkg.totalGd} total`} />
                                        <StatusChip value={formatRate(pkg.effectiveUsdPer100Gd)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {tab === "promos" && (
                <SectionCard title="Promos" detail="Draft or active promo controls with server-enforced limits and floor warnings.">
                    <div className="grid gap-2">
                        {state.promos.data?.length ? state.promos.data.map((promo) => (
                            <div key={promo.promoId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{promo.title}</div>
                                        <div className="text-[11px] text-gray-500">{promo.code} · {promo.promoType}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={promo.active ? "active" : "draft"} />
                                        <StatusChip value={promo.stackable ? "stackable" : "non-stackable"} />
                                        <StatusChip value={`max/user ${promo.maxPerUser ?? "—"}`} />
                                        <StatusChip value={formatRate(promo.effectiveUsdPer100GdImpact)} />
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-sm text-gray-500">No promo configs yet. Mutation routes are ready for draft promos.</div>}
                    </div>
                </SectionCard>
            )}

            {tab === "offers" && (
                <SectionCard title="Offers" detail="Limited-time and audience-scoped offer wrappers over packages and promos.">
                    <div className="grid gap-2">
                        {state.offers.data?.length ? state.offers.data.map((offer) => (
                            <div key={offer.offerId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{offer.offerType}</div>
                                        <div className="text-[11px] text-gray-500">{offer.eligibleAudience} · {formatWindow(offer.startsAtUtc, offer.endsAtUtc)}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={offer.active ? "active" : "draft"} />
                                        <StatusChip value={`${offer.packageIds.length} package${offer.packageIds.length === 1 ? "" : "s"}`} />
                                        <StatusChip value={offer.promoId ? `promo ${offer.promoId}` : "no promo"} />
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-sm text-gray-500">No offer configs yet. Create draft offers only when the promo/package source is ready.</div>}
                    </div>
                </SectionCard>
            )}

            {tab === "redemptions" && (
                <SectionCard title="Redemptions" detail="Recent purchase redemptions with package, promo, offer, and effective-rate audit fields.">
                    <div className="grid gap-2">
                        {state.redemptions.data?.map((row) => (
                            <div key={row.redemptionId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{row.packageLabel}</div>
                                        <div className="text-[11px] text-gray-500">{row.shortUserId} · {new Date(row.createdAtUtc).toLocaleString()}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={`paid ${formatUsd(row.priceUsdPaid)}`} />
                                        <StatusChip value={`discount ${formatUsd(row.discountUsd)}`} />
                                        <StatusChip value={`${row.totalIssuedGd.toLocaleString()} GD`} />
                                        <StatusChip value={formatRate(row.effectiveUsdPer100Gd)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {tab === "drift" && (
                <SectionCard title="Drift" detail="Platform Economy is the winner. Any mismatch downstream must show exact expected versus actual fields.">
                    <div className="grid gap-2">
                        {state.drift.data?.length ? state.drift.data.map((row) => (
                            <div key={row.driftId} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{row.surface}</div>
                                        <div className="text-[11px] text-gray-500">{row.expected} · {row.actual}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={row.severity} />
                                        <StatusChip value={row.validator} />
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-sm text-gray-500">No current economy drift detected across package, promo, wallet, revenue, or ledger snapshots.</div>}
                    </div>
                </SectionCard>
            )}

            {tab === "warnings" && (
                <SectionCard title="Warnings" detail="Warnings are explicit. They do not silently reconcile downstream surfaces.">
                    <div className="grid gap-2">
                        {warnings.length ? warnings.map((warning, index) => (
                            <div key={`${warning.code}:${index}`} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{warning.label}</div>
                                        <div className="text-[11px] text-amber-100/80">{warning.detail}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <StatusChip value={warning.code} />
                                        <StatusChip value={warning.severity} />
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-sm text-gray-500">No economy warnings are currently raised.</div>}
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
