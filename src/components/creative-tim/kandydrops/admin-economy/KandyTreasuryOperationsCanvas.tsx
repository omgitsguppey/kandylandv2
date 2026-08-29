"use client";

import Link from "next/link";
import {
    FileText,
    LayoutDashboard,
    Package,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Users,
    type LucideIcon,
} from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { PlatformEconomyStrip } from "@/app/admin/economy/components/PlatformEconomyStrip";
import type {
    EconomySliceState,
    PlatformEconomyDashboardState,
} from "@/app/admin/economy/components/types";
import type {
    PlatformEconomyTreasurySummary,
    PlatformEconomyWarning,
} from "@/lib/platform-economy";

export type KandyTreasuryOperationsCanvasProps = {
    state: PlatformEconomyDashboardState;
    warnings: PlatformEconomyWarning[];
    isLocalAdminUiTestSession: boolean;
    treasurySourceState: ComponentProps<typeof PlatformEconomyStrip>["sourceState"];
    warningsStillLoading: boolean;
};

type TruthTone = "neutral" | "warning" | "critical" | "active";

function formatUsd(value: number | null | undefined) {
    return value == null ? "--" : "$" + value.toFixed(2);
}

function formatRate(value: number | null | undefined) {
    return value == null ? "--" : "$" + value.toFixed(2) + " / 100 GD";
}

function formatWindow(start: string | null | undefined, end: string | null | undefined) {
    if (!start && !end) return "No window";
    return (start ? new Date(start).toLocaleDateString() : "now") + " -> " + (end ? new Date(end).toLocaleDateString() : "open");
}

function summarizeSourceWarnings(warnings: PlatformEconomyWarning[]) {
    if (warnings.length === 0) return null;
    const labels = warnings.slice(0, 2).map((warning) => warning.label);
    const remaining = warnings.length - labels.length;
    return labels.join(" / ") + (remaining > 0 ? " / +" + remaining + " more" : "");
}

function renderSliceState<T>({
    slice,
    emptyMessage,
    children,
}: {
    slice: EconomySliceState<T>;
    emptyMessage: string;
    children: (data: T) => ReactNode;
}) {
    if (slice.error) {
        return <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] px-3 py-3 text-sm text-red-300">{slice.error}</div>;
    }

    if (slice.loading && slice.data == null) {
        return <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-gray-500">Loading this section...</div>;
    }

    if (slice.data == null) {
        return <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-gray-500">{emptyMessage}</div>;
    }

    if (Array.isArray(slice.data) && slice.data.length === 0) {
        return <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-gray-500">{emptyMessage}</div>;
    }

    return children(slice.data);
}

function TruthPill({ value, tone = "neutral" }: { value: string; tone?: TruthTone }) {
    const tones: Record<TruthTone, string> = {
        neutral: "border-white/10 bg-white/[0.055] text-gray-300",
        warning: "border-amber-400/25 bg-amber-500/10 text-amber-100",
        critical: "border-red-400/25 bg-red-500/10 text-red-100",
        active: "border-kandy-lilac/35 bg-kandy-lilac/10 text-kandy-lilac",
    };

    return <span className={"inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold " + tones[tone]}>{value}</span>;
}

function warningTone(value: string): TruthTone {
    const normalized = value.toLowerCase();
    if (normalized.includes("critical") || normalized.includes("failed") || normalized.includes("error")) return "critical";
    if (normalized.includes("warn") || normalized.includes("review")) return "warning";
    return "neutral";
}

function CanvasHeading({
    eyebrow,
    title,
    detail,
    icon: Icon,
}: {
    eyebrow: string;
    title: string;
    detail: string;
    icon: LucideIcon;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-kandy-lilac/25 bg-brand-purple/15 text-kandy-lilac shadow-inner shadow-white/10">
                <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">{eyebrow}</p>
                <h2 className="mt-0.5 text-base font-black tracking-tight text-white">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{detail}</p>
            </div>
        </div>
    );
}

