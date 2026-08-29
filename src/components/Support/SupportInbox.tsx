"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { KandySupportConversation } from "@/components/creative-tim/kandydrops/support/KandySupportConversation";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import {
    SUPPORT_THREAD_CATEGORIES,
    type SupportMessageRecord,
    type SupportThreadCategory,
    type SupportThreadPreview,
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

type SupportProblemAction = "load_list" | "load_detail" | "create" | "reply" | "status" | "missing_thread";

type SupportErrorPayload = {
    error?: string;
    errorCode?: string;
    errorKey?: string;
    userMessage?: string;
    retryable?: boolean;
    resource?: string;
};

class SupportRequestError extends Error {
    status: number;
    errorKey: string | null;
    retryable: boolean | null;
    resource: string | null;

    constructor(message: string, {
        status,
        errorKey,
        retryable,
        resource,
    }: {
        status: number;
        errorKey?: string | null;
        retryable?: boolean | null;
        resource?: string | null;
    }) {
        super(message);
        this.name = "SupportRequestError";
        this.status = status;
        this.errorKey = errorKey ?? null;
        this.retryable = retryable ?? null;
        this.resource = resource ?? null;
    }
}

function normalizeInitialCategory(value: string | null): SupportThreadCategory {
    return SUPPORT_THREAD_CATEGORIES.includes(value as SupportThreadCategory)
        ? value as SupportThreadCategory
        : "general";
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await authFetch(url, init);
    const body = await response.json().catch(() => ({})) as T & SupportErrorPayload;
    if (!response.ok) {
        throw new SupportRequestError(
            typeof body.userMessage === "string" && body.userMessage.trim()
                ? body.userMessage
                : "Support request could not be completed right now.",
            {
                status: response.status,
                errorKey: typeof body.errorKey === "string" ? body.errorKey : typeof body.errorCode === "string" ? body.errorCode : null,
                retryable: typeof body.retryable === "boolean" ? body.retryable : null,
                resource: typeof body.resource === "string" ? body.resource : null,
            },
        );
    }
    return body;
}

function getSupportProblemCopy(action: SupportProblemAction, error?: unknown) {
    if (error instanceof SupportRequestError) {
        if (error.status === 401 || error.errorKey === "auth_required" || error.errorKey === "unauthorized" || error.errorKey === "session_expired") {
            return "Sign in again to continue with support.";
        }
        if (error.status === 403 || error.errorKey === "forbidden") {
            return "This support ticket is not available on this account.";
        }
        if (error.status === 404 || error.errorKey === "not_found" || error.resource === "support_thread" || error.resource === "thread") {
            return "This support ticket could not be found. Open a new ticket if you still need help.";
        }
        if (error.status === 429 || error.errorKey === "rate_limited") {
            return "Too many support requests came through. Wait a minute, then try again.";
        }
        if (error.status === 400 || error.status === 422 || error.errorKey === "validation_failed") {
            return "Check the support details and try again.";
        }
        if (error.retryable === false && error.errorKey === "missing_firestore_index") {
            return "Support inbox setup needs operator attention before this can load.";
        }
    }

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
        case "missing_thread":
            return "This support ticket could not be found. Open a new ticket if you still need help.";
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
                detail: { message: getSupportProblemCopy("load_list", threadListError) },
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
                detail: { message: getSupportProblemCopy("load_detail", selectedThreadError) },
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
            const messageText = getSupportProblemCopy("create", error);
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support ticket creation failed",
                detail: { message: messageText },
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
            const messageText = getSupportProblemCopy("reply", error);
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support reply failed",
                detail: { message: messageText },
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
            const messageText = getSupportProblemCopy("status", error);
            reportClientIssue({
                channel: "network",
                severity: "error",
                message: "Support status update failed",
                detail: { message: messageText },
            });
            toast.error(messageText);
        } finally {
            setUpdatingStatus(false);
        }
    }

    return (
        <>
            <PageViewEvent eventName="support_inbox_viewed" />
            <KandySupportConversation
                threadCount={threadList?.threads.length ?? 0}
                threads={threadList?.threads ?? []}
                threadListLoading={threadListLoading}
                threadListProblem={
                    threadListError ? getSupportProblemCopy("load_list", threadListError) : null
                }
                selectedThreadId={selectedThreadId}
                onSelectThread={(threadId) => {
                    setSelectedThreadId(threadId);
                    setComposerOpen(false);
                }}
                composerOpen={composerOpen}
                onComposerOpenChange={setComposerOpen}
                subject={subject}
                onSubjectChange={setSubject}
                category={category}
                onCategoryChange={(nextCategory) =>
                    setCategory(normalizeInitialCategory(nextCategory))
                }
                message={message}
                onMessageChange={setMessage}
                submitting={submitting}
                createDisabled={subject.trim().length < 4 || message.trim().length < 10}
                onCreateThread={() => void handleCreateThread()}
                selectedThreadLoading={selectedThreadLoading}
                selectedThreadProblem={
                    selectedThreadError
                        ? getSupportProblemCopy("load_detail", selectedThreadError)
                        : null
                }
                selectedThreadMissing={Boolean(selectedThread?.success && selectedThread.thread === null)}
                selectedThreadMissingCopy={getSupportProblemCopy("missing_thread")}
                activeThread={activeSelectedThread?.thread ?? null}
                messages={activeSelectedThread?.messages ?? []}
                onRefresh={() => void mutateSelectedThread()}
                updatingStatus={updatingStatus}
                onStatusAction={(action) => void handleStatusAction(action)}
                reply={reply}
                onReplyChange={setReply}
                replying={replying}
                onReply={() => void handleReply()}
            />
        </>
    );
}