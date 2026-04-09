"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import {
    AlertTriangle,
    FileText,
    LifeBuoy,
    MessageSquare,
    ShieldAlert,
} from "lucide-react";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { buildAdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import {
    CHAT_COLLECTIONS,
    type ChatThreadRecord,
} from "@/lib/chat";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { db } from "@/lib/firebase-data";
import { cn } from "@/lib/utils";

type ModerationMessageRecord = {
    id: string;
    threadId: string;
    creatorId: string;
    userId: string;
    senderRole: "creator" | "user" | "admin";
    messageKind: "text" | "image" | "video" | "broadcast";
    text?: string;
    assetUrl?: string;
    assetName?: string;
    assetMimeType?: string;
    costGd?: number;
    createdAt: number;
};

type SecurityEventRecord = {
    id: string;
    userId: string;
    username: string;
    label: string;
    message: string;
    reason: string;
    severity: "low" | "medium" | "high";
    detectionKind: string;
    pagePath: string | null;
    dropId: string | null;
    assetKey: string | null;
    timestamp: number;
};

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
    const normalized = toStringValue(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Not recorded";
    }

    const deltaMs = timestamp - Date.now();
    const deltaMinutes = Math.round(deltaMs / 60_000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(deltaMinutes) < 60) {
        return formatter.format(deltaMinutes, "minute");
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) {
        return formatter.format(deltaHours, "hour");
    }

    const deltaDays = Math.round(deltaHours / 24);
    return formatter.format(deltaDays, "day");
}

function formatAbsoluteTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Not recorded";
    }

    return new Date(timestamp).toLocaleString();
}

function statusTone(severity: SecurityEventRecord["severity"]) {
    if (severity === "high") {
        return "border-red-500/30 bg-red-500/10 text-red-100";
    }

    if (severity === "medium") {
        return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    }

    return "border-sky-400/30 bg-sky-400/10 text-sky-100";
}

function isImageAsset(message: ModerationMessageRecord) {
    return message.assetMimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(message.assetUrl ?? "");
}

function isVideoAsset(message: ModerationMessageRecord) {
    return message.assetMimeType?.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(message.assetUrl ?? "");
}

function buildThreadLabel(thread: ChatThreadRecord) {
    const creatorHandle = thread.creatorUsername ? `@${thread.creatorUsername.replace(/^@+/, "")}` : thread.creatorDisplayName || thread.creatorId;
    const userHandle = thread.userUsername ? `@${thread.userUsername.replace(/^@+/, "")}` : thread.userDisplayName || thread.userId;
    return `${creatorHandle} / ${userHandle}`;
}