function SourceTruthRail({
    treasury,
    treasurySourceState,
    warnings,
    warningsStillLoading,
    isLocalAdminUiTestSession,
}: {
    treasury: PlatformEconomyTreasurySummary | null;
    treasurySourceState: ComponentProps<typeof PlatformEconomyStrip>["sourceState"];
    warnings: PlatformEconomyWarning[];
    warningsStillLoading: boolean;
    isLocalAdminUiTestSession: boolean;
}) {
    return (
        <aside className="relative overflow-hidden rounded-[1.8rem] border border-kandy-lilac/25 bg-gradient-to-b from-brand-purple/[0.14] via-kandy-void/85 to-black/30 p-4">
            <span aria-hidden="true" className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-pink/15 blur-3xl" />
            <div className="relative space-y-4">
                <CanvasHeading
                    eyebrow="Source truth"
                    title="Treasury posture"
                    detail="Read-only source state is kept separate from follow-up decisions."
                    icon={ShieldAlert}
                />

                <dl className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs text-gray-400">Treasury source</dt>
                        <dd><TruthPill value={treasurySourceState} tone={warningTone(treasurySourceState)} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs text-gray-400">Freshness</dt>
                        <dd><TruthPill value={treasury?.freshnessState ?? treasurySourceState} tone={warningTone(treasury?.freshnessState ?? treasurySourceState)} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs text-gray-400">Raised warnings</dt>
                        <dd><TruthPill value={String(warnings.length)} tone={warnings.length ? "warning" : "active"} /></dd>
                    </div>
                </dl>

                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">Attention queue</p>
                    {isLocalAdminUiTestSession ? (
                        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-gray-500">source_missing: economy warning source is not loaded in this fixture.</div>
                    ) : warnings.length ? warnings.map((warning, index) => (
                        <div key={warning.code + ":" + index} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.09] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{warning.label}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{warning.detail}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <TruthPill value={warning.code} tone="warning" />
                                    <TruthPill value={warning.severity} tone={warningTone(warning.severity)} />
                                </div>
                            </div>
                        </div>
                    )) : warningsStillLoading
                        ? <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-gray-500">Warnings are still loading from the remaining economy sections.</div>
                        : <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-gray-500">No economy warnings are currently raised.</div>}
                </div>
            </div>
        </aside>
    );
}

