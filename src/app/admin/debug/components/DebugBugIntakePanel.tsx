"use client";

import { Pill, Section } from "./DebugPrimitives";

type BugSeverity = "low" | "medium" | "high" | "critical";

function toneForBugSeverity(severity?: string) {
    if (severity === "high" || severity === "critical") return "bad" as const;
    if (severity === "medium") return "warn" as const;
    return "neutral" as const;
}

function toneForBugStatus(status?: string, severity?: string) {
    if ((status === "new" || status === "in_progress") && (severity === "high" || severity === "critical")) return "bad" as const;
    if ((status === "new" || status === "in_progress") && severity === "medium") return "warn" as const;
    if (status === "resolved" || status === "dismissed") return "good" as const;
    return "neutral" as const;
}

function fallbackRelative(timestamp?: number) {
    if (!timestamp) return "unknown age";
    const days = Math.floor(Math.max(0, Date.now() - timestamp) / 86_400_000);
    if (days > 0) return `${days}d ago`;
    return "less than 1d ago";
}

function reportTitle(report: any) {
    return report.title || report.summary || "Untitled bug report";
}

function visibleReports(reports: any[], ageBucket: "last_7d" | "older_backlog") {
    return reports.filter((report) => report.ageBucket === ageBucket || (!report.ageBucket && ageBucket === "older_backlog"));
}

function renderBugReport(report: any) {
    const createdAtUtc = report.createdAtUtc || (report.timestamp ? new Date(report.timestamp).toISOString() : "unknown");
    const ageBucket = report.ageBucket || "older_backlog";
    const evidenceState = report.inventoryState || "partial";
    return (
        <div
            key={report.reportId || report.id}
            className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
            data-bug-report-status={report.status}
            data-bug-report-severity={report.severity}
            data-bug-report-age-bucket={ageBucket}
            data-bug-report-evidence-state={evidenceState}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{reportTitle(report)}</p>
                    <p className="mt-1 text-xs text-gray-400">{report.path || report.currentPath || "Unknown path"} | {report.sourceComponent || report.componentName || "Unknown component"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Pill label="Status" value={report.status || "new"} tone={toneForBugStatus(report.status, report.severity)} badgeLabel={(report.status || "new").toUpperCase()} />
                    <Pill label="Severity" value={report.severity || "medium"} tone={toneForBugSeverity(report.severity)} badgeLabel={(report.severity || "medium").toUpperCase()} />
                </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-gray-300">{report.userMessage || report.message || "No message captured."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
                <Pill label="Breadcrumbs" value={report.breadcrumbsCount ?? 0} truthState="live" badgeLabel="LOADED" />
                <Pill label="Diagnostics" value={report.diagnosticsCount ?? 0} truthState="live" badgeLabel="LOADED" />
                <Pill label="Rollouts" value={report.rolloutCount ?? 0} truthState="live" badgeLabel="INFO" />
                <Pill label="When" value={report.ageLabel || fallbackRelative(report.timestamp)} truthState="live" badgeLabel={ageBucket === "last_7d" ? "RECENT" : "BACKLOG"} />
                <Pill label="Created UTC" value={createdAtUtc} truthState={createdAtUtc === "unknown" ? "degraded" : "live"} badgeLabel={createdAtUtc === "unknown" ? "PARTIAL" : "LOADED"} />
            </div>
        </div>
    );
}

function reportGroup(title: string, reports: any[]) {
    if (reports.length === 0) return null;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</p>
                <Pill label="Reports" value={reports.length} truthState="live" badgeLabel="LOADED" />
            </div>
            <div className="space-y-3">{reports.map(renderBugReport)}</div>
        </div>
    );
}

export function DebugBugIntakePanel({ data }: { data: any }) {
    const reports = data?.bugReports || [];
    const summary = data?.bugIntakeTriage || {};
    const loadedCount = summary.loadedCount ?? reports.length;
    const last7dReports = visibleReports(reports, "last_7d");
    const olderReports = visibleReports(reports, "older_backlog");
    const last7dCount = summary.last7dCount ?? data?.stats?.bugReportsLast7d ?? last7dReports.length;
    const backlogCount = summary.backlogCount ?? Math.max(0, loadedCount - last7dCount);
    const needsTriageCount = summary.needsTriageCount ?? reports.filter((report: any) => ["new", "in_progress"].includes(report.status) && ["medium", "high", "critical"].includes(report.severity)).length;
    const repeatedPathGroups = (summary.groupedByPath || []).filter((group: any) => group.count > 1);

    return (
        <Section
            title="Bug reports to triage"
            subtitle="Recent bug intake with severity, path, and diagnostic context."
            defaultOpen={loadedCount > 0}
            summary={<><Pill label="Loaded" value={loadedCount} truthState="live" badgeLabel="LOADED" /><Pill label="Last 7d" value={last7dCount} tone={last7dCount > 0 ? "warn" : "good"} badgeLabel={last7dCount > 0 ? "REVIEW" : "LIVE"} /><Pill label="Older backlog" value={backlogCount} truthState="live" badgeLabel="BACKLOG" /><Pill label="Needs triage" value={needsTriageCount} tone={needsTriageCount > 0 ? "warn" : "good"} badgeLabel={needsTriageCount > 0 ? "REVIEW" : "LIVE"} /></>}
        >
            <div
                className="space-y-4"
                data-bug-intake-loaded-count={loadedCount}
                data-bug-intake-last7d-count={last7dCount}
                data-bug-intake-backlog-count={backlogCount}
                data-bug-intake-needs-triage-count={needsTriageCount}
            >
                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3 text-xs text-gray-300">
                    Loaded sample and last-seven-day intake are separate. Older reports remain visible as backlog instead of being counted as current intake.
                </div>
                {repeatedPathGroups.length > 0 ? (
                    <details className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-300">
                        <summary className="cursor-pointer font-semibold text-white">Path clusters</summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {repeatedPathGroups.slice(0, 6).map((group: any) => (
                                <Pill key={group.path} label={group.path} value={group.count} tone={toneForBugSeverity(group.highestSeverity as BugSeverity)} badgeLabel="GROUP" />
                            ))}
                        </div>
                    </details>
                ) : null}
                {loadedCount ? (
                    <>
                        {reportGroup("Last 7 days", last7dReports)}
                        {reportGroup("Older backlog", olderReports)}
                    </>
                ) : (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">No bug reports are loaded in the current sample.</div>
                )}
            </div>
        </Section>
    );
}
