"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Loader2, Send, UserRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminSupportWorkspaceAccent } from "@/components/creative-tim/kandydrops/admin-support/AdminSupportWorkspaceAccent";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAdminSupportRealtime } from "@/hooks/useAdminSupportRealtime";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import type { AdminSurfaceState } from "@/lib/admin-parity";
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
    const supportQueueCountLabel = isLocalAdminUiTestSession ? "--" : summary.total;
    const supportTurnCountLabel = isLocalAdminUiTestSession ? "--" : summary.openCount;
    const userTurnCountLabel = isLocalAdminUiTestSession ? "--" : summary.waitingOnUserCount;
    const supportSourceState: AdminSurfaceState = isLocalAdminUiTestSession
        ? "unavailable"
        : threadsError
            ? "failed"
            : isLoadingThreads
                ? "loading"
                : messagesError
                    ? "degraded"
                    : "live";
    const supportSourceLabel = isLocalAdminUiTestSession
        ? "No source"
        : threadsError
            ? "API Failed"
            : isLoadingThreads
                ? "Checking API"
                : messagesError
                    ? "API Partial"
                    : "API Verified";
    const supportSourceDetail = isLocalAdminUiTestSession
        ? "Local fixture mode does not load protected support routes."
        : threadsError
            ? "The protected admin support list route failed."
            : isLoadingThreads
                ? "Checking the protected admin support list route."
                : messagesError
                    ? "The support list loaded, but the selected thread detail failed."
                    : "The protected admin support list route returned successfully.";

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
        <div className="relative flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-[#09060f] px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-5 lg:px-7">
            <PageViewEvent eventName="admin_support_viewed" />
            <AdminSupportWorkspaceAccent />

            <header className="relative shrink-0 rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200/70">Kandy operations</p>
                        <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Support Workspace</h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fuchsia-100">Admin-only inbox</span>
                        <AdminStatusBadge
                            state={supportSourceState}
                            label={supportSourceLabel}
                            title={supportSourceDetail}
                            className="rounded-full px-3 py-1.5 text-[11px] font-bold"
                        />
                    </div>
                </div>
                {isLocalAdminUiTestSession ? (
                    <div
                        className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100"
                        data-admin-support-fixture-boundary="true"
                    >
                        <span className="font-bold text-white">source_missing fixture.</span> source_missing: support source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.
                    </div>
                ) : null}
            </header>

            <div className="relative mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden xl:flex-row">
                <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl xl:w-[390px]" aria-label="Support thread queue">
                    <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-4 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200/60">Live triage</p>
                                <h2 className="mt-1 text-lg font-black tracking-tight text-white">Support queue</h2>
                            </div>
                            <span className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/10 px-3 py-2 text-right">
                                <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-fuchsia-100/65">Threads</span>
                                <span className="block text-lg font-black leading-5 text-white">{supportQueueCountLabel}</span>
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                            {[
                                { id: "all", label: "All" },
                                { id: "waiting_on_support", label: "Needs action" },
                                { id: "waiting_on_user", label: "Waiting" },
                            ].map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setStatusFilter(entry.id)}
                                    aria-pressed={statusFilter === entry.id}
                                    className={`min-h-11 rounded-xl px-2 text-[10px] font-bold leading-tight transition-colors ${statusFilter === entry.id ? "bg-white/12 text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)]" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                                >
                                    {entry.label}
                                </button>
                            ))}
                        </div>

                        {threadsError ? (
                            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-5 text-amber-100">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>{getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")}</span>
                            </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2.5">
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/70">Support turn</p>
                                <p className="mt-1 text-xl font-black leading-5 text-white">{supportTurnCountLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.07] px-3 py-2.5">
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">User turn</p>
                                <p className="mt-1 text-xl font-black leading-5 text-white">{userTurnCountLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                        {isLoadingThreads && !threads.length ? (
                            <div className="flex justify-center p-6">
                                <Loader2 className="h-5 w-5 animate-spin text-brand-purple" aria-hidden="true" />
                            </div>
                        ) : filteredThreads.length ? (
                            <div className="space-y-2">
                                {filteredThreads.map((thread) => {
                                    const active = thread.id === selectedThreadId;
                                    const primaryIdentity = thread.userHandle ? `@${thread.userHandle}` : thread.userDisplayName || thread.userEmail || thread.userId;
                                    return (
                                        <button
                                            key={thread.id}
                                            type="button"
                                            onClick={() => setSelectedThreadId(thread.id)}
                                            className={`group relative min-h-[106px] w-full overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-colors ${active ? "border-fuchsia-300/35 bg-fuchsia-500/[0.13] shadow-[0_12px_28px_rgba(168,85,247,0.16)]" : "border-white/5 bg-black/15 hover:border-white/15 hover:bg-white/[0.06]"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-white">{thread.subject || "Support thread"}</p>
                                                    <p className="mt-1 truncate text-[11px] text-gray-400">{primaryIdentity} <span className="text-gray-600">/</span> {formatSupportCategoryLabel(thread.category)}</p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                    <span className="text-[10px] text-gray-500">{formatRelativeTime(thread.lastMessageAt)}</span>
                                                    <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusTone(thread.status)}`}>
                                                        {describeSupportState(thread.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <p className="truncate text-[11px] text-gray-500">{thread.lastMessagePreview || "No preview available"}</p>
                                                {thread.unreadForAdmin ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,0.9)]" /> : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-6 text-center text-[11px] text-gray-500">
                                No support threads match.
                            </div>
                        )}
                    </div>
                </aside>

                <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#160d22]/80 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl" aria-label="Support thread workspace">
                    {!selectedThreadId ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-fuchsia-300/15 bg-fuchsia-400/10">
                                <LifeBuoy className="h-7 w-7 text-fuchsia-200/75" aria-hidden="true" />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-white">Select a thread to view the transcript</p>
                            <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">The selected thread stays scoped to this protected admin support lane.</p>
                        </div>
                    ) : selectedThread ? (
                        <>
                            <div className="shrink-0 border-b border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200/60">Thread detail</p>
                                        <h2 className="mt-1 text-lg font-black tracking-tight text-white">{selectedThread.subject || "Support thread"}</h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-gray-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <UserRound className="h-3.5 w-3.5 text-fuchsia-200/70" aria-hidden="true" />
                                                {selectedThread.userHandle ? `@${selectedThread.userHandle}` : selectedThread.userDisplayName || selectedThread.userEmail || selectedThread.userId}
                                            </span>
                                            <span className="text-gray-600">/</span>
                                            <span>{formatSupportCategoryLabel(selectedThread.category)}</span>
                                            <Link
                                                href={`/admin/user/${selectedThread.userId}`}
                                                className="rounded-lg px-1.5 py-1 font-bold text-fuchsia-200 transition-colors hover:bg-fuchsia-400/10 hover:text-white"
                                            >
                                                View Record
                                            </Link>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(selectedThread.status)}`}>
                                        {describeSupportState(selectedThread.status)}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                                    <span className="flex min-h-11 items-center pr-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Actions</span>
                                    <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl px-3 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_support")}>
                                        Need action
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl px-3 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("waiting_on_user")}>
                                        Wait on user
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl px-3 text-[11px]" isLoading={updatingStatus} onClick={() => void handleStatusUpdate("resolved")}>
                                        Resolve
                                    </Button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                                {messagesError ? (
                                    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-100">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        <span>{getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")}</span>
                                    </div>
                                ) : null}

                                {isLoadingMessages && !messages.length ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand-purple" aria-hidden="true" />
                                    </div>
                                ) : messages.length ? (
                                    <div className="space-y-4">
                                        {messages.map((entry) => {
                                            const isAdminMessage = entry.senderRole === "admin";
                                            return (
                                                <div key={entry.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[90%] rounded-[1.35rem] border px-4 py-3 sm:max-w-[76%] ${isAdminMessage ? "border-fuchsia-300/15 bg-fuchsia-500/[0.16] text-white" : "border-white/10 bg-white/[0.065] text-gray-100"}`}>
                                                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-gray-400">
                                                            <span className="font-black">{entry.senderRole === "admin" ? "Support" : "User"}</span>
                                                            <span className="text-gray-600">/</span>
                                                            <span>{formatRelativeTime(entry.createdAt)}</span>
                                                        </div>
                                                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-[11px] text-gray-500">
                                        No messages are recorded.
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 border-t border-white/10 bg-black/25 p-3 sm:p-4">
                                <label className="block">
                                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100/55">Reply</span>
                                    <textarea
                                        value={reply}
                                        onChange={(event) => setReply(event.target.value)}
                                        rows={2}
                                        placeholder="Reply with the next concrete step or resolution..."
                                        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-fuchsia-300/60 focus:bg-black/45"
                                    />
                                </label>
                                <div className="mt-3 flex justify-end">
                                    <Button type="button" variant="brand" size="sm" className="min-h-11 rounded-xl px-4 text-xs" isLoading={replying} disabled={reply.trim().length === 0} onClick={() => void handleReply()}>
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
