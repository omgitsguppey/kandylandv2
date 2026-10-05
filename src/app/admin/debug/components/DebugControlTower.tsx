"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { resolveHumanError } from "@/lib/errors/resolve-human-error";
import type { HumanErrorDescriptor } from "@/lib/errors/error-language";
import { readUiJson } from "@/lib/ui-continuity";
import type { AdminDebugControlTowerModel, AdminDebugControlTowerSection } from "@/lib/admin-debug-control-tower";
import { resolveControlTowerBusinessTruthState } from "@/lib/admin/debug/control-tower-truth";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { Button } from "@/components/ui/Button";
import { DebugControlTowerBusinessTruth } from "./DebugControlTowerBusinessTruth";
import { DebugOperatorCockpit, DebugPublicBetaDecisionDetails, DebugPublicBetaDecisionStrip, formatPublicBetaDecisionStatus, resolvePublicBetaOperatorPresentation } from "./DebugOperatorCockpit";
import { DebugGumdropRecoverySummary, DebugRuntimeEvidenceGroups } from "./DebugRuntimeEvidenceGroups";
import { formatPublicBetaCapDetailForAdmin, formatPublicBetaReadinessStatusForAdmin, resolvePublicBetaCapDetailForAdmin, summarizePublicBetaCapDisplays } from "./DebugControlTowerEvidenceCopy";
import { FILTERS, type FilterId, FindingCard, LiveIssueCard, NextActionCard, ReportCard, SECTION_COPY, filterReport, resolveReportDisplay, toBadgeState } from "./DebugControlTowerCards";
import { formatRelative } from "./DebugTime";
export function DebugControlTower({ businessSnapshot, isLocalAdminUiTestSession = false }: { businessSnapshot?: AdminUserTruthSnapshot | null; isLocalAdminUiTestSession?: boolean }) {
    const [model, setModel] = useState<AdminDebugControlTowerModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<(HumanErrorDescriptor & { status: number | null }) | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterId>("all");

    useEffect(() => {
        let cancelled = false;
        async function loadControlTower() {
            setLoading(true);
            setError(null);
            setModel(null);
            let response: Response | null = null;
            try {
                response = isLocalAdminUiTestSession
                    ? await fetch("/api/admin/debug/control-tower", { credentials: "same-origin" })
                    : await authFetch("/api/admin/debug/control-tower");
                const payload = await readUiJson<AdminDebugControlTowerModel>(response, { moduleLabel: "Admin Control Tower", url: "/api/admin/debug/control-tower" });
                if (!cancelled) {
                    setModel(payload);
                }
            } catch (issue) {
                const issueStatus = (issue as { status?: unknown } | null)?.status;
                const status = response && !response.ok ? response.status : typeof issueStatus === "number" ? issueStatus : null;
                const safeError = resolveHumanError({ error: issue, status, surface: "admin_truth", fallback: "admin_truth_unavailable" });
                if (!cancelled) setError({ ...safeError, status });
                reportClientIssue({
                    channel: "runtime",
                    severity: "warn",
                    message: "Admin debug Control Tower load failed",
                    error: issue,
                    detail: { route: "/api/admin/debug/control-tower", component: "DebugControlTower", status, errorKey: safeError.errorKey },
                    consoleLabel: "[Admin Debug] Control Tower load failed",
                });
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        void loadControlTower();
        return () => { cancelled = true; };
    }, [isLocalAdminUiTestSession]);

    const filteredSections = useMemo(() => {
        if (!model) return null;
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
    const controlTruthState = model?.truthState ?? (loading ? "unknown" : error ? "failed" : "unavailable");
    const resolvedBusinessSnapshot = model?.businessSnapshot ?? businessSnapshot ?? null;
    const canonicalBusinessTruthState = model?.businessTruthState ?? resolveControlTowerBusinessTruthState(resolvedBusinessSnapshot);
    const permissionBlocked = error?.status === 401 || error?.status === 403 || ["auth_required", "unauthorized", "forbidden", "session_expired", "wrong_account"].includes(error?.errorKey ?? "");
    const controlTowerBadgeState = permissionBlocked ? "blocked" : toBadgeState(controlTruthState);
    const canonicalBetaCapDetails = Array.isArray(model?.canonicalPublicBetaCapDetails) ? model.canonicalPublicBetaCapDetails : [];
    const canonicalBetaCapDisplays = canonicalBetaCapDetails.map(resolvePublicBetaCapDetailForAdmin);
    const canonicalBetaCapSummary = summarizePublicBetaCapDisplays(canonicalBetaCapDisplays);
    const publicBetaDecision = model?.canonicalPublicBetaOperatorDecision ?? null;
    const canonicalBetaEvidenceGates = Array.isArray(model?.canonicalPublicBetaEvidenceGates) ? model.canonicalPublicBetaEvidenceGates : [];
    const runtimeEvidenceGroups = Array.isArray(model?.runtimeEvidenceGroups) ? model.runtimeEvidenceGroups : [];
    const visibleReports = filteredSections?.reduce((count, section) => count + section.reports.length, 0) ?? 0;
    const blockerReports = (model?.reports ?? [])
        .filter((report) => report.truthState !== "live" || report.criticalCount > 0 || report.findingCount > 0)
        .slice(0, 5);
    const visibleNextActions = model?.nextActions.slice(0, 3) ?? [];
    const failedReportWithFindings = blockerReports.some((report) => report.truthState === "failed" && (report.criticalCount > 0 || report.findingCount > 0 || report.topFindings.length > 0));
    const publicBetaPresentation = resolvePublicBetaOperatorPresentation({
        decision: publicBetaDecision,
        canonicalTruthState: model?.canonicalPublicBetaTruthState,
        fallback: canonicalBetaCapSummary,
        failedReportWithFindings,
    });
    const publicBetaReadinessReason = publicBetaDecision?.releaseReadiness.detail
        ?? (model ? formatPublicBetaCapDetailForAdmin(model.canonicalPublicBetaReadinessReason) : "");
    const publicBetaReadinessStatusLabel = publicBetaDecision
        ? formatPublicBetaDecisionStatus(publicBetaDecision.releaseReadiness.status)
        : model ? formatPublicBetaReadinessStatusForAdmin({
            status: model.canonicalPublicBetaReadinessStatus,
            reason: model.canonicalPublicBetaReadinessReason,
            capDetails: canonicalBetaCapDetails,
        }) : "Readiness unavailable";
    return (
        <section
            className="min-w-0 wrap-anywhere space-y-6"
            data-admin-debug-v2="control-tower"
            data-debug-mobile-layout="compact-card-stack"
            data-debug-default-density="summary-plus-evidence-drawer"
            data-debug-report-source={model?.reportSource ?? "agent_state"}
            data-debug-report-freshness={model?.reportFreshnessState ?? "unknown"}
            data-debug-truth-state={permissionBlocked ? "permission_blocked" : controlTruthState}
            data-debug-critical-count={model?.criticalCount ?? 0}
            data-debug-next-action-count={model?.nextActions.length ?? 0}
            data-debug-canonical-public-beta-score={model?.canonicalPublicBetaScore ?? "unavailable"}
        >
            <div className="min-w-0 space-y-4">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 max-w-full flex-1 basis-48">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center text-primary">
                                <Icon className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="sr-only">Admin Control Tower</p>
                                <h2 className="wrap-anywhere text-xl font-semibold tracking-tight text-foreground">Control Tower</h2>
                            </div>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Readiness, current issues, and next actions.
                        </p>
                    </div>
                    <div className="min-w-0 max-w-full shrink-0 wrap-anywhere text-left sm:text-right">
                        <AdminTruthBadge state={controlTowerBadgeState} className="mb-1" />
                        <p className="text-sm font-semibold text-muted-foreground">{isLocalAdminUiTestSession ? "Source reports only" : publicBetaReadinessStatusLabel}</p>
                        <p className="text-sm text-muted-foreground">{isLocalAdminUiTestSession ? "Local UI fixture" : loading ? "Loading" : model ? formatRelative(Date.parse(model.generatedAt)) : "Unavailable"}</p>
                    </div>
                </div>
                {model ? (
                    <p
                        className="mt-3 border-t border-border pt-3 text-sm leading-5 text-muted-foreground"
                        data-debug-visible-summary="single-triage-strip"
                        data-debug-report-source="agent/state/public-beta-score.generated.json"
                    >
                        {publicBetaDecision ? (
                            <DebugPublicBetaDecisionStrip decision={publicBetaDecision} liveIssueCount={model.liveIssues.length} />
                        ) : (
                            <>{canonicalBetaCapSummary.summary || `${blockerReports.length} report item${blockerReports.length === 1 ? "" : "s"}`}, {model.liveIssues.length} current issues, and {visibleReports} evidence rows.</>
                        )}
                    </p>
                ) : null}
            </div>

            {error ? (
                <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert" data-debug-truth-state={permissionBlocked ? "permission_blocked" : "failed"} data-debug-error-key={error.errorKey} data-debug-error-status={error.status ?? undefined}>
                    {error.operatorMessage}
                </div>
            ) : null}
            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-xl bg-warning/10 p-4 text-sm text-warning"
                    data-admin-debug-control-tower-fixture-boundary="true"
                    data-admin-debug-control-tower-fixture-state="source_reports_only"
                >
                    source_missing fixture: generated source reports are loaded; live admin evidence, route samples, and protected actions stay blocked until verified admin access provides the source.
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground" data-debug-truth-state="unknown">
                    Loading admin status.
                </div>
            ) : null}

            {model ? <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6">
                        {visibleNextActions.length > 0 ? (
                            <section aria-label="Next actions" className="min-w-0 space-y-3" data-debug-report-source="next-actions">
                                <h3 className="text-lg font-semibold">Next actions ({model.nextActions.length})</h3>
                                <div className="mt-2 grid gap-2">
                                    {visibleNextActions.map((action) => (
                                        <NextActionCard key={action.id} action={action} />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                        {model.liveIssues.length > 0 ? (
                            <section aria-label="Current issues" className="min-w-0 space-y-3" data-debug-report-source={model.debugEvidenceSource}>
                                <h3 className="text-lg font-semibold">Current issues ({model.liveIssues.length})</h3>
                                <div className="mt-2 grid gap-2">
                                    {model.liveIssues.slice(0, 10).map((issue) => (
                                        <LiveIssueCard key={issue.id} issue={issue} />
                                    ))}
                                </div>
                            </section>
                        ) : null}
            </div> : null}

            {model ? (
                <Disclosure
                    className="min-w-0 border-t border-border pt-2 text-sm text-muted-foreground"
                    data-debug-report-source="source-detail"
                    data-debug-default-details="collapsed"
                >
                    <DisclosureSummary className="flex min-h-11 cursor-pointer items-center py-3 font-medium text-foreground">
                        Details and next steps
                    </DisclosureSummary>
                    <div className="mt-3 space-y-3">
                        <section className="min-w-0 space-y-3" data-debug-report-source="triage-summary">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <DebugPublicBetaDecisionDetails
                                    decision={publicBetaDecision}
                                    evidenceGates={canonicalBetaEvidenceGates}
                                    fallbackReason={publicBetaReadinessReason}
                                    fallbackStatus={publicBetaReadinessStatusLabel}
                                    generatedAtUtc={model.canonicalPublicBetaGeneratedAtUtc}
                                    sourceDrift={model.canonicalPublicBetaSourceDrift}
                                />
                                <AdminTruthBadge state={publicBetaPresentation.badgeState} label={publicBetaPresentation.badgeLabel} />
                            </div>
                            {canonicalBetaEvidenceGates.length === 0 && canonicalBetaCapDisplays.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {canonicalBetaCapDisplays.map((capDetail, index) => (
                                        <li
                                            key={`canonical-beta-cap-${index}`}
                                            className="min-w-0 border-t border-border text-sm"
                                            data-public-beta-evidence-state={capDetail.state}
                                        >
                                            <span className="font-semibold text-foreground">{capDetail.label}</span>
                                            <span className="text-muted-foreground"> - {capDetail.detail}</span>
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
                                                className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm"
                                                data-debug-report-source={report.filePath}
                                                data-debug-report-freshness={report.freshness}
                                                data-debug-truth-state={report.truthState}
                                            >
                                                <span className="font-semibold text-foreground">{report.label}</span>
                                                <span className="text-muted-foreground">{display.findingLabel}</span>
                                                <AdminStatusBadge state={display.badgeState} label={display.badgeLabel} title={display.sourceDetail} className="max-w-full whitespace-normal py-0.5" />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>

                        <div className="min-w-0 space-y-2 border-t border-border py-4">
                            <p className="text-xs text-muted-foreground">{model.reportAggregateSummary}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{model.reportAggregateTruthState}</p>
                        </div>

                        {topFindings.length > 0 ? (
                            <Disclosure className="rounded-md border border-border bg-background/20 px-2 py-1 text-xs text-muted-foreground" data-debug-report-source="top-findings">
                                <DisclosureSummary className="flex min-h-11 cursor-pointer items-center py-3 font-medium text-foreground">Top findings</DisclosureSummary>
                                <div className="mt-2 grid gap-2">
                                    {topFindings.map((finding) => (
                                        <FindingCard key={`top-${finding.id}`} finding={finding} compact />
                                    ))}
                                </div>
                            </Disclosure>
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

                        <Disclosure className="min-w-0 border-t border-border">
                            <DisclosureSummary className="flex min-h-11 cursor-pointer items-center py-3 font-medium text-foreground">Filters and evidence rows ({visibleReports})</DisclosureSummary>
                            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                                {FILTERS.map((filter) => {
                                    const active = activeFilter === filter.id;
                                    return (
                                        <Button
                                            key={filter.id}
                                            type="button"
                                            onClick={() => setActiveFilter(filter.id)}
                                            variant={active ? "default" : "ghost"}
                                            size="sm"
                                            className="max-w-full whitespace-normal"
                                            aria-pressed={active}
                                        >
                                            {filter.label}
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 space-y-3">
                                {filteredSections?.map(({ sectionId, reports }) => {
                                    if (reports.length === 0) return null;
                                    const section = SECTION_COPY[sectionId];
                                    const SectionIcon = section.icon;
                                    return (
                                        <section key={sectionId} className="min-w-0 space-y-3" data-debug-report-source={sectionId}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                                                    <SectionIcon className="h-5 w-5 text-foreground" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                                                    <p className="text-xs leading-5 text-muted-foreground">{section.subtitle}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
                                                {reports.map((report) => (
                                                    <ReportCard key={`${sectionId}-${report.id}`} report={report} />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        </Disclosure>
                    </div>
                </Disclosure>
            ) : null}
        </section>
    );
}
