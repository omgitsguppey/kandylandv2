"use client";

import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminDebugCardCopy } from "@/lib/admin-debug-summary-cards";
import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import {
    ADMIN_NO_SOURCE_LABEL,
    resolveAdminInputTruthState as resolveAdminTruthState,
    type AdminTruthState,
} from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

/* ─── Shared Tone Type ─── */
export type PillTone = "neutral" | "good" | "warn" | "bad";

export function toneForPanelStatus(status?: string): PillTone {
    if (status === "healthy") return "good" as const;
    if (status === "warn") return "warn" as const;
    if (status === "fail" || status === "failed") return "bad" as const;
    return "neutral" as const;
}

export function truthStateForPanelStatus(status?: string): AdminSurfaceState {
    if (status === "warn") return "degraded";
    if (status === "fail" || status === "failed") return "failed";
    return coerceAdminSurfaceState(status);
}

export function labelForPanelStatus(status?: string) {
    return formatAdminSurfaceStateLabel(truthStateForPanelStatus(status));
}

export function toneForSourceStatus(status?: string): PillTone {
    if (status === "loaded_with_data" || status === "loaded_empty_with_source_window") return "good";
    if (status === "failed" || status === "source_missing_actionable" || status === "formula_missing_actionable" || status === "registry_missing_actionable") return "bad";
    if (status === "stale_rebuild_required" || status === "source_ready_no_sample_loaded") return "warn";
    return "neutral";
}

export function truthStateForSourceStatus(status?: string): AdminTruthState {
    if (status === "loaded_with_data" || status === "loaded_empty_with_source_window") return "live";
    if (status === "failed") return "failed";
    if (status === "source_missing_actionable" || status === "registry_missing_actionable") return "unavailable";
    if (status === "formula_missing_actionable") return "failed";
    if (status === "stale_rebuild_required") return "stale";
    if (status === "source_ready_no_sample_loaded") return "review";
    return "unavailable";
}

export function badgeForSourceStatus(status?: string) {
    if (status === "loaded_with_data") return "LOADED";
    if (status === "loaded_empty_with_source_window") return "PROVEN ZERO";
    if (status === "source_ready_no_sample_loaded") return "NO SAMPLE";
    if (status === "source_missing_actionable") return "MISSING";
    if (status === "formula_missing_actionable") return "ACTIONABLE";
    if (status === "registry_missing_actionable") return "REGISTRY";
    if (status === "stale_rebuild_required") return "STALE";
    if (status === "failed") return "FAILED";
    return "UNKNOWN";
}

export function badgeForDebugSeverity(state?: string) {
    if (state === "error" || state === "fail" || state === "failed" || state === "mismatch") return "Needs fix";
    if (state === "review" || state === "warn" || state === "warning" || state === "partial") return "Review";
    if (state === "live" || state === "ready" || state === "pass" || state === "ok") return "Live";
    return "Info";
}

function formatDebugPillBadgeLabel(label?: string) {
    if (!label) return undefined;
    const normalized = label.trim();
    const sentenceCaseOverrides: Record<string, string> = {
        ACTIONABLE: "Action needed",
        CONFIG: "Configured",
        ERROR: "Needs fix",
        FAILED: "Failed",
        INFO: "Info",
        LIVE: "Live",
        LOADED: "Loaded",
        MISSING: "Missing",
        "NO SAMPLE": "No sample",
        "PROVEN ZERO": "Proven zero",
        REVIEW: "Review",
        "STALE SAMPLE": "Stale sample",
        UNKNOWN: "Unknown",
    };
    if (sentenceCaseOverrides[normalized]) return sentenceCaseOverrides[normalized];
    if (!/^[A-Z0-9 _-]+$/u.test(normalized)) return normalized;
    return normalized.replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/^\w/u, (letter) => letter.toUpperCase());
}

