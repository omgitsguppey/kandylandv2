const CHAT_REALTIME_RETRY_DELAYS_MS = [1_500, 3_000, 5_000, 10_000, 15_000] as const;

export function getChatRealtimeRetryDelayMs(attempt: number) {
    const normalizedAttempt = Number.isFinite(attempt) && attempt > 0
        ? Math.floor(attempt)
        : 1;
    return CHAT_REALTIME_RETRY_DELAYS_MS[Math.min(normalizedAttempt - 1, CHAT_REALTIME_RETRY_DELAYS_MS.length - 1)];
}
