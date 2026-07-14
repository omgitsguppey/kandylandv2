export type ChatSendWarning = {
    code?: string;
    detail?: string;
};

export const CHAT_COMPOSER_RECOVERY_MAX_SETTLED_ENTRIES = 20;
export const CHAT_COMPOSER_RECOVERY_MAX_SETTLED_FILE_ENTRIES = 2;

export function buildChatActorThreadKey(actorId: string, threadId: string) {
    return JSON.stringify([actorId, threadId]);
}

export function isChatSendThreadCurrent(input: {
    currentActorId: string | null;
    currentThreadId: string | null;
    sendActorId: string;
    sendThreadId: string;
}) {
    return input.currentActorId === input.sendActorId
        && input.currentThreadId === input.sendThreadId;
}

export function canReuseChatPendingSend<TFile>(input: {
    pendingFingerprint: string | null | undefined;
    currentFingerprint: string;
    pendingFile: TFile | null | undefined;
    currentFile: TFile | null;
}) {
    return input.pendingFingerprint === input.currentFingerprint
        && (input.currentFile === null || input.pendingFile === input.currentFile);
}

export function isChatSendSuccessReceipt(body: unknown, expected: {
    threadId: string;
    viewerRole: "user" | "creator";
    messageKind: "text" | "image" | "video";
    text: string;
    assetUrl?: string | null;
    assetName?: string | null;
    assetMimeType?: string | null;
}) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return false;
    }
    const record = body as Record<string, unknown>;
    if (record.success !== true || !record.message || typeof record.message !== "object" || !record.thread || typeof record.thread !== "object") {
        return false;
    }
    const message = record.message as Record<string, unknown>;
    const thread = record.thread as Record<string, unknown>;
    return typeof message.id === "string"
        && message.id.length > 0
        && message.threadId === expected.threadId
        && message.senderRole === expected.viewerRole
        && message.messageKind === expected.messageKind
        && (typeof message.text === "string" ? message.text : "") === expected.text
        && (typeof message.assetUrl === "string" ? message.assetUrl : "") === (expected.assetUrl ?? "")
        && (typeof message.assetName === "string" ? message.assetName : "") === (expected.assetName ?? "")
        && (typeof message.assetMimeType === "string" ? message.assetMimeType : "") === (expected.assetMimeType ?? "")
        && typeof message.createdAt === "number"
        && Number.isFinite(message.createdAt)
        && thread.id === expected.threadId
        && thread.viewerRole === expected.viewerRole
        && record.pricing !== null
        && typeof record.pricing === "object";
}

export function resolveChatComposerRecovery<T>(input: {
    activeKey: string | null;
    pendingByKey: ReadonlyMap<string, { composerRecovery: T }>;
    recoveryByKey: ReadonlyMap<string, T>;
}) {
    if (!input.activeKey) {
        return null;
    }

    return input.recoveryByKey.get(input.activeKey)
        ?? input.pendingByKey.get(input.activeKey)?.composerRecovery
        ?? null;
}

export function resolveChatComposerRecoveryUpdate<T extends object>(input: {
    mappedRecovery: T | null | undefined;
    pendingRecovery: T | null | undefined;
    patch: Partial<T>;
}) {
    const currentRecovery = input.mappedRecovery ?? input.pendingRecovery;
    if (!currentRecovery) {
        return null;
    }

    return {
        recovery: { ...currentRecovery, ...input.patch },
        shouldUpdatePending: !input.mappedRecovery || input.mappedRecovery === input.pendingRecovery,
    };
}

export function stripChatComposerRecoveryFile<TFile, TRecovery extends { file: TFile | null }>(
    recovery: TRecovery,
): Omit<TRecovery, "file"> & { file: null } {
    return { ...recovery, file: null };
}

export function selectChatComposerRecoveryEvictions(input: {
    recoveryKeys: Iterable<string>;
    activeKeys: ReadonlySet<string>;
    maxSettledEntries?: number;
}) {
    const maxSettledEntries = Math.max(
        0,
        Math.trunc(input.maxSettledEntries ?? CHAT_COMPOSER_RECOVERY_MAX_SETTLED_ENTRIES),
    );
    const settledKeys = [...input.recoveryKeys].filter((key) => !input.activeKeys.has(key));
    return settledKeys.slice(0, Math.max(0, settledKeys.length - maxSettledEntries));
}

export function selectChatComposerFileRecoveryEvictions(input: {
    recoveryKeys: Iterable<string>;
    activeKeys: ReadonlySet<string>;
    maxSettledFileEntries?: number;
}) {
    return selectChatComposerRecoveryEvictions({
        recoveryKeys: input.recoveryKeys,
        activeKeys: input.activeKeys,
        maxSettledEntries: input.maxSettledFileEntries
            ?? CHAT_COMPOSER_RECOVERY_MAX_SETTLED_FILE_ENTRIES,
    });
}

export function buildChatSendErrorMessage(input: {
    error?: string;
    errorCode?: string;
}) {
    switch (input.errorCode) {
        case "forbidden":
            return "You are not allowed to send messages in this thread.";
        case "insufficient_paid_gumdrops":
            return "You need more paid GumDrops to message this creator.";
        case "creator_unavailable":
            return "Messaging is unavailable for this creator right now.";
        case "invalid_attachment":
            return "This message type needs a valid attachment before it can be sent.";
        case "participants_not_found":
            return "This chat thread is missing one of its participants.";
        case "invalid_thread":
            return "This chat thread is no longer valid.";
        case "empty_message":
            return "Add a message or attachment before sending.";
        case "file_too_large_requires_fan_pass":
            return "This file is too large. Chat uploads are limited to 25 MB unless you have a Fan Pass.";
        case "fan_pass_file_limit_exceeded":
            return "This file is too large. Fan Pass uploads support up to 500 MB. Please upload a smaller file.";
        case "file_too_large":
            return "This file is too large for chat upload.";
        default:
            return "We couldn't send your message. Try again shortly.";
    }
}

export function buildChatSendWarningMessage(warnings?: ChatSendWarning[] | null) {
    if (!warnings || warnings.length === 0) {
        return null;
    }

    const postSendTrackingWarning = warnings.find((warning) => warning.code === "post_send_tracking_failure");
    if (postSendTrackingWarning) {
        return "Message sent, but tracking degraded after delivery. Admin debug will show the warning.";
    }

    return "Message sent with a non-blocking warning.";
}
