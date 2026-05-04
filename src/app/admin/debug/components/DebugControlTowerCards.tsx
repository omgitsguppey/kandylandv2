"use client";

import { ChevronDown, DollarSign, LayoutGrid, LifeBuoy, Radar, ShieldCheck, Signal, type LucideIcon } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type {
    AdminDebugControlTowerSection,
    AdminDebugFindingCard,
    AdminDebugLiveIssueCard,
    AdminDebugReportCard,
    AdminDebugSeverity,
    AdminDebugTruthState,
    AdminDebugNextAction,
} from "@/lib/admin-debug-control-tower";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";

export type FilterId = "all" | "critical" | "ui" | "money" | "cost" | "telemetry" | "support" | "creator" | "stale";

export const FILTERS: Array<{ id: FilterId; label: string }> = [
    { id: "all", label: "All" },
    { id: "critical", label: "Critical" },
    { id: "ui", label: "UI" },
    { id: "money", label: "Money" },
    { id: "cost", label: "Cost" },
    { id: "telemetry", label: "Telemetry" },
    { id: "support", label: "Support" },
    { id: "creator", label: "Creator" },
    { id: "stale", label: "Stale" },
];

export const SECTION_COPY: Record<AdminDebugControlTowerSection, { title: string; subtitle: string; icon: LucideIcon }> = {
    beta_readiness: {
        title: "Beta Readiness",
        subtitle: "Public beta score, speed/security, hardening, device, cost, content, telemetry, stale state, and critical counts.",
        icon: ShieldCheck,
    },
    live_issues: {
        title: "Live Issues",
        subtitle: "Pre-catcher and debug evidence summaries. Raw support/user bodies stay redacted and collapsed.",
        icon: Radar,
    },
    device_ui: {
        title: "Device + UI",
        subtitle: "Device dry audit, layout score, chat shell, wallet density, image loading, and preview/content protection.",
        icon: LayoutGrid,
    },
    money_cost: {
        title: "Money + Cost",
        subtitle: "GumDrops economy truth, PayPal-adjacent health, Google cost, Cloud Run, SQL/Data Connect, BigQuery, Storage, and rate-limit risk.",
        icon: DollarSign,
    },
    telemetry_behavior: {
        title: "Telemetry + Behavior",
        subtitle: "Telemetry parity, watch-time truth, analytics ingest, event catalog drift, and behavior scoring confidence.",
        icon: Signal,
    },
    support_creator: {
        title: "Support + Creator Monetization",
        subtitle: "Support admin access, route failures, booking typed errors, Fan Pass paid-GD truth, and Creator Lane parity.",
        icon: LifeBuoy,
    },
};

export function toBadgeState(state: AdminDebugTruthState): AdminSurfaceState {
    if (state === "live") return "live";
    if (state === "stale") return "stale";
    if (state === "failed") return "failed";
    if (state === "missing" || state === "unknown") return "unavailable";
    return "unavailable";
}

