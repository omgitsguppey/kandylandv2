"use client";

import { Loader2, ShieldAlert } from "lucide-react";

import type { AdminModerationSecurityAlert } from "@/lib/admin-moderation";
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

function severityTone(severity: AdminModerationSecurityAlert["severity"]) {
    if (severity === "high") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (severity === "medium") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    return "border-white/10 bg-white/5 text-gray-300";
}

function priorityTone(priority: AdminModerationSecurityAlert["reviewPriority"]) {
    if (priority === "urgent") return "border-red-500/40 bg-red-500/15 text-red-200";
    if (priority === "elevated") return "border-amber-400/35 bg-amber-400/10 text-amber-200";
    return "border-white/10 bg-white/5 text-gray-300";
}

function confidenceTone(confidence: AdminModerationSecurityAlert["confidence"]) {
    if (confidence === "confirmed") return "border-purple-500/40 bg-purple-500/15 text-purple-200";
    if (confidence === "unknown") return "border-gray-500/40 bg-gray-500/15 text-gray-300";
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function label(value: string) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
}

type AdminModerationSecurityAlertsProps = {
    alerts: AdminModerationSecurityAlert[];
    isLoading: boolean;
    error: Error | null;
};

export function AdminModerationSecurityAlerts({
    alerts,
    isLoading,
    error,
}: AdminModerationSecurityAlertsProps) {
    const urgentCount = alerts.filter((alert) => alert.reviewPriority === "urgent").length;
    const reviewCount = alerts.filter((alert) => alert.reviewPriority === "urgent" || alert.reviewPriority === "elevated").length;

    return (
        <section className="glass-panel flex h-full max-h-[40vh] flex-col overflow-hidden rounded-2xl p-4 xl:max-h-[50vh]">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">Security Alerts</h2>
                    <p className="truncate text-[10px] text-gray-500">Server logs with confidence and next action.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {urgentCount > 0 ? (
                        <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            {urgentCount} now
                        </span>
                    ) : null}
                    {reviewCount > 0 ? (
                        <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                            {reviewCount} review
                        </span>
                    ) : null}
                </div>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
                {alerts.slice(0, 20).map((alert) => (
                    <article key={alert.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-white">{alert.label}</p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                    {alert.username} • {alert.contextLabel}
                                </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-gray-500">{formatRelativeTime(alert.timestamp)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", priorityTone(alert.reviewPriority))}>
                                {alert.priorityLabel}
                            </span>
                            <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", severityTone(alert.severity))}>
                                {label(alert.severity)}
                            </span>
                            <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", confidenceTone(alert.confidence))}>
                                {alert.accuracyLabel}
                            </span>
                            {alert.repeatCount && alert.repeatCount > 1 ? (
                                <span className="rounded border border-orange-500/35 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-200">
                                    {alert.repeatCount} signals
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-[10px] text-gray-300">
                            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-brand-purple" />
                            <p className="min-w-0">
                                {alert.actionLabel} <span className="text-gray-500">Source: {alert.sourceLabel}.</span>
                            </p>
                        </div>
                    </article>
                ))}
                {isLoading && alerts.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" />Loading alerts...</div>
                ) : null}
                {!isLoading && alerts.length === 0 && !error ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">No security alerts in the current feed.</div>
                ) : null}
                {error ? (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">Alert refresh delayed. Existing rows stay visible when available.</div>
                ) : null}
            </div>
        </section>
    );
}