export function AdminModerationConsole() {
    const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
    const [messages, setMessages] = useState<ModerationMessageRecord[]>([]);
    const [messageThreadId, setMessageThreadId] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<SecurityEventRecord[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [threadsLoaded, setThreadsLoaded] = useState(false);
    const [messagesLoaded, setMessagesLoaded] = useState(false);
    const [alertsLoaded, setAlertsLoaded] = useState(false);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [alertError, setAlertError] = useState<string | null>(null);

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
        [selectedThreadId, threads],
    );
    const visibleMessages = useMemo(
        () => (selectedThreadId && messageThreadId === selectedThreadId) ? messages : [],
        [messageThreadId, messages, selectedThreadId],
    );
    const messageDetailLoaded = !selectedThreadId || (messageThreadId === selectedThreadId && messagesLoaded);
    const attachmentMessages = useMemo(
        () => visibleMessages.filter((message) => Boolean(message.assetUrl)),
        [visibleMessages],
    );
    const recentHighSeverityAlerts = useMemo(
        () => alerts.filter((alert) => alert.severity === "high"),
        [alerts],
    );
    const alertReasonSummary = useMemo(() => {
        const counts = new Map<string, { label: string; count: number }>();
        alerts.forEach((alert) => {
            const current = counts.get(alert.reason) ?? { label: alert.label, count: 0 };
            current.count += 1;
            counts.set(alert.reason, current);
        });

        return Array.from(counts.entries())
            .map(([reason, value]) => ({
                reason,
                label: value.label,
                count: value.count,
            }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 6);
    }, [alerts]);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.threads), orderBy("lastMessageAt", "desc"), limit(80)),
            (snapshot) => {
                setThreadError(null);
                setThreadsLoaded(true);
                const nextThreads = snapshot.docs.map((docSnapshot) => ({
                    ...(docSnapshot.data() as ChatThreadRecord),
                    id: docSnapshot.id,
                })).sort((left, right) => right.lastMessageAt - left.lastMessageAt);
                setThreads(nextThreads);
                setSelectedThreadId((current) => {
                    if (current && nextThreads.some((thread) => thread.id === current)) {
                        return current;
                    }

                    return nextThreads[0]?.id ?? null;
                });
            },
            (error) => {
                setThreadsLoaded(true);
                setThreadError(error.message || "Live moderation thread stream failed.");
                reportRealtimeIssue("admin moderation threads", error);
            },
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedThreadId) {
            return;
        }

        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.messages), where("threadId", "==", selectedThreadId)),
            (snapshot) => {
                setMessageError(null);
                setMessagesLoaded(true);
                setMessageThreadId(selectedThreadId);
                const nextMessages = snapshot.docs.map((docSnapshot) => ({
                    ...(docSnapshot.data() as ModerationMessageRecord),
                    id: docSnapshot.id,
                })).sort((left, right) => left.createdAt - right.createdAt);
                setMessages(nextMessages);
            },
            (error) => {
                setMessagesLoaded(true);
                setMessageError(error.message || "Thread message stream failed.");
                reportRealtimeIssue("admin moderation thread detail", error, {
                    threadId: selectedThreadId,
                });
            },
        );

        return () => unsubscribe();
    }, [selectedThreadId]);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(80)),
            (snapshot) => {
                setAlertError(null);
                setAlertsLoaded(true);
                setAlerts(snapshot.docs.map((docSnapshot) => {
                    const data = docSnapshot.data() as Record<string, unknown>;
                    return {
                        id: docSnapshot.id,
                        userId: toStringValue(data.userId),
                        username: toStringValue(data.username) || "Unknown user",
                        label: toStringValue(data.label) || "Security event",
                        message: toStringValue(data.message) || "Security event logged.",
                        reason: toStringValue(data.reason) || "unknown",
                        severity: (data.severity === "high" || data.severity === "medium" || data.severity === "low") ? data.severity : "medium",
                        detectionKind: toStringValue(data.detectionKind) || "runtime",
                        pagePath: toNullableString(data.pagePath),
                        dropId: toNullableString(data.dropId),
                        assetKey: toNullableString(data.assetKey),
                        timestamp: toNumber(data.timestamp),
                    } satisfies SecurityEventRecord;
                }));
            },
            (error) => {
                setAlertsLoaded(true);
                setAlertError(error.message || "Security alert stream failed.");
                reportRealtimeIssue("admin moderation security alerts", error);
            },
        );

        return () => unsubscribe();
    }, []);

    const moderationHealthItems = useMemo(() => [
        buildAdminUiChartHealthItem({
            key: "moderation.live_chat_threads",
            title: "Live chat threads",
            page: "moderation",
            category: "operations",
            source: "mixed_client_live",
            hasLoaded: threadsLoaded,
            loading: !threadsLoaded,
            hasData: threadsLoaded,
            blockingIssues: threadError ? [threadError] : [],
            healthySummary: `${threads.length} live chat threads are visible in moderation.`,
            emptySummary: "The live chat thread stream is connected but there are no visible creator conversations yet.",
        }),
        buildAdminUiChartHealthItem({
            key: "moderation.thread_detail",
            title: "Selected thread detail",
            page: "moderation",
            category: "operations",
            source: "mixed_client_live",
            hasLoaded: messageDetailLoaded,
            loading: !messageDetailLoaded,
            hasData: Boolean(selectedThreadId) ? messageDetailLoaded : true,
            blockingIssues: messageError ? [messageError] : [],
            healthySummary: selectedThreadId
                ? `${visibleMessages.length} messages are loaded for the selected moderation thread.`
                : "No moderation thread is selected yet, but the detail lane is ready.",
            emptySummary: "The selected thread is connected but has no messages yet.",
        }),
        buildAdminUiChartHealthItem({
            key: "moderation.security_alerts",
            title: "Security alerts",
            page: "moderation",
            category: "security",
            source: "mixed_client_live",
            hasLoaded: alertsLoaded,
            loading: !alertsLoaded,
            hasData: alertsLoaded,
            blockingIssues: alertError ? [alertError] : [],
            healthySummary: alerts.length > 0
                ? `${alerts.length} live security alerts are visible in moderation.`
                : "The security stream is connected and there are no recent alerts in the current window.",
            emptySummary: "The security stream is connected and there are no recent alerts in the current window.",
        }),
    ], [alertError, alerts.length, alertsLoaded, messageDetailLoaded, messageError, selectedThreadId, threadError, threads.length, threadsLoaded, visibleMessages.length]);

    useAdminUiChartHealthReporter(moderationHealthItems);

    return (
        <div className="space-y-4">
            <PageViewEvent eventName="admin_moderation_viewed" />
            <AdminPageHeader
                eyebrow="Admin Moderation"
                title="Content Moderation"
                subtitle="Live creator chat oversight and live security alerts in one place. This surface is backed by realtime Firestore reads, not simulated analytics cards."
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            {threads.length} live threads
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            {alerts.length} security alerts
                        </span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                            Live Firestore streams
                        </span>
                    </>
                )}
            />

            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                    <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-white">Live chat threads</h2>
                                <p className="mt-1 text-xs leading-5 text-gray-400">Every creator-to-fan thread, with unread counts, last activity, and the current last message.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">
                                Realtime
                            </span>
                        </div>

                        <div className="space-y-3">
                            {threads.map((thread) => {
                                const unreadCount = Math.max(thread.unreadCountForCreator ?? 0, thread.unreadCountForUser ?? 0);
                                const counterpartLabel = buildThreadLabel(thread);
                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => setSelectedThreadId(thread.id)}
                                        className={cn(
                                            "w-full rounded-[1.35rem] border p-3 text-left transition-colors",
                                            selectedThreadId === thread.id
                                                ? "border-brand-purple/40 bg-brand-purple/10"
                                                : "border-white/10 bg-white/[0.03]",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{counterpartLabel}</p>
                                                <p className="mt-1 truncate text-xs text-gray-400">{thread.lastMessagePreview || "No messages yet"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-gray-400">{formatRelativeTime(thread.lastMessageAt)}</p>
                                                {unreadCount > 0 ? (
                                                    <span className="mt-1 inline-flex rounded-full border border-brand-purple/30 bg-brand-purple/12 px-2 py-0.5 text-[10px] font-bold text-brand-purple">
                                                        {unreadCount} unread
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                            <span>Creator {thread.creatorUsername ? `@${thread.creatorUsername}` : thread.creatorId}</span>
                                            <span>User {thread.userUsername ? `@${thread.userUsername}` : thread.userId}</span>
                                            <span>{thread.subscriberChatFree ? "Subscriber free chat" : "Paid fan send"}</span>
                                        </div>
                                    </button>
                                );
                            })}

                            {!threadsLoaded ? (
                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">Connecting live thread stream...</div>
                            ) : null}
                            {threadsLoaded && threads.length === 0 ? (
                                <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">No creator chat threads are visible yet.</div>
                            ) : null}
                            {threadError ? (
                                <div className="rounded-[1.35rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{threadError}</div>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-white">Security alerts</h2>
                                <p className="mt-1 text-xs leading-5 text-gray-400">Live screenshot, recording, save, and viewer-protection detections have been moved out of analytics and into moderation.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">
                                {recentHighSeverityAlerts.length} high
                            </span>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {alertReasonSummary.length > 0 ? alertReasonSummary.map((item) => (
                                <span key={item.reason} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white">
                                    {item.label} · {item.count}
                                </span>
                            )) : (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100">
                                    No recent alerts
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {alerts.slice(0, 10).map((alert) => (
                                <div key={alert.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-white">{alert.username}</p>
                                                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", statusTone(alert.severity))}>
                                                    {alert.severity}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-white">{alert.label}</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">{alert.message}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-400">{formatRelativeTime(alert.timestamp)}</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                        {alert.pagePath ? <span>{alert.pagePath}</span> : null}
                                        {alert.dropId ? <span>Drop {alert.dropId}</span> : null}
                                        {alert.assetKey ? <span>{alert.assetKey}</span> : null}
                                    </div>
                                </div>
                            ))}

                            {!alertsLoaded ? (
                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">Connecting live security stream...</div>
                            ) : null}
                            {alertError ? (
                                <div className="rounded-[1.35rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{alertError}</div>
                            ) : null}
                        </div>
                    </section>
                </div>

                <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Selected thread</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">Live transcript plus exchanged files for the currently selected creator conversation.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">
                            {visibleMessages.length} messages
                        </span>
                    </div>
                    {selectedThread ? (
                        <>
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        Creator {selectedThread.creatorUsername ? `@${selectedThread.creatorUsername}` : selectedThread.creatorDisplayName || selectedThread.creatorId}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        User {selectedThread.userUsername ? `@${selectedThread.userUsername}` : selectedThread.userDisplayName || selectedThread.userId}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        {selectedThread.subscriberChatFree ? "Subscriber free chat on" : "Paid fan messages"}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        Updated {formatRelativeTime(selectedThread.lastMessageAt)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                                        <LifeBuoy className="h-4 w-4 text-brand-purple" />
                                        Files exchanged
                                    </div>
                                    <div className="space-y-3">
                                        {attachmentMessages.length > 0 ? attachmentMessages.map((message) => (
                                            <div key={message.id} className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <span className="text-xs font-semibold text-white">
                                                        {message.senderRole === "creator" ? "Creator" : message.senderRole === "admin" ? "Admin" : "Fan"}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">{formatRelativeTime(message.createdAt)}</span>
                                                </div>
                                                {isImageAsset(message) && message.assetUrl ? (
                                                    <a href={message.assetUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-white/10">
                                                        <img src={message.assetUrl} alt={message.assetName || "Shared image"} className="h-40 w-full object-cover" />
                                                    </a>
                                                ) : null}
                                                {isVideoAsset(message) && message.assetUrl ? (
                                                    <video controls className="w-full rounded-2xl border border-white/10 bg-black/40">
                                                        <source src={message.assetUrl} type={message.assetMimeType || undefined} />
                                                    </video>
                                                ) : null}
                                                {!isImageAsset(message) && !isVideoAsset(message) && message.assetUrl ? (
                                                    <a href={message.assetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">
                                                        <FileText className="h-4 w-4 text-brand-purple" />
                                                        {message.assetName || "Open file"}
                                                    </a>
                                                ) : null}
                                            </div>
                                        )) : (
                                            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                                No files have been exchanged in this thread yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                                        <MessageSquare className="h-4 w-4 text-brand-purple" />
                                        Live transcript
                                    </div>
                                    <div className="max-h-[42rem] space-y-3 overflow-auto pr-1">
                                        {visibleMessages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={cn(
                                                    "rounded-[1.2rem] border p-3",
                                                    message.senderRole === "creator"
                                                        ? "border-brand-purple/25 bg-brand-purple/10"
                                                        : message.senderRole === "admin"
                                                            ? "border-cyan-400/20 bg-cyan-400/10"
                                                            : "border-white/10 bg-black/25",
                                                )}
                                            >
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                                                        {message.senderRole === "creator" ? <MessageSquare className="h-4 w-4 text-brand-purple" /> : null}
                                                        {message.senderRole === "admin" ? <ShieldAlert className="h-4 w-4 text-cyan-300" /> : null}
                                                        {message.senderRole === "user" ? <AlertTriangle className="h-4 w-4 text-gray-300" /> : null}
                                                        <span>{message.senderRole === "creator" ? "Creator" : message.senderRole === "admin" ? "Admin" : "Fan"}</span>
                                                        <span className="text-gray-500">·</span>
                                                        <span className="text-gray-400">{message.messageKind}</span>
                                                    </div>
                                                    <span className="text-[11px] text-gray-400">{formatAbsoluteTime(message.createdAt)}</span>
                                                </div>

                                                {message.text ? <p className="text-sm leading-6 text-white">{message.text}</p> : null}
                                                {message.assetUrl ? (
                                                    <div className="mt-3">
                                                        {isImageAsset(message) ? (
                                                            <a href={message.assetUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-white/10">
                                                                <img src={message.assetUrl} alt={message.assetName || "Shared image"} className="max-h-72 w-full object-cover" />
                                                            </a>
                                                        ) : isVideoAsset(message) ? (
                                                            <video controls className="w-full rounded-2xl border border-white/10 bg-black/40">
                                                                <source src={message.assetUrl} type={message.assetMimeType || undefined} />
                                                            </video>
                                                        ) : (
                                                            <a href={message.assetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">
                                                                <FileText className="h-4 w-4 text-brand-purple" />
                                                                {message.assetName || "Open file"}
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                                    {typeof message.costGd === "number" && message.costGd > 0 ? <span>{message.costGd} GD</span> : null}
                                                    {message.assetMimeType ? <span>{message.assetMimeType}</span> : null}
                                                </div>
                                            </div>
                                        ))}

                                        {!messageDetailLoaded ? (
                                            <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4 text-sm text-gray-400">Connecting live message stream...</div>
                                        ) : null}
                                        {messageDetailLoaded && visibleMessages.length === 0 ? (
                                            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                                This thread exists but has no messages yet.
                                            </div>
                                        ) : null}
                                        {messageError ? (
                                            <div className="rounded-[1.2rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{messageError}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                            Select a live creator thread to inspect the transcript and exchanged files.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
