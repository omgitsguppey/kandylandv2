"use client";

import { ChevronDown, DollarSign, LayoutGrid, LifeBuoy, Radar, ShieldCheck, Signal, type LucideIcon } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { resolvePublicBetaCapDetailForAdmin } from "@/lib/agent-score/formal-gate-display";
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
    { id: "stale", label: "Refresh due" },
];

export const SECTION_COPY: Record<AdminDebugControlTowerSection, { title: string; subtitle: string; icon: LucideIcon }> = {
    beta_readiness: { title: "Beta Readiness", subtitle: "Release evidence, blockers, and refresh work that affects beta signoff.", icon: ShieldCheck },
    live_issues: { title: "Current Issues", subtitle: "Grouped runtime evidence with raw details kept behind drilldown.", icon: Radar },
    device_ui: { title: "Device + UI", subtitle: "Device layout, image loading, and protected preview checks.", icon: LayoutGrid },
    money_cost: { title: "Money + Cost", subtitle: "Treasury labels, cost guardrails, and source evidence boundaries.", icon: DollarSign },
    telemetry_behavior: { title: "Telemetry + Behavior", subtitle: "Event, identity, watch-time, and behavior source agreement.", icon: Signal },
    support_creator: { title: "Support + Creator Monetization", subtitle: "Support access, creator status, and paid-GD surface checks.", icon: LifeBuoy },
};

export function toBadgeState(state: AdminDebugTruthState): AdminSurfaceState {
    if (state === "live") return "live";
    if (state === "stale") return "stale";
    if (state === "failed") return "failed";
    if (state === "missing" || state === "unknown") return "unavailable";
    return "unavailable";
}

function isRefreshOnlyFinding(finding: AdminDebugFindingCard) {
    return findingDisplayState(finding) === "refresh_due";
}

function isEvidenceGateFinding(finding: AdminDebugFindingCard) {
    return findingDisplayState(finding) !== "review" || /evidence gate/iu.test(finding.title);
}

const isSourceOnlyEvidenceFinding = (finding: AdminDebugFindingCard) => findingDisplayState(finding) === "source_only";

const isTypedEvidenceGateFinding = (finding: AdminDebugFindingCard) => ["site_activity_evidence_required", "admin_source_activity_sample_required"].includes(findingDisplayState(finding));
const findingDisplayState = (finding: AdminDebugFindingCard) => resolvePublicBetaCapDetailForAdmin(`${finding.title} ${finding.humanReadableWarning} ${finding.evidence.join(" ")}`).state;

