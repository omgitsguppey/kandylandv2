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
        <section className="rounded-2xl border border-white/10 bg-black/25 p-3" data-moderation-alert-list="risk-first">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">Risk Alerts</h2>
                    <p className="truncate text-xs text-gray-500">Evidence-weighted, not screenshot claims.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-200">{displayCount}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {alerts.slice(0, 24).map((alert) => {
                    const selected = selectedAlertId === alert.id;
                    return (
                        <button
                            key={alert.id}
                            type="button"
                            onClick={() => onSelectAlert(alert.id)}
                            aria-pressed={selected}
                            className={cn(
                                "min-h-11 rounded-xl border p-3 text-left transition",
                                selected ? "border-brand-purple/45 bg-brand-purple/12" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-white">{alert.label}</p>
                                    <p className="mt-1 truncate text-xs text-gray-400">{alert.username} | {alert.contextLabel}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-lg font-black text-white">{alert.riskScore}</p>
                                    <p className="text-[10px] text-gray-500">{formatRelativeTime(alert.timestamp)}</p>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase", tierTone(alert.riskTier))}>{alert.riskTier}</span>
                                <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase", confidenceTone(alert.riskConfidence))}>{alert.riskConfidence}</span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">{alert.priorityLabel}</span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">{alert.accuracyLabel}</span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">FP {alert.falsePositiveRisk}</span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">{alert.evidenceCount} evidence</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">Source: {alert.sourceLabel}</p>
                            <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-xs text-gray-300">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple" />
                                <div className="min-w-0">
                                    <p>{alert.observedSummary}</p>
                                    <p className="mt-1 text-gray-400">{alert.actionLabel || alert.recommendedAction}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
                {isLoading && alerts.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" aria-hidden="true" />Loading alerts...</div>
                ) : null}
                {adminSessionState === "waiting_for_admin_session" ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-gray-400">Waiting for admin session...</div>
                ) : null}
                {adminSessionState === "local_fixture_source_missing" ? (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">Risk alert evidence is source_missing in local review.</div>
                ) : null}
                {!isLoading && alerts.length === 0 && !error ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-sm text-gray-400">
                        {adminSessionState === "local_fixture_source_missing" ? "No risk-alert evidence is loaded for local review." : "No unresolved risk alerts."}
                    </div>
                ) : null}
                {safeErrorMessage ? (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100" data-moderation-alerts-safe-error="true">
                        {safeErrorMessage}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
