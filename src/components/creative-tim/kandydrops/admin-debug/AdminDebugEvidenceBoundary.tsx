"use client";

import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { ADMIN_NO_SOURCE_LABEL, resolveAdminInputTruthState, type AdminTruthState } from "@/lib/admin-truth-state";

type AdminDebugEvidenceItem = {
    label: string;
    value: string | number;
    meta: string;
    truthState: AdminTruthState | AdminSurfaceState | "loading";
};

type AdminDebugEvidenceDetail = AdminDebugEvidenceItem & {
    copy: {
        operatorSummary: string;
        recommendedNextCheck: string;
        sourceDetails: string;
    };
};

type AdminDebugEvidenceBoundaryProps = {
    items: readonly AdminDebugEvidenceItem[];
    detailItems: readonly AdminDebugEvidenceDetail[];
};

export function AdminDebugEvidenceBoundary({ items, detailItems }: AdminDebugEvidenceBoundaryProps) {
    return (
        <section
            className="min-w-0 space-y-4"
            data-admin-debug-summary="compact"
            data-admin-debug-presentation="control_tower"
            data-mobile-organization="summary-first"
            data-admin-debug-detail-density="single_evidence_drawer"
            data-admin-debug-detail-card-count={detailItems.length}
        >
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="sr-only">Evidence boundary</p>
                    <h2 className="text-lg font-semibold text-foreground">Current source signals</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Status is separated from source detail so missing, stale, and failed evidence remains visible.</p>
                </div>
                <p className="text-sm text-muted-foreground">{detailItems.length} evidence lanes</p>
            </header>

            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
                {items.map((item) => {
                    const resolvedTruth = resolveAdminInputTruthState({
                        truthState: item.truthState,
                        value: item.value,
                        pendingInitialLoad: item.truthState === "loading",
                    });

                    return (
                        <AdminMetricCard key={item.label} label={item.label}
                            value={resolvedTruth.hasUsableValue ? item.value : ADMIN_NO_SOURCE_LABEL}
                            meta={item.meta} truthState={resolvedTruth.truthState}
                            pendingInitialLoad={resolvedTruth.pendingInitialLoad} hasUsableValue={resolvedTruth.hasUsableValue} />
                    );
                })}
            </div>

            <details className="group min-w-0 border-t border-border">
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3 text-sm font-medium text-foreground">
                    <span>Open evidence drilldown</span>
                    <span className="text-sm text-muted-foreground group-open:hidden">Collapsed</span>
                    <span className="hidden text-sm text-muted-foreground group-open:inline">Open</span>
                </summary>
                <div className="mt-3 min-w-0 divide-y divide-border">
                    {detailItems.map((item) => {
                        const resolvedTruth = resolveAdminInputTruthState({
                            truthState: item.truthState,
                            value: item.value,
                            pendingInitialLoad: item.truthState === "loading",
                        });

                        return (
                            <article key={item.label} className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4 py-4">
                                <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <AdminTruthBadge
                                            state={resolvedTruth.truthState}
                                            pendingInitialLoad={resolvedTruth.pendingInitialLoad}
                                            hasUsableValue={resolvedTruth.hasUsableValue}
                                        />
                                        <p className="wrap-anywhere font-medium text-foreground">{item.label}</p>
                                    </div>
                                    <p className="mt-2 wrap-anywhere text-lg font-semibold tabular-nums text-foreground">{resolvedTruth.hasUsableValue ? item.value : ADMIN_NO_SOURCE_LABEL}</p>
                                    <p className="mt-1 wrap-anywhere text-sm text-muted-foreground">{item.meta}</p>
                                </div>
                                <p className="min-w-0 wrap-anywhere text-sm leading-6 text-muted-foreground">{item.copy.operatorSummary}</p>
                                <div className="min-w-0 space-y-2 wrap-anywhere text-sm leading-6 text-muted-foreground">
                                    <p><span className="font-medium text-foreground">Next:</span> {item.copy.recommendedNextCheck}</p>
                                    <p><span className="font-medium text-foreground">Source:</span> {item.copy.sourceDetails}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </details>
        </section>
    );
}
