"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleHelp, LifeBuoy, Loader2, MessageSquarePlus, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Button } from "@/components/ui/Button";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import {
    SUPPORT_THREAD_CATEGORIES,
    type SupportMessageRecord,
    type SupportThreadCategory,
    type SupportThreadPreview,
    describeSupportState,
    formatSupportCategoryLabel,
} from "@/lib/support-readiness";

type SupportThreadListResponse = {
    success: boolean;
    threads: SupportThreadPreview[];
};

type SupportThreadDetailResponse = {
    success: boolean;
    thread: SupportThreadPreview | null;
    messages: SupportMessageRecord[];
};

const SUPPORT_POLL_INTERVAL_MS = 10_000;

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

function normalizeInitialCategory(value: string | null): SupportThreadCategory {
    return SUPPORT_THREAD_CATEGORIES.includes(value as SupportThreadCategory)
        ? value as SupportThreadCategory
        : "general";
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await authFetch(url, init);
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) {
        throw new Error("Support request could not be completed right now.");
    }
    return body;
}

function getSupportProblemCopy(action: "load_list" | "load_detail" | "create" | "reply" | "status") {
    switch (action) {
        case "load_list":
            return "Support tickets could not be loaded right now.";
        case "load_detail":
            return "This support ticket could not be loaded right now.";
        case "create":
            return "Support ticket could not be created right now.";
        case "reply":
            return "Support reply could not be sent right now.";
        case "status":
            return "Ticket status could not be updated right now.";
    }
}

