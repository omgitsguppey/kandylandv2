"use client";

import { ChevronDown, DollarSign, LayoutGrid, LifeBuoy, Radar, ShieldCheck, Signal, type LucideIcon } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminDebugControlTowerSection, AdminDebugFindingCard, AdminDebugLiveIssueCard, AdminDebugReportCard, AdminDebugSeverity, AdminDebugTruthState, AdminDebugNextAction } from "@/lib/admin-debug-control-tower";
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
    beta_readiness: { title: "Beta Readiness", subtitle: "Public beta score, speed/security, hardening, device, cost, content, telemetry, stale state, and critical counts.", icon: ShieldCheck },
    live_issues: { title: "Current Issues", subtitle: "Pre-catcher and debug evidence summaries. Raw support/user bodies stay redacted and collapsed.", icon: Radar },
    device_ui: { title: "Device + UI", subtitle: "Device dry audit, layout score, chat shell, wallet density, image loading, and preview/content protection.", icon: LayoutGrid },
    money_cost: { title: "Money + Cost", subtitle: "GumDrops economy truth, PayPal-adjacent health, Google cost, Cloud Run, SQL/Data Connect, BigQuery, Storage, and rate-limit risk.", icon: DollarSign },
    telemetry_behavior: { title: "Telemetry + Behavior", subtitle: "Telemetry parity, watch-time truth, analytics ingest, event catalog drift, and behavior scoring confidence.", icon: Signal },
    support_creator: { title: "Support + Creator Monetization", subtitle: "Support admin access, route failures, booking typed errors, Fan Pass paid-GD truth, and Creator Lane parity.", icon: LifeBuoy },
};

export function toBadgeState(state: AdminDebugTruthState): AdminSurfaceState {
    if (state === "live") return "live";
    if (state === "stale") return "stale";
    if (state === "failed") return "failed";
    if (state === "missing" || state === "unknown") return "unavailable";
    return "unavailable";
}

function isRefreshOnlyFinding(finding: AdminDebugFindingCard) {
    return /source commit|current repo head|older than 72 hours|freshness|generated report|report metadata/u.test(`${finding.title} ${finding.humanReadableWarning} ${finding.evidence.join(" ")}`.toLowerCase());
}

export function formatPublicBetaCapDetailForAdmin(detail?: string) {
    const normalized = String(detail ?? "").trim();
    const count = normalized.match(/\b\d+\b/u)?.[0];
    if (!normalized) return "Readiness unavailable.";
    if (/targeted behavior tests/iu.test(normalized)) return "Source checks only: targeted behavior validators passed, but manual, provider, runtime, and admin truth proof remain separate.";
    if (/runtime\/provider smoke|provider smoke|runtime smoke/iu.test(normalized)) return /operator-confirmed|operator confirmed|paypal/iu.test(normalized)
        ? "External proof required: operator-confirmed payment is product context only; attach formal provider smoke and keep deployed runtime smoke current."
        : "External proof required: attach formal provider smoke and keep deployed runtime smoke current.";
    if (/admin truth|sample evidence|truth sample/iu.test(normalized)) return "Admin sample required: attach a fresh redacted production admin truth sample.";
    if (/report freshness|pr integrity|freshness window|current-head|current head/iu.test(normalized)) return count ? `Refresh due: ${count} required generated reports are older than the freshness window.` : "Refresh due: required generated reports are older than the freshness window.";
    return normalized.replace(/^Unknown evidence:\s*/iu, "Needs classification: ").replace(/^Stale evidence:\s*/iu, "Refresh or proof needed: ").replace(/^Runtime unverified:\s*/iu, "Runtime proof needed: ");
}

export function formatPublicBetaReadinessStatusForAdmin(input: { status?: string | null; reason?: string | null; capDetails?: string[] }) {
    const status = String(input.status ?? "").trim();
    const combined = [status, input.reason, ...(input.capDetails ?? [])].filter(Boolean).join(" ");
    if (!status) return "Readiness unavailable";
    if (/ready/iu.test(status)) return "Ready";
    if (/runtime\/provider smoke|provider smoke|runtime smoke|admin truth|sample evidence|truth sample|manual screenshot|external proof|proof required/iu.test(combined)) return "External proof required";
    if (/report freshness|pr integrity|freshness window|current-head|current head|generated reports? are older/iu.test(combined)) return "Report refresh needed";
    if (/targeted behavior tests|source checks/iu.test(combined)) return "Source checks only";
    if (/unknown evidence/iu.test(combined)) return "Evidence needs classification";
    if (/stale evidence/iu.test(combined)) return "Refresh or proof needed";
    return status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}

