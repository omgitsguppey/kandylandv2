"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminDebugCardCopy } from "@/lib/admin-debug-summary-cards";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";

/* ─── Shared Tone Type ─── */
export type PillTone = "neutral" | "good" | "warn" | "bad";

function stateFromTone(tone: PillTone): AdminSurfaceState {
    if (tone === "good") return "live";
    if (tone === "warn") return "degraded";
    if (tone === "bad") return "failed";
    return "unavailable";
}

/* ─── Pill ─── */
export function Pill({ label, value, tone = "neutral", truthState }: { label: string; value: string | number; tone?: PillTone; truthState?: AdminSurfaceState }) {
    const toneClassName = tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
            : tone === "bad"
                ? "border-red-400/20 bg-red-500/10 text-red-100"
                : "border-white/10 bg-white/5 text-gray-200";

    return (
        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClassName)}>
            <AdminStatusBadge state={truthState ?? stateFromTone(tone)} className="py-0 text-[8px]" />
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
    truthState: AdminSurfaceState;
    copy?: AdminDebugCardCopy;
}) {
    return (
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
                <AdminStatusBadge state={truthState} className="py-0 text-[8px]" />
            </div>
            <div className="mt-1 text-[1.4rem] font-black text-white">{value}</div>
            {meta ? <p className="mt-1 text-[11px] text-gray-400">{meta}</p> : null}
            {copy ? (
                <details className="mt-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                    <summary className="cursor-pointer font-semibold text-gray-100">Explain this</summary>
                    <div className="mt-2 space-y-1.5">
                        <p><span className="text-gray-500">What this means:</span> {copy.operatorSummary}</p>
                        <p><span className="text-gray-500">Why it matters:</span> {copy.whyItMatters}</p>
                        <p><span className="text-gray-500">What to check next:</span> {copy.recommendedNextCheck}</p>
                        <p><span className="text-gray-500">Technical evidence:</span> {copy.technicalEvidence}</p>
                        <p><span className="text-gray-500">Source details:</span> {copy.sourceDetails}</p>
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
        <section className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/25">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
                aria-expanded={open}
            >
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-white md:text-base">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-[11px] leading-5 text-gray-400 md:text-xs">{subtitle}</p> : null}
                    {summary ? <div className="mt-2.5 flex flex-wrap gap-2">{summary}</div> : null}
                </div>
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            {open ? <div className="border-t border-white/10 px-3 py-2.5">{children}</div> : null}
        </section>
    );
}

/* ─── ScrollWrap ─── */
export function ScrollWrap({ children }: { children: React.ReactNode }) {
    return <div className="max-h-[24rem] overflow-auto rounded-[1rem] border border-white/10 bg-black/25">{children}</div>;
}
