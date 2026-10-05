"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";
import { Button } from "@/components/ui/Button";


import { Activity, CheckCircle2, FileWarning, Radio } from "lucide-react";
import { useMemo, useState } from "react";

import type { AdminAiDebugRealtimeSignals, AdminAiDebugRealtimeDiagnostic } from "@/lib/admin-ai-debug-runtime";
import { cn } from "@/lib/utils";

function toneClasses(tone: "good" | "warn" | "bad" | "neutral") {
    if (tone === "good") {
        return "border-success/20 bg-success/10 text-success";
    }
    if (tone === "warn") {
        return "border-warning/20 bg-warning/10 text-warning";
    }
    if (tone === "bad") {
        return "border-destructive/20 bg-destructive/10 text-destructive";
    }
    return "border-border bg-secondary text-foreground";
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

function observerStateLabel(state: AdminAiDebugRealtimeSignals["preflightChecks"][number]["state"]) {
    return state.replace(/_/g, " ");
}

function formatSignalAge(timestamp?: number | null) {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) {
        return "Not recorded";
    }

    return new Date(timestamp).toLocaleString();
}

export function AdminAiAssistantRealtimePanel({ state }: { state: AdminAiDebugRealtimeSignals }) {
    const [fixingIds, setFixingIds] = useState<Record<string, boolean>>({});
    const [plans, setPlans] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const groupedDiagnostics = useMemo(() => {
        const groups = new Map<string, {
            key: string;
            severity: AdminAiDebugRealtimeDiagnostic["severity"];
            message: string;
            detailPreview?: string;
            createdAtMs: number;
            count: number;
            diagnostics: AdminAiDebugRealtimeDiagnostic[];
        }>();

        for (const diagnostic of state.diagnostics) {
            const key = [
                diagnostic.severity,
                diagnostic.message,
                diagnostic.detailPreview || "",
            ].join("|");
            const existing = groups.get(key);
            if (existing) {
                existing.count += 1;
                existing.createdAtMs = Math.max(existing.createdAtMs, diagnostic.createdAtMs);
                existing.diagnostics.push(diagnostic);
                continue;
            }
            groups.set(key, {
                key,
                severity: diagnostic.severity,
                message: diagnostic.message,
                detailPreview: diagnostic.detailPreview,
                createdAtMs: diagnostic.createdAtMs,
                count: 1,
                diagnostics: [diagnostic],
            });
        }

        return Array.from(groups.values()).sort((left, right) => right.createdAtMs - left.createdAtMs);
    }, [state.diagnostics]);

    const handleFix = async (groupKey: string, diagnostic: AdminAiDebugRealtimeDiagnostic, action: "inspect" | "dismiss") => {
        setFixingIds((prev) => ({ ...prev, [groupKey]: true }));
        setErrors((prev) => ({ ...prev, [diagnostic.id]: "" }));
        
        try {
            const res = await fetch("/api/admin/debug/assistant/fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    fixType: action === "dismiss" ? "dismiss_diagnostic" : "inspect_diagnostic",
                    diagnosticId: diagnostic.id,
                    diagnosticMessage: diagnostic.message,
                    diagnosticDetail: diagnostic.detailPreview,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to process assistant action");
            
            setPlans((prev) => ({ ...prev, [groupKey]: data }));
        } catch (err: any) {
            setErrors((prev) => ({ ...prev, [groupKey]: err.message }));
        } finally {
            setFixingIds((prev) => ({ ...prev, [groupKey]: false }));
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live preflight lane</p>
                        <p className="mt-2 text-sm text-muted-foreground">{state.feedDetail}</p>
                    </div>
                    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClasses(toTone(state.feedStatus)))}>
                        <Radio className="h-3.5 w-3.5" />
                        {state.feedStatus}
                    </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest live signal</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{formatSignalAge(state.latestSignalAtMs)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recent AI diagnostics</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{state.diagnostics.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Configured model</p>
                        <p className="mt-2 break-all text-sm font-semibold text-foreground">{state.settings.model}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {state.preflightChecks.map((check) => (
                    <div key={check.key} className={cn("rounded-[1rem] border px-3 py-3", toneClasses(toTone(check.status)))}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{check.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {check.status === "pass" ? <CheckCircle2 className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                                <span className="rounded-full border border-border bg-background/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground">
                                    {check.sourceLabel}
                                </span>
                                <span className="rounded-full border border-border bg-background/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground">
                                    {observerStateLabel(check.state)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Activity className="h-3.5 w-3.5" />
                            <span>{check.updatedAtUtc ? `Updated ${formatSignalAge(check.updatedAtMs)}` : check.reason}</span>
                        </div>
                    </div>
                ))}
            </div>

            {groupedDiagnostics.length > 0 && (
                <div className="mt-8 space-y-4">
                    <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">Live diagnostics and guided actions</h3>
                    <div className="grid gap-3">
                        {groupedDiagnostics.map((group) => {
                            const diag = group.diagnostics[0];
                            const plan = plans[group.key];
                            return (
                            <div key={group.key} className="rounded-[1rem] border border-border bg-secondary p-4 space-y-3">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold", 
                                                group.severity === "error" ? "bg-destructive/20 text-destructive" : 
                                                group.severity === "warn" ? "bg-warning/20 text-warning" : 
                                                "bg-info/20 text-info"
                                            )}>
                                                {group.severity}
                                            </span>
                                            <p className="text-sm font-semibold text-foreground">{group.message}{group.count > 1 ? ` x${group.count}` : ""}</p>
                                        </div>
                                        {group.detailPreview && (
                                            <p className="mt-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap">{group.detailPreview}</p>
                                        )}
                                        <p className="mt-2 text-[10px] text-muted-foreground">{formatSignalAge(group.createdAtMs)}</p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button variant="ghost" 
                                            onClick={() => handleFix(group.key, diag, "inspect")}
                                            disabled={fixingIds[group.key]}
                                            className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/50 text-xs font-semibold text-foreground disabled:opacity-50 transition-colors"
                                        >
                                            {fixingIds[group.key] ? "Inspecting..." : "Inspect"}
                                        </Button>
                                        <Button variant="ghost" 
                                            onClick={() => handleFix(group.key, diag, "dismiss")}
                                            disabled={fixingIds[group.key]}
                                            className="px-3 py-1.5 rounded-lg border border-border bg-background/30 text-xs font-semibold text-foreground disabled:opacity-50 transition-colors"
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                                {errors[group.key] && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                        {errors[group.key]}
                                    </div>
                                )}
                                {plan && (
                                    <div className="mt-3 p-3 rounded-xl bg-background/40 border border-border">
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assistant action</p>
                                        <p className="mt-2 text-sm text-foreground">{plan.status}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">{plan.reason}</p>
                                        {plan.plan ? (
                                            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                                <div><span className="font-semibold text-foreground">Issue:</span> {plan.plan.issue_summary}</div>
                                                <div><span className="font-semibold text-foreground">Likely cause:</span> {plan.plan.likely_cause}</div>
                                                <div><span className="font-semibold text-foreground">Apply eligibility:</span> {plan.plan.apply_eligibility?.state} - {plan.plan.apply_eligibility?.reason}</div>
                                                <div><span className="font-semibold text-foreground">Rollback:</span> {plan.plan.rollback_note}</div>
                                                <Disclosure>
                                                    <DisclosureSummary className="cursor-pointer font-semibold text-foreground">Plan details</DisclosureSummary>
                                                    <div className="mt-2 space-y-1">
                                                        {(plan.plan.safe_fix_plan || []).map((entry: string) => <div key={entry}>- {entry}</div>)}
                                                        {(plan.plan.files_to_inspect || []).map((entry: string) => <div key={entry}>- {entry}</div>)}
                                                        {(plan.plan.validators_to_run || []).map((entry: string) => <div key={entry}>- {entry}</div>)}
                                                    </div>
                                                </Disclosure>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            )}
        </div>
    );
}
