"use client";

import { Activity, CheckCircle2, FileWarning, Radio } from "lucide-react";
import { useState } from "react";

import type { AdminAiDebugRealtimeSignals, AdminAiDebugRealtimeDiagnostic } from "@/lib/admin-ai-debug-runtime";
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
    const [fixingIds, setFixingIds] = useState<Record<string, boolean>>({});
    const [patches, setPatches] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFix = async (diagnostic: AdminAiDebugRealtimeDiagnostic) => {
        setFixingIds((prev) => ({ ...prev, [diagnostic.id]: true }));
        setErrors((prev) => ({ ...prev, [diagnostic.id]: "" }));
        
        try {
            const res = await fetch("/api/admin/debug/assistant/fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    diagnosticMessage: diagnostic.message,
                    diagnosticDetail: diagnostic.detailPreview
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate fix");
            
            setPatches((prev) => ({ ...prev, [diagnostic.id]: data.patch }));
        } catch (err: any) {
            setErrors((prev) => ({ ...prev, [diagnostic.id]: err.message }));
        } finally {
            setFixingIds((prev) => ({ ...prev, [diagnostic.id]: false }));
        }
    };

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

            {state.diagnostics.length > 0 && (
                <div className="mt-8 space-y-4">
                    <h3 className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Live Diagnostics & AI Auto-Fix</h3>
                    <div className="grid gap-3">
                        {state.diagnostics.map((diag) => (
                            <div key={diag.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 space-y-3">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold", 
                                                diag.severity === "error" ? "bg-red-500/20 text-red-300" : 
                                                diag.severity === "warn" ? "bg-amber-500/20 text-amber-300" : 
                                                "bg-blue-500/20 text-blue-300"
                                            )}>
                                                {diag.severity}
                                            </span>
                                            <p className="text-sm font-semibold text-white">{diag.message}</p>
                                        </div>
                                        {diag.detailPreview && (
                                            <p className="mt-2 text-xs text-gray-400 font-mono whitespace-pre-wrap">{diag.detailPreview}</p>
                                        )}
                                        <p className="mt-2 text-[10px] text-gray-500">{formatSignalAge(diag.createdAtMs)}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleFix(diag)}
                                        disabled={fixingIds[diag.id]}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-purple/20 hover:bg-brand-purple/30 border border-brand-purple/50 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
                                    >
                                        {fixingIds[diag.id] ? "Generating Fix..." : "AI Auto-Fix"}
                                    </button>
                                </div>
                                {errors[diag.id] && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                                        {errors[diag.id]}
                                    </div>
                                )}
                                {patches[diag.id] && (
                                    <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Proposed Patch (.patch)</p>
                                            <button 
                                                onClick={() => navigator.clipboard.writeText(patches[diag.id])}
                                                className="text-[10px] uppercase tracking-wider text-brand-purple hover:text-white transition-colors"
                                            >
                                                Copy Patch
                                            </button>
                                        </div>
                                        <pre className="text-[11px] text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap selection:bg-brand-purple/30">
                                            {patches[diag.id]}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
