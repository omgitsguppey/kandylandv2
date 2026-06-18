"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import type { AdminDebugControlTowerModel, AdminDebugControlTowerSection } from "@/lib/admin-debug-control-tower";
import { resolveControlTowerBusinessTruthState } from "@/lib/admin/debug/control-tower-truth";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { cn } from "@/lib/utils";
import { DebugControlTowerBusinessTruth } from "./DebugControlTowerBusinessTruth";
import { DebugOperatorCockpit } from "./DebugOperatorCockpit";
import { DebugGumdropRecoverySummary, DebugRuntimeEvidenceGroups } from "./DebugRuntimeEvidenceGroups";
import { FILTERS, type FilterId, FindingCard, LiveIssueCard, NextActionCard, ReportCard, SECTION_COPY, filterReport, formatPublicBetaCapDetailForAdmin, formatPublicBetaReadinessStatusForAdmin, formatRelative, resolveReportDisplay } from "./DebugControlTowerCards";

export function DebugControlTower({ businessSnapshot, isLocalAdminUiTestSession = false }: { businessSnapshot?: AdminUserTruthSnapshot | null; isLocalAdminUiTestSession?: boolean }) {
    const [model, setModel] = useState<AdminDebugControlTowerModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterId>("all");

    useEffect(() => {
        let cancelled = false;

        if (isLocalAdminUiTestSession) {
            setModel(null);
            setLoading(false);
            setError(null);
            return;
        }

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
                    const safeError = sanitizeErrorForUser(issue, "admin_truth", "admin_truth_unavailable");
                    setError(safeError.errorKey === "unknown_error" ? "Admin Control Tower could not be loaded." : safeError.operatorMessage);
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
    }, [isLocalAdminUiTestSession]);

    const filteredSections = useMemo(() => {
        if (!model) {
            return null;
        }
        return Object.entries(model.sections).map(([sectionId, reports]) => ({
            sectionId: sectionId as AdminDebugControlTowerSection,
            reports: reports.filter((report) => (
                activeFilter === "all"
                    ? report.truthState !== "live" || report.findingCount > 0 || report.topFindings.length > 0
                    : filterReport(report, activeFilter)
            )),
        }));
    }, [activeFilter, model]);

    const topFindings = useMemo(() => (model?.reports.flatMap((report) => report.topFindings) ?? [])
        .filter((finding) => activeFilter !== "critical" || finding.severity === "critical")
        .slice(0, 5), [activeFilter, model?.reports]);

    const Icon = model?.criticalCount ? AlertTriangle : loading ? Clock3 : CheckCircle2;
    const controlTruthState = isLocalAdminUiTestSession
        ? "missing"
        : model?.truthState ?? (loading ? "unknown" : error ? "failed" : "unavailable");
    const resolvedBusinessSnapshot = model?.businessSnapshot ?? businessSnapshot ?? null;
    const canonicalBusinessTruthState = model?.businessTruthState ?? resolveControlTowerBusinessTruthState(resolvedBusinessSnapshot);
    const controlTowerBadgeState = controlTruthState === "missing" || controlTruthState === "unknown"
        ? "unavailable"
        : controlTruthState;
    const canonicalBetaCapDetails = Array.isArray(model?.canonicalPublicBetaCapDetails) ? model.canonicalPublicBetaCapDetails : [];
    const runtimeEvidenceGroups = Array.isArray(model?.runtimeEvidenceGroups) ? model.runtimeEvidenceGroups : [];
    const visibleReports = filteredSections?.reduce((count, section) => count + section.reports.length, 0) ?? 0;
    const blockerReports = (model?.reports ?? [])
        .filter((report) => report.truthState !== "live" || report.criticalCount > 0 || report.findingCount > 0)
        .slice(0, 5);
    const visibleNextActions = model?.nextActions.slice(0, 3) ?? [];
    const publicBetaNeedsFormalProof = canonicalBetaCapDetails.some((detail) => !/targeted behavior tests|source checks/i.test(detail) && /proof|provider|runtime|admin truth|manual screenshot|truth sample/i.test(detail));
    const publicBetaNeedsRefresh = !publicBetaNeedsFormalProof && canonicalBetaCapDetails.some((detail) => /report freshness|freshness window|current-head|current head|generated reports? are older/i.test(detail));
    const publicBetaNeedsReview = !publicBetaNeedsFormalProof && !publicBetaNeedsRefresh && canonicalBetaCapDetails.length > 0;
    const failedReportWithFindings = blockerReports.some((report) => report.truthState === "failed" && (report.criticalCount > 0 || report.findingCount > 0 || report.topFindings.length > 0));
    const publicBetaBadgeState = model?.canonicalPublicBetaTruthState === "stale" || publicBetaNeedsRefresh ? "stale" : (publicBetaNeedsFormalProof || publicBetaNeedsReview) ? "review" : failedReportWithFindings ? "failed" : "live";
    const publicBetaBadgeLabel = publicBetaNeedsFormalProof ? "Proof required" : publicBetaNeedsRefresh ? "Refresh due" : publicBetaNeedsReview ? "Review" : undefined;
    const publicBetaReadinessReason = model ? formatPublicBetaCapDetailForAdmin(model.canonicalPublicBetaReadinessReason) : "";
    const publicBetaReadinessStatusLabel = model ? formatPublicBetaReadinessStatusForAdmin({
        status: model.canonicalPublicBetaReadinessStatus,
        reason: model.canonicalPublicBetaReadinessReason,
        capDetails: canonicalBetaCapDetails,
    }) : "Readiness unavailable";

    return (
        <section
            className="space-y-3"
            data-admin-debug-v2="control-tower"
            data-debug-mobile-layout="compact-card-stack"
            data-debug-default-density="summary-plus-evidence-drawer"
            data-debug-report-source={model?.reportSource ?? "agent_state"}
            data-debug-report-freshness={model?.reportFreshnessState ?? "unknown"}
            data-debug-truth-state={controlTruthState}
            data-debug-critical-count={model?.criticalCount ?? 0}
            data-debug-next-action-count={model?.nextActions.length ?? 0}
            data-debug-canonical-public-beta-score={model?.canonicalPublicBetaScore ?? "unavailable"}
        >
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 shadow-lg shadow-black/15 backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/15">
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">Admin Control Tower</p>
                                <h2 className="text-lg font-black text-white">Control Tower</h2>
                            </div>
                        </div>
                        <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-300">
                            Readiness, current issues, and next actions.
                        </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                        <AdminTruthBadge state={controlTowerBadgeState} className="mb-1" />
                        <p className="text-[11px] font-semibold text-gray-300">{isLocalAdminUiTestSession ? "Waiting for verified source" : publicBetaReadinessStatusLabel}</p>
                        <p className="text-[11px] text-gray-400">{isLocalAdminUiTestSession ? "Local UI fixture" : loading ? "Loading" : model ? formatRelative(Date.parse(model.generatedAt)) : "Unavailable"}</p>
                    </div>
                </div>
                {model ? (
                    <p
                        className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-gray-300"
                        data-debug-visible-summary="single-triage-strip"
                        data-debug-report-source="agent/state/public-beta-score.generated.json"
                    >
                        {canonicalBetaCapDetails.length || blockerReports.length} proof or refresh item{(canonicalBetaCapDetails.length || blockerReports.length) === 1 ? "" : "s"}, {model.liveIssues.length} current issues, and {visibleReports} evidence rows. {publicBetaReadinessReason}
                    </p>
                ) : null}
            </div>

            {error ? (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100" data-debug-truth-state="failed">
                    {error}
                </div>
            ) : null}
            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100"
                    data-admin-debug-control-tower-fixture-boundary="true"
                    data-admin-debug-control-tower-fixture-state="source_missing"
                >
                    Control Tower reports are waiting for verified debug evidence from a real admin session.
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300" data-debug-truth-state="unknown">
                    Loading admin status.
                </div>
            ) : null}

            {model ? (
                <details
                    className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-300"
                    data-debug-report-source="source-detail"
                    data-debug-default-details="collapsed"
                >
                    <summary className="min-h-9 cursor-pointer font-semibold text-gray-100">
                        Details and next steps
                    </summary>
                    <div className="mt-3 space-y-3">
                        <section className="rounded-md border border-white/10 bg-black/25 p-3" data-debug-report-source="triage-summary">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-bold text-white">Items to clear</h3>
                                    <p className="text-xs text-gray-400">{publicBetaReadinessReason}</p>
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        {model.canonicalPublicBetaStatus} | {model.canonicalPublicBetaGeneratedAtUtc ?? "No generatedAtUtc"} | source {model.canonicalPublicBetaSourceDrift}
                                    </p>
                                </div>
                                <AdminTruthBadge state={publicBetaBadgeState} label={publicBetaBadgeLabel} />
                            </div>
                            {canonicalBetaCapDetails.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-gray-300">
                                    {canonicalBetaCapDetails.map((capDetail, index) => (
                                        <li key={`canonical-beta-cap-${index}`} className="rounded-md border border-white/10 bg-black/20 px-2 py-1">
                                            {formatPublicBetaCapDetailForAdmin(capDetail)}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {blockerReports.length > 0 ? (
                                <div className="mt-2 grid gap-1">
                                    {blockerReports.map((report) => {
                                        const display = resolveReportDisplay(report);

                                        return (
                                            <div
                                                key={`blocker-${report.id}`}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1.5 text-xs"
                                                data-debug-report-source={report.filePath}
                                                data-debug-report-freshness={report.freshness}
                                                data-debug-truth-state={report.truthState}
                                            >
                                                <span className="font-semibold text-white">{report.label}</span>
                                                <span className="text-gray-400">{display.findingLabel}</span>
                                                <AdminStatusBadge state={display.badgeState} label={display.badgeLabel} title={display.sourceDetail} className="py-0 text-[8px]" />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                            <p className="text-xs text-gray-300">{model.reportAggregateSummary}</p>
                            <p className="mt-1 text-xs text-gray-500">{model.reportAggregateTruthState}</p>
                        </div>

                        {topFindings.length > 0 ? (
                            <details className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-gray-300" data-debug-report-source="top-findings">
                                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Top findings</summary>
                                <div className="mt-2 grid gap-2">
                                    {topFindings.map((finding) => (
                                        <FindingCard key={`top-${finding.id}`} finding={finding} compact />
                                    ))}
                                </div>
                            </details>
                        ) : null}

                        {model.liveIssues.length > 0 ? (
                            <details className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-gray-300" data-debug-report-source={model.debugEvidenceSource}>
                                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Current issues ({model.liveIssues.length})</summary>
                                <div className="mt-2 grid gap-2">
                                    {model.liveIssues.slice(0, 10).map((issue) => (
                                        <LiveIssueCard key={issue.id} issue={issue} />
                                    ))}
                                </div>
                            </details>
                        ) : null}

                        {visibleNextActions.length > 0 ? (
                            <details className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-gray-300" data-debug-report-source="next-actions">
                                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Next actions ({model.nextActions.length})</summary>
                                <div className="mt-2 grid gap-2">
                                    {visibleNextActions.map((action) => (
                                        <NextActionCard key={action.id} action={action} />
                                    ))}
                                </div>
                            </details>
                        ) : null}

                        <DebugOperatorCockpit cockpit={model.operatorCockpit} />

                        <DebugGumdropRecoverySummary gumdropRecovery={model.gumdropRecovery} />

                        {resolvedBusinessSnapshot ? (
                            <DebugControlTowerBusinessTruth
                                businessSnapshot={resolvedBusinessSnapshot}
                                truthState={canonicalBusinessTruthState}
                            />
                        ) : null}

                        {runtimeEvidenceGroups.length > 0 ? (
                            <DebugRuntimeEvidenceGroups
                                groups={runtimeEvidenceGroups}
                                debugEvidenceSource={model.debugEvidenceSource}
                            />
                        ) : null}

                        <details className="rounded-md border border-white/10 bg-black/20 p-2">
                            <summary className="min-h-9 cursor-pointer font-semibold text-gray-100">Filters and evidence rows ({visibleReports})</summary>
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
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

                            <div className="mt-3 space-y-3">
                                {filteredSections?.map(({ sectionId, reports }) => {
                                    if (reports.length === 0) return null;
                                    const section = SECTION_COPY[sectionId];
                                    const SectionIcon = section.icon;
                                    return (
                                        <section key={sectionId} className="rounded-md border border-white/10 bg-black/25 p-3" data-debug-report-source={sectionId}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
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
                            </div>
                        </details>
                    </div>
                </details>
            ) : null}
        </section>
    );
}
