"use client";

import { Button } from "@/components/ui/Button";
import { TableScrollArea } from "@/components/ui/data-table";


import { useMemo, useState } from "react";
import { FileText, MessageSquare, ShieldCheck, ShieldAlert } from "lucide-react";

import { AdminEvidenceMediaPreview } from "@/components/Admin/AdminEvidenceMediaPreview";
import { AdminModerationSecurityAlerts } from "@/components/Admin/AdminModerationSecurityAlerts";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAdminModerationRealtime } from "@/hooks/useAdminModerationRealtime";
import { buildAdminModerationControlTowerModel } from "@/lib/admin-moderation-control-tower";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Critical", "High", "Review", "Heuristic", "Confirmed", "Entitlement", "Threads"] as const;

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) return "Not recorded";
    const deltaMinutes = Math.round((timestamp - Date.now()) / 60_000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) return formatter.format(deltaHours, "hour");
    return formatter.format(Math.round(deltaHours / 24), "day");
}

function formatAbsoluteTime(timestamp?: number) {
    return timestamp && Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Not recorded";
}

function buildThreadLabel(input: { creatorUsername?: string; creatorDisplayName?: string; creatorId: string; userUsername?: string; userDisplayName?: string; userId: string }) {
    const creator = input.creatorUsername ? `@${input.creatorUsername.replace(/^@+/, "")}` : input.creatorDisplayName || input.creatorId;
    const user = input.userUsername ? `@${input.userUsername.replace(/^@+/, "")}` : input.userDisplayName || input.userId;
    return `${creator} / ${user}`;
}

function turnLabel(sender?: string) {
    if (sender === "admin") return "Reviewed by admin";
    if (sender === "creator") return "Creator context";
    return "User context";
}

function explainModerationRouteError(error: Error | null, route: string) {
    if (!error) {
        return `${route} source is not ready.`;
    }

    if (error.message === "Admin permission required.") {
        return "Admin permission required.";
    }

    if (error.message === "Not authenticated" || error.message === "Missing or invalid token") {
        return "collecting: admin access and source state are resolving.";
    }

    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return `${route} failed: ${safeError.operatorMessage}`;
}