export function formatRelative(value?: number | null) {
    if (!value) return "Not generated";
    const deltaMs = Math.max(0, Date.now() - value);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function filterReport(report: AdminDebugReportCard, filter: FilterId) {
    if (filter === "all") return true;
    if (filter === "critical") return report.criticalCount > 0 || report.topFindings.some((finding) => finding.severity === "critical");
    if (filter === "stale") return report.truthState === "stale" || report.truthState === "missing";
    if (filter === "ui") return report.section === "device_ui" || report.id.includes("device") || report.id.includes("image");
    if (filter === "money") return report.id.includes("gumdrop") || report.id.includes("content-protection");
    if (filter === "cost") return report.section === "money_cost" || report.id.includes("cost") || report.id.includes("sql");
    if (filter === "telemetry") return report.section === "telemetry_behavior" || report.id.includes("telemetry") || report.id.includes("watch");
    if (filter === "support") return report.id.includes("support") || report.section === "support_creator";
    if (filter === "creator") return report.id.includes("creator") || report.section === "support_creator";
    return true;
}

export function toneClassForSeverity(severity: AdminDebugSeverity | string) {
    if (severity === "critical") return "border-red-400/30 bg-red-500/10 text-red-100";
    if (severity === "major") return "border-orange-400/30 bg-orange-500/10 text-orange-100";
    if (severity === "moderate") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    return "border-white/10 bg-white/5 text-gray-200";
}

export function FindingCard({ finding, compact = false }: { finding: AdminDebugFindingCard; compact?: boolean }) {
    return (
        <article
            className={cn("rounded-xl border p-3", toneClassForSeverity(finding.severity))}
            data-debug-truth-state={finding.truthState}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={cn("font-bold text-white", compact ? "text-xs" : "text-sm")}>{finding.title}</p>
                    <p className="mt-1 text-[11px] text-gray-300">{finding.domain} | {finding.filePath}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {finding.severity}
                </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-100">{finding.humanReadableWarning}</p>
            <p className="mt-2 text-[11px] font-semibold text-white/80">{finding.suggestedValidator}</p>
            {finding.evidence.length > 0 ? (
                <details className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px]">
                    <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Evidence</summary>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                        {finding.evidence.map((entry, index) => (
                            <li key={`${finding.id}-evidence-${index}`}>{entry}</li>
                        ))}
                    </ul>
                </details>
            ) : null}
        </article>
    );
}

export function ReportCard({ report }: { report: AdminDebugReportCard }) {
    return (
        <article
            className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3"
            data-debug-report-source={report.filePath}
            data-debug-report-freshness={report.freshness}
            data-debug-truth-state={report.truthState}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{report.label}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-gray-400">{report.command}</p>
                </div>
                <AdminStatusBadge state={toBadgeState(report.truthState)} className="shrink-0 py-0 text-[8px]" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Score</p>
                    <p className="text-2xl font-black text-white">{report.score ?? "--"}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Findings</p>
                    <p className="text-sm font-bold text-gray-200">{report.findingCount}</p>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {report.status}
                </span>
                <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {report.ageHours === null ? "No timestamp" : `${report.ageHours}h old`}
                </span>
                {report.criticalCount > 0 ? (
                    <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-100">
                        {report.criticalCount} critical
                    </span>
                ) : null}
            </div>
            {report.topFindings.length > 0 ? (
                <details className="mt-3 rounded-xl border border-white/10 bg-black/25 p-2 text-xs text-gray-300">
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-semibold text-gray-100">
                        Top findings
                        <ChevronDown className="h-4 w-4" />
                    </summary>
                    <div className="mt-2 space-y-2">
                        {report.topFindings.map((finding) => (
                            <FindingCard key={finding.id} finding={finding} compact />
                        ))}
                    </div>
                </details>
            ) : null}
        </article>
    );
}

export function LiveIssueCard({ issue }: { issue: AdminDebugLiveIssueCard }) {
    return (
        <article
            className={cn(
                "rounded-xl border p-3",
                issue.severity === "critical"
                    ? "border-red-400/30 bg-red-500/10"
                    : issue.severity === "error"
                        ? "border-orange-400/30 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.04]",
            )}
            data-debug-truth-state={issue.truthState}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-white">{issue.humanMessage}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{issue.category} | {issue.route ?? issue.component ?? issue.source}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase text-white">{issue.severity}</span>
            </div>
            <p className="mt-2 text-xs text-gray-300">Fingerprint {issue.fingerprint} | {issue.occurrenceCount}x | {formatRelative(issue.lastSeenAt)}</p>
        </article>
    );
}

export function NextActionCard({ action }: { action: AdminDebugNextAction }) {
    return (
        <article className={cn("rounded-xl border p-3", toneClassForSeverity(action.severity))}>
            <p className="text-sm font-bold text-white">{action.action}</p>
            <p className="mt-1 text-xs text-gray-300">{action.domain} | {action.affectedFile}</p>
            <p className="mt-2 text-[11px] font-semibold text-white/80">{action.suggestedValidator}</p>
        </article>
    );
}
