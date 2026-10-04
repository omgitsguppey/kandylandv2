import { useCallback, useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { readUiJson } from "@/lib/ui-continuity";
import {
  normalizeSupportThreadCategory,
  normalizeSupportThreadStatus,
  type SupportMessageRecord,
  type SupportThreadRecord,
} from "@/lib/support-readiness";

type AdminSupportThreadListSummary = {
  total: number;
  openCount: number;
  waitingOnUserCount: number;
  resolvedCount: number;
};

type AdminSupportThreadListResponse = {
  success: boolean;
  threads: SupportThreadRecord[];
  summary?: Partial<AdminSupportThreadListSummary>;
};

type AdminSupportThreadDetailResponse = {
  success: boolean;
  thread: SupportThreadRecord | null;
  messages: SupportMessageRecord[];
};

type AdminSupportMessageState = {
  threadId: string | null;
  messages: SupportMessageRecord[];
  isLoading: boolean;
  error: Error | null;
};

const EMPTY_SUMMARY: AdminSupportThreadListSummary = {
  total: 0,
  openCount: 0,
  waitingOnUserCount: 0,
  resolvedCount: 0,
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function normalizeThread(thread: SupportThreadRecord): SupportThreadRecord {
  return {
    ...thread,
    status: normalizeSupportThreadStatus(thread.status),
    category: normalizeSupportThreadCategory(thread.category),
    createdAt: toNumber(thread.createdAt),
    updatedAt: toNumber(thread.updatedAt),
    lastMessageAt: toNumber(thread.lastMessageAt),
    messageCount: Math.max(0, toNumber(thread.messageCount)),
  };
}

function normalizeSummary(summary: Partial<AdminSupportThreadListSummary> | undefined, threads: SupportThreadRecord[]) {
  if (summary) {
    return {
      total: toNumber(summary.total),
      openCount: toNumber(summary.openCount),
      waitingOnUserCount: toNumber(summary.waitingOnUserCount),
      resolvedCount: toNumber(summary.resolvedCount),
    };
  }

  return threads.reduce<AdminSupportThreadListSummary>((acc, thread) => {
    acc.total += 1;
    if (thread.status === "waiting_on_user") {
      acc.waitingOnUserCount += 1;
    } else if (thread.status === "resolved" || thread.status === "closed") {
      acc.resolvedCount += 1;
    } else {
      acc.openCount += 1;
    }
    return acc;
  }, { ...EMPTY_SUMMARY });
}

async function readAdminSupportJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, init);
  return readUiJson<T>(response, { moduleLabel: "Admin support", url, requireSuccess: true });
}

export function useAdminSupportRealtime(selectedThreadId: string | null, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false;
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const selectedThreadRef = useRef(selectedThreadId);
  const threadRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const [threads, setThreads] = useState<SupportThreadRecord[]>([]);
  const [messageState, setMessageState] = useState<AdminSupportMessageState>({threadId:null, messages:[], isLoading:false, error:null});
  const [summary, setSummary] = useState<AdminSupportThreadListSummary | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<Error | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      threadRequestRef.current += 1;
      messageRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    return () => {
      threadRequestRef.current += 1;
      messageRequestRef.current += 1;
    };
  }, [enabled]);

  useEffect(() => {
    selectedThreadRef.current = selectedThreadId;
    return () => { messageRequestRef.current += 1; };
  }, [selectedThreadId]);

  const refreshThreads = useCallback(async () => {
    if (!mountedRef.current) return;
    const requestId = ++threadRequestRef.current;
    if (!enabled || !enabledRef.current) {
      setThreads([]);
      setSummary(null);
      setThreadsError(null);
      setIsLoadingThreads(false);
      return;
    }

    setIsLoadingThreads(true);
    try {
      const body = await readAdminSupportJson<AdminSupportThreadListResponse>("/api/admin/support/threads?status=all");
      if (!Array.isArray(body.threads)) {
        throw new Error("Support thread list did not return a verified snapshot.");
      }
      if (body.summary && ["total", "openCount", "waitingOnUserCount", "resolvedCount"].some((key) => {
        const value = body.summary?.[key as keyof AdminSupportThreadListSummary];
        return typeof value !== "number" || !Number.isInteger(value) || value < 0;
      })) {
        throw new Error("Support thread list returned an incomplete summary.");
      }
      const nextThreads = body.threads.map(normalizeThread);
      if (!mountedRef.current || !enabledRef.current || requestId !== threadRequestRef.current) {
        return;
      }
      setThreads(nextThreads);
      setSummary(normalizeSummary(body.summary, nextThreads));
      setThreadsError(null);
    } catch (error) {
      if (!mountedRef.current || !enabledRef.current || requestId !== threadRequestRef.current) {
        return;
      }
      setThreadsError(error instanceof Error ? error : new Error("Support thread list failed for admin route."));
    } finally {
      if (mountedRef.current && enabledRef.current && requestId === threadRequestRef.current) {
        setIsLoadingThreads(false);
      }
    }
  }, [enabled]);

  const refreshMessages = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!enabled || !enabledRef.current || !selectedThreadId) {
      messageRequestRef.current += 1;
      setMessageState({threadId:null, messages:[], isLoading:false, error:null});
      return;
    }
    // An older action may finish after the operator selected another thread.
    if (selectedThreadRef.current !== selectedThreadId) return;
    const requestId = ++messageRequestRef.current;
    const isCurrentRequest = () => mountedRef.current && enabledRef.current
      && requestId === messageRequestRef.current && selectedThreadRef.current === selectedThreadId;

    setMessageState((current) => ({threadId:selectedThreadId, messages:current.threadId === selectedThreadId ? current.messages : [], isLoading:true, error:null}));
    try {
      const body = await readAdminSupportJson<AdminSupportThreadDetailResponse>(`/api/admin/support/threads/${selectedThreadId}`);
      if (!Array.isArray(body.messages) || (body.thread && body.thread.id !== selectedThreadId)
        || body.messages.some((message) => !message || message.threadId !== selectedThreadId)) {
        throw new Error("Support thread detail did not return messages for the selected thread.");
      }
      if (!body.thread) {
        throw new Error("The selected support thread is no longer available.");
      }
      if (!isCurrentRequest()) {
        return;
      }
      setMessageState({threadId:selectedThreadId, messages:body.messages, isLoading:false, error:null});
      if (body.thread) {
        const normalized = normalizeThread(body.thread);
        setThreads((current) => {
          const found = current.some((thread) => thread.id === normalized.id);
          return found
            ? current.map((thread) => thread.id === normalized.id ? normalized : thread)
            : [normalized, ...current];
        });
      }
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }
      setMessageState((current) => ({...current, isLoading:false, error:error instanceof Error ? error : new Error("Support thread detail failed for admin route.")}));
    } finally {
      if (isCurrentRequest()) {
        setMessageState((current) => ({...current, isLoading:false}));
      }
    }
  }, [enabled, selectedThreadId]);

  const refreshAll = useCallback(async () => {
    await refreshThreads();
    await refreshMessages();
  }, [refreshMessages, refreshThreads]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  const activeMessageState = enabled && messageState.threadId === selectedThreadId
    ? messageState
    : { messages:[], isLoading:Boolean(enabled && selectedThreadId), error:null };

  return {
    threads,
    messages: activeMessageState.messages,
    summary,
    isLoadingThreads,
    isLoadingMessages: activeMessageState.isLoading,
    threadsError,
    messagesError: activeMessageState.error,
    refreshThreads,
    refreshMessages,
    refreshAll,
  };
}
