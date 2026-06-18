"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminDebugCardCopy } from "@/lib/admin-debug-summary-cards";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
    resolveAdminInputTruthState as resolveAdminTruthState,
    type AdminTruthState,
} from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

/* ─── Shared Tone Type ─── */
export type PillTone = "neutral" | "good" | "warn" | "bad";

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
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
            : tone === "bad"
                ? "border-red-400/20 bg-red-500/10 text-red-100"
                : "border-white/10 bg-white/5 text-gray-200";

    const resolvedTruth = resolveAdminTruthState ({
        truthState,
        value,
        pendingInitialLoad: truthState === "loading",
    });

    return (
        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClassName)}>
            <AdminTruthBadge
                state={resolvedTruth.truthState}
                label={formatDebugPillBadgeLabel(badgeLabel)}
                className="py-0 text-[8px] normal-case tracking-normal"
                pendingInitialLoad={resolvedTruth.pendingInitialLoad}
                hasUsableValue={resolvedTruth.hasUsableValue}
            />
            <span className="text-gray-400">{label}</span>
            <span className="font-semibold text-white">{value}</span>
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
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-2.5">
            <AdminMetricCard
                label={label}
                value={value}
                meta={meta}
                truthState={resolvedTruth.truthState}
                hasUsableValue={resolvedTruth.hasUsableValue}
                pendingInitialLoad={resolvedTruth.pendingInitialLoad}
                badgeClassName="py-0 text-[8px]"
                valueClassName="mt-1 text-[1.4rem] md:text-[1.4rem]"
                className="border-0 bg-transparent p-0"
            />
            {copy ? (
                <details className="mt-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                    <summary className="cursor-pointer font-semibold text-gray-100">Explain this</summary>
                    <div className="mt-2 space-y-1.5">
                        <p><span className="text-gray-500">What this means:</span> {copy.operatorSummary}</p>
                        <p><span className="text-gray-500">Why it matters:</span> {copy.whyItMatters}</p>
                        <p><span className="text-gray-500">What to check next:</span> {copy.recommendedNextCheck}</p>
                        <p><span className="text-gray-500">Technical evidence:</span> {copy.technicalEvidence}</p>
                        <p><span className="text-gray-500">Source notes:</span> {copy.sourceDetails}</p>
                    </div>
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
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="overflow-hidden rounded-lg border border-white/10 bg-black/25">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left"
                aria-expanded={open}
            >
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-white md:text-base">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-gray-400 md:text-xs">{subtitle}</p> : null}
                    {summary ? <div className="mt-2 flex flex-wrap gap-1.5">{summary}</div> : null}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            {open ? <div className="border-t border-white/10 px-3 py-2">{children}</div> : null}
        </section>
    );
}

/* ─── ScrollWrap ─── */
export function ScrollWrap({ children }: { children: React.ReactNode }) {
    return <div className="max-h-[24rem] overflow-auto rounded-[1rem] border border-white/10 bg-black/25">{children}</div>;
}
