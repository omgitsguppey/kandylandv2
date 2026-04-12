const CHAT_REALTIME_RETRY_DELAYS_MS = [1_500, 3_000, 5_000, 10_000, 15_000] as const;

export const CHAT_REALTIME_FAILURE_REPORT_COOLDOWN_MS = 30_000;

type ChatRouteSyncInput = {
    creatorId?: string | null;
    currentSearch?: string | null;
    selectedThreadId?: string | null;
};



export function getChatRealtimeRetryDelayMs(attempt: number) {
    const normalizedAttempt = Number.isFinite(attempt) && attempt > 0
        ? Math.floor(attempt)
        : 1;
    return CHAT_REALTIME_RETRY_DELAYS_MS[Math.min(normalizedAttempt - 1, CHAT_REALTIME_RETRY_DELAYS_MS.length - 1)];
}

export function buildChatThreadRouteSyncTarget({
    creatorId,
    currentSearch,
    selectedThreadId,
}: ChatRouteSyncInput) {
    if (!selectedThreadId) {
        return null;
    }

    const normalizedSearch = (currentSearch || "").replace(/^\?/, "");
    const params = new URLSearchParams(normalizedSearch);
    params.set("thread", selectedThreadId);
    if (creatorId) {
        params.set("creator", creatorId);
    } else {
        params.delete("creator");
    }

    const nextSearch = params.toString();
    if (nextSearch === normalizedSearch) {
        return null;
    }

    return nextSearch ? `/dashboard/chat?${nextSearch}` : "/dashboard/chat";
}



export function shouldReportChatRealtimeFailure(
    lastReportedAtMs?: number | null,
    nowMs = Date.now(),
    cooldownMs = CHAT_REALTIME_FAILURE_REPORT_COOLDOWN_MS,
) {
    if (!Number.isFinite(lastReportedAtMs) || !Number.isFinite(nowMs)) {
        return true;
    }

    return nowMs - Number(lastReportedAtMs) >= cooldownMs;
}