export function KandyTreasuryOperationsCanvas({
    state,
    warnings,
    isLocalAdminUiTestSession,
    treasurySourceState,
    warningsStillLoading,
}: KandyTreasuryOperationsCanvasProps) {
    return (
        <div className="relative space-y-5" data-admin-economy-surface="treasury-operations-canvas">
            {isLocalAdminUiTestSession ? (
                <section
                    className="rounded-[1.35rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
                    data-admin-economy-fixture-boundary="true"
                    data-admin-economy-fixture-state="source_missing"
                >
                    source_missing fixture. Economy source is not loaded here; protected treasury, ledger, provider, and reconciliation reads stay blocked.
                </section>
            ) : null}

            <header className="relative overflow-hidden rounded-[2rem] border border-kandy-lilac/25 bg-gradient-to-br from-brand-purple/25 via-kandy-void/90 to-brand-pink/10 p-5 shadow-2xl shadow-black/25 sm:p-6">
                <span aria-hidden="true" className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-brand-purple/35 blur-3xl" />
                <span aria-hidden="true" className="absolute -right-14 bottom-0 h-36 w-36 rounded-full bg-brand-pink/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-kandy-lilac/80">Platform economy</p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Treasury operations canvas</h1>
                        <p className="mt-2 text-sm leading-relaxed text-gray-300">Balance evidence, pricing architecture, commercial levers, and reconciliation are arranged for the decision they support.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-gray-300">
                        <ShieldAlert aria-hidden="true" className="h-4 w-4 text-kandy-lilac" />
                        Source truth remains read-only here.
                    </div>
                </div>
            </header>

            <PlatformEconomyStrip
                treasury={state.treasury.data}
                warningCount={warnings.length}
                sourceState={treasurySourceState}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)]">
                <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/20 p-4 sm:p-5">
                    <span aria-hidden="true" className="absolute -right-12 top-1/3 h-32 w-32 rounded-full bg-brand-purple/15 blur-3xl" />
                    <div className="relative space-y-4">
                        <CanvasHeading
                            eyebrow="Balance decisions"
                            title="Live treasury ledger"
                            detail="Canonical balance split, rate floor, and wallet source drilldown."
                            icon={Users}
                        />
                        {renderSliceState({
                            slice: state.treasury,
                            emptyMessage: isLocalAdminUiTestSession
                                ? "source_missing: treasury source is not loaded in this fixture."
                                : "No treasury snapshot is available yet.",
                            children: (treasury) => (
                                <div className="space-y-2">
                                    {treasury.walletRows.map((row) => {
                                        const sourceWarningSummary = summarizeSourceWarnings(row.sourceWarnings);
                                        return (
                                            <article key={row.userId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition-colors hover:border-kandy-lilac/35">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0">
                                                        <Link href={row.adminUserHref} className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-white transition-colors hover:text-kandy-lilac">
                                                            <span className="truncate">{row.displayName}</span>
                                                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-kandy-lilac">Open record</span>
                                                        </Link>
                                                        <p className="mt-1 text-[11px] text-gray-500">{row.shortUserId}</p>
                                                        {sourceWarningSummary ? <p className="mt-2 text-[11px] text-amber-200">{sourceWarningSummary}</p> : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                        <TruthPill value={"total " + row.totalGd.toLocaleString() + " GD"} tone="active" />
                                                        <TruthPill value={"paid-source " + row.paidGd.toLocaleString()} />
                                                        <TruthPill value={"reward/free " + row.rewardFreeGd.toLocaleString()} />
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ),
                        })}
                    </div>
                </section>

                <SourceTruthRail
                    treasury={state.treasury.data}
                    treasurySourceState={treasurySourceState}
                    warnings={warnings}
                    warningsStillLoading={warningsStillLoading}
                    isLocalAdminUiTestSession={isLocalAdminUiTestSession}
                />
            </div>

            <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-black/25 via-kandy-void/90 to-brand-purple/[0.1] p-4 sm:p-5">
                <span aria-hidden="true" className="absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-brand-purple/20 blur-3xl" />
                <div className="relative space-y-4">
                    <CanvasHeading
                        eyebrow="Pricing architecture"
                        title="Package mix and rate floor"
                        detail="Code-backed package truth and effective-rate detail stay visible before a commercial decision."
                        icon={Package}
                    />
                    {renderSliceState({
                        slice: state.packages,
                        emptyMessage: isLocalAdminUiTestSession
                            ? "source_missing: package source is not loaded in this fixture."
                            : "No package configs are available yet.",
                        children: (packages) => (
                            <div className="grid gap-2 lg:grid-cols-2">
                                {packages.map((pkg) => (
                                    <article key={pkg.packageId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-bold text-white">{pkg.label}</h3>
                                                <p className="mt-1 text-[11px] text-gray-500">{pkg.packageId}</p>
                                            </div>
                                            <TruthPill value={formatUsd(pkg.priceUsd)} tone="active" />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                                            <TruthPill value={String(pkg.basePaidGd) + " paid"} />
                                            <TruthPill value={String(pkg.bonusPaidGd) + " bonus"} />
                                            <TruthPill value={String(pkg.totalGd) + " total"} />
                                            <TruthPill value={formatRate(pkg.effectiveUsdPer100Gd)} />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ),
                    })}
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="space-y-4">
                        <CanvasHeading
                            eyebrow="Promotion controls"
                            title="Promo guardrails"
                            detail="Draft and active promos remain tied to server-enforced limits and floor warnings."
                            icon={Sparkles}
                        />
                        {renderSliceState({
                            slice: state.promos,
                            emptyMessage: isLocalAdminUiTestSession
                                ? "source_missing: promo source is not loaded in this fixture."
                                : "No promo configs yet. Mutation routes are ready for draft promos.",
                            children: (promos) => (
                                <div className="space-y-2">
                                    {promos.map((promo) => (
                                        <article key={promo.promoId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-bold text-white">{promo.title}</h3>
                                                    <p className="mt-1 text-[11px] text-gray-500">{promo.code} / {promo.promoType}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                    <TruthPill value={promo.active ? "active" : "draft"} tone={promo.active ? "active" : "neutral"} />
                                                    <TruthPill value={promo.stackable ? "stackable" : "non-stackable"} />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                                                <TruthPill value={"max/user " + (promo.maxPerUser ?? "--")} />
                                                <TruthPill value={formatRate(promo.effectiveUsdPer100GdImpact)} />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ),
                        })}
                    </div>
                </section>

                <section className="rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-brand-pink/[0.08] via-kandy-void/90 to-black/25 p-4 sm:p-5">
                    <div className="space-y-4">
                        <CanvasHeading
                            eyebrow="Offer strategy"
                            title="Audience and timing"
                            detail="Limited-time offer wrappers stay attached to their package and promo source."
                            icon={LayoutDashboard}
                        />
                        {renderSliceState({
                            slice: state.offers,
                            emptyMessage: isLocalAdminUiTestSession
                                ? "source_missing: offer source is not loaded in this fixture."
                                : "No offer configs yet. Create draft offers only when the promo/package source is ready.",
                            children: (offers) => (
                                <div className="space-y-2">
                                    {offers.map((offer) => (
                                        <article key={offer.offerId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-bold text-white">{offer.offerType}</h3>
                                                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{offer.eligibleAudience} / {formatWindow(offer.startsAtUtc, offer.endsAtUtc)}</p>
                                                </div>
                                                <TruthPill value={offer.active ? "active" : "draft"} tone={offer.active ? "active" : "neutral"} />
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                                                <TruthPill value={String(offer.packageIds.length) + " package" + (offer.packageIds.length === 1 ? "" : "s")} />
                                                <TruthPill value={offer.promoId ? "promo " + offer.promoId : "no promo"} />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ),
                        })}
                    </div>
                </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="space-y-4">
                        <CanvasHeading
                            eyebrow="Reconciliation trail"
                            title="Recent redemptions"
                            detail="Package, promo, offer, and effective-rate audit fields remain together."
                            icon={FileText}
                        />
                        {renderSliceState({
                            slice: state.redemptions,
                            emptyMessage: isLocalAdminUiTestSession
                                ? "source_missing: redemption source is not loaded in this fixture."
                                : "No recent redemptions are available yet.",
                            children: (redemptions) => (
                                <div className="space-y-2">
                                    {redemptions.map((row) => (
                                        <article key={row.redemptionId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-bold text-white">{row.packageLabel}</h3>
                                                    <p className="mt-1 text-[11px] text-gray-500">{row.shortUserId} / {new Date(row.createdAtUtc).toLocaleString()}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                    <TruthPill value={"paid " + formatUsd(row.priceUsdPaid)} tone="active" />
                                                    <TruthPill value={"discount " + formatUsd(row.discountUsd)} />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                                                <TruthPill value={row.totalIssuedGd.toLocaleString() + " GD"} />
                                                <TruthPill value={formatRate(row.effectiveUsdPer100Gd)} />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ),
                        })}
                    </div>
                </section>

                <section className="rounded-[1.8rem] border border-white/10 bg-gradient-to-b from-white/[0.045] to-black/25 p-4 sm:p-5">
                    <div className="space-y-4">
                        <CanvasHeading
                            eyebrow="Integrity review"
                            title="Drift review"
                            detail="Platform Economy remains canonical; downstream mismatches keep both expected and actual values visible."
                            icon={TrendingUp}
                        />
                        {renderSliceState({
                            slice: state.drift,
                            emptyMessage: isLocalAdminUiTestSession
                                ? "source_missing: drift source is not loaded in this fixture."
                                : "No current economy drift detected across package, promo, wallet, revenue, or ledger snapshots.",
                            children: (drift) => (
                                <div className="space-y-2">
                                    {drift.map((row) => (
                                        <article key={row.driftId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-bold text-white">{row.surface}</p>
                                            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{row.expected} / {row.actual}</p>
                                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                                                <TruthPill value={row.severity} tone={warningTone(row.severity)} />
                                                <TruthPill value={row.validator} />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ),
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
