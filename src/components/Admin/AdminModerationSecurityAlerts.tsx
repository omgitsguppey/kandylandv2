"use client";

import { Button } from "@/components/ui/Button";


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
    if (tier === "critical") return "border-destructive/40 bg-destructive/15 text-destructive";
    if (tier === "high") return "border-warning/40 bg-warning/15 text-warning";
    if (tier === "review") return "border-warning/35 bg-warning/10 text-warning";
    if (tier === "watch") return "border-primary/30 bg-primary/12 text-primary";
    return "border-border bg-secondary text-muted-foreground";
}

function confidenceTone(confidence: AdminModerationSecurityAlert["riskConfidence"]) {
    if (confidence === "confirmed") return "border-primary/40 bg-primary/15 text-primary";
    if (confidence === "strong") return "border-info/35 bg-info/10 text-info";
    if (confidence === "heuristic") return "border-warning/30 bg-warning/10 text-warning";
    return "border-border bg-secondary text-muted-foreground";
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
        <section className="overflow-hidden rounded-[1.6rem] border border-border bg-secondary shadow-none" data-moderation-alert-list="risk-first">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
                <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/55">Risk feed</p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">Security alerts</h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">Evidence-weighted, not screenshot claims.</p>
                </div>
                <span className="rounded-2xl border border-primary/15 bg-primary/[0.08] px-3 py-2 text-center">
                    <span className="block text-[8px] font-semibold uppercase tracking-wide text-primary/60">Open</span>
                    <span className="block text-lg font-semibold leading-5 text-foreground">{displayCount}</span>
                </span>
            </div>
            <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-1">
                {alerts.slice(0, 24).map((alert) => {
                    const selected = selectedAlertId === alert.id;
                    return (
                        <Button variant="ghost"
                            key={alert.id}
                            type="button"
                            onClick={() => onSelectAlert(alert.id)}
                            aria-pressed={selected}
                            className={cn(
                                "group min-h-[144px] rounded-2xl border px-3.5 py-3 text-left transition-colors",
                                selected
                                    ? "border-primary/35 bg-primary/[0.13] shadow-none"
                                    : "border-border bg-background/15 hover:border-border hover:bg-secondary",
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{alert.label}</p>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">{alert.username} <span className="text-muted-foreground">/</span> {alert.contextLabel}</p>
                                </div>
                                <div className="shrink-0 rounded-xl border border-border bg-background/20 px-2 py-1.5 text-right">
                                    <p className="text-lg font-semibold leading-4 text-foreground">{alert.riskScore}</p>
                                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{formatRelativeTime(alert.timestamp)}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide", tierTone(alert.riskTier))}>{alert.riskTier}</span>
                                <span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide", confidenceTone(alert.riskConfidence))}>{alert.riskConfidence}</span>
                                <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{alert.priorityLabel}</span>
                                <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{alert.accuracyLabel}</span>
                            </div>
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-background/20 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/75" aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="line-clamp-2">{alert.observedSummary}</p>
                                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">{alert.sourceLabel} / {alert.evidenceCount} evidence / FP {alert.falsePositiveRisk}</p>
                                </div>
                            </div>
                            <p className="mt-2 truncate text-[10px] font-semibold text-muted-foreground">{alert.actionLabel || alert.recommendedAction}</p>
                        </Button>
                    );
                })}
                {isLoading && alerts.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background/15 p-3 text-xs text-muted-foreground"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" aria-hidden="true" />Loading alerts...</div>
                ) : null}
                {adminSessionState === "waiting_for_admin_session" ? (
                    <div className="rounded-2xl border border-border bg-background/15 p-3 text-sm leading-5 text-muted-foreground">collecting: admin access and source state are resolving.</div>
                ) : null}
                {adminSessionState === "local_fixture_source_missing" ? (
                    <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm leading-5 text-warning">source_missing: risk-alert source is not loaded in this fixture.</div>
                ) : null}
                {!isLoading && alerts.length === 0 && !error ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background/15 p-3 text-sm leading-5 text-muted-foreground">
                        {adminSessionState === "local_fixture_source_missing" ? "source_missing: risk-alert evidence is not loaded in this fixture." : "No unresolved risk alerts."}
                    </div>
                ) : null}
                {safeErrorMessage ? (
                    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning" data-moderation-alerts-safe-error="true">
                        {safeErrorMessage}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
