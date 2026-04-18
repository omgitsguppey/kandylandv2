"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Loader2, RefreshCw, Send, UserRound } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    type SupportMessageRecord,
    type SupportThreadPreview,
    describeSupportState,
    formatSupportCategoryLabel,
} from "@/lib/support-readiness";

type AdminSupportThreadRecord = SupportThreadPreview & {
    userId: string;
    userEmail: string | null;
    userDisplayName: string | null;
    userHandle: string | null;
    messageCount: number;
};

type AdminSupportThreadListResponse = {
    success: boolean;
    threads: AdminSupportThreadRecord[];
    summary: {
        total: number;
        openCount: number;
        waitingOnUserCount: number;
        resolvedCount: number;
    };
};

type AdminSupportThreadDetailResponse = {
    success: boolean;
    thread: AdminSupportThreadRecord | null;
    messages: SupportMessageRecord[];
};

const ADMIN_SUPPORT_POLL_INTERVAL_MS = 10_000;

function formatRelativeTime(timestamp?: number | null) {
    if (!timestamp) {
        return "Not recorded";
    }

    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const deltaMinutes = Math.round((timestamp - Date.now()) / 60_000);
    if (Math.abs(deltaMinutes) < 60) {
        return formatter.format(deltaMinutes, "minute");
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) {
        return formatter.format(deltaHours, "hour");
    }

    const deltaDays = Math.round(deltaHours / 24);
    if (Math.abs(deltaDays) < 30) {
        return formatter.format(deltaDays, "day");
    }

    return new Date(timestamp).toLocaleString();
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

export function AdminSupportQueue() {
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(searchParams.get("threadId"));
    const [reply, setReply] = useState("");
    const [replying, setReplying] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const userIdFilter = searchParams.get("userId")?.trim() || "";
    const listUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
            params.set("status", statusFilter);
        }
        if (userIdFilter) {
            params.set("userId", userIdFilter);
        }

        const suffix = params.toString();
        return `/api/admin/support/threads${suffix ? `?${suffix}` : ""}`;
    }, [statusFilter, userIdFilter]);

    const {
        data: threadList,
        error: threadListError,
        isLoading: threadListLoading,
        mutate: mutateThreadList,
    } = useAdminPollingSWR<AdminSupportThreadListResponse>(listUrl, ADMIN_SUPPORT_POLL_INTERVAL_MS);

    const {
        data: selectedThread,
        error: selectedThreadError,
        isLoading: selectedThreadLoading,
        mutate: mutateSelectedThread,
    } = useAdminPollingSWR<AdminSupportThreadDetailResponse>(
        selectedThreadId ? `/api/admin/support/threads/${selectedThreadId}` : null,
        selectedThreadId ? ADMIN_SUPPORT_POLL_INTERVAL_MS : 0,
    );

    useEffect(() => {
        if (!threadListError) {
            return;
        }

        reportClientIssue({
            channel: "network",
            severity: "warn",
            message: "Admin support queue failed to load",
            detail: threadListError.message,
        });
    }, [threadListError]);

    useEffect(() => {
        if (!selectedThreadError) {
            return;
        }

        reportClientIssue({
            channel: "network",
            severity: "warn",
            message: "Admin support thread failed to load",
            detail: selectedThreadError.message,
        });
    }, [selectedThreadError]);

    useEffect(() => {
        const threads = threadList?.threads ?? [];
        if (!threads.length) {
            setSelectedThreadId(null);
            return;
        }

        if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
            setSelectedThreadId(threads[0].id);
        }
    }, [selectedThreadId, threadList?.threads]);

    async function handleReply() {
        if (!selectedThreadId) {
            return;
        }

        setReplying(true);
        try {
            const response = await readJson<AdminSupportThreadDetailResponse>(
                `/api/admin/support/threads/${selectedThreadId}`,
                {
                    method: "POST",
                    body: JSON.stringify({ message: reply }),
                },
            );

            setReply("");
            await mutateSelectedThread(response, false);
            await mutateThreadList();
            toast.success("Support reply sent.");
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "Support reply failed.";
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support reply failed",
                detail: { message: messageText },
            });
            toast.error(messageText);
        } finally {
            setReplying(false);
        }
    }

    async function handleStatusUpdate(status: string) {
        if (!selectedThreadId) {
            return;
        }

        setUpdatingStatus(true);
        try {
            const response = await readJson<AdminSupportThreadDetailResponse>(
                `/api/admin/support/threads/${selectedThreadId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                },
            );

            await mutateSelectedThread(response, false);
            await mutateThreadList();
            toast.success("Support status updated.");
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "Support status update failed.";
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support status update failed",
                detail: { message: messageText },
            });
            toast.error(messageText);
        } finally {
            setUpdatingStatus(false);
        }
    }

    return (
        <div className="space-y-4">
            <PageViewEvent eventName="admin_support_viewed" />
            <AdminPageHeader
                eyebrow="Admin Console"
                title="Support Queue"
                compact
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            {(threadList?.summary.total ?? 0)} threads loaded
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            Live poll every 10s
                        </span>
                    </>
                )}
            />

            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Queue</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">In-site tickets only. No email fallback.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: "all", label: "All" },
                                { id: "waiting_on_support", label: "Waiting on support" },
                                { id: "waiting_on_user", label: "Waiting on user" },
                                { id: "resolved", label: "Resolved" },
                            ].map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setStatusFilter(entry.id)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === entry.id ? "border-brand-purple/35 bg-brand-purple/15 text-white" : "border-white/10 bg-black/30 text-gray-300"}`}
                                >
                                    {entry.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {threadListError ? (
                        <div className="mt-4 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {threadListError.message}
                        </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Waiting on support</p>
                            <p className="mt-2 text-2xl font-black text-white">{threadList?.summary.openCount ?? 0}</p>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Waiting on user</p>
                            <p className="mt-2 text-2xl font-black text-white">{threadList?.summary.waitingOnUserCount ?? 0}</p>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Resolved</p>
                            <p className="mt-2 text-2xl font-black text-white">{threadList?.summary.resolvedCount ?? 0}</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {threadListLoading && !threadList?.threads.length ? (
                            <div className="flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-300">
                                <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
                                Loading support queue...
                            </div>
                        ) : threadList?.threads.length ? threadList.threads.map((thread) => {
                            const active = thread.id === selectedThreadId;
                            const primaryIdentity = thread.userHandle ? `@${thread.userHandle}` : thread.userDisplayName || thread.userEmail || thread.userId;
                            return (
                                <button
                                    key={thread.id}
                                    type="button"
                                    onClick={() => setSelectedThreadId(thread.id)}
                                    className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition-colors ${active ? "border-brand-purple/35 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{thread.subject || "Support thread"}</p>
                                            <p className="mt-1 truncate text-xs text-gray-400">
                                                {primaryIdentity} · {formatSupportCategoryLabel(thread.category)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {thread.unreadForAdmin ? <span className="h-2.5 w-2.5 rounded-full bg-brand-purple" /> : null}
                                            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(thread.status)}`}>
                                                {describeSupportState(thread.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-400">
                                        <span className="truncate">{thread.lastMessagePreview || "No message preview"}</span>
                                        <span className="shrink-0">{formatRelativeTime(thread.lastMessageAt)}</span>
                                    </div>
                                </button>
                            );
                        }) : (
                            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-sm text-gray-400">
                                No support threads match this filter.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Thread detail</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">Read, reply, or move status without leaving the queue.</p>
                        </div>
                        <Button type="button" variant="glass" size="sm" onClick={() => void mutateSelectedThread()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>

                    {!selectedThreadId ? (
                        <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-gray-400">
                            Select a support thread from the queue.
                        </div>
                    ) : selectedThreadLoading && !selectedThread?.thread ? (
                        <div className="mt-4 flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-300">
                            <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
                            Loading support thread...
                        </div>
                    ) : selectedThreadError ? (
                        <div className="mt-4 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {selectedThreadError.message}
                        </div>
                    ) : selectedThread?.thread ? (
                        <>
                            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black text-white">{selectedThread.thread.subject || "Support thread"}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                                            <span className="inline-flex items-center gap-2">
                                                <UserRound className="h-4 w-4 text-brand-purple" />
                                                {selectedThread.thread.userHandle ? `@${selectedThread.thread.userHandle}` : selectedThread.thread.userDisplayName || selectedThread.thread.userEmail || selectedThread.thread.userId}
                                            </span>
                                            <span>•</span>
                                            <span>{formatSupportCategoryLabel(selectedThread.thread.category)}</span>
                                            <span>•</span>
                                            <span>{selectedThread.thread.messageCount} message{selectedThread.thread.messageCount === 1 ? "" : "s"}</span>
                                        </div>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(selectedThread.thread.status)}`}>
                                        {describeSupportState(selectedThread.thread.status)}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button type="button" variant="glass" size="sm" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_support")}>
                                        Waiting on support
                                    </Button>
                                    <Button type="button" variant="glass" size="sm" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_user")}>
                                        Waiting on user
                                    </Button>
                                    <Button type="button" variant="glass" size="sm" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("resolved")}>
                                        Resolve
                                    </Button>
                                    <Link
                                        href={`/admin/user/${selectedThread.thread.userId}`}
                                        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-black/30 px-3 text-xs font-bold text-white transition-colors hover:border-white/20"
                                    >
                                        Open user record
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {selectedThread.messages.length ? selectedThread.messages.map((entry) => {
                                    const isAdminMessage = entry.senderRole === "admin";
                                    return (
                                        <div key={entry.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[92%] rounded-[1.2rem] border px-4 py-3 sm:max-w-[80%] ${isAdminMessage ? "border-brand-purple/20 bg-brand-purple/12 text-white" : "border-white/10 bg-black/25 text-gray-100"}`}>
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-gray-400">
                                                    <span>{entry.senderRole === "admin" ? "Support" : "User"}</span>
                                                    <span>{formatRelativeTime(entry.createdAt)}</span>
                                                </div>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-400">
                                        No messages are recorded in this thread yet.
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
                                <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Reply as support</span>
                                    <textarea
                                        value={reply}
                                        onChange={(event) => setReply(event.target.value)}
                                        rows={4}
                                        placeholder="Reply with the next concrete step, status, or resolution."
                                        className="w-full rounded-[1rem] border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                                    />
                                </label>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button type="button" variant="brand" isLoading={replying} disabled={reply.trim().length === 0} onClick={() => void handleReply()}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send reply
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-gray-400">
                            <LifeBuoy className="mx-auto mb-3 h-6 w-6 text-brand-purple" />
                            Select a support thread to inspect its messages.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