/* ─── Pill ─── */
export function Pill({ label, value, tone = "neutral", truthState, badgeLabel }: { label: string; value: string | number; tone?: PillTone; truthState?: AdminTruthState | AdminSurfaceState | "loading"; badgeLabel?: string }) {
    const toneClassName = tone === "good"
        ? "text-success"
        : tone === "warn"
            ? "text-warning"
            : tone === "bad"
                ? "text-destructive"
                : "text-foreground";

    const resolvedTruth = resolveAdminTruthState ({
        truthState,
        value,
        pendingInitialLoad: truthState === "loading",
    });

    return (
        <div className={cn("flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 text-sm", toneClassName)} data-debug-pill-tone={tone}>
            <span className="min-w-0 wrap-anywhere text-muted-foreground">{label}</span>
            <span className="min-w-0 wrap-anywhere font-medium tabular-nums">{typeof value === "number" && !resolvedTruth.hasUsableValue ? ADMIN_NO_SOURCE_LABEL : value}</span>
            <AdminTruthBadge state={resolvedTruth.truthState} label={formatDebugPillBadgeLabel(badgeLabel)}
                className="max-w-full shrink-0 wrap-anywhere whitespace-normal py-0.5 normal-case tracking-normal"
                pendingInitialLoad={resolvedTruth.pendingInitialLoad} hasUsableValue={resolvedTruth.hasUsableValue} />
        </div>
    );
}

/* ─── StatCard ─── */
export function StatCard({
    label,
    value,
    meta,
    truthState,
    copy,
}: {
    label: string;
    value: string | number;
    meta?: string;
    truthState: AdminTruthState | AdminSurfaceState | "loading";
    copy?: AdminDebugCardCopy;
}) {
    const resolvedTruth = resolveAdminTruthState ({
        truthState,
        value,
        pendingInitialLoad: truthState === "loading",
    });

    return (
        <div className="min-w-0 space-y-2">
            <AdminMetricCard label={label} value={resolvedTruth.hasUsableValue ? value : ADMIN_NO_SOURCE_LABEL} meta={meta}
                truthState={resolvedTruth.truthState} hasUsableValue={resolvedTruth.hasUsableValue}
                pendingInitialLoad={resolvedTruth.pendingInitialLoad} />
            {copy ? (
                <details className="min-w-0 text-sm text-muted-foreground">
                    <summary className="flex min-h-11 cursor-pointer items-center py-3 font-medium text-foreground">Explain this</summary>
                    <dl className="space-y-3 pb-3 leading-6">
                        <div><dt className="font-medium text-foreground">What this means</dt><dd className="wrap-anywhere">{copy.operatorSummary}</dd></div>
                        <div><dt className="font-medium text-foreground">Why it matters</dt><dd className="wrap-anywhere">{copy.whyItMatters}</dd></div>
                        <div><dt className="font-medium text-foreground">What to check next</dt><dd className="wrap-anywhere">{copy.recommendedNextCheck}</dd></div>
                        <div><dt className="font-medium text-foreground">Technical evidence</dt><dd className="wrap-anywhere">{copy.technicalEvidence}</dd></div>
                        <div><dt className="font-medium text-foreground">Source details</dt><dd className="wrap-anywhere">{copy.sourceDetails}</dd></div>
                    </dl>
                </details>
            ) : null}
        </div>
    );
}

/* ─── Section (collapsible) ─── */
export function Section({
    title,
    subtitle,
    summary,
    defaultOpen,
    children,
}: {
    title: string;
    subtitle?: string;
    summary?: React.ReactNode;
    defaultOpen: boolean;
    children: React.ReactNode;
}) {

    return (
        <AdminDashboardModule title={title} description={subtitle} summary={summary} defaultOpen={defaultOpen}>
            {children}
        </AdminDashboardModule>
    );
}

/* ─── ScrollWrap ─── */
export function ScrollWrap({ children }: { children: React.ReactNode }) {
    return <div className="max-h-[24rem] min-w-0 overflow-auto">{children}</div>;
}
