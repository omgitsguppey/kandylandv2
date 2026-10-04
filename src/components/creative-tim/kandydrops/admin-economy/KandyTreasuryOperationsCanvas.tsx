"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { PlatformEconomyStrip } from "@/app/admin/economy/components/PlatformEconomyStrip";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Card, CardContent } from "@/components/creative-tim/ui/card";
import { Badge } from "@/components/creative-tim/ui/badge";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { EconomySliceState, EconomyWarningSummary, PlatformEconomyDashboardState } from "@/app/admin/economy/components/types";
import type { PlatformEconomyTreasurySummary, PlatformEconomyWarning } from "@/lib/platform-economy";

export type KandyTreasuryOperationsCanvasProps = {
    state: PlatformEconomyDashboardState;
    warningSummary: EconomyWarningSummary;
    isLocalAdminUiTestSession: boolean;
    treasurySourceState: ComponentProps<typeof PlatformEconomyStrip>["sourceState"];
};

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

function Fields({ values }: { values: ReadonlyArray<readonly [string, ReactNode]> }) {
    return <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-5 gap-y-3">
        {values.map(([label, value]) => <div key={label} className="min-w-0">
            <dt className="break-words text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
        </div>)}
    </dl>;
}

function renderSliceState<T>({ slice, emptyMessage, children }: {
    slice: EconomySliceState<T>; emptyMessage: string; children: (data: T) => ReactNode;
}) {
    if (slice.error) return <p className="break-words rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{slice.error}</p>;
    if (slice.loading && slice.data == null) return <p className="text-sm text-muted-foreground" role="status">Loading this section...</p>;
    if (slice.data == null) return <p className="text-sm text-muted-foreground">Source is unavailable for this section.</p>;
    if (Array.isArray(slice.data) && slice.data.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
    return children(slice.data);
}

function SliceSection<T>({ id, title, detail, slice, emptyMessage, children, defaultOpen = false }: {
    id: keyof PlatformEconomyDashboardState; title: string; detail: string; slice: EconomySliceState<T>;
    emptyMessage: string; children: (data: T) => ReactNode; defaultOpen?: boolean;
}) {
    const sourceLabel = slice.error ? "failed" : slice.loading && slice.data === null ? "collecting"
        : slice.data === null ? "source_missing" : Array.isArray(slice.data) ? `${slice.data.length} ${slice.data.length === 1 ? "record" : "records"}` : "Source loaded";
    return <section className="min-w-0" data-admin-economy-slice={id}>
        <Card className="min-w-0 gap-0 py-0">
            <CardContent className="min-w-0 px-4">
                <details open={defaultOpen}>
                    <summary className="min-h-11 cursor-pointer content-center break-words py-3 text-foreground">
                        <h2 className="inline text-base font-semibold">{title}</h2>
                        <span className={cn("ml-3 inline-block break-words text-sm", slice.error ? "text-destructive" : "text-muted-foreground")}>{sourceLabel}</span>
                    </summary>
                    <div className="min-w-0 space-y-4 pb-4">
                        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
                        {renderSliceState({ slice, emptyMessage, children })}
                    </div>
                </details>
            </CardContent>
        </Card>
    </section>;
}

function SourceTruthRail({ treasury, treasurySourceState, warningSummary, isLocalAdminUiTestSession }: {
    treasury: PlatformEconomyTreasurySummary | null;
    treasurySourceState: ComponentProps<typeof PlatformEconomyStrip>["sourceState"];
    warningSummary: EconomyWarningSummary; isLocalAdminUiTestSession: boolean;
}) {
    const { warnings, count, sourceState } = warningSummary;
    const complete = !isLocalAdminUiTestSession && sourceState === "verified";
    const warningCountLabel = isLocalAdminUiTestSession || count === null ? "--" : `${complete ? "" : "≥"}${count}`;
    return <aside className="min-w-0" aria-label="Treasury source and warnings">
        <Card className="min-w-0 gap-0 py-0">
            <CardContent className="min-w-0 space-y-4 p-4">
                <h2 className="text-base font-semibold text-foreground">Treasury posture</h2>
                <Fields values={[["Treasury source", treasurySourceState], ["Freshness", treasury?.freshnessState ?? treasurySourceState], ["Raised warnings", warningCountLabel]]} />
                {!isLocalAdminUiTestSession && !complete ? <p className="text-sm leading-6 text-muted-foreground">
                    {sourceState === "collecting" ? "Warnings are still loading from the remaining economy sections." : "The warning source is incomplete. Available warnings are shown; the total is unavailable."}
                </p> : null}
                {isLocalAdminUiTestSession ? <p className="text-sm text-muted-foreground">source_missing: economy warning source is not loaded in this fixture.</p>
                    : warnings.length ? <ul className="divide-y divide-border">
                        {warnings.map((warning, index) => <li key={warning.code + ":" + index} className="min-w-0 space-y-2 py-3 first:pt-0 last:pb-0">
                            <p className="break-words text-sm font-medium text-warning">{warning.label}</p>
                            <p className="break-words text-sm leading-6 text-foreground">{warning.detail}</p>
                            <p className="break-words text-sm text-muted-foreground">{warning.code} / {warning.severity}</p>
                        </li>)}
                    </ul> : complete ? <p className="text-sm text-muted-foreground">No economy warnings are currently raised.</p> : null}
            </CardContent>
        </Card>
    </aside>;
}

export function KandyTreasuryOperationsCanvas({ state, warningSummary, isLocalAdminUiTestSession, treasurySourceState }: KandyTreasuryOperationsCanvasProps) {
    return <div className="min-w-0 space-y-4" data-admin-economy-surface="treasury-operations-canvas">
        {isLocalAdminUiTestSession ? <section className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning"
            data-admin-economy-fixture-boundary="true" data-admin-economy-fixture-state="source_missing">
            source_missing fixture. Economy source is not loaded here; protected treasury, ledger, provider, and reconciliation reads stay blocked.
        </section> : null}
        <AdminPageHeader compact eyebrow="Platform Economy" title="GumDrops Commerce Control Center"
            subtitle="Canonical treasury, package, promo, offer, redemption, warning, and drift truth for anything GumDrops touches."
            topSlot={<p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Source truth remains read-only here.</p>} />
        <PlatformEconomyStrip treasury={state.treasury.data} warningSummary={warningSummary} sourceState={treasurySourceState} />
        <SourceTruthRail treasury={state.treasury.data} treasurySourceState={treasurySourceState} warningSummary={warningSummary} isLocalAdminUiTestSession={isLocalAdminUiTestSession} />
        <div className="space-y-3">
            <SliceSection id="treasury" title="Treasury ledger" defaultOpen detail="Canonical balance split, rate floor, and wallet source drilldown."
                slice={state.treasury} emptyMessage={isLocalAdminUiTestSession ? "source_missing: treasury source is not loaded in this fixture." : "No treasury snapshot is available yet."}>
                {(treasury) => <ul className="divide-y divide-border">{treasury.walletRows.map((row) => <li key={row.userId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                        <Link href={row.adminUserHref} className={buttonVariants({ variant: "ghost", size: "sm", className: "max-w-full justify-start gap-2 whitespace-normal rounded-xl text-left" })}>
                            <span className="min-w-0 break-words">{row.displayName}</span><span className="text-sm">Open record</span>
                        </Link>
                        <p className="mt-1 break-words text-sm text-muted-foreground">{row.shortUserId}</p>
                    </div>
                    <Fields values={[["Total", row.totalGd.toLocaleString() + " GD"], ["Paid-source", row.paidGd.toLocaleString()], ["Reward/free", row.rewardFreeGd.toLocaleString()]]} />
                    {summarizeSourceWarnings(row.sourceWarnings) ? <p className="break-words text-sm text-warning">{summarizeSourceWarnings(row.sourceWarnings)}</p> : null}
                </li>)}</ul>}
            </SliceSection>
            <SliceSection id="redemptions" title="Recent redemptions" defaultOpen detail="Package, promo, offer, and effective-rate audit fields remain together."
                slice={state.redemptions} emptyMessage={isLocalAdminUiTestSession ? "source_missing: redemption source is not loaded in this fixture." : "No recent redemptions are available yet."}>
                {(redemptions) => <ul className="divide-y divide-border">{redemptions.map((row) => <li key={row.redemptionId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <h3 className="break-words text-sm font-semibold text-foreground">{row.packageLabel}</h3>
                    <p className="break-words text-sm text-muted-foreground">{row.shortUserId} / {new Date(row.createdAtUtc).toLocaleString()}</p>
                    <Fields values={[["Paid", formatUsd(row.priceUsdPaid)], ["Discount", formatUsd(row.discountUsd)], ["Issued", row.totalIssuedGd.toLocaleString() + " GD"], ["Effective rate", formatRate(row.effectiveUsdPer100Gd)]]} />
                    <p className="break-words text-sm text-muted-foreground">{row.packageId ?? "No package"} / {row.promoCode ?? row.promoId ?? "No promo"} / {row.offerId ?? "No offer"}</p>
                </li>)}</ul>}
            </SliceSection>
            <SliceSection id="packages" title="Package mix and rate floor" detail="Code-backed package truth and effective-rate detail stay visible before a commercial decision."
                slice={state.packages} emptyMessage={isLocalAdminUiTestSession ? "source_missing: package source is not loaded in this fixture." : "No package configs are available yet."}>
                {(packages) => <ul className="divide-y divide-border">{packages.map((pkg) => <li key={pkg.packageId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-semibold text-foreground">{pkg.label}</h3>
                        <Badge variant="secondary" className="max-w-full whitespace-normal break-words">{pkg.active ? "active" : "draft"}</Badge></div>
                    <p className="break-words text-sm text-muted-foreground">{pkg.packageId}</p>
                    <Fields values={[["Price", formatUsd(pkg.priceUsd)], ["Base paid GD", pkg.basePaidGd], ["Bonus paid-source GD", pkg.bonusPaidGd], ["Total GD", pkg.totalGd], ["Effective rate", formatRate(pkg.effectiveUsdPer100Gd)]]} />
                </li>)}</ul>}
            </SliceSection>
            <SliceSection id="promos" title="Promo guardrails" detail="Draft and active promos remain tied to server-enforced limits and floor warnings."
                slice={state.promos} emptyMessage={isLocalAdminUiTestSession ? "source_missing: promo source is not loaded in this fixture." : "No promo configs yet."}>
                {(promos) => <ul className="divide-y divide-border">{promos.map((promo) => <li key={promo.promoId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <h3 className="break-words text-sm font-semibold text-foreground">{promo.title}</h3>
                    <p className="break-words text-sm text-muted-foreground">{promo.code} / {promo.promoType}</p>
                    <Fields values={[["Status", promo.active ? "active" : "draft"], ["Stacking", promo.stackable ? "stackable" : "non-stackable"], ["Max/user", promo.maxPerUser ?? "--"], ["Effective rate", formatRate(promo.effectiveUsdPer100GdImpact)]]} />
                </li>)}</ul>}
            </SliceSection>
            <SliceSection id="offers" title="Audience and timing" detail="Limited-time offer wrappers stay attached to their package and promo source."
                slice={state.offers} emptyMessage={isLocalAdminUiTestSession ? "source_missing: offer source is not loaded in this fixture." : "No offer configs yet. Create draft offers only when the promo/package source is ready."}>
                {(offers) => <ul className="divide-y divide-border">{offers.map((offer) => <li key={offer.offerId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <h3 className="break-words text-sm font-semibold text-foreground">{offer.offerType}</h3>
                    <p className="break-words text-sm text-muted-foreground">{offer.eligibleAudience} / {formatWindow(offer.startsAtUtc, offer.endsAtUtc)}</p>
                    <Fields values={[["Status", offer.active ? "active" : "draft"], ["Packages", String(offer.packageIds.length) + " package" + (offer.packageIds.length === 1 ? "" : "s")], ["Promo", offer.promoId ? "promo " + offer.promoId : "no promo"]]} />
                </li>)}</ul>}
            </SliceSection>
            <SliceSection id="drift" title="Drift review" detail="Platform Economy remains canonical; downstream mismatches keep both expected and actual values visible."
                slice={state.drift} emptyMessage={isLocalAdminUiTestSession ? "source_missing: drift source is not loaded in this fixture." : "No current economy drift detected across package, promo, wallet, revenue, or ledger snapshots."}>
                {(drift) => <ul className="divide-y divide-border">{drift.map((row) => <li key={row.driftId} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
                    <h3 className="break-words text-sm font-semibold text-foreground">{row.surface}</h3>
                    <Fields values={[["Expected", row.expected], ["Actual", row.actual], ["Severity", row.severity], ["Validator", row.validator]]} />
                </li>)}</ul>}
            </SliceSection>
        </div>
    </div>;
}
