"use client";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { resolveAdminInputTruthState, type AdminTruthState } from "@/lib/admin-truth-state";

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
            className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(13,8,26,0.86))] shadow-[0_20px_58px_rgba(0,0,0,0.2)]"
            data-admin-debug-summary="compact"
            data-admin-debug-presentation="control_tower"
            data-mobile-organization="summary-first"
            data-admin-debug-detail-density="single_evidence_drawer"
            data-admin-debug-detail-card-count={detailItems.length}
        >
            <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-kandy-lilac">Evidence boundary</p>
                    <h2 className="mt-1 text-lg font-black text-white">Current source signals</h2>
                    <p className="mt-1 text-sm leading-5 text-white/60">Status is separated from source detail so missing, stale, and failed evidence remains visible.</p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{detailItems.length} evidence lanes</p>
            </header>

            <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                {items.map((item) => {
                    const resolvedTruth = resolveAdminInputTruthState({
                        truthState: item.truthState,
                        value: item.value,
                        pendingInitialLoad: item.truthState === "loading",
                    });

                    return (
                        <div key={item.label} className="min-w-0 px-4 py-4 sm:px-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-white/48">{item.label}</p>
                                <AdminTruthBadge
                                    state={resolvedTruth.truthState}
                                    pendingInitialLoad={resolvedTruth.pendingInitialLoad}
                                    hasUsableValue={resolvedTruth.hasUsableValue}
                                />
                            </div>
                            <p className="mt-3 truncate text-xl font-black text-white">{item.value}</p>
                            <p className="mt-1 truncate text-sm text-white/58">{item.meta}</p>
                        </div>
                    );
                })}
            </div>

            <details className="group border-t border-white/10 px-4 py-3 sm:px-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                    <span>Open evidence drilldown</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.13em] text-kandy-lilac group-open:hidden">Collapsed</span>
                    <span className="hidden text-xs font-semibold uppercase tracking-[0.13em] text-kandy-lilac group-open:inline">Open</span>
                </summary>
                <div className="mt-3 divide-y divide-white/10 border-t border-white/10">
                    {detailItems.map((item) => {
                        const resolvedTruth = resolveAdminInputTruthState({
                            truthState: item.truthState,
                            value: item.value,
                            pendingInitialLoad: item.truthState === "loading",
                        });

                        return (
                            <article key={item.label} className="grid gap-3 py-4 lg:grid-cols-[minmax(11rem,0.75fr)_minmax(0,1.35fr)_minmax(13rem,0.9fr)]">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <AdminTruthBadge
                                            state={resolvedTruth.truthState}
                                            pendingInitialLoad={resolvedTruth.pendingInitialLoad}
                                            hasUsableValue={resolvedTruth.hasUsableValue}
                                        />
                                        <p className="truncate font-bold text-white">{item.label}</p>
                                    </div>
                                    <p className="mt-2 truncate text-lg font-black text-white">{item.value}</p>
                                    <p className="mt-1 text-sm text-white/55">{item.meta}</p>
                                </div>
                                <p className="text-sm leading-6 text-white/72">{item.copy.operatorSummary}</p>
                                <div className="space-y-2 text-sm leading-5 text-white/58">
                                    <p><span className="font-semibold text-white/78">Next:</span> {item.copy.recommendedNextCheck}</p>
                                    <p><span className="font-semibold text-white/78">Source:</span> {item.copy.sourceDetails}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </details>
        </section>
    );
}
