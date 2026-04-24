"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { FileText, Loader2, MessageSquare, Activity } from "lucide-react";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAdminModerationRealtime } from "@/hooks/useAdminModerationRealtime";
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
    if (severity === "high") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (severity === "medium") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    return "border-sky-400/30 bg-sky-400/10 text-sky-300";
}

function confidenceTone(confidence: "confirmed" | "heuristic" | undefined) {
    if (confidence === "confirmed") return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    return "border-gray-500/40 bg-gray-500/15 text-gray-400";
}

export function AdminModerationConsole() {
    const [selectedThreadIdOverride, setSelectedThreadIdOverride] = useState<string | null>(null);
    
    // Wire up true realtime hooks
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
    } = useAdminModerationRealtime(selectedThreadIdOverride);

    const selectedThreadId = activeThreadId;

    const selectedThread = useMemo(() => threads.find(t => t.id === selectedThreadId) || null, [threads, selectedThreadId]);
    const attachments = useMemo(() => messages.filter((message) => Boolean(message.assetUrl)), [messages]);
    const highAlerts = useMemo(() => alerts.filter((alert) => alert.severity === "high").length, [alerts]);

    return (
        <div className="space-y-4 md:space-y-5">
            <PageViewEvent eventName="admin_moderation_viewed" />
            <AdminPageHeader
                eyebrow="Admin Moderation"
                title="Moderation Console"
                subtitle="Realtime creator chat oversight and clustered security alerts."
                compact
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white">{threads.length} threads</span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white">{alerts.length} alerts</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                            <Activity className="h-3.5 w-3.5" />
                            Live
                        </span>
                    </>
                )}
            />

            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-4">
                    {/* Chat Threads List */}
                    <section className="glass-panel rounded-2xl p-4 flex flex-col h-full max-h-[40vh] xl:max-h-[50vh] overflow-hidden">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white">Queue</h2>
                        </div>
                        <div className="space-y-2 overflow-y-auto pr-1">
                            {threads.map((thread) => {
                                const unreadCount = Math.max(thread.unreadCountForCreator, thread.unreadCountForUser);
                                return (
                                    <button 
                                        key={thread.id} 
                                        type="button" 
                                        onClick={() => setSelectedThreadIdOverride(thread.id)} 
                                        className={cn(
                                            "w-full rounded-xl border p-2.5 text-left transition-colors flex items-center justify-between gap-3", 
                                            selectedThreadId === thread.id 
                                                ? "border-brand-purple/40 bg-brand-purple/10" 
                                                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-white">{buildThreadLabel(thread)}</p>
                                            <p className="truncate text-[10px] text-gray-400 mt-0.5">{thread.lastMessagePreview || "No messages yet"}</p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] text-gray-500">{formatRelativeTime(thread.lastMessageAt)}</span>
                                            {unreadCount > 0 ? (
                                                <span className="mt-1 rounded border border-brand-purple/30 bg-brand-purple/12 px-1.5 py-0.5 text-[9px] font-bold text-brand-purple">
                                                    {unreadCount} unread
                                                </span>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                            {isLoadingThreads && threads.length === 0 ? <div className="p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" />Loading queue...</div> : null}
                            {!isLoadingThreads && threads.length === 0 && !threadsError ? <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">No active chat threads.</div> : null}
                            {threadsError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">Failed to load threads.</div> : null}
                        </div>
                    </section>

                    {/* Security Alerts */}
                    <section className="glass-panel rounded-2xl p-4 flex flex-col h-full max-h-[40vh] xl:max-h-[50vh] overflow-hidden">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white">Security Alerts</h2>
                            {highAlerts > 0 && <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">{highAlerts} High</span>}
                        </div>
                        <div className="space-y-2 overflow-y-auto pr-1">
                            {alerts.slice(0, 20).map((alert) => (
                                <div key={alert.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="truncate text-xs font-bold text-white">{alert.username}</p>
                                            {alert.repeatCount && alert.repeatCount > 1 ? (
                                                <span className="rounded border border-orange-500/40 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300">
                                                    {alert.repeatCount}x Burst
                                                </span>
                                            ) : null}
                                        </div>
                                        <span className="shrink-0 text-[10px] text-gray-500">{formatRelativeTime(alert.timestamp)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", statusTone(alert.severity))}>{alert.severity}</span>
                                        <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", confidenceTone(alert.confidence))}>{alert.confidence === "confirmed" ? "Confirmed" : "Suspected"}</span>
                                        <span className="truncate text-[11px] text-gray-300">{alert.label}</span>
                                    </div>
                                </div>
                            ))}
                            {isLoadingAlerts && alerts.length === 0 ? <div className="p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" />Loading alerts...</div> : null}
                            {alertsError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">Alert stream failed.</div> : null}
                        </div>
                    </section>
                </div>

                {/* Selected Thread Workspace */}
                <section className="glass-panel rounded-2xl flex flex-col h-[85vh] xl:h-[100vh] overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <h2 className="text-sm font-bold text-white">Workspace</h2>
                        {selectedThread && (
                            <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider">
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Cr: {selectedThread.creatorUsername || selectedThread.creatorId.substring(0, 8)}</span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Usr: {selectedThread.userUsername || selectedThread.userId.substring(0, 8)}</span>
                            </div>
                        )}
                    </div>
                    
                    {selectedThread ? (
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
                            {/* Transcript */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Transcript
                                </div>
                                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                                    {messages.map((message) => (
                                        <div key={message.id} className={cn(
                                            "rounded-xl border p-2.5", 
                                            message.senderRole === "creator" ? "border-brand-purple/25 bg-brand-purple/5" 
                                            : message.senderRole === "admin" ? "border-cyan-400/20 bg-cyan-400/5" 
                                            : "border-white/5 bg-black/20"
                                        )}>
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                                    <span className="text-white">{message.senderRole}</span>
                                                    <span className="text-gray-600">|</span>
                                                    <span className="text-gray-400">{message.messageKind}</span>
                                                </div>
                                                <span className="text-[9px] text-gray-500">{formatAbsoluteTime(message.createdAt)}</span>
                                            </div>
                                            {message.text && <p className="text-xs leading-relaxed text-gray-200">{message.text}</p>}
                                            {(message.costGd > 0 || message.assetMimeType) && (
                                                <div className="mt-1.5 flex gap-2 text-[9px] font-medium text-gray-500">
                                                    {message.costGd > 0 && <span>{message.costGd} GD</span>}
                                                    {message.assetMimeType && <span>{message.assetMimeType}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isLoadingMessages && messages.length === 0 ? <div className="p-3 text-xs text-gray-400"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" />Loading transcript...</div> : null}
                                    {!isLoadingMessages && messages.length === 0 && !messagesError ? <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-gray-500">No messages in this thread.</div> : null}
                                    {messagesError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">Transcript feed failed.</div> : null}
                                </div>
                            </div>

                            {/* Attachments */}
                            <div className="lg:w-64 xl:w-72 flex flex-col shrink-0">
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                                    <FileText className="h-3.5 w-3.5" />
                                    Files
                                </div>
                                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                                    {attachments.length > 0 ? attachments.map((message) => (
                                        <div key={message.id} className="rounded-xl border border-white/5 bg-black/20 p-2">
                                            <div className="mb-1.5 flex justify-between items-center">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{message.senderRole}</span>
                                            </div>
                                            {isImageAsset(message.assetUrl, message.assetMimeType) && message.assetUrl && (
                                                <a href={message.assetUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-white/5">
                                                    <img src={message.assetUrl} alt="Shared image" className="h-24 w-full object-cover" />
                                                </a>
                                            )}
                                            {isVideoAsset(message.assetUrl, message.assetMimeType) && message.assetUrl && (
                                                <video controls className="w-full h-24 rounded-lg border border-white/5 bg-black/40">
                                                    <source src={message.assetUrl} type={message.assetMimeType || undefined} />
                                                </video>
                                            )}
                                            {!isImageAsset(message.assetUrl, message.assetMimeType) && !isVideoAsset(message.assetUrl, message.assetMimeType) && message.assetUrl && (
                                                <a href={message.assetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-1.5 text-[10px] font-semibold text-gray-300 w-full justify-center">
                                                    <FileText className="h-3 w-3" /> Open File
                                                </a>
                                            )}
                                        </div>
                                    )) : <div className="rounded-xl border border-dashed border-white/5 p-3 text-xs text-gray-600 text-center">No files shared.</div>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-6 text-xs text-gray-500">
                            Select a thread from the queue to open the workspace.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