export function SupportInbox() {
    const searchParams = useSearchParams();
    const requestedThreadId = searchParams.get("threadId");
    const requestedSubject = searchParams.get("subject")?.trim() || "";
    const requestedMessage = searchParams.get("message")?.trim() || "";
    const requestedCategory = normalizeInitialCategory(searchParams.get("category"));

    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(requestedThreadId);
    const [composerOpen, setComposerOpen] = useState<boolean>(() => !requestedThreadId);
    const [subject, setSubject] = useState(requestedSubject);
    const [category, setCategory] = useState<SupportThreadCategory>(requestedCategory);
    const [message, setMessage] = useState(requestedMessage);
    const [reply, setReply] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [replying, setReplying] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const {
        data: threadList,
        error: threadListError,
        isLoading: threadListLoading,
        mutate: mutateThreadList,
    } = useAuthSWR<SupportThreadListResponse>("/api/support/threads", {
        refreshInterval: SUPPORT_POLL_INTERVAL_MS,
        revalidateOnFocus: true,
        keepPreviousData: true,
    });

    const {
        data: selectedThread,
        error: selectedThreadError,
        isLoading: selectedThreadLoading,
        mutate: mutateSelectedThread,
    } = useAuthSWR<SupportThreadDetailResponse>(
        selectedThreadId ? `/api/support/threads/${selectedThreadId}` : null,
        {
            refreshInterval: selectedThreadId ? SUPPORT_POLL_INTERVAL_MS : 0,
            revalidateOnFocus: true,
            keepPreviousData: true,
        },
    );

    useEffect(() => {
        if (!threadListError) {
            return;
        }

            reportClientIssue({
                channel: "network",
                severity: "warn",
                message: "Support thread list failed to load",
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
                message: "Support thread detail failed to load",
                detail: selectedThreadError.message,
        });
    }, [selectedThreadError]);

    useEffect(() => {
        const threads = threadList?.threads ?? [];
        if (!threads.length) {
            setSelectedThreadId(null);
            return;
        }

        if (requestedThreadId && threads.some((thread) => thread.id === requestedThreadId)) {
            setSelectedThreadId((current) => current || requestedThreadId);
            return;
        }

        if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
            setSelectedThreadId(threads[0].id);
        }
    }, [requestedThreadId, selectedThreadId, threadList?.threads]);

    const selectedThreadSummary = useMemo(
        () => threadList?.threads.find((thread) => thread.id === selectedThreadId) ?? null,
        [selectedThreadId, threadList?.threads],
    );

    const activeSelectedThread = useMemo(() => (
        selectedThread?.thread?.id === selectedThreadId ? selectedThread : null
    ), [selectedThread, selectedThreadId]);

    useEffect(() => {
        if (!selectedThreadSummary) {
            return;
        }

        if (!selectedThreadSummary.unreadForUser) {
            return;
        }

        trackEvent("support_reply_viewed", {
            source_component: "support_inbox",
            route: window.location.pathname,
            thread_id: selectedThreadSummary.id,
            ticket_id: selectedThreadSummary.id,
            category: selectedThreadSummary.category,
            support_category: selectedThreadSummary.category,
            source_truth: "client",
            entity_type: "support",
            entity_id: selectedThreadSummary.id,
        });
    }, [selectedThreadSummary]);

    async function handleCreateThread() {
        setSubmitting(true);
        try {
            const response = await readJson<{ success: boolean; thread: SupportThreadDetailResponse }>(
                "/api/support/threads",
                {
                    method: "POST",
                    body: JSON.stringify({
                        subject,
                        category,
                        message,
                        sourcePath: window.location.pathname,
                    }),
                },
            );

            await mutateThreadList();
            await mutateSelectedThread(response.thread, false);
            setSelectedThreadId(response.thread.thread?.id || null);
            setComposerOpen(false);
            setMessage("");
            toast.success("Support ticket created.");
        } catch (error) {
            const messageText = getSupportProblemCopy("create");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support ticket creation failed",
                detail: { message: error instanceof Error ? error.message : messageText },
            });
            toast.error(messageText);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReply() {
        if (!selectedThreadId) {
            return;
        }

        setReplying(true);
        try {
            const response = await readJson<SupportThreadDetailResponse>(
                `/api/support/threads/${selectedThreadId}`,
                {
                    method: "POST",
                    body: JSON.stringify({ message: reply }),
                },
            );
            setReply("");
            await mutateSelectedThread(response, false);
            await mutateThreadList();
            toast.success("Reply sent.");
        } catch (error) {
            const messageText = getSupportProblemCopy("reply");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support reply failed",
                detail: { message: error instanceof Error ? error.message : messageText },
            });
            trackEvent("support_thread_reply_failed", {
                source_component: "support_inbox",
                route: window.location.pathname,
                thread_id: selectedThreadId,
                ticket_id: selectedThreadId,
                support_category: selectedThreadSummary?.category ?? category,
                reason_code: "support_reply_failed",
                entity_type: "support",
                entity_id: selectedThreadId,
            });
            toast.error(messageText);
        } finally {
            setReplying(false);
        }
    }

    async function handleStatusAction(action: "resolve" | "reopen") {
        if (!selectedThreadId) {
            return;
        }

        setUpdatingStatus(true);
        try {
            const response = await readJson<SupportThreadDetailResponse>(
                `/api/support/threads/${selectedThreadId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ action }),
                },
            );

            await mutateSelectedThread(response, false);
            await mutateThreadList();
            toast.success(action === "resolve" ? "Ticket resolved." : "Ticket reopened.");
        } catch (error) {
            const messageText = getSupportProblemCopy("status");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support status update failed",
                detail: { message: error instanceof Error ? error.message : messageText },
            });
            toast.error(messageText);
        } finally {
            setUpdatingStatus(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-3 pb-20 pt-16 sm:px-4 md:pt-[4.5rem]">
            <PageViewEvent eventName="support_inbox_viewed" />
            <div className="mb-5 rounded-[1.85rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.18),rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.96)_100%)] px-5 py-5 md:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-purple">Support</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">In-site support inbox</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">Open tickets, track replies, and keep account or creator issues inside your dashboard.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            {(threadList?.threads.length ?? 0)} thread{(threadList?.threads.length ?? 0) === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            10s live poll
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <section className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Tickets</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">Open a ticket or continue one already in flight.</p>
                        </div>
                        <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            onClick={() => setComposerOpen((current) => !current)}
                        >
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            {composerOpen ? "Hide form" : "New ticket"}
                        </Button>
                    </div>

                    {composerOpen ? (
                        <div className="rounded-[1.25rem] border border-brand-purple/20 bg-brand-purple/10 p-4">
                            <div className="grid gap-3">
                                <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-purple">Subject</span>
                                    <input
                                        value={subject}
                                        onChange={(event) => setSubject(event.target.value)}
                                        placeholder="What do you need help with?"
                                        className="h-11 w-full rounded-[1rem] border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-purple">Category</span>
                                    <select
                                        value={category}
                                        onChange={(event) => setCategory(normalizeInitialCategory(event.target.value))}
                                        className="h-11 w-full rounded-[1rem] border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition-colors focus:border-brand-purple"
                                    >
                                        {SUPPORT_THREAD_CATEGORIES.map((entry) => (
                                            <option key={entry} value={entry} className="bg-black text-white">
                                                {formatSupportCategoryLabel(entry)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-purple">Message</span>
                                    <textarea
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        rows={5}
                                        placeholder="Describe the issue and what you need."
                                        className="w-full rounded-[1rem] border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                                    />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="brand"
                                        onClick={() => void handleCreateThread()}
                                        isLoading={submitting}
                                        disabled={subject.trim().length < 4 || message.trim().length < 10}
                                    >
                                        Create ticket
                                    </Button>
                                    <Button type="button" variant="glass" onClick={() => setComposerOpen(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {threadListError ? (
                        <div className="rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {getSupportProblemCopy("load_list")}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        {threadListLoading && !threadList?.threads.length ? (
                            <div className="flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-300">
                                <Loader2 className="h-4 w-4 animate-spin text-brand-purple" aria-hidden="true" />
                                Loading tickets...
                            </div>
                        ) : threadList?.threads.length ? threadList.threads.map((thread) => {
                            const active = thread.id === selectedThreadId;
                            return (
                                <button
                                    key={thread.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedThreadId(thread.id);
                                        setComposerOpen(false);
                                    }}
                                    className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition-colors ${active ? "border-brand-purple/35 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{thread.subject || "Support thread"}</p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {formatSupportCategoryLabel(thread.category)} • {formatRelativeTime(thread.lastMessageAt)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {thread.unreadForUser ? <span className="h-2.5 w-2.5 rounded-full bg-brand-purple" /> : null}
                                            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(thread.status)}`}>
                                                {describeSupportState(thread.status)}
                                            </span>
                                        </div>
                                    </div>
                                    {thread.lastMessagePreview ? (
                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-300">{thread.lastMessagePreview}</p>
                                    ) : null}
                                </button>
                            );
                        }) : (
                            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-sm text-gray-400">
                                No tickets yet. Open one here when you need help.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white">Thread detail</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Replies stay in this ticket and refresh every 10 seconds.
                            </p>
                        </div>
                        <Button type="button" variant="glass" size="sm" onClick={() => void mutateSelectedThread()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>

                    {!selectedThreadId ? (
                        <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-gray-400">
                            Pick a ticket or open a new one.
                        </div>
                    ) : selectedThreadLoading && !activeSelectedThread?.thread ? (
                        <div className="mt-4 flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-300">
                            <Loader2 className="h-4 w-4 animate-spin text-brand-purple" aria-hidden="true" />
                            Loading thread...
                        </div>
                    ) : selectedThreadError ? (
                        <div className="mt-4 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {getSupportProblemCopy("load_detail")}
                        </div>
                    ) : activeSelectedThread?.thread ? (
                        <>
                            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black text-white">{activeSelectedThread.thread.subject || "Support thread"}</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            {formatSupportCategoryLabel(activeSelectedThread.thread.category)} • Last update {formatRelativeTime(activeSelectedThread.thread.lastMessageAt)}
                                        </p>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(activeSelectedThread.thread.status)}`}>
                                        {describeSupportState(activeSelectedThread.thread.status)}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {activeSelectedThread.thread.status === "resolved" || activeSelectedThread.thread.status === "closed" ? (
                                        <Button type="button" variant="glass" size="sm" isLoading={updatingStatus} onClick={() => void handleStatusAction("reopen")}>
                                            Reopen ticket
                                        </Button>
                                    ) : (
                                        <Button type="button" variant="glass" size="sm" isLoading={updatingStatus} onClick={() => void handleStatusAction("resolve")}>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            Mark resolved
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {activeSelectedThread.messages.length ? activeSelectedThread.messages.map((entry) => {
                                    const isUser = entry.senderRole !== "admin";
                                    return (
                                        <div key={entry.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[92%] rounded-[1.2rem] border px-4 py-3 sm:max-w-[80%] ${isUser ? "border-brand-purple/20 bg-brand-purple/12 text-white" : "border-white/10 bg-black/25 text-gray-100"}`}>
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-gray-400">
                                                    <span>{entry.senderRole === "admin" ? "Support" : "You"}</span>
                                                    <span>{formatRelativeTime(entry.createdAt)}</span>
                                                </div>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-400">
                                        No messages are in this ticket yet.
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
                                <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Reply</span>
                                    <textarea
                                        value={reply}
                                        onChange={(event) => setReply(event.target.value)}
                                        rows={4}
                                        placeholder="Add the next detail or reply."
                                        className="w-full rounded-[1rem] border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                                    />
                                </label>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="brand"
                                        isLoading={replying}
                                        disabled={reply.trim().length === 0 || activeSelectedThread.thread.status === "resolved" || activeSelectedThread.thread.status === "closed"}
                                        onClick={() => void handleReply()}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        Send reply
                                    </Button>
                                    {(activeSelectedThread.thread.status === "resolved" || activeSelectedThread.thread.status === "closed") ? (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-semibold text-gray-300">
                                            <CircleHelp className="h-4 w-4 text-brand-purple" />
                                            Reopen the ticket before sending more messages.
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-gray-400">
                            <LifeBuoy className="mx-auto mb-3 h-6 w-6 text-brand-purple" />
                            Select a ticket to view messages.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
