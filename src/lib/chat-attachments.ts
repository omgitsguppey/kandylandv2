export const CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export type ChatAttachmentKind = "image" | "video";

export type ChatAttachmentClientPhase = "prepare" | "storage" | "complete";
export type ChatAttachmentRetryDisposition =
    | "retry_same_operation"
    | "cancel_then_rotate"
    | "rotate_operation"
    | "already_committed";
export type ChatAttachmentCancelState = "canceled" | "already_committed" | "unconfirmed";

export type ChatAttachmentRetryAction = {
    outcome: "retry" | "rotate" | "committed";
    retainOperation: boolean;
    clearOperationKey: boolean;
};

type ChatAttachmentProblemDetail = {
    errorCode?: unknown;
    retryable?: unknown;
};

export type ChatAttachmentCompleteOperationIdentity = {
    operationKey: string;
    uploadId: string;
    correlationId: string;
    storagePath: string;
};

export type ChatAttachmentFinalizedReceipt = {
    success: true;
    status: "finalized";
    idempotencyKey: string;
    uploadId: string;
    correlationId: string;
    storagePath: string;
    assetUrl: string;
    assetName?: string;
    assetMimeType?: string;
    sizeBytes?: number;
};

export function isChatAttachmentFinalizedReceipt(
    body: unknown,
    operation: ChatAttachmentCompleteOperationIdentity,
): body is ChatAttachmentFinalizedReceipt {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return false;
    }
    const record = body as Record<string, unknown>;
    return record.success === true
        && record.status === "finalized"
        && record.idempotencyKey === operation.operationKey
        && record.uploadId === operation.uploadId
        && record.correlationId === operation.correlationId
        && record.storagePath === operation.storagePath
        && typeof record.assetUrl === "string"
        && record.assetUrl.trim().length > 0
        && (record.assetName === undefined || typeof record.assetName === "string")
        && (record.assetMimeType === undefined || typeof record.assetMimeType === "string")
        && (record.sizeBytes === undefined || (typeof record.sizeBytes === "number" && Number.isFinite(record.sizeBytes)));
}

export function resolveChatAttachmentRetryDisposition(input: {
    phase: ChatAttachmentClientPhase;
    responseStatus?: number | null;
    responseParsed?: boolean;
    detail?: ChatAttachmentProblemDetail | null;
}): ChatAttachmentRetryDisposition {
    const errorCode = typeof input.detail?.errorCode === "string"
        ? input.detail.errorCode
        : "";

    if (errorCode === "attachment_already_attached") {
        return "already_committed";
    }
    if (errorCode === "attachment_canceled") {
        return "rotate_operation";
    }
    if (input.phase === "storage") {
        return "cancel_then_rotate";
    }
    if (input.responseParsed === false || typeof input.responseStatus !== "number") {
        return "retry_same_operation";
    }

    const retryableConflict = input.detail?.retryable === true || [
        "attachment_complete_conflict",
        "attachment_complete_in_progress",
        "attachment_cancel_requested",
        "attachment_cancel_in_progress",
        "attachment_operation_in_progress",
    ].includes(errorCode);
    if (retryableConflict || input.responseStatus >= 500 || [408, 425, 429, 499].includes(input.responseStatus)) {
        return "retry_same_operation";
    }

    if (input.phase === "prepare") {
        return input.responseStatus >= 400 && input.responseStatus < 500
            ? "rotate_operation"
            : "retry_same_operation";
    }

    return input.responseStatus >= 400 && input.responseStatus < 500
        ? "cancel_then_rotate"
        : "retry_same_operation";
}

export function resolveChatAttachmentRetryAction(input: {
    disposition: ChatAttachmentRetryDisposition;
    cancelState?: ChatAttachmentCancelState | null;
}): ChatAttachmentRetryAction {
    if (input.disposition === "already_committed" || input.cancelState === "already_committed") {
        return { outcome: "committed", retainOperation: false, clearOperationKey: true };
    }
    if (input.disposition === "rotate_operation" || input.cancelState === "canceled") {
        return { outcome: "rotate", retainOperation: false, clearOperationKey: true };
    }

    return { outcome: "retry", retainOperation: true, clearOperationKey: false };
}

export function shouldClearChatPendingOperation(input: {
    serverErrorCode?: string | null;
    attachmentDisposition?: ChatAttachmentRetryDisposition | null;
    cleanupState?: ChatAttachmentCancelState | null;
    definitiveServerFailure: boolean;
    hasUploadedAttachment: boolean;
}) {
    return input.serverErrorCode === "attachment_canceled"
        || input.attachmentDisposition === "rotate_operation"
        || input.cleanupState === "canceled"
        || (input.definitiveServerFailure && !input.hasUploadedAttachment);
}

export function resolveChatAttachmentKind(mimeType: unknown): ChatAttachmentKind | null {
    if (typeof mimeType !== "string") {
        return null;
    }

    const normalized = mimeType.trim().toLowerCase();
    if (normalized.startsWith("image/")) {
        return "image";
    }

    if (normalized.startsWith("video/")) {
        return "video";
    }

    return null;
}

export function isSupportedChatAttachmentMimeType(mimeType: unknown) {
    return resolveChatAttachmentKind(mimeType) !== null;
}
