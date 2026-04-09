"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { FileText, Loader2, MessageSquare, RefreshCw } from "lucide-react";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import {
    type AdminModerationSecurityAlertsResponse,
    type AdminModerationThreadDetailResponse,
    type AdminModerationThreadsResponse,
} from "@/lib/admin-moderation";
import { buildAdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
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

function formatAbsoluteTime(timestamp?: number) {
    return timestamp && Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Not recorded";
}

function buildThreadLabel(input: {
    creatorUsername?: string;
    creatorDisplayName?: string;
    creatorId: string;
    userUsername?: string;
    userDisplayName?: string;
    userId: string;
}) {
    const creator = input.creatorUsername ? `@${input.creatorUsername.replace(/^@+/, "")}` : input.creatorDisplayName || input.creatorId;
    const user = input.userUsername ? `@${input.userUsername.replace(/^@+/, "")}` : input.userDisplayName || input.userId;
    return `${creator} / ${user}`;
}

function isImageAsset(assetUrl?: string, assetMimeType?: string) {
    return assetMimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(assetUrl ?? "");
}

function isVideoAsset(assetUrl?: string, assetMimeType?: string) {
    return assetMimeType?.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(assetUrl ?? "");
}

function statusTone(severity: "low" | "medium" | "high") {
    if (severity === "high") return "border-red-500/30 bg-red-500/10 text-red-100";
    if (severity === "medium") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    return "border-sky-400/30 bg-sky-400/10 text-sky-100";
}

export function AdminModerationConsole() {
    const [selectedThreadIdOverride, setSelectedThreadIdOverride] = useState<string | null>(null);
    const threadsRequest = useAdminPollingSWR<AdminModerationThreadsResponse>("/api/admin/moderation/threads", 10_000, {
        keepPreviousData: true,
    });
    const threads = useMemo(() => threadsRequest.data?.threads ?? [], [threadsRequest.data?.threads]);
    const selectedThreadId = useMemo(() => {
        if (selectedThreadIdOverride && threads.some((thread) => thread.id === selectedThreadIdOverride)) {
            return selectedThreadIdOverride;
        }

        return threads[0]?.id ?? null;
    }, [selectedThreadIdOverride, threads]);
    const detailRequest = useAdminPollingSWR<AdminModerationThreadDetailResponse>(
        selectedThreadId ? `/api/admin/moderation/threads/${selectedThreadId}` : null,
        selectedThreadId ? 3_000 : 5_000,
        { keepPreviousData: true },
    );
    const alertsRequest = useAdminPollingSWR<AdminModerationSecurityAlertsResponse>("/api/admin/moderation/security-alerts", 12_000, {
        keepPreviousData: true,
    });

    const alerts = useMemo(() => alertsRequest.data?.alerts ?? [], [alertsRequest.data?.alerts]);
    const selectedThread = detailRequest.data?.thread ?? null;
    const messages = useMemo(() => detailRequest.data?.messages ?? [], [detailRequest.data?.messages]);
    const attachments = useMemo(() => messages.filter((message) => Boolean(message.assetUrl)), [messages]);
    const highAlerts = useMemo(() => alerts.filter((alert) => alert.severity === "high").length, [alerts]);

    const moderationHealthItems = useMemo(() => ([
        buildAdminUiChartHealthItem({
            key: "moderation.live_chat_threads",
            title: "Moderation chat threads",
            page: "moderation",
            category: "operations",
            source: "mixed_client_live",
            updatedAtMs: threadsRequest.data?.generatedAtMs ?? 0,
            hasLoaded: Boolean(threadsRequest.data) || Boolean(threadsRequest.error),
            loading: threadsRequest.isLoading,
            hasData: Boolean(threadsRequest.data),
            blockingIssues: threadsRequest.error ? [threadsRequest.error instanceof Error ? threadsRequest.error.message : "Moderation threads failed."] : [],
            healthySummary: `${threads.length} moderation threads loaded from the server-backed moderation API.`,
            emptySummary: "No moderation threads are visible in the current server window.",
        }),
        buildAdminUiChartHealthItem({
            key: "moderation.thread_detail",
            title: "Moderation thread detail",
            page: "moderation",
            category: "operations",
            source: "mixed_client_live",
            updatedAtMs: detailRequest.data?.generatedAtMs ?? 0,
            hasLoaded: !selectedThreadId || Boolean(detailRequest.data) || Boolean(detailRequest.error),
            loading: Boolean(selectedThreadId) && detailRequest.isLoading,
            hasData: !selectedThreadId || Boolean(detailRequest.data),
            blockingIssues: detailRequest.error ? [detailRequest.error instanceof Error ? detailRequest.error.message : "Moderation thread detail failed."] : [],
            healthySummary: selectedThreadId ? `${messages.length} moderation messages are loaded for the selected thread.` : "No moderation thread is selected yet.",
            emptySummary: "The selected moderation thread returned no messages in this poll window.",
        }),
        buildAdminUiChartHealthItem({
            key: "moderation.security_alerts",
            title: "Moderation security alerts",
            page: "moderation",
            category: "security",
            source: "mixed_client_live",
            updatedAtMs: alertsRequest.data?.generatedAtMs ?? 0,
            hasLoaded: Boolean(alertsRequest.data) || Boolean(alertsRequest.error),
            loading: alertsRequest.isLoading,
            hasData: Boolean(alertsRequest.data),
            blockingIssues: alertsRequest.error ? [alertsRequest.error instanceof Error ? alertsRequest.error.message : "Moderation security alerts failed."] : [],
            healthySummary: `${alerts.length} security alerts loaded from the moderation API.`,
            emptySummary: "No security alerts are visible in the current moderation window.",
        }),
    ]), [alerts.length, alertsRequest.data, alertsRequest.error, alertsRequest.isLoading, detailRequest.data, detailRequest.error, detailRequest.isLoading, messages.length, selectedThreadId, threads.length, threadsRequest.data, threadsRequest.error, threadsRequest.isLoading]);

    useAdminUiChartHealthReporter(moderationHealthItems);

    const refreshNow = async () => {
        await Promise.all([threadsRequest.mutate(), detailRequest.mutate(), alertsRequest.mutate()]);
    };

    return (
        <div className="space-y-4">
            <PageViewEvent eventName="admin_moderation_viewed" />
            <AdminPageHeader
                eyebrow="Admin Moderation"
                title="Content Moderation"
                subtitle="Server-backed creator chat oversight and security alerts. This surface uses admin APIs with automatic polling, not client Firestore subscriptions."
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">{threads.length} threads</span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">{alerts.length} alerts</span>
                        <button type="button" onClick={refreshNow} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/10">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh now
                        </button>
                    </>
                )}
            />

            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                    <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-white">Chat threads</h2>
                                <p className="mt-1 text-xs leading-5 text-gray-400">Server-backed thread list with unread counts and latest previews.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">{threadsRequest.data?.generatedAtMs ? `Updated ${formatRelativeTime(threadsRequest.data.generatedAtMs)}` : "Waiting"}</span>
                        </div>
                        <div className="space-y-3">
                            {threads.map((thread) => {
                                const unreadCount = Math.max(thread.unreadCountForCreator, thread.unreadCountForUser);
                                return (
                                    <button key={thread.id} type="button" onClick={() => setSelectedThreadIdOverride(thread.id)} className={cn("w-full rounded-[1.35rem] border p-3 text-left transition-colors", selectedThreadId === thread.id ? "border-brand-purple/40 bg-brand-purple/10" : "border-white/10 bg-white/[0.03]")}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{buildThreadLabel(thread)}</p>
                                                <p className="mt-1 truncate text-xs text-gray-400">{thread.lastMessagePreview || "No messages yet"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-gray-400">{formatRelativeTime(thread.lastMessageAt)}</p>
                                                {unreadCount > 0 ? <span className="mt-1 inline-flex rounded-full border border-brand-purple/30 bg-brand-purple/12 px-2 py-0.5 text-[10px] font-bold text-brand-purple">{unreadCount} unread</span> : null}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {threadsRequest.isLoading && !threadsRequest.data ? <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading moderation threads...</div> : null}
                            {!threadsRequest.isLoading && threads.length === 0 && !threadsRequest.error ? <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">No creator chat threads are visible yet.</div> : null}
                            {threadsRequest.error ? <div className="rounded-[1.35rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{threadsRequest.error instanceof Error ? threadsRequest.error.message : "Moderation thread reads failed."}</div> : null}
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-white">Security alerts</h2>
                                <p className="mt-1 text-xs leading-5 text-gray-400">This is the primary operational surface for viewer-protection detections.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">{highAlerts} high</span>
                        </div>
                        <div className="space-y-3">
                            {alerts.slice(0, 10).map((alert) => (
                                <div key={alert.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-white">{alert.username}</p>
                                                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", statusTone(alert.severity))}>{alert.severity}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-white">{alert.label}</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">{alert.message}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-400">{formatRelativeTime(alert.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                            {alertsRequest.isLoading && !alertsRequest.data ? <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading security alerts...</div> : null}
                            {alertsRequest.error ? <div className="rounded-[1.35rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{alertsRequest.error instanceof Error ? alertsRequest.error.message : "Moderation security alerts failed."}</div> : null}
                        </div>
                    </section>
                </div>

                <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Selected thread</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">Transcript and exchanged files for the selected creator conversation.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">{detailRequest.data?.generatedAtMs ? `Updated ${formatRelativeTime(detailRequest.data.generatedAtMs)}` : "Waiting"}</span>
                    </div>
                    {selectedThread ? (
                        <div className="space-y-4">
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap gap-2 text-[11px] text-white">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Creator {selectedThread.creatorUsername ? `@${selectedThread.creatorUsername}` : selectedThread.creatorId}</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">User {selectedThread.userUsername ? `@${selectedThread.userUsername}` : selectedThread.userId}</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{selectedThread.subscriberChatFree ? "Subscriber free chat on" : "Paid fan messages"}</span>
                                </div>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400"><FileText className="h-4 w-4 text-brand-purple" />Files</div>
                                    <div className="space-y-3">
                                        {attachments.length > 0 ? attachments.map((message) => (
                                            <div key={message.id} className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <span className="text-xs font-semibold text-white">{message.senderRole}</span>
                                                    <span className="text-[11px] text-gray-400">{formatRelativeTime(message.createdAt)}</span>
                                                </div>
                                                {isImageAsset(message.assetUrl, message.assetMimeType) && message.assetUrl ? <a href={message.assetUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-white/10"><img src={message.assetUrl} alt={message.assetName || "Shared image"} className="h-40 w-full object-cover" /></a> : null}
                                                {isVideoAsset(message.assetUrl, message.assetMimeType) && message.assetUrl ? <video controls className="w-full rounded-2xl border border-white/10 bg-black/40"><source src={message.assetUrl} type={message.assetMimeType || undefined} /></video> : null}
                                                {!isImageAsset(message.assetUrl, message.assetMimeType) && !isVideoAsset(message.assetUrl, message.assetMimeType) && message.assetUrl ? <a href={message.assetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white"><FileText className="h-4 w-4 text-brand-purple" />{message.assetName || "Open file"}</a> : null}
                                            </div>
                                        )) : <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">No files have been exchanged in this thread yet.</div>}
                                    </div>
                                </div>
                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400"><MessageSquare className="h-4 w-4 text-brand-purple" />Transcript</div>
                                    <div className="max-h-[42rem] space-y-3 overflow-auto pr-1">
                                        {messages.map((message) => (
                                            <div key={message.id} className={cn("rounded-[1.2rem] border p-3", message.senderRole === "creator" ? "border-brand-purple/25 bg-brand-purple/10" : message.senderRole === "admin" ? "border-cyan-400/20 bg-cyan-400/10" : "border-white/10 bg-black/25")}>
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-white"><span>{message.senderRole}</span><span className="text-gray-500">·</span><span className="text-gray-400">{message.messageKind}</span></div>
                                                    <span className="text-[11px] text-gray-400">{formatAbsoluteTime(message.createdAt)}</span>
                                                </div>
                                                {message.text ? <p className="text-sm leading-6 text-white">{message.text}</p> : null}
                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">{message.costGd > 0 ? <span>{message.costGd} GD</span> : null}{message.assetMimeType ? <span>{message.assetMimeType}</span> : null}</div>
                                            </div>
                                        ))}
                                        {detailRequest.isLoading && !detailRequest.data ? <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4 text-sm text-gray-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading thread detail...</div> : null}
                                        {!detailRequest.isLoading && messages.length === 0 && !detailRequest.error ? <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">This thread exists but has no messages yet.</div> : null}
                                        {detailRequest.error ? <div className="rounded-[1.2rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{detailRequest.error instanceof Error ? detailRequest.error.message : "Moderation thread detail failed."}</div> : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">Select a moderation thread to inspect its transcript and exchanged files.</div>
                    )}
                </section>
            </div>
        </div>
    );
}