export function AdminModerationConsole() {
    const [selectedThreadIdOverride, setSelectedThreadIdOverride] = useState<string | null>(null);
    const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
    const {
        threads,
        messages,
        alerts,
        isLoadingThreads,
        isLoadingMessages,
        isLoadingAlerts,
        threadsError,
        messagesError,
        alertsError,
        activeThreadId,
        adminSessionState,
    } = useAdminModerationRealtime(selectedThreadIdOverride);

    const model = useMemo(() => buildAdminModerationControlTowerModel({
        threads,
        alerts,
        threadsError,
        messagesError,
        alertsError,
        selectedAlertId,
    }), [alerts, alertsError, messagesError, selectedAlertId, threads, threadsError]);
    const selectedThread = useMemo(() => model.sortedThreads.find((thread) => thread.id === activeThreadId) || null, [activeThreadId, model.sortedThreads]);
    const attachments = useMemo(() => messages.filter((message) => Boolean(message.assetUrl || message.assetMimeType)), [messages]);
    const visibleAlerts = useMemo(() => model.sortedAlerts.filter((alert) => {
        if (filter === "All") return true;
        if (filter === "Critical") return alert.riskTier === "critical";
        if (filter === "High") return alert.riskTier === "high";
        if (filter === "Review") return alert.riskTier === "review";
        if (filter === "Heuristic") return alert.riskConfidence === "heuristic";
        if (filter === "Confirmed") return alert.riskConfidence === "confirmed";
        if (filter === "Entitlement") return alert.reasonCodes.some((code) => code.includes("entitlement"));
        return true;
    }), [filter, model.sortedAlerts]);
    const threadCountLabel = adminSessionState === "waiting_for_admin_session"
        ? "Waiting..."
        : adminSessionState === "local_fixture_source_missing"
            ? "No thread source"
        : threadsError
            ? "Thread source failed"
            : `${threads.length} threads`;
    const alertCountLabel = adminSessionState === "waiting_for_admin_session"
        ? "Waiting..."
        : adminSessionState === "local_fixture_source_missing"
            ? "No alert source"
        : alertsError
            ? "Alert source failed"
            : `${alerts.length} alerts`;
    const isLocalFixtureSourceMissing = adminSessionState === "local_fixture_source_missing";
    const statusLabel = isLoadingThreads || isLoadingMessages || isLoadingAlerts
        ? "Loading"
        : isLocalFixtureSourceMissing
            ? "No source"
            : model.failedDataSources > 0
                ? "Degraded"
                : "Ready";
    const riskPostureFacts = isLocalFixtureSourceMissing
        ? [
            ["Unresolved", "No source", "No risk-alert source loaded"],
            ["High/Critical", "No source", "No risk score source loaded"],
            ["Confirmed", "No source", "No server evidence source loaded"],
            ["Heuristic", "No source", "No heuristic evidence source loaded"],
            ["Sources", "No source", "permission_blocked: source reads require verified admin access"],
        ]
        : [
            ["Unresolved", model.unresolvedAlerts, "Risk alerts in feed"],
            ["High/Critical", model.highOrCriticalRiskCount, "Human review first"],
            ["Confirmed", model.confirmedEvidenceCount, "Server-backed evidence"],
            ["Heuristic", model.heuristicOnlyCount, "Never auto-punitive alone"],
            ["Sources", model.failedDataSources, model.failedDataSources > 0 ? "Partial / failed" : "Live"],
        ];

    function selectAlert(alertId: string) {
        setSelectedAlertId(alertId);
        const alert = model.sortedAlerts.find((item) => item.id === alertId);
        trackEvent("admin_moderation_alert_selected", {
            source_component: "AdminModerationConsole",
            alert_id: alertId,
            user_id: alert?.userId,
            drop_id: alert?.dropId,
            risk_score: alert?.riskScore,
            risk_tier: alert?.riskTier,
            confidence: alert?.riskConfidence,
        });
    }

    function actionClick(action: string) {
        const alert = model.selectedAlert;
        const payload = {
            source_component: "AdminModerationConsole",
            action,
            alert_id: alert?.id,
            user_id: alert?.userId,
            drop_id: alert?.dropId,
            risk_score: alert?.riskScore,
            risk_tier: alert?.riskTier,
            confidence: alert?.riskConfidence,
            reason_codes: alert?.reasonCodes,
        };
        trackEvent("admin_moderation_risk_action_clicked", payload);
        if (action === "reviewed") trackEvent("admin_moderation_alert_reviewed", payload);
        if (action === "dismissed_false_positive") trackEvent("admin_moderation_alert_dismissed_false_positive", payload);
        if (action === "escalated") trackEvent("admin_moderation_alert_escalated", payload);
    }

    return (
        <div
            className="min-w-0 space-y-4"
            data-admin-moderation-v2="real-risk-workspace"
            data-moderation-truth-state={isLocalFixtureSourceMissing ? "source_missing" : model.truthState}
            data-moderation-alert-count={model.unresolvedAlerts}
            data-moderation-selected-alert-id={model.selectedAlert?.id || "none"}
        >
            <PageViewEvent eventName="admin_moderation_viewed" />
            <AdminPageHeader compact eyebrow="Kandy risk operations" title="Risk posture and casefiles"
                subtitle="Creator chat review and server-backed security alerts are kept in one evidence-first decision lane."
                topSlot={(
                <label className="grid gap-2 text-sm font-medium">
                    Evidence lens
                    <NativeSelect
                        value={filter}
                        onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number])}
                        aria-label="Moderation evidence filter"
                    >
                        {FILTERS.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}
                    </NativeSelect>
                </label>
                )}
            />

            {isLocalFixtureSourceMissing ? (
                <div
                    className="relative rounded-[1.35rem] border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning"
                    data-admin-moderation-fixture-boundary="true"
                    data-admin-moderation-fixture-state="source_missing"
                >
                    <p className="font-bold">source_missing fixture.</p>
                    <p className="mt-1 text-xs leading-5 text-warning/80">
                        source_missing: moderation source is not loaded in this fixture. Protected evidence reads stay blocked until verified admin access provides the source.
                    </p>
                </div>
            ) : null}

            <section className="relative border-y border-border bg-background/15 px-4 py-4 sm:px-6" data-moderation-control-tower="risk-posture">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/65">Risk posture</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                        <span className="border border-primary/20 bg-primary/10 px-2 py-1 text-primary">Real evidence only</span>
                        <span className="border border-border bg-background/25 px-2 py-1 text-foreground">{statusLabel}</span>
                        <span className="border border-border bg-background/25 px-2 py-1 text-foreground">{threadCountLabel}</span>
                        <span className="border border-border bg-background/25 px-2 py-1 text-foreground">{alertCountLabel}</span>
                    </div>
                </div>
                <dl className="grid gap-px bg-secondary sm:grid-cols-2 xl:grid-cols-5">
                    {riskPostureFacts.map(([label, value, detail]) => (
                        <div key={label} className="bg-card px-3.5 py-3">
                            <dt className="text-[9px] font-semibold uppercase tracking-wide text-primary/55">{label}</dt>
                            <dd className="mt-2 text-2xl font-semibold leading-6 text-foreground">{value}</dd>
                            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                        </div>
                    ))}
                </dl>
            </section>

            <div className="relative grid min-h-0 gap-3 xl:grid-cols-[21rem_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <section className="overflow-hidden rounded-[1.6rem] border border-border bg-secondary shadow-none" data-moderation-thread-queue="compact">
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/55">Conversation queue</p>
                                <h2 className="mt-1 text-base font-semibold text-foreground">Linked threads</h2>
                            </div>
                            <span className="rounded-full border border-border bg-background/20 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{model.queueHealth}</span>
                        </div>
                        <TableScrollArea className="flex gap-2 overflow-x-auto p-3 xl:block xl:max-h-[27rem] xl:space-y-2 xl:overflow-y-auto">
                            {model.sortedThreads.slice(0, 12).map((thread) => {
                                const unreadCount = Math.max(thread.unreadCountForCreator, thread.unreadCountForUser);
                                const selected = activeThreadId === thread.id;
                                return (
                                    <Button variant="ghost"
                                        key={thread.id}
                                        type="button"
                                        onClick={() => setSelectedThreadIdOverride(thread.id)}
                                        aria-current={selected ? "true" : undefined}
                                        className={cn(
                                            "min-h-[116px] w-[18rem] shrink-0 rounded-2xl border px-3.5 py-3 text-left transition-colors xl:w-full",
                                            selected
                                                ? "border-primary/35 bg-primary/[0.13] shadow-none"
                                                : "border-border bg-background/15 hover:border-border hover:bg-secondary",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{buildThreadLabel(thread)}</p>
                                            {unreadCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary">{unreadCount}</span> : null}
                                        </div>
                                        <p className="mt-2 truncate text-xs text-muted-foreground">{thread.lastMessagePreview || "No messages yet"}</p>
                                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{formatRelativeTime(thread.lastMessageAt)}</p>
                                    </Button>
                                );
                            })}
                            {adminSessionState === "waiting_for_admin_session" ? <div className="p-3 text-xs text-muted-foreground">collecting: admin access and source state are resolving.</div> : null}
                            {isLocalFixtureSourceMissing ? <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">source_missing: moderation thread source is not loaded in this fixture.</div> : null}
                            {isLoadingThreads && threads.length === 0 ? <div className="p-3 text-xs text-muted-foreground">Loading queue...</div> : null}
                            {!isLoadingThreads && threads.length === 0 && !threadsError ? <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">{isLocalFixtureSourceMissing ? "source_missing: moderation thread evidence is not loaded in this fixture." : "No moderation threads linked."}</div> : null}
                            {threadsError ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{explainModerationRouteError(threadsError, "/api/admin/moderation/threads")}</div> : null}
                        </TableScrollArea>
                    </section>

                    <AdminModerationSecurityAlerts alerts={visibleAlerts} selectedAlertId={model.selectedAlert?.id} isLoading={isLoadingAlerts} error={alertsError} adminSessionState={adminSessionState} onSelectAlert={selectAlert} />
                </aside>

                <main className="min-h-[540px] overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-none" data-moderation-evidence-workspace="primary">
                    {model.selectedAlert ? (
                        <div className="flex min-h-[540px] flex-col">
                            <header className="border-b border-border bg-secondary px-4 py-4 sm:px-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">Evidence casefile</p>
                                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{model.selectedAlert.label}</h2>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{model.selectedAlert.message}</p>
                                    </div>
                                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.08] px-4 py-3 text-right">
                                        <p className="text-3xl font-semibold leading-7 text-foreground">{model.selectedAlert.riskScore}</p>
                                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70">{model.selectedAlert.riskTier} / {model.selectedAlert.riskConfidence}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-border bg-background/20 px-3 py-1.5 text-[10px] font-semibold text-foreground">False positive: {model.selectedAlert.falsePositiveRisk}</span>
                                    <span className="rounded-full border border-border bg-background/20 px-3 py-1.5 text-[10px] font-semibold text-foreground">{model.selectedAlert.evidenceCount} evidence</span>
                                    <span className="rounded-full border border-border bg-background/20 px-3 py-1.5 text-[10px] font-semibold text-foreground">{model.selectedAlert.sourceLabel}</span>
                                </div>
                            </header>

                            <div className="grid min-h-0 flex-1 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                                <section className="min-w-0 space-y-3">
                                    <article className="rounded-[1.35rem] border border-border bg-background/20 p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
                                            What was actually observed
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{model.selectedAlert.observedSummary}</p>
                                        <ul className="mt-4 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                                            {model.selectedAlert.positiveSignals.map((signal) => <li key={signal} className="rounded-xl border border-success/10 bg-success/[0.05] px-3 py-2">+ {signal}</li>)}
                                            {model.selectedAlert.negativeSignals.map((signal) => <li key={signal} className="rounded-xl border border-warning/10 bg-warning/[0.05] px-3 py-2">- {signal}</li>)}
                                        </ul>
                                    </article>

                                    <article className="rounded-[1.35rem] border border-border bg-background/20 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                                                Linked thread transcript
                                            </div>
                                            {selectedThread ? <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Protected context</span> : null}
                                        </div>
                                        {selectedThread ? (
                                            <div className="mt-3 max-h-[42dvh] space-y-2 overflow-y-auto pr-1" data-moderation-transcript-owner="primary-scroll-region">
                                                {messages.map((message) => (
                                                    <div key={message.id} className={cn("rounded-2xl border px-3.5 py-3", message.senderRole === "admin" ? "border-info/20 bg-info/[0.07]" : message.senderRole === "creator" ? "border-primary/20 bg-primary/[0.07]" : "border-border bg-secondary")}>
                                                        <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide">
                                                            <span className="text-foreground">{turnLabel(message.senderRole)}</span>
                                                            <span className="text-muted-foreground">{formatAbsoluteTime(message.createdAt)}</span>
                                                        </div>
                                                        {message.text ? <p className="text-sm leading-6 text-foreground">{message.text}</p> : null}
                                                    </div>
                                                ))}
                                                {adminSessionState === "waiting_for_admin_session" ? <div className="rounded-xl border border-border bg-background/15 p-3 text-xs text-muted-foreground">collecting: admin access and source state are resolving.</div> : null}
                                                {isLoadingMessages && messages.length === 0 ? <div className="rounded-xl border border-border bg-background/15 p-3 text-xs text-muted-foreground">Loading transcript...</div> : null}
                                                {messagesError ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive">{explainModerationRouteError(messagesError, "/api/admin/moderation/threads/[threadId]")}</div> : null}
                                            </div>
                                        ) : (
                                            <p className="mt-3 rounded-xl border border-dashed border-border bg-background/15 p-3 text-sm text-muted-foreground">No thread linked. Evidence-only alert.</p>
                                        )}
                                    </article>

                                    <section className="border-l-2 border-primary/45 bg-background/20 px-4 py-4" data-moderation-evidence-file-tray="true">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                                            Protected evidence files
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {attachments.length > 0 ? attachments.map((message) => <AdminEvidenceMediaPreview key={message.id} message={message} />) : <p className="rounded-xl border border-dashed border-border bg-background/15 p-3 text-sm text-muted-foreground">No files shared in the selected thread.</p>}
                                        </div>
                                    </section>
                                </section>

                                <aside className="space-y-3">
                                    <article className="rounded-[1.35rem] border border-border bg-secondary p-4">
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/55">Protected context</p>
                                        <h3 className="mt-1 text-base font-semibold text-foreground">Case details</h3>
                                        <div className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                                            <p><span className="font-semibold text-muted-foreground">User:</span> {model.selectedAlert.username || model.selectedAlert.userId || "Unknown"}</p>
                                            <p><span className="font-semibold text-muted-foreground">Drop:</span> {model.selectedAlert.dropId || "Not linked"}</p>
                                            <p><span className="font-semibold text-muted-foreground">Asset:</span> {model.selectedAlert.assetKey || "Not linked"}</p>
                                            <p><span className="font-semibold text-muted-foreground">Last seen:</span> {formatAbsoluteTime(model.selectedAlert.timestamp)}</p>
                                        </div>
                                    </article>
                                    <article className="rounded-[1.35rem] border border-primary/15 bg-primary/[0.06] p-4">
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/65">Review decision</p>
                                        <h3 className="mt-1 text-base font-semibold text-foreground">Operator actions</h3>
                                        <p className="mt-3 text-xs leading-5 text-muted-foreground">{model.selectedAlert.recommendedAction}</p>
                                        <div className="mt-4 grid gap-2">
                                            {["reviewed", "escalated", "dismissed_false_positive"].map((action) => (
                                                <Button variant="ghost" key={action} type="button" onClick={() => actionClick(action)} className="min-h-11 rounded-xl border border-border bg-background/20 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                                                    {action === "reviewed" ? "Mark reviewed" : action === "escalated" ? "Escalate" : "Dismiss false positive"}
                                                </Button>
                                            ))}
                                            <div data-moderation-action-state="not_configured" className="rounded-xl border border-border bg-background/20 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Not configured.</span> Account restrictions and file access blocks need a connected admin action source before they can run here.</div>
                                        </div>
                                    </article>
                                </aside>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-[32rem] flex-col items-center justify-center p-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/15 bg-primary/[0.08]">
                                <ShieldCheck className="h-8 w-8 text-primary/80" aria-hidden="true" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-foreground">No alert selected</h2>
                            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Select a risk alert. Empty workspaces stay compact and truthful instead of showing fake moderation tools.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
