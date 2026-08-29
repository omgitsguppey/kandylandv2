"use client";

import { Loader2, ShieldAlert } from "lucide-react";

import type { AdminModerationSecurityAlert } from "@/lib/admin-moderation";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { cn } from "@/lib/utils";

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) return "Not recorded";
    const deltaMinutes = Math.round((timestamp - Date.now()) / 60_000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) return formatter.format(deltaHours, "hour");
    return formatter.format(Math.round(deltaHours / 24), "day");
}

function tierTone(tier: AdminModerationSecurityAlert["riskTier"]) {
    if (tier === "critical") return "border-red-400/40 bg-red-500/15 text-red-100";
    if (tier === "high") return "border-orange-400/40 bg-orange-500/15 text-orange-100";
    if (tier === "review") return "border-amber-400/35 bg-amber-400/10 text-amber-100";
    if (tier === "watch") return "border-brand-purple/30 bg-brand-purple/12 text-[#e4d4ff]";
    return "border-white/10 bg-white/5 text-gray-300";
}

function confidenceTone(confidence: AdminModerationSecurityAlert["riskConfidence"]) {
    if (confidence === "confirmed") return "border-purple-400/40 bg-purple-500/15 text-purple-100";
    if (confidence === "strong") return "border-cyan-400/35 bg-cyan-500/10 text-cyan-100";
    if (confidence === "heuristic") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    return "border-gray-500/40 bg-gray-500/15 text-gray-300";
}

type AdminModerationSecurityAlertsProps = {
    alerts: AdminModerationSecurityAlert[];
    selectedAlertId?: string | null;
    isLoading: boolean;
    error: Error | null;
    adminSessionState: "waiting_for_admin_session" | "local_fixture_source_missing" | "ready";
    onSelectAlert: (alertId: string) => void;
};

export function AdminModerationSecurityAlerts({
    alerts,
    selectedAlertId,
    isLoading,
    error,
    adminSessionState,
    onSelectAlert,
}: AdminModerationSecurityAlertsProps) {
    const displayCount = error ? "Unknown" : String(alerts.length);
    const safeErrorMessage = error
        ? sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable").operatorMessage
        : null;
    // Route failures must stay unknown/unavailable here; never render a verified zero from raw route errors.

    return (
        <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.045] shadow-[0_16px_40px_rgba(0,0,0,0.2)]" data-moderation-alert-list="risk-first">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
                <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-100/55">Risk feed</p>
                    <h2 className="mt-1 text-base font-black text-white">Security alerts</h2>
                    <p className="mt-1 truncate text-xs text-gray-500">Evidence-weighted, not screenshot claims.</p>
                </div>
                <span className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.08] px-3 py-2 text-center">
                    <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-100/60">Open</span>
                    <span className="block text-lg font-black leading-5 text-white">{displayCount}</span>
                </span>
            </div>
            <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-1">
                {alerts.slice(0, 24).map((alert) => {
                    const selected = selectedAlertId === alert.id;
                    return (
                        <button
                            key={alert.id}
                            type="button"
                            onClick={() => onSelectAlert(alert.id)}
                            aria-pressed={selected}
                            className={cn(
                                "group min-h-[144px] rounded-2xl border px-3.5 py-3 text-left transition-colors",
                                selected
                                    ? "border-fuchsia-300/35 bg-fuchsia-500/[0.13] shadow-[0_10px_24px_rgba(168,85,247,0.14)]"
                                    : "border-white/[0.08] bg-black/15 hover:border-white/20 hover:bg-white/[0.055]",
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-white">{alert.label}</p>
                                    <p className="mt-1 truncate text-xs text-gray-400">{alert.username} <span className="text-gray-600">/</span> {alert.contextLabel}</p>
                                </div>
                                <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-right">
                                    <p className="text-lg font-black leading-4 text-white">{alert.riskScore}</p>
                                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-500">{formatRelativeTime(alert.timestamp)}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className={cn("rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]", tierTone(alert.riskTier))}>{alert.riskTier}</span>
                                <span className={cn("rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]", confidenceTone(alert.riskConfidence))}>{alert.riskConfidence}</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-300">{alert.priorityLabel}</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-300">{alert.accuracyLabel}</span>
                            </div>
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-2.5 py-2 text-xs leading-5 text-gray-300">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fuchsia-200/75" aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="line-clamp-2">{alert.observedSummary}</p>
                                    <p className="mt-1 truncate text-[10px] font-semibold text-gray-500">{alert.sourceLabel} / {alert.evidenceCount} evidence / FP {alert.falsePositiveRisk}</p>
                                </div>
                            </div>
                            <p className="mt-2 truncate text-[10px] font-semibold text-gray-500">{alert.actionLabel || alert.recommendedAction}</p>
                        </button>
                    );
                })}
                {isLoading && alerts.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" aria-hidden="true" />Loading alerts...</div>
                ) : null}
                {adminSessionState === "waiting_for_admin_session" ? (
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-sm leading-5 text-gray-400">collecting: admin access and source state are resolving.</div>
                ) : null}
                {adminSessionState === "local_fixture_source_missing" ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm leading-5 text-amber-100">source_missing: risk-alert source is not loaded in this fixture.</div>
                ) : null}
                {!isLoading && alerts.length === 0 && !error ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-3 text-sm leading-5 text-gray-400">
                        {adminSessionState === "local_fixture_source_missing" ? "source_missing: risk-alert evidence is not loaded in this fixture." : "No unresolved risk alerts."}
                    </div>
                ) : null}
                {safeErrorMessage ? (
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100" data-moderation-alerts-safe-error="true">
                        {safeErrorMessage}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
