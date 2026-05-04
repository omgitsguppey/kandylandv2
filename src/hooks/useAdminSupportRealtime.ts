import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
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

function buildAdminSupportError(url: string, status: number, fallback?: string) {
  const safeFallback = fallback && fallback !== "Internal server error" ? fallback : undefined;

  if (status === 401 || status === 403) {
    if (url.includes("/api/admin/support/threads/")) {
      return new Error("Support message detail route returned forbidden.");
    }
    return new Error("Admin support thread read was blocked. Check admin role, support_threads rules, and admin support API route.");
  }

  if (url.includes("/api/admin/support/threads/")) {
    return new Error(safeFallback || "Support dashboard expected nested messages but received no messages.");
  }

  return new Error(safeFallback || "Support thread list failed for admin route.");
}

async function readAdminSupportJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, init);
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    throw buildAdminSupportError(url, response.status, body.error);
  }
  return body;
}

export function useAdminSupportRealtime(selectedThreadId: string | null) {
  const mountedRef = useRef(true);
  const [threads, setThreads] = useState<SupportThreadRecord[]>([]);
  const [messages, setMessages] = useState<SupportMessageRecord[]>([]);
  const [summary, setSummary] = useState<AdminSupportThreadListSummary>(EMPTY_SUMMARY);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [threadsError, setThreadsError] = useState<Error | null>(null);
  const [messagesError, setMessagesError] = useState<Error | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const body = await readAdminSupportJson<AdminSupportThreadListResponse>("/api/admin/support/threads?status=all");
      const nextThreads = (body.threads ?? []).map(normalizeThread);
      if (!mountedRef.current) {
        return;
      }
      setThreads(nextThreads);
      setSummary(normalizeSummary(body.summary, nextThreads));
      setThreadsError(null);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setThreadsError(error instanceof Error ? error : new Error("Support thread list failed for admin route."));
    } finally {
      if (mountedRef.current) {
        setIsLoadingThreads(false);
      }
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!selectedThreadId) {
      setMessages([]);
      setMessagesError(null);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const body = await readAdminSupportJson<AdminSupportThreadDetailResponse>(`/api/admin/support/threads/${selectedThreadId}`);
      if (!mountedRef.current) {
        return;
      }
      setMessages(body.messages ?? []);
      setMessagesError(null);
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
      if (!mountedRef.current) {
        return;
      }
      setMessagesError(error instanceof Error ? error : new Error("Support thread detail failed for admin route."));
    } finally {
      if (mountedRef.current) {
        setIsLoadingMessages(false);
      }
    }
  }, [selectedThreadId]);

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

  const stableSummary = useMemo(() => summary, [summary]);

  return {
    threads,
    messages,
    summary: stableSummary,
    isLoadingThreads,
    isLoadingMessages,
    threadsError,
    messagesError,
    refreshThreads,
    refreshMessages,
    refreshAll,
  };
}
