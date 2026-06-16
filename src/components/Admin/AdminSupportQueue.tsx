"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Loader2, Send, UserRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAdminSupportRealtime } from "@/hooks/useAdminSupportRealtime";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import {
    describeSupportState,
    formatSupportCategoryLabel,
} from "@/lib/support-readiness";

function formatRelativeTime(timestamp?: number | null) {
    if (!timestamp) return "Not recorded";

    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const deltaMinutes = Math.round((timestamp - Date.now()) / 60_000);
    if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");

    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) return formatter.format(deltaHours, "hour");

    const deltaDays = Math.round(deltaHours / 24);
    if (Math.abs(deltaDays) < 30) return formatter.format(deltaDays, "day");

    return new Date(timestamp).toLocaleDateString();
}

function statusTone(status: string) {
    if (status === "resolved" || status === "closed") {
        return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    }
    if (status === "waiting_on_user") {
        return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
    }
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await authFetch(url, init);
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : `Request failed for ${url}`);
    }
    return body;
}

function getAdminSupportSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export function AdminSupportQueue() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(searchParams.get("threadId"));
    const [reply, setReply] = useState("");
    const [replying, setReplying] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const userIdFilter = searchParams.get("userId")?.trim() || "";
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const {
        threads,
        messages,
        summary,
        isLoadingThreads,
        isLoadingMessages,
        threadsError,
        messagesError,
        refreshAll,
    } = useAdminSupportRealtime(selectedThreadId, { enabled: !isLocalAdminUiTestSession });

    const filteredThreads = useMemo(() => {
        return threads.filter(thread => {
            if (userIdFilter && thread.userId !== userIdFilter) return false;
            if (statusFilter !== "all") {
                if (statusFilter === "waiting_on_support" && (thread.status === "open" || thread.status === "pending")) return true;
                if (statusFilter === "resolved" && thread.status === "closed") return true;
                if (thread.status !== statusFilter) return false;
            }
            return true;
        });
    }, [threads, statusFilter, userIdFilter]);

    useEffect(() => {
        if (!threadsError) return;
        reportClientIssue({
            channel: "network",
            severity: "warn",
            message: "Support thread list failed for admin route.",
            detail: {
                route: "/api/admin/support/threads",
                component: "AdminSupportQueue",
                message: getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed."),
            },
        });
    }, [threadsError]);

    useEffect(() => {
        if (!messagesError) return;
        reportClientIssue({
            channel: "network",
            severity: "warn",
            message: "Support message detail route failed for admin dashboard.",
            detail: {
                route: selectedThreadId ? `/api/admin/support/threads/${selectedThreadId}` : "/api/admin/support/threads/[threadId]",
                component: "AdminSupportQueue",
                threadId: selectedThreadId,
                message: getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed."),
            },
        });
    }, [messagesError, selectedThreadId]);

    useEffect(() => {
        if (!filteredThreads.length) {
            if (threads.length > 0 && selectedThreadId && !threads.some(t => t.id === selectedThreadId)) {
                setSelectedThreadId(null);
            }
            return;
        }

        if (!selectedThreadId || !filteredThreads.some((thread) => thread.id === selectedThreadId)) {
            setSelectedThreadId(filteredThreads[0].id);
        }
    }, [selectedThreadId, filteredThreads, threads]);

    const selectedThread = useMemo(() => {
        return threads.find(t => t.id === selectedThreadId) || null;
    }, [threads, selectedThreadId]);

    async function handleReply() {
        if (!selectedThreadId) return;

        setReplying(true);
        try {
            await readJson(`/api/admin/support/threads/${selectedThreadId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: reply }),
            });
            await refreshAll();
            setReply("");
            toast.success("Support reply sent.");
        } catch (error) {
            const messageText = getAdminSupportSafeErrorMessage(error, "Support reply failed.");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support reply failed",
                detail: {
                    route: `/api/admin/support/threads/${selectedThreadId}/messages`,
                    component: "AdminSupportQueue",
                    threadId: selectedThreadId,
                    message: messageText,
                },
            });
            toast.error(messageText);
        } finally {
            setReplying(false);
        }
    }

    async function handleStatusUpdate(status: string) {
        if (!selectedThreadId) return;

        setUpdatingStatus(true);
        try {
            await readJson(`/api/admin/support/threads/${selectedThreadId}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            await refreshAll();
            toast.success("Support status updated.");
        } catch (error) {
            const messageText = getAdminSupportSafeErrorMessage(error, "Support status update failed.");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support status update failed",
                detail: {
                    route: `/api/admin/support/threads/${selectedThreadId}`,
                    component: "AdminSupportQueue",
                    threadId: selectedThreadId,
                    status,
                    message: messageText,
                },
            });
            toast.error(messageText);
        } finally {
            setUpdatingStatus(false);
        }
    }

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-black px-4 pb-4 sm:px-6 lg:px-8">
            <PageViewEvent eventName="admin_support_viewed" />
            <div className="shrink-0 pt-4">
                <AdminPageHeader
                    eyebrow="Admin Console"
                    title="Support Workspace"
                    compact
                    actions={(
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${isLocalAdminUiTestSession ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>
                            {isLocalAdminUiTestSession ? "source_missing" : "Verified"}
                        </span>
                    )}
                />
                {isLocalAdminUiTestSession ? (
                    <div
                        className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100"
                        data-admin-support-fixture-boundary="true"
                    >
                        <span className="font-bold text-white">Local UI review only.</span> Support queue data is source_missing here. Use a real admin session before reading threads, replying, or changing support status.
                    </div>
                ) : null}
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:flex-row">
                {/* Queue Pane */}
                <section className="flex min-h-0 shrink-0 flex-col rounded-[1.2rem] border border-white/10 bg-black/35 xl:w-[420px]">
                    <div className="shrink-0 p-4 pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-bold text-white">Queue ({summary.total})</h2>
                            <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
                                {[
                                    { id: "all", label: "All" },
                                    { id: "waiting_on_support", label: "Needs action" },
                                    { id: "waiting_on_user", label: "Waiting" },
                                ].map((entry) => (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => setStatusFilter(entry.id)}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${statusFilter === entry.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                                    >
                                        {entry.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {threadsError ? (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")}
                            </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-2 gap-2 pb-3">
                            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/80">Support turn</p>
                                <p className="mt-1 text-lg font-black text-white">{summary.openCount}</p>
                            </div>
                            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400/80">User turn</p>
                                <p className="mt-1 text-lg font-black text-white">{summary.waitingOnUserCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                        {isLoadingThreads && !threads.length ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-brand-purple" aria-hidden="true" />
                            </div>
                        ) : filteredThreads.length ? (
                            <div className="space-y-1.5">
                                {filteredThreads.map((thread) => {
                                    const active = thread.id === selectedThreadId;
                                    const primaryIdentity = thread.userHandle ? `@${thread.userHandle}` : thread.userDisplayName || thread.userEmail || thread.userId;
                                    return (
                                        <button
                                            key={thread.id}
                                            type="button"
                                            onClick={() => setSelectedThreadId(thread.id)}
                                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? "border-brand-purple/40 bg-brand-purple/15" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-white">{thread.subject || "Support thread"}</p>
                                                    <p className="mt-0.5 truncate text-[11px] text-gray-400">
                                                        {primaryIdentity} · {formatSupportCategoryLabel(thread.category)}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                    <span className="text-[10px] text-gray-500">{formatRelativeTime(thread.lastMessageAt)}</span>
                                                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${statusTone(thread.status)}`}>
                                                        {describeSupportState(thread.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                <p className="truncate text-[11px] text-gray-500">{thread.lastMessagePreview || "No preview available"}</p>
                                                {thread.unreadForAdmin ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-purple" /> : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[11px] text-gray-500">
                                No support threads match.
                            </div>
                        )}
                    </div>
                </section>

                {/* Workspace Pane */}
                <section className="flex min-h-0 flex-1 flex-col rounded-[1.2rem] border border-white/10 bg-black/35">
                    {!selectedThreadId ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
                            <LifeBuoy className="mb-3 h-8 w-8 text-brand-purple/50" />
                            <p className="text-sm">Select a thread to view the transcript</p>
                        </div>
                    ) : selectedThread ? (
                        <>
                            {/* Thread Header */}
                            <div className="shrink-0 border-b border-white/10 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-white">{selectedThread.subject || "Support thread"}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <UserRound className="h-3.5 w-3.5 text-brand-purple" />
                                                {selectedThread.userHandle ? `@${selectedThread.userHandle}` : selectedThread.userDisplayName || selectedThread.userEmail || selectedThread.userId}
                                            </span>
                                            <span>•</span>
                                            <span>{formatSupportCategoryLabel(selectedThread.category)}</span>
                                            <span>•</span>
                                            <Link
                                                href={`/admin/user/${selectedThread.userId}`}
                                                className="text-brand-purple hover:underline"
                                            >
                                                View Record
                                            </Link>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(selectedThread.status)}`}>
                                        {describeSupportState(selectedThread.status)}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Actions</span>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_support")}>
                                        Need action
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_user")}>
                                        Wait on user
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("resolved")}>
                                        Resolve
                                    </Button>
                                </div>
                            </div>

                            {/* Transcript */}
                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                {messagesError ? (
                                    <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                                        {getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")}
                                    </div>
                                ) : null}

                                {isLoadingMessages && !messages.length ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-brand-purple" aria-hidden="true" />
                                    </div>
                                ) : messages.length ? (
                                    <div className="space-y-4">
                                        {messages.map((entry) => {
                                            const isAdminMessage = entry.senderRole === "admin";
                                            return (
                                                <div key={entry.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${isAdminMessage ? "bg-brand-purple/20 text-white" : "bg-white/10 text-gray-100"}`}>
                                                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-gray-400">
                                                            <span className="font-bold">{entry.senderRole === "admin" ? "Support" : "User"}</span>
                                                            <span>•</span>
                                                            <span>{formatRelativeTime(entry.createdAt)}</span>
                                                        </div>
                                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-[11px] text-gray-500">
                                        No messages are recorded.
                                    </div>
                                )}
                            </div>

                            {/* Composer */}
                            <div className="shrink-0 border-t border-white/10 bg-black/40 p-4">
                                <label className="block space-y-1.5">
                                    <textarea
                                        value={reply}
                                        onChange={(event) => setReply(event.target.value)}
                                        rows={2}
                                        placeholder="Reply with the next concrete step or resolution..."
                                        className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                                    />
                                </label>
                                <div className="mt-2 flex justify-end">
                                    <Button type="button" variant="brand" size="sm" className="h-8 text-xs" isLoading={replying} disabled={reply.trim().length === 0} onClick={() => void handleReply()}>
                                        <Send className="mr-1.5 h-3.5 w-3.5" />
                                        Send Reply
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center p-8">
                            <Loader2 className="h-5 w-5 animate-spin text-brand-purple" aria-hidden="true" />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
