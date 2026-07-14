const CHAT_REALTIME_RETRY_DELAYS_MS = [1_500, 3_000, 5_000, 10_000, 15_000] as const;

export const CHAT_REALTIME_FAILURE_REPORT_COOLDOWN_MS = 30_000;

type ChatRouteSyncInput = {
    creatorId?: string | null;
    currentSearch?: string | null;
    selectedThreadId?: string | null;
};

type ChatRequestedThreadActorTransitionInput = {
    previousOwnerUserId?: string | null;
    nextUserId?: string | null;
    requestedThreadId?: string | null;
    blockedRequestedThreadId?: string | null;
};

export function resolveChatRequestedThreadActorTransition({
    previousOwnerUserId,
    nextUserId,
    requestedThreadId,
    blockedRequestedThreadId,
}: ChatRequestedThreadActorTransitionInput) {
    const requested = requestedThreadId?.trim() || null;
    const ownerChanged = (previousOwnerUserId || null) !== (nextUserId || null);
    const hadAuthenticatedOwner = Boolean(previousOwnerUserId);
    const nextBlockedRequestedThreadId = ownerChanged && hadAuthenticatedOwner && requested
        ? requested
        : blockedRequestedThreadId || null;
    const requestedThreadBelongsToPreviousActor = Boolean(
        requested && nextBlockedRequestedThreadId === requested,
    );

    return {
        blockedRequestedThreadId: nextBlockedRequestedThreadId,
        retainedRequestedThreadId: hadAuthenticatedOwner || requestedThreadBelongsToPreviousActor
            ? null
            : requested,
    } as const;
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
