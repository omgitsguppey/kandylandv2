"use client";

import { Activity, CheckCircle2, FileWarning, Radio } from "lucide-react";

import type { AdminAiDebugRealtimeSignals } from "@/lib/admin-ai-debug-runtime";
import { cn } from "@/lib/utils";

function toneClasses(tone: "good" | "warn" | "bad" | "neutral") {
    if (tone === "good") {
        return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    }
    if (tone === "warn") {
        return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
    if (tone === "bad") {
        return "border-red-400/20 bg-red-500/10 text-red-100";
    }
    return "border-white/10 bg-white/5 text-gray-200";
}

function toTone(status: AdminAiDebugRealtimeSignals["feedStatus"] | AdminAiDebugRealtimeSignals["preflightChecks"][number]["status"]) {
    if (status === "realtime" || status === "pass") {
        return "good" as const;
    }
    if (status === "partial" || status === "polled" || status === "warn") {
        return "warn" as const;
    }
    if (status === "failed" || status === "fail") {
        return "bad" as const;
    }
    return "neutral" as const;
}

function formatSignalAge(timestamp?: number | null) {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) {
        return "Not recorded";
    }

    return new Date(timestamp).toLocaleString();
}

export function AdminAiAssistantRealtimePanel({ state }: { state: AdminAiDebugRealtimeSignals }) {
    return (
        <div className="space-y-4">
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Live preflight lane</p>
                        <p className="mt-2 text-sm text-gray-300">{state.feedDetail}</p>
                    </div>
                    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClasses(toTone(state.feedStatus)))}>
                        <Radio className="h-3.5 w-3.5" />
                        {state.feedStatus}
                    </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Latest live signal</p>
                        <p className="mt-2 text-sm font-semibold text-white">{formatSignalAge(state.latestSignalAtMs)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Recent AI diagnostics</p>
                        <p className="mt-2 text-sm font-semibold text-white">{state.diagnostics.length}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Configured model</p>
                        <p className="mt-2 break-all text-sm font-semibold text-white">{state.settings.model}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {state.preflightChecks.map((check) => (
                    <div key={check.key} className={cn("rounded-[1rem] border px-3 py-3", toneClasses(toTone(check.status)))}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-white">{check.label}</p>
                                <p className="mt-1 text-xs text-gray-300">{check.detail}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {check.status === "pass" ? <CheckCircle2 className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gray-200">
                                    {check.sourceLabel}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-300">
                            <Activity className="h-3.5 w-3.5" />
                            <span>{check.updatedAtMs ? `Updated ${formatSignalAge(check.updatedAtMs)}` : "Update time not recorded"}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
