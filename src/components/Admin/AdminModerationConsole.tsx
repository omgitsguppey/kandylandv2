"use client";

import { useMemo, useState } from "react";
import { FileText, MessageSquare, ShieldCheck, ShieldAlert } from "lucide-react";

import { AdminEvidenceMediaPreview } from "@/components/Admin/AdminEvidenceMediaPreview";
import { AdminModerationSecurityAlerts } from "@/components/Admin/AdminModerationSecurityAlerts";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
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
        return `${route} is unavailable.`;
    }

    if (error.message === "Admin permission required.") {
        return "Admin permission required.";
    }

    if (error.message === "Not authenticated" || error.message === "Missing or invalid token") {
        return "Waiting for admin session...";
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
            ? "Unavailable"
            : `${threads.length} threads`;
    const alertCountLabel = adminSessionState === "waiting_for_admin_session"
        ? "Waiting..."
        : adminSessionState === "local_fixture_source_missing"
            ? "No alert source"
        : alertsError
            ? "Alerts unavailable"
            : `${alerts.length} alerts`;
    const isLocalFixtureSourceMissing = adminSessionState === "local_fixture_source_missing";
    const statusLabel = isLoadingThreads || isLoadingMessages || isLoadingAlerts
        ? "Loading"
        : isLocalFixtureSourceMissing
            ? "No source"
            : model.failedDataSources > 0
                ? "Degraded"
                : "Ready";
    const summaryCards = isLocalFixtureSourceMissing
        ? [
            ["Unresolved", "No source", "No risk-alert source loaded"],
            ["High/Critical", "No source", "No risk score source loaded"],
            ["Confirmed", "No source", "No server evidence source loaded"],
            ["Heuristic", "No source", "No heuristic evidence source loaded"],
            ["Sources", "No source", "Real admin session required"],
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
            className="space-y-4 md:space-y-5"
            data-admin-moderation-v2="real-risk-workspace"
            data-moderation-truth-state={isLocalFixtureSourceMissing ? "source_missing" : model.truthState}
            data-moderation-alert-count={model.unresolvedAlerts}
            data-moderation-selected-alert-id={model.selectedAlert?.id || "none"}
        >
            <PageViewEvent eventName="admin_moderation_viewed" />
            <AdminPageHeader
                eyebrow="Admin Moderation"
                title="Moderation Control Tower"
                subtitle="Creator chat review and server-backed security alerts."
                compact
                actions={(
                    <>
                        <span className="rounded-full border border-brand-purple/30 bg-brand-purple/12 px-3 py-1 text-xs font-bold text-[#e4d4ff]">Real evidence only</span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white">{statusLabel}</span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white">{threadCountLabel}</span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white">{alertCountLabel}</span>
                    </>
                )}
            />

            {isLocalFixtureSourceMissing ? (
                <div
                    className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    data-admin-moderation-fixture-boundary="true"
                    data-admin-moderation-fixture-state="source_missing"
                >
                    <p className="font-bold">Local admin UI review only.</p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/80">
                        No verified moderation source is loaded in local review. A real admin session is required for thread transcripts, risk alerts, media evidence, and security-event samples.
                    </p>
                </div>
            ) : null}

            <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" data-moderation-control-tower="true">
                {summaryCards.map(([label, value, detail]) => (
                    <article key={label} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</p>
                        <p className="mt-2 text-2xl font-black text-white">{value}</p>
                        <p className="mt-1 text-xs text-gray-400">{detail}</p>
                    </article>
                ))}
            </section>

            <div className="flex flex-wrap gap-1.5 pb-1 sm:gap-2" aria-label="Moderation filters">
                {FILTERS.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setFilter(item)}
                        aria-pressed={filter === item}
                        className={cn("min-h-10 rounded-full border px-2.5 text-xs font-bold sm:min-h-11 sm:px-3 sm:text-sm", filter === item ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-white/[0.03] text-gray-300")}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <aside className="space-y-3">
                    <section className="rounded-2xl border border-white/10 bg-black/25 p-3" data-moderation-thread-queue="compact">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white">Threads</h2>
                            <span className="text-xs text-gray-500">{model.queueHealth}</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto xl:block xl:max-h-[26rem] xl:space-y-2 xl:overflow-y-auto">
                            {model.sortedThreads.slice(0, 12).map((thread) => {
                                const unreadCount = Math.max(thread.unreadCountForCreator, thread.unreadCountForUser);
                                const selected = activeThreadId === thread.id;
                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => setSelectedThreadIdOverride(thread.id)}
                                        aria-current={selected ? "true" : undefined}
                                        className={cn("min-h-11 w-[17rem] shrink-0 rounded-xl border p-3 text-left xl:w-full", selected ? "border-brand-purple/45 bg-brand-purple/12" : "border-white/10 bg-white/[0.03]")}
                                    >
                                        <p className="truncate text-sm font-bold text-white">{buildThreadLabel(thread)}</p>
                                        <p className="mt-1 truncate text-xs text-gray-400">{thread.lastMessagePreview || "No messages yet"}</p>
                                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                                            <span>{formatRelativeTime(thread.lastMessageAt)}</span>
                                            {unreadCount > 0 ? <span className="rounded-full bg-brand-purple px-2 py-0.5 font-bold text-white">{unreadCount}</span> : null}
                                        </div>
                                    </button>
                                );
                            })}
                            {adminSessionState === "waiting_for_admin_session" ? <div className="p-3 text-xs text-gray-400">Waiting for admin session...</div> : null}
                            {isLocalFixtureSourceMissing ? <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">No verified moderation thread source is loaded in local review.</div> : null}
                            {isLoadingThreads && threads.length === 0 ? <div className="p-3 text-xs text-gray-400">Loading queue...</div> : null}
                            {!isLoadingThreads && threads.length === 0 && !threadsError ? <div className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-gray-400">{isLocalFixtureSourceMissing ? "No moderation thread evidence is loaded for local review." : "No moderation threads linked."}</div> : null}
                            {threadsError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{explainModerationRouteError(threadsError, "/api/admin/moderation/threads")}</div> : null}
                        </div>
                    </section>

                    <AdminModerationSecurityAlerts alerts={visibleAlerts} selectedAlertId={model.selectedAlert?.id} isLoading={isLoadingAlerts} error={alertsError} adminSessionState={adminSessionState} onSelectAlert={selectAlert} />
                </aside>

                <main className="min-h-[520px] rounded-2xl border border-white/10 bg-black/25" data-moderation-evidence-workspace="primary">
                    {model.selectedAlert ? (
                        <div className="flex min-h-[520px] flex-col">
                            <header className="border-b border-white/10 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">Evidence workspace</p>
                                        <h2 className="mt-1 text-xl font-black text-white">{model.selectedAlert.label}</h2>
                                        <p className="mt-1 text-sm text-gray-400">{model.selectedAlert.message}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-white">{model.selectedAlert.riskScore}</p>
                                        <p className="text-xs font-bold uppercase text-gray-400">{model.selectedAlert.riskTier} / {model.selectedAlert.riskConfidence}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">False positive: {model.selectedAlert.falsePositiveRisk}</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">{model.selectedAlert.evidenceCount} evidence</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">{model.selectedAlert.sourceLabel}</span>
                                </div>
                            </header>

                            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_18rem]">
                                <section className="space-y-3">
                                    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                                            <ShieldAlert className="h-4 w-4 text-brand-purple" />
                                            What was actually observed
                                        </div>
                                        <p className="text-sm leading-6 text-gray-300">{model.selectedAlert.observedSummary}</p>
                                        <ul className="mt-3 space-y-2 text-xs text-gray-400">
                                            {model.selectedAlert.positiveSignals.map((signal) => <li key={signal}>+ {signal}</li>)}
                                            {model.selectedAlert.negativeSignals.map((signal) => <li key={signal}>- {signal}</li>)}
                                        </ul>
                                    </article>

                                    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                                            <MessageSquare className="h-4 w-4 text-brand-purple" />
                                            Linked thread transcript
                                        </div>
                                        {selectedThread ? (
                                            <div className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1" data-moderation-transcript-owner="primary-scroll-region">
                                                {messages.map((message) => (
                                                    <div key={message.id} className={cn("rounded-xl border p-3", message.senderRole === "admin" ? "border-cyan-400/20 bg-cyan-400/5" : message.senderRole === "creator" ? "border-brand-purple/25 bg-brand-purple/5" : "border-white/10 bg-white/[0.03]")}>
                                                        <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider">
                                                            <span className="text-white">{turnLabel(message.senderRole)}</span>
                                                            <span className="text-gray-500">{formatAbsoluteTime(message.createdAt)}</span>
                                                        </div>
                                                        {message.text ? <p className="text-sm leading-6 text-gray-200">{message.text}</p> : null}
                                                    </div>
                                                ))}
                                                {adminSessionState === "waiting_for_admin_session" ? <div className="text-xs text-gray-400">Waiting for admin session...</div> : null}
                                                {isLoadingMessages && messages.length === 0 ? <div className="text-xs text-gray-400">Loading transcript...</div> : null}
                                                {messagesError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{explainModerationRouteError(messagesError, "/api/admin/moderation/threads/[threadId]")}</div> : null}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No thread linked. Evidence-only alert.</p>
                                        )}
                                    </article>

                                    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                                            <FileText className="h-4 w-4 text-brand-purple" />
                                            Safe evidence media
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {attachments.length > 0 ? attachments.map((message) => <AdminEvidenceMediaPreview key={message.id} message={message} />) : <p className="text-sm text-gray-500">No files shared in the selected thread.</p>}
                                        </div>
                                    </article>
                                </section>

                                <aside className="space-y-3">
                                    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
                                        <h3 className="text-sm font-bold text-white">Context</h3>
                                        <div className="mt-3 space-y-2 text-xs text-gray-300">
                                            <p>User: {model.selectedAlert.username || model.selectedAlert.userId || "Unknown"}</p>
                                            <p>Drop: {model.selectedAlert.dropId || "Not linked"}</p>
                                            <p>Asset: {model.selectedAlert.assetKey || "Not linked"}</p>
                                            <p>Last seen: {formatAbsoluteTime(model.selectedAlert.timestamp)}</p>
                                        </div>
                                    </article>
                                    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
                                        <h3 className="text-sm font-bold text-white">Actions</h3>
                                        <p className="mt-2 text-xs leading-5 text-gray-400">{model.selectedAlert.recommendedAction}</p>
                                        <div className="mt-3 grid gap-2">
                                            {["reviewed", "escalated", "dismissed_false_positive"].map((action) => (
                                                <button key={action} type="button" onClick={() => actionClick(action)} className="min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white">
                                                    {action === "reviewed" ? "Mark reviewed" : action === "escalated" ? "Escalate" : "Dismiss false positive"}
                                                </button>
                                            ))}
                                            <button type="button" disabled data-moderation-action-state="not_implemented" className="min-h-11 rounded-full border border-white/10 bg-white/[0.02] px-3 text-sm font-bold text-gray-500">Restrict account unavailable</button>
                                            <button type="button" disabled data-moderation-action-state="not_implemented" className="min-h-11 rounded-full border border-white/10 bg-white/[0.02] px-3 text-sm font-bold text-gray-500">Disable file access unavailable</button>
                                        </div>
                                    </article>
                                </aside>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-[24rem] flex-col items-center justify-center p-6 text-center">
                            <ShieldCheck className="h-10 w-10 text-brand-purple" />
                            <h2 className="mt-3 text-lg font-black text-white">No alert selected</h2>
                            <p className="mt-1 max-w-sm text-sm text-gray-400">Select a risk alert. Empty workspaces stay compact and truthful instead of showing fake moderation tools.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
