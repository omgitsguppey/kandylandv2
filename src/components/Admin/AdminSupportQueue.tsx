"use client";

import { Textarea } from "@/components/ui/textarea";
import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, LifeBuoy, Loader2, RefreshCw, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useAdminSupportRealtime } from "@/hooks/useAdminSupportRealtime";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { authFetch } from "@/lib/authFetch";
import { readUiJson } from "@/lib/ui-continuity";
import { createStaleRequestGuard } from "@/lib/frontend-hardening/ui/loading-state-contract";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { resolveClientActionError } from "@/lib/errors/client-error-adapter";
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

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await authFetch(url, init);
    return readUiJson<T>(response, { moduleLabel: "Admin support", url, requireSuccess: true });
}

function getAdminSupportSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = resolveClientActionError(error, { surface: "admin_truth", fallbackKey: "admin_truth_unavailable" }).descriptor;
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export function AdminSupportQueue() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const requestedThreadId = searchParams.get("threadId");
    function threadHref(threadId: string | null) {
        const query = new URLSearchParams(searchParams.toString());
        if (threadId) query.set("threadId", threadId); else query.delete("threadId");
        return "/admin/support" + (query.size ? "?" + query.toString() : "");
    }
    function selectThread(threadId: string) {
        setSelectedThreadId(threadId);
        router.push(threadHref(threadId), { scroll: false });
    }
    const { user } = useAuth();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const statusOptions = [
        { id: "all", label: "All statuses" },
        { id: "waiting_on_support", label: "Needs action" },
        { id: "waiting_on_user", label: "Waiting on user" },
        { id: "resolved", label: "Resolved" },
    ];
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(searchParams.get("threadId"));
    const [replyState, setReplyState] = useState<{ actorId: string | null; drafts: Record<string, string> }>({ actorId: user?.uid ?? null, drafts: {} });
    const mountedRef = useRef(true);
    const activeActorRef = useRef({ actorId: user?.uid ?? null, fixture: isAdminUiTestSessionUser(user) });
    const pendingActionRef = useRef<{ reply: symbol | null; status: symbol | null }>({ reply: null, status: null });
    const [actorRequestGuard] = useState(() => createStaleRequestGuard());
    const nextActor = { actorId: user?.uid ?? null, fixture: isAdminUiTestSessionUser(user) };
    if (activeActorRef.current.actorId !== nextActor.actorId || activeActorRef.current.fixture !== nextActor.fixture) actorRequestGuard.next();
    activeActorRef.current = nextActor;
    const reply = selectedThreadId && replyState.actorId === (user?.uid ?? null) ? replyState.drafts[selectedThreadId] ?? "" : "";
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; actorRequestGuard.next(); }; }, [actorRequestGuard]);
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
        if (requestedThreadId) { setSelectedThreadId(requestedThreadId); return; }
        if (!filteredThreads.length) {
            if (threads.length > 0 && selectedThreadId && !threads.some(t => t.id === selectedThreadId)) {
                setSelectedThreadId(null);
            }
            return;
        }

        if (!selectedThreadId || !filteredThreads.some((thread) => thread.id === selectedThreadId)) {
            setSelectedThreadId(filteredThreads[0].id);
        }
    }, [requestedThreadId, selectedThreadId, filteredThreads, threads]);

    const selectedThread = useMemo(() => {
        return threads.find(t => t.id === selectedThreadId) || null;
    }, [threads, selectedThreadId]);
    const hasSupportSummary = !isLocalAdminUiTestSession && summary !== null;
    const supportQueueCountLabel = hasSupportSummary ? summary.total : "--";
    const supportTurnCountLabel = hasSupportSummary ? summary.openCount : "--";
    const userTurnCountLabel = hasSupportSummary ? summary.waitingOnUserCount : "--";
    const supportSourceState: AdminSurfaceState = isLocalAdminUiTestSession
        ? "unavailable"
        : threadsError
            ? hasSupportSummary ? "degraded" : "failed"
            : isLoadingThreads
                ? "loading"
                : messagesError
                    ? "degraded"
                    : hasSupportSummary ? "live" : "unavailable";
    const supportSourceLabel = isLocalAdminUiTestSession
        ? "No source"
        : threadsError
            ? hasSupportSummary ? "Cached API" : "API Failed"
            : isLoadingThreads
                ? "Checking API"
                : messagesError
                    ? "API Partial"
                    : hasSupportSummary ? "API Verified" : "No source";
    const supportSourceDetail = isLocalAdminUiTestSession
        ? "Local fixture mode does not load protected support routes."
        : threadsError
            ? hasSupportSummary ? "The support refresh failed. Showing the last verified list." : "The protected admin support list route failed."
            : isLoadingThreads
                ? "Checking the protected admin support list route."
                : messagesError
                    ? "The support list loaded, but the selected thread detail failed."
                    : hasSupportSummary ? "The protected admin support list route returned successfully." : "No verified support list is available.";

    async function handleReply() {
        const threadId = selectedThreadId;
        const actorId = user?.uid ?? null;
        const sentReply = reply;
        if (!threadId || !actorId || isLocalAdminUiTestSession || !sentReply.trim() || pendingActionRef.current.reply) return;
        const request = Symbol("support-reply");
        pendingActionRef.current.reply = request;
        const actorGeneration = actorRequestGuard.current();
        const isCurrentActor = () => mountedRef.current && actorRequestGuard.isFresh(actorGeneration) && activeActorRef.current.actorId === actorId && !activeActorRef.current.fixture;
        setReplying(true);
        try {
            await readJson(`/api/admin/support/threads/${threadId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: sentReply }),
            });
            if (!isCurrentActor()) return;
            await refreshAll();
            if (!isCurrentActor()) return;
            setReplyState((current) => isCurrentActor() && current.actorId === actorId && current.drafts[threadId] === sentReply
                ? { ...current, drafts: { ...current.drafts, [threadId]: "" } } : current);
            toast.success("Support reply sent.");
        } catch (error) {
            if (!isCurrentActor()) return;
            const messageText = getAdminSupportSafeErrorMessage(error, "Support reply failed.");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support reply failed",
                detail: {
                    route: `/api/admin/support/threads/${threadId}/messages`,
                    component: "AdminSupportQueue",
                    threadId,
                    message: messageText,
                },
            });
            toast.error(messageText);
        } finally {
            if (pendingActionRef.current.reply === request) pendingActionRef.current.reply = null;
            if (mountedRef.current) setReplying(false);
        }
    }

    async function handleStatusUpdate(status: string) {
        const threadId = selectedThreadId;
        const actorId = user?.uid ?? null;
        if (!threadId || !actorId || isLocalAdminUiTestSession || pendingActionRef.current.status) return;
        const request = Symbol("support-status");
        pendingActionRef.current.status = request;
        const actorGeneration = actorRequestGuard.current();
        const isCurrentActor = () => mountedRef.current && actorRequestGuard.isFresh(actorGeneration) && activeActorRef.current.actorId === actorId && !activeActorRef.current.fixture;
        setUpdatingStatus(true);
        try {
            await readJson(`/api/admin/support/threads/${threadId}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            if (!isCurrentActor()) return;
            await refreshAll();
            if (!isCurrentActor()) return;
            toast.success("Support status updated.");
        } catch (error) {
            if (!isCurrentActor()) return;
            const messageText = getAdminSupportSafeErrorMessage(error, "Support status update failed.");
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Admin support status update failed",
                detail: {
                    route: `/api/admin/support/threads/${threadId}`,
                    component: "AdminSupportQueue",
                    threadId,
                    status,
                    message: messageText,
                },
            });
            toast.error(messageText);
        } finally {
            if (pendingActionRef.current.status === request) pendingActionRef.current.status = null;
            if (mountedRef.current) setUpdatingStatus(false);
        }
    }

    return (
        <div className="@container/support min-w-0 space-y-5" data-admin-support-pane={requestedThreadId ? "conversation" : "inbox"}>
            <PageViewEvent eventName="admin_support_viewed" />
            <AdminPageHeader compact eyebrow="Kandy operations" title="Support"
                subtitle="Read and reply to support conversations across accounts."
                actions={<Button type="button" variant="ghost" isLoading={isLoadingThreads} disabled={isLocalAdminUiTestSession} onClick={() => void refreshAll()}><RefreshCw className="mr-2 size-4" aria-hidden="true" />Refresh inbox</Button>}
                topSlot={isLocalAdminUiTestSession ? (
                    <p className="break-words text-sm leading-relaxed text-muted-foreground" role="alert" data-admin-support-fixture-boundary="true">
                        source_missing: support source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.
                    </p>
                ) : undefined}
            />
            <div className="flex min-w-0 flex-wrap items-start gap-2 text-sm">
                <AdminStatusBadge state={supportSourceState} label={supportSourceLabel} title={supportSourceDetail} className="text-xs" />
                <p className="min-w-0 flex-1 break-words leading-relaxed text-muted-foreground">{supportSourceDetail}</p>
            </div>

            <div className="grid min-w-0 gap-6 @min-[48rem]/support:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.5fr)] @min-[48rem]/support:items-start">
                <Card className={cn("min-w-0 gap-0 py-0", requestedThreadId ? "hidden @min-[48rem]/support:block" : "block")} role="region" aria-label="Support thread queue">
                    <div className="space-y-4 p-4 @min-[48rem]/support:p-5">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Inbox</h2>
                        <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-3 text-sm">
                            <div className="min-w-0"><dt className="text-muted-foreground">Loaded threads</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{supportQueueCountLabel}</dd></div>
                            <div className="min-w-0"><dt className="text-muted-foreground">Needs action</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{supportTurnCountLabel}</dd></div>
                            <div className="min-w-0"><dt className="text-muted-foreground">Waiting on user</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{userTurnCountLabel}</dd></div>
                        </dl>
                        <Disclosure className="min-w-0">
                            <DisclosureSummary className="min-h-11 cursor-pointer content-center [overflow-wrap:anywhere] text-base font-medium text-foreground">
                                Thread status: {statusOptions.find((entry) => entry.id === statusFilter)?.label}
                            </DisclosureSummary>
                            <div className="mt-2 grid min-w-0 gap-1" role="group" aria-label="Thread status options">
                                {statusOptions.map((entry) => <Button key={entry.id} type="button" variant={statusFilter === entry.id ? "default" : "ghost"}
                                    className="max-w-full justify-start whitespace-normal text-left text-base" aria-pressed={statusFilter === entry.id}
                                    onClick={(event) => {
                                        setStatusFilter(entry.id);
                                        const disclosure = event.currentTarget.closest("details");
                                        disclosure?.removeAttribute("open");
                                        disclosure?.querySelector("summary")?.focus();
                                    }}>{entry.label}</Button>)}
                            </div>
                        </Disclosure>
                        {userIdFilter ? <p className="break-words text-sm leading-relaxed text-muted-foreground">Showing this account. <Link href="/admin/support" className={cn(buttonVariants({variant:"ghost",size:"sm"}),"whitespace-normal text-primary")}>View full inbox</Link></p> : null}
                        {threadsError ? <p role="alert" className="flex min-w-0 items-start gap-2 break-words text-sm leading-relaxed text-foreground"><AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")}</span></p> : null}
                    </div>
                    {isLoadingThreads && !hasSupportSummary ? <p role="status" className="flex items-center gap-2 px-4 pb-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading inbox...</p>
                        : filteredThreads.length ? (
                            <ul className="min-w-0 px-2 pb-2">
                                {filteredThreads.map((thread) => {
                                    const active = thread.id === selectedThreadId;
                                    const primaryIdentity = thread.userHandle ? `@${thread.userHandle}` : thread.userDisplayName || thread.userEmail || thread.userId;
                                    return <li key={thread.id} className="min-w-0 border-b border-border last:border-b-0">
                                        <Button variant="ghost" type="button" onClick={() => selectThread(thread.id)} aria-current={active ? "true" : undefined}
                                            className={cn("w-full min-w-0 min-h-11 rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",active ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary")}>
                                            <div className="flex min-w-0 items-start gap-2">
                                                <p className="min-w-0 flex-1 [overflow-wrap:anywhere] text-base font-semibold leading-snug">{thread.subject || "Support thread"}</p>
                                                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                            </div>
                                            <p className="mt-1 [overflow-wrap:anywhere] text-sm leading-relaxed text-muted-foreground">{primaryIdentity}</p>
                                            <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-relaxed text-muted-foreground">{thread.lastMessagePreview || "No preview available"}</p>
                                            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="max-w-full whitespace-normal break-words font-medium">{describeSupportState(thread.status)}</Badge>
                                                <span>{formatSupportCategoryLabel(thread.category)}</span>
                                                <span>{formatRelativeTime(thread.lastMessageAt)}</span>
                                                {thread.unreadForAdmin ? <span className="font-semibold text-primary">Unread</span> : null}
                                            </div>
                                        </Button>
                                    </li>;
                                })}
                            </ul>
                        ) : <div className="space-y-2 px-4 pb-5 text-sm leading-relaxed text-muted-foreground">
                            <p className="font-medium text-foreground">{!hasSupportSummary ? "Inbox unavailable" : threads.length ? "No threads match this filter." : "No support threads in the loaded inbox."}</p>
                            {!hasSupportSummary ? <p>{isLocalAdminUiTestSession ? "A verified admin source is required." : "Refresh the inbox after restoring access or connectivity."}</p> : null}
                        </div>}
                </Card>

                <Card className={cn("min-w-0 gap-0 py-0",requestedThreadId ? "block" : "hidden @min-[48rem]/support:block")} role="region" aria-label="Support thread workspace">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 p-3 @min-[48rem]/support:hidden">
                        <Button type="button" variant="ghost" onClick={() => router.push(threadHref(null), { scroll: false })}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />Back to inbox</Button>
                    </div>
                    {!selectedThreadId ? <div className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground"><LifeBuoy className="size-6" aria-hidden="true" /><h2 className="text-lg font-semibold text-foreground">Choose a conversation</h2><p>Select an inbox thread to read its messages and reply.</p></div>
                        : selectedThread ? <>
                            <header className="space-y-4 p-4 @min-[48rem]/support:p-5">
                                <h2 className="[overflow-wrap:anywhere] text-xl font-semibold leading-snug tracking-tight text-foreground">{selectedThread.subject || "Support thread"}</h2>
                                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                                    <span className="[overflow-wrap:anywhere]">{selectedThread.userHandle ? `@${selectedThread.userHandle}` : selectedThread.userDisplayName || selectedThread.userEmail || selectedThread.userId}</span>
                                    <span>{formatSupportCategoryLabel(selectedThread.category)}</span>
                                    <Badge variant="secondary" className="max-w-full whitespace-normal break-words font-medium">{describeSupportState(selectedThread.status)}</Badge>
                                    <Link href={`/admin/user/${selectedThread.userId}`} className={cn(buttonVariants({variant:"ghost",size:"sm"}),"max-w-full whitespace-normal text-primary")}>View Record</Link>
                                </div>
                                <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Thread actions">
                                    <Button type="button" variant="ghost" size="sm" className="max-w-full whitespace-normal" isLoading={updatingStatus} disabled={isLocalAdminUiTestSession || Boolean(messagesError) || isLoadingMessages} onClick={() => void handleStatusUpdate("waiting_on_support")}>Need action</Button>
                                    <Button type="button" variant="ghost" size="sm" className="max-w-full whitespace-normal" isLoading={updatingStatus} disabled={isLocalAdminUiTestSession || Boolean(messagesError) || isLoadingMessages} onClick={() => void handleStatusUpdate("waiting_on_user")}>Wait on user</Button>
                                    <Button type="button" variant="outline" size="sm" className="max-w-full whitespace-normal" isLoading={updatingStatus} disabled={isLocalAdminUiTestSession || Boolean(messagesError) || isLoadingMessages} onClick={() => void handleStatusUpdate("resolved")}>Resolve</Button>
                                </div>
                            </header>
                            <section className="min-w-0 space-y-4 border-t border-border p-4 @min-[48rem]/support:p-5" aria-label="Conversation messages">
                                {messagesError ? <div className="space-y-3"><p role="alert" className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-foreground"><AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")}</span></p><Button type="button" variant="ghost" disabled={isLocalAdminUiTestSession} onClick={() => void refreshAll()}>Reload conversation</Button></div> : null}
                                {isLoadingMessages && !messages.length ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading conversation...</p>
                                    : messages.length ? <ol className="min-w-0 space-y-6">
                                        {messages.map((entry) => <li key={entry.id} className="min-w-0 space-y-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">{entry.senderRole === "admin" ? "Support" : entry.senderRole === "system" ? "System" : "User"}</span><span>{formatRelativeTime(entry.createdAt)}</span></div>
                                            <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-base leading-relaxed text-foreground">{entry.body}</p>
                                        </li>)}
                                    </ol> : !messagesError ? <p className="text-sm leading-relaxed text-muted-foreground">No messages are recorded.</p> : null}
                            </section>
                            <div className="min-w-0 space-y-3 border-t border-border p-4 @min-[48rem]/support:p-5">
                                <label className="block min-w-0 space-y-2 text-sm font-medium text-foreground"><span>Reply</span>
                                    <Textarea value={reply} onChange={(event) => { if (!selectedThreadId) return; const value = event.target.value; const actorId = user?.uid ?? null; setReplyState((current) => ({ actorId, drafts: { ...(current.actorId === actorId ? current.drafts : {}), [selectedThreadId]: value } })); }} rows={3}
                                        disabled={isLocalAdminUiTestSession || Boolean(messagesError) || isLoadingMessages} placeholder="Write the next step or resolution..."
                                        className="min-h-28 w-full resize-y rounded-lg border border-input bg-background p-3 text-base font-normal leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
                                </label>
                                <div className="flex min-w-0 flex-wrap justify-end gap-2"><Button type="button" variant="brand" className="max-w-full whitespace-normal" isLoading={replying} disabled={isLocalAdminUiTestSession || Boolean(messagesError) || isLoadingMessages || reply.trim().length === 0} onClick={() => void handleReply()}><Send className="mr-2 size-4 shrink-0" aria-hidden="true" />Send Reply</Button></div>
                            </div>
                        </> : <div className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
                            <h2 className="text-lg font-semibold text-foreground">{messagesError ? "Conversation unavailable" : "Loading conversation..."}</h2>
                            {messagesError ? <><p role="alert">{getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")}</p><Button type="button" variant="ghost" disabled={isLocalAdminUiTestSession} onClick={() => void refreshAll()}>Reload conversation</Button></> : <p role="status">Checking the selected thread.</p>}
                        </div>}
                </Card>
            </div>
        </div>
    );
}