export function resolveReportDisplay(report: AdminDebugReportCard): { badgeState: AdminSurfaceState; badgeLabel?: string; statusLabel: string; findingLabel: string; sourceDetail: string } {
    const sourceFindingCount = report.findingCount > 0 ? report.findingCount : report.topFindings.filter((finding) => !isRefreshOnlyFinding(finding)).length;
    const hasFindings = sourceFindingCount > 0 || report.criticalCount > 0;
    const findingLabel = hasFindings ? `${sourceFindingCount} source finding${sourceFindingCount === 1 ? "" : "s"}` : "No active findings";
    const sourceNeedsRefresh = report.freshness === "stale_24h" || report.freshness === "stale_72h" || report.sourceDrift === "stale";
    const proofBoundaryOnly = !hasFindings
        && report.id === "public-beta-score"
        && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(report.status.toLowerCase());
    const normalizedStatus = report.status.toLowerCase();
    const reportStatusLabel = (() => {
        if (["clean", "pass", "passed", "ready", "ok"].includes(normalizedStatus)) return "Source current";
        if (["delayed", "queued", "waiting"].includes(normalizedStatus)) return hasFindings ? "Review delayed" : "Waiting for evidence";
        if (["fail", "failed", "error"].includes(normalizedStatus)) return hasFindings ? "Needs review" : "Source failed";
        if (["beta-risk", "warning", "review"].includes(normalizedStatus)) return "Needs review";
        return report.status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
    })();
    const sourceDetail = `Source score ${report.score ?? "unavailable"}; freshness ${report.freshness}; truth ${report.truthState}.`;
    if (report.freshness === "missing" || report.truthState === "missing") {
        return { badgeState: "unavailable", statusLabel: "Source missing", findingLabel: hasFindings ? findingLabel : "No source", sourceDetail: "Required generated state is missing and cannot clear this lane." };
    }
    if (report.freshness === "failed") {
        return { badgeState: "failed", statusLabel: "Source failed", findingLabel: hasFindings ? findingLabel : "Source failed", sourceDetail: "Generated state could not be parsed and cannot clear this lane." };
    }
    if (proofBoundaryOnly) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "External proof required", findingLabel: "Proof gate", sourceDetail: "Source validators are not enough for provider, runtime, or admin truth proof." };
    }
    if (sourceNeedsRefresh) {
        return { badgeState: "stale", badgeLabel: "Refresh due", statusLabel: "Refresh due", findingLabel, sourceDetail: "Generated state is older than its freshness window or current-head metadata." };
    }
    if (!hasFindings && report.truthState === "live") {
        return { badgeState: "live", statusLabel: "Source current", findingLabel, sourceDetail };
    }
    if (!hasFindings && ["delayed", "queued", "waiting"].includes(normalizedStatus)) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Waiting for evidence", findingLabel, sourceDetail: `Generated state is waiting on its source lane. Refresh command: ${report.command}` };
    }
    if (!hasFindings && ["fail", "failed", "error"].includes(normalizedStatus)) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Needs review", findingLabel, sourceDetail: `Generated state reported ${report.status}, but no active source finding was attached. Check ${report.command}.` };
    }
    return { badgeState: toBadgeState(report.truthState), statusLabel: reportStatusLabel, findingLabel, sourceDetail };
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

function formatLiveIssueCategory(category: string) {
    if (category === "browser_security_boundary") {
        return "browser security boundary";
    }
    return category.replaceAll("_", " ");
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
    const display = resolveReportDisplay(report);
    const updatedLabel = report.updatedAtMs ? `Last updated ${formatRelative(report.updatedAtMs)}` : report.ageHours === null ? "Not generated" : `Last updated ${report.ageHours}h ago`;

    return (
        <article
            className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
            data-debug-report-source={report.filePath}
            data-debug-report-freshness={report.freshness}
            data-debug-truth-state={report.truthState}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{report.label}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-gray-400">{updatedLabel}</p>
                </div>
                <AdminStatusBadge state={display.badgeState} label={display.badgeLabel} title={display.sourceDetail} className="shrink-0 py-0 text-[8px]" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {display.statusLabel}
                </span>
                <span className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {report.ageHours === null ? "No timestamp" : `${report.ageHours}h old`}
                </span>
                <span className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {display.findingLabel}
                </span>
                {report.criticalCount > 0 ? (
                    <span className="rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-100">
                        {report.criticalCount} critical
                    </span>
                ) : null}
            </div>
            <details className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-gray-300">
                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Source detail</summary>
                <p className="mt-1">{display.sourceDetail} Refresh command: {report.command}</p>
            </details>
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
    const metaParts = [
        formatLiveIssueCategory(issue.category),
        issue.route ?? issue.component ?? issue.source,
        issue.sourceSurface ? `${issue.sourceSurface} surface` : null,
    ].filter(Boolean);
    const note = issue.browserSecurityBlocked
        ? issue.nonActionableThirdParty
            ? "Expected third-party iframe boundary. This is not a backend failure."
            : issue.actionable
                ? "App code attempted a browser-blocked frame access path."
                : "Browser blocked cross-origin frame access."
        : null;

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
                    <p className="mt-1 text-[11px] text-gray-400">{metaParts.join(" | ")}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase text-white">{issue.severity}</span>
            </div>
            {note ? (
                <p className="mt-2 text-xs text-gray-200">{note}</p>
            ) : null}
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
