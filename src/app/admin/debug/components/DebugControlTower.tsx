"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { AdminDebugControlTowerModel, AdminDebugControlTowerSection } from "@/lib/admin-debug-control-tower";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { cn } from "@/lib/utils";
import {
    FILTERS,
    type FilterId,
    FindingCard,
    LiveIssueCard,
    NextActionCard,
    ReportCard,
    SECTION_COPY,
    filterReport,
    formatRelative,
    toBadgeState,
} from "./DebugControlTowerCards";

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-black text-white">{value}</p>
        </div>
    );
}

function businessTruthState(snapshot?: AdminUserTruthSnapshot | null) {
    if (!snapshot) return "unavailable" as const;
    if (
        snapshot.sourceFreshness === "failed"
        || snapshot.sourceFreshness === "unavailable"
        || snapshot.issues.some((issue) => issue.severity === "fail")
    ) {
        return "failed" as const;
    }
    if (
        snapshot.sourceFreshness === "stale"
        || snapshot.sourceFreshness === "degraded"
        || snapshot.sourceTruth === "legacy_fallback"
        || snapshot.issues.some((issue) => issue.severity === "warn")
    ) {
        return "stale" as const;
    }
    return "live" as const;
}

function formatCompactCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatCompactWatchTime(valueMs: number) {
    const totalMinutes = Math.round(valueMs / 60_000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function DebugControlTower({ businessSnapshot }: { businessSnapshot?: AdminUserTruthSnapshot | null }) {
    const [model, setModel] = useState<AdminDebugControlTowerModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterId>("all");

    useEffect(() => {
        let cancelled = false;

        async function loadControlTower() {
            setLoading(true);
            setError(null);
            try {
                const response = await authFetch("/api/admin/debug/control-tower");
                const payload = await response.json() as AdminDebugControlTowerModel & { error?: string };
                if (!response.ok) {
                    throw new Error(payload.error || "Admin Control Tower could not be loaded.");
                }
                if (!cancelled) {
                    setModel(payload);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(issue instanceof Error ? issue.message : "Admin Control Tower could not be loaded.");
                }
                reportClientIssue({
                    channel: "runtime",
                    severity: "warn",
                    message: "Admin debug Control Tower load failed",
                    error: issue,
                    detail: {
                        route: "/api/admin/debug/control-tower",
                        component: "DebugControlTower",
                    },
                    consoleLabel: "[Admin Debug] Control Tower load failed",
                });
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadControlTower();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredSections = useMemo(() => {
        if (!model) {
            return null;
        }
        return Object.entries(model.sections).map(([sectionId, reports]) => ({
            sectionId: sectionId as AdminDebugControlTowerSection,
            reports: reports.filter((report) => filterReport(report, activeFilter)),
        }));
    }, [activeFilter, model]);

    const topFindings = useMemo(() => {
        const findings = model?.reports.flatMap((report) => report.topFindings) ?? [];
        return findings
            .filter((finding) => activeFilter !== "critical" || finding.severity === "critical")
            .slice(0, 5);
    }, [activeFilter, model?.reports]);

    const Icon = model?.criticalCount ? AlertTriangle : loading ? Clock3 : CheckCircle2;
    const controlTruthState = model?.truthState ?? (loading ? "unknown" : error ? "failed" : "unavailable");
    const canonicalBusinessTruthState = businessTruthState(businessSnapshot);

    return (
        <section
            className="space-y-3"
            data-admin-debug-v2="control-tower"
            data-debug-mobile-layout="compact-card-stack"
            data-debug-report-source={model?.reportSource ?? "agent_state"}
            data-debug-report-freshness={model?.staleReportCount ? "stale" : "fresh"}
            data-debug-truth-state={controlTruthState}
            data-debug-critical-count={model?.criticalCount ?? 0}
            data-debug-next-action-count={model?.nextActions.length ?? 0}
        >
            <div className="rounded-[1.35rem] border border-white/10 bg-black/35 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/15">
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">Admin Control Tower</p>
                                <h2 className="text-xl font-black text-white">Control Tower</h2>
                            </div>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                            Public beta truth, live evidence, and next actions.
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <AdminStatusBadge state={toBadgeState(controlTruthState)} className="mb-2" />
                        <p className="text-3xl font-black text-white">{model?.overallScore ?? "--"}</p>
                        <p className="text-[11px] text-gray-400">{loading ? "Loading" : model ? formatRelative(Date.parse(model.generatedAt)) : "Unavailable"}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <SummaryMetric label="Critical" value={model?.criticalCount ?? "--"} />
                    <SummaryMetric label="Stale" value={model?.staleReportCount ?? "--"} />
                    <SummaryMetric label="Missing" value={model?.missingReportCount ?? "--"} />
                    <SummaryMetric label="Live issues" value={model?.liveIssueCount ?? "--"} />
                </div>
            </div>

            {businessSnapshot ? (
                <div
                    className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3"
                    data-debug-report-source="canonical-business-truth"
                    data-debug-truth-state={canonicalBusinessTruthState}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-white">Canonical Business Truth</h3>
                            <p className="text-xs text-gray-400">
                                User, purchase, revenue, unwrap, and watch metrics come from the admin-user truth snapshot and do not inherit ops-health status.
                            </p>
                        </div>
                        <AdminStatusBadge state={toBadgeState(canonicalBusinessTruthState)} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <SummaryMetric label="Users" value={businessSnapshot.totalUsers} />
                        <SummaryMetric label="Purchases" value={businessSnapshot.verifiedPurchases} />
                        <SummaryMetric label="Revenue" value={formatCompactCurrency(businessSnapshot.totalRevenueUsd)} />
                        <SummaryMetric label="Unwraps" value={businessSnapshot.trackedUnwraps} />
                        <SummaryMetric label="Watch" value={formatCompactWatchTime(businessSnapshot.validWatchTimeMs)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-300">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            freshness {businessSnapshot.sourceFreshness}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            truth {businessSnapshot.sourceTruth}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            confidence {businessSnapshot.confidenceScore}%
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            generated {formatRelative(businessSnapshot.generatedAt)}
                        </span>
                    </div>
                    {businessSnapshot.issues.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {businessSnapshot.issues.slice(0, 4).map((issue) => (
                                <div key={issue.code} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                    <p className="font-semibold text-white">{issue.severity}</p>
                                    <p className="mt-1">{issue.message}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((filter) => {
                    const active = activeFilter === filter.id;
                    return (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => setActiveFilter(filter.id)}
                            className={cn(
                                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors",
                                active
                                    ? "border-brand-purple/50 bg-brand-purple/20 text-white"
                                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",
                            )}
                            aria-pressed={active}
                        >
                            {filter.label}
                        </button>
                    );
                })}
            </div>

            {error ? (
                <div className="rounded-[1.1rem] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100" data-debug-truth-state="failed">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300" data-debug-truth-state="unknown">
                    Loading generated audit summaries.
                </div>
            ) : null}

            {model && topFindings.length > 0 ? (
                <div className="grid gap-2" data-debug-report-source="top-findings">
                    {topFindings.map((finding) => (
                        <FindingCard key={`top-${finding.id}`} finding={finding} />
                    ))}
                </div>
            ) : null}

            {model && model.liveIssues.length > 0 ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3" data-debug-report-source={model.debugEvidenceSource}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-white">Live Issues</h3>
                            <p className="text-xs text-gray-400">Top redacted runtime evidence by severity, count, and recency.</p>
                        </div>
                        <AdminStatusBadge state={model.liveIssues.some((issue) => issue.severity === "critical") ? "failed" : "live"} />
                    </div>
                    <div className="mt-3 grid gap-2">
                        {model.liveIssues.slice(0, 10).map((issue) => (
                            <LiveIssueCard key={issue.id} issue={issue} />
                        ))}
                    </div>
                </div>
            ) : null}

            {filteredSections?.map(({ sectionId, reports }) => {
                if (reports.length === 0) return null;
                const section = SECTION_COPY[sectionId];
                const SectionIcon = section.icon;
                return (
                    <section key={sectionId} className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3" data-debug-report-source={sectionId}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                <SectionIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{section.title}</h3>
                                <p className="text-xs leading-5 text-gray-400">{section.subtitle}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {reports.map((report) => (
                                <ReportCard key={`${sectionId}-${report.id}`} report={report} />
                            ))}
                        </div>
                    </section>
                );
            })}

            {model && model.nextActions.length > 0 ? (
                <section className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3" data-debug-report-source="next-actions">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-white">Recommended Next Actions</h3>
                            <p className="text-xs text-gray-400">Deterministic actions from highest-severity findings.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">{model.nextActions.length}</span>
                    </div>
                    <div className="mt-3 grid gap-2">
                        {model.nextActions.slice(0, 10).map((action) => (
                            <NextActionCard key={action.id} action={action} />
                        ))}
                    </div>
                </section>
            ) : null}
        </section>
    );
}