export function resolveReportDisplay(report: AdminDebugReportCard): { badgeState: AdminSurfaceState; badgeLabel?: string; statusLabel: string; findingLabel: string; sourceDetail: string } {
    const evidenceGateCount = report.evidenceGateCount ?? 0;
    const sourceFindingCount = report.findingCount > 0
        ? report.findingCount
        : report.topFindings.filter((finding) => !isRefreshOnlyFinding(finding) && !isEvidenceGateFinding(finding)).length;
    const hasFindings = sourceFindingCount > 0 || report.criticalCount > 0;
    const normalizedStatus = report.status.toLowerCase();
    const zeroFindingEvidencePending = !hasFindings && ["delayed", "queued", "waiting"].includes(normalizedStatus);
    const zeroFindingEvidenceGate = !hasFindings && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(normalizedStatus);
    const findingLabel = hasFindings
        ? `${sourceFindingCount} source finding${sourceFindingCount === 1 ? "" : "s"}`
        : evidenceGateCount > 0
            ? `${evidenceGateCount} source evidence lane${evidenceGateCount === 1 ? "" : "s"}`
        : zeroFindingEvidencePending
            ? "Evidence pending"
            : zeroFindingEvidenceGate
                ? "Source evidence lane"
                : "No active findings";
    const sourceNeedsRefresh = report.freshness === "stale_24h" || report.freshness === "stale_72h" || report.sourceDrift === "stale";
    const evidenceGateOnly = !hasFindings && (evidenceGateCount > 0 || report.topFindings.some(isEvidenceGateFinding));
    const sourceEvidenceGateOnly = !hasFindings
        && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(normalizedStatus)
        && (
            report.topFindings.some(isTypedEvidenceGateFinding)
            || (report.id === "public-beta-score" && report.topFindings.length === 0)
        );
    const refreshGateOnly = !hasFindings
        && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(normalizedStatus)
        && report.topFindings.some((finding) => isRefreshOnlyFinding(finding) || /report refresh required/u.test(finding.title.toLowerCase()));
    const sourceOnlyGateOnly = !hasFindings
        && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(normalizedStatus)
        && report.topFindings.some(isSourceOnlyEvidenceFinding)
        && !report.topFindings.some(isTypedEvidenceGateFinding)
        && !refreshGateOnly;
    const typedEvidenceBoundaryOnly = !hasFindings
        && sourceEvidenceGateOnly
        && ["fail", "failed", "error", "beta-risk", "warning", "review"].includes(report.status.toLowerCase());
    const reportStatusLabel = (() => {
        if (["clean", "pass", "passed", "ready", "ok"].includes(normalizedStatus)) return "Source current";
        if (["delayed", "queued", "waiting"].includes(normalizedStatus)) return hasFindings ? "Review delayed" : "Waiting for evidence";
        if (["fail", "failed", "error"].includes(normalizedStatus)) return hasFindings ? "Needs review" : "Source failed";
        if (["beta-risk", "warning", "review"].includes(normalizedStatus)) return "Needs review";
        return report.status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
    })();
    const sourceDetail = hasFindings
        ? "This source lane has active findings. Repair the source owner before treating it as clear."
        : "This source lane is current and has no active findings.";
    if (report.freshness === "missing" || report.truthState === "missing") {
        return { badgeState: "unavailable", statusLabel: "Source missing", findingLabel: hasFindings ? findingLabel : "No source", sourceDetail: "Required source evidence is missing and cannot clear this lane." };
    }
    if (report.freshness === "failed") {
        return { badgeState: "failed", statusLabel: "Source failed", findingLabel: hasFindings ? findingLabel : "Source failed", sourceDetail: "The source evidence could not be read and cannot clear this lane." };
    }
    if (typedEvidenceBoundaryOnly) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Source activity evidence required", findingLabel: evidenceGateOnly ? findingLabel : "Source evidence lane", sourceDetail: "Source validators cannot close provider-backed site activity, deployed route evidence, or admin source activity sample lanes by themselves." };
    }
    if (sourceOnlyGateOnly) return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Source checks only", findingLabel: evidenceGateOnly ? findingLabel : "Source-only evidence", sourceDetail: "Source validators passed; deployed route evidence, provider-backed site activity, admin source activity samples, and UI source contract checks remain separate source lanes." };
    if (sourceNeedsRefresh || refreshGateOnly) {
        return { badgeState: "stale", badgeLabel: "Refresh due", statusLabel: "Refresh due", findingLabel, sourceDetail: "This evidence is older than its freshness window or current app version." };
    }
    if (!hasFindings && report.truthState === "live") {
        return { badgeState: "live", statusLabel: "Source current", findingLabel, sourceDetail };
    }
    if (!hasFindings && ["delayed", "queued", "waiting"].includes(normalizedStatus)) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Waiting for evidence", findingLabel, sourceDetail: "This lane is waiting for its source evidence to refresh." };
    }
    if (!hasFindings && ["fail", "failed", "error"].includes(normalizedStatus)) {
        return { badgeState: "degraded", badgeLabel: "Review", statusLabel: "Needs review", findingLabel, sourceDetail: "This lane reported a problem without an attached source finding. Review the owning check." };
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
                    {display.findingLabel}
                </span>
                {report.criticalCount > 0 ? (
                    <span className="rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-100">
                        {report.criticalCount} critical
                    </span>
                ) : null}
            </div>
            <details className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-gray-300">
                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Why this state</summary>
                <p className="mt-1">{display.sourceDetail} Next check: {report.command}</p>
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
            <details className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-gray-300">
                <summary className="min-h-9 cursor-pointer pt-2 font-semibold text-gray-100">Evidence handling</summary>
                <p className="mt-1">Raw support/user bodies stay redacted and collapsed.</p>
            </details>
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
