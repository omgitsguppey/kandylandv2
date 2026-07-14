import { randomUUID } from "node:crypto";

import type { FileMetadata } from "@google-cloud/storage";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { CHAT_COLLECTIONS } from "@/lib/chat";
import { CHAT_MEDIA_LIMIT_BYTES_FAN_PASS } from "@/lib/chat/chat-media-limits";
import { buildMediaAccessTelemetry, resolveMediaAccess } from "@/lib/media/media-access-resolver";
import {
    fingerprintStoragePath,
    isStorageNotFoundFailure,
    isStoragePreconditionFailure,
    readStorageObjectVersion,
} from "@/lib/media/media-upload-contract";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { resolveServerChatMediaLimitPolicy } from "@/lib/server/chat-media-limit-policy";
import { handleApiError } from "@/lib/server/auth";
import {
    CREATOR_EXPERIENCE_OPERATION_COLLECTION,
    buildChatAttachmentOperationIdentity,
    matchesChatAttachmentOperationIdentity,
} from "@/lib/server/creator-experiences";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const completeAttachmentSchema = z.object({
    threadId: z.string().trim().min(1),
    storagePath: z.string().trim().min(1),
    fileName: z.string().trim().min(1).max(260),
    mimeType: z.string().trim().min(1).max(160),
    uploadId: z.string().trim().min(1).max(180).optional(),
    correlationId: z.string().trim().min(1).max(180).optional(),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
});

const ATTACHMENT_COMPLETE_GUARD_EVIDENCE = {
    firestoreReadScope: "bounded_documents",
    attachmentCompleteGuarded: true,
    ownershipChecked: true,
    threadMembershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
    idempotencyGuarded: true,
    idempotencyScope: "creator_experience_message_operation",
    transactionBound: true,
} as const;
const CLIENT_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/u;
const UNSAFE_STORAGE_PATH_PATTERN = /(?:^https?:|^gs:|^[a-z][a-z0-9+.-]*:|\\|\/\/|\.\.)/iu;
const CHAT_JSON_BODY_LIMIT_BYTES = 64_000;
const CHAT_ATTACHMENT_COMPLETION_LEASE_MS = 60_000;

function buildFirebaseStorageDownloadUrl(bucketName: string, storagePath: string, token: string) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function isSafePendingAttachmentPath(storagePath: string, expectedPrefix: string) {
    return storagePath.startsWith(expectedPrefix)
        && storagePath.length > expectedPrefix.length
        && !storagePath.endsWith("/")
        && !UNSAFE_STORAGE_PATH_PATTERN.test(storagePath);
}

function buildAttachmentCompleteForbiddenResponse(input?: { viewerUserId?: string | null }) {
    const accessDecision = resolveMediaAccess({
        surface: "chat_attachment",
        mediaId: "pending_chat_attachment",
        viewerUserId: input?.viewerUserId ?? "authenticated_caller",
        exists: true,
        isChatThreadParticipant: false,
        sourceTruth: "chat_thread_membership",
        route: "/api/chat/attachments/complete",
    });
    return NextResponse.json({
        ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
        error: "Attachment completion is not allowed for this file.",
        errorCode: "attachment_complete_forbidden",
        mediaAccessReason: accessDecision.reason,
        mediaAccessFailureClass: accessDecision.failureClass,
        mediaAccessDebugLane: "Private media access",
    }, { status: 403 });
}

function deriveUploadIdFromStoragePath(storagePath: string) {
    const fileName = storagePath.split("/").pop() ?? "";
    const [uploadId] = fileName.split("_");
    return uploadId && uploadId.trim().length > 0 ? uploadId : fingerprintStoragePath(storagePath) ?? "unknown_upload";
}

function getClientIdempotencyKey(request: NextRequest, bodyKey?: string) {
    return bodyKey
        ?? request.headers.get("idempotency-key")?.trim()
        ?? request.headers.get("x-idempotency-key")?.trim()
        ?? undefined;
}

function assertChatAttachmentUploadOwnership(input: {
    storagePath: string;
    callerUid: string;
    threadId: string;
}) {
    const expectedPrefix = `creator/messages/${input.callerUid}/${input.threadId}/`;
    return {
        expectedPrefix,
        ok: input.storagePath.startsWith(expectedPrefix) && isSafePendingAttachmentPath(input.storagePath, expectedPrefix),
    };
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/attachments/complete:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/attachments/complete",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({
                error: "Unauthorized",
                errorCode: "unauthorized",
            }, { status: 401 }));
        }
        const db = adminDb;

        let rawBody: unknown;
        try {
            rawBody = await readBoundedJsonBody<unknown>(request, {
                maxBytes: CHAT_JSON_BODY_LIMIT_BYTES,
                routeName: "chat/attachments/complete",
            });
        } catch (error) {
            const payloadTooLarge = isBoundedJsonBodyError(error) && error.code === "payload_too_large";
            return finalize(NextResponse.json({
                error: payloadTooLarge ? "Request payload is too large." : "Malformed request body.",
                errorCode: payloadTooLarge ? "payload_too_large" : "malformed_body",
                retryable: false,
            }, { status: payloadTooLarge ? 413 : 400 }));
        }
        const parsedPayload = completeAttachmentSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment finalize request.",
                errorCode: "invalid_attachment_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
        const clientIdempotencyKey = getClientIdempotencyKey(request, payload.idempotencyKey);
        if (!clientIdempotencyKey || !CLIENT_IDEMPOTENCY_KEY_PATTERN.test(clientIdempotencyKey)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Invalid idempotency key.",
                errorCode: "invalid_idempotency_key",
            }, { status: 400 }));
        }
        if (!isSupportedChatAttachmentMimeType(payload.mimeType)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Only image and video attachments are supported in chat.",
                errorCode: "unsupported_attachment_type",
            }, { status: 400 }));
        }

        // cost-bound: caller, thread, lifecycle, and deterministic message documents only; never a collection scan.
        const callerSnap = await db.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";

        // storage-media guard: authenticated chat participant membership is verified before pending media finalization.
        const detail = await safeGetChatThreadDetailForViewer({
            viewerUid: caller.uid,
            callerRole,
            threadId: payload.threadId,
        });
        if (!detail) {
            return finalize(buildNotFoundResponse("thread", "Chat thread not found.", "thread_not_found"));
        }

        const uploadId = payload.uploadId ?? deriveUploadIdFromStoragePath(payload.storagePath);
        const correlationId = payload.correlationId ?? payload.idempotencyKey ?? uploadId;
        const ownership = assertChatAttachmentUploadOwnership({
            storagePath: payload.storagePath,
            callerUid: caller.uid,
            threadId: payload.threadId,
        });
        const accessDecision = resolveMediaAccess({
            surface: "chat_attachment",
            mediaId: uploadId,
            assetId: payload.fileName,
            viewerUserId: caller.uid,
            ownerUserId: caller.uid,
            exists: true,
            isChatThreadParticipant: ownership.ok,
            storagePath: payload.storagePath,
            route: "/api/chat/attachments/complete",
            sourceTruth: "chat_thread_membership",
        });
        if (!payload.storagePath.startsWith(ownership.expectedPrefix)) {
            return finalize(buildAttachmentCompleteForbiddenResponse({ viewerUserId: caller.uid }));
        }
        if (!ownership.ok) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Invalid attachment storage path.",
                errorCode: "invalid_attachment_path",
                mediaAccessReason: accessDecision.reason,
                mediaAccessFailureClass: accessDecision.failureClass,
                mediaAccessDebugLane: "Private media access",
            }, { status: 400 }));
        }

        const attachmentOperation = buildChatAttachmentOperationIdentity({
            userId: detail.thread.userId,
            creatorId: detail.thread.creatorId,
            callerUid: caller.uid,
            threadId: payload.threadId,
            clientKey: clientIdempotencyKey,
            storagePath: payload.storagePath,
        });

        // idempotency: completion only validates the pending object and sets stable metadata/token on the same storage path.
        const bucket = adminStorage.bucket();
        const file = bucket.file(payload.storagePath);
        let metadata: FileMetadata;
        try {
            [metadata] = await file.getMetadata();
        } catch (error) {
            if (isStorageNotFoundFailure(error)) {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                    error: "Uploaded attachment not found.",
                    errorCode: "attachment_not_found",
                }, { status: 404 }), error);
            }
            throw error;
        }
        const objectVersion = readStorageObjectVersion(metadata);
        if (!objectVersion) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment object version is unavailable. Retry the upload before completing it.",
                errorCode: "attachment_object_version_missing",
                retryable: true,
            }, { status: 409 }));
        }
        const rawMetadataToken = metadata.metadata?.firebaseStorageDownloadTokens
            || metadata.metadata?.downloadTokens;
        const existingAttachmentOperationId = metadata.metadata?.chatAttachmentOperationId;
        if (
            typeof existingAttachmentOperationId === "string"
            && existingAttachmentOperationId.trim().length > 0
            && existingAttachmentOperationId !== attachmentOperation.operationId
        ) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment belongs to a different message operation.",
                errorCode: "attachment_operation_mismatch",
            }, { status: 409 }));
        }
        const metadataToken = typeof rawMetadataToken === "string" && rawMetadataToken.trim().length > 0
            ? rawMetadataToken
            : randomUUID();
        const contentType = metadata.contentType || payload.mimeType || "application/octet-stream";
        if (!isSupportedChatAttachmentMimeType(contentType)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Only image and video attachments are supported in chat.",
                errorCode: "unsupported_attachment_type",
            }, { status: 400 }));
        }
        const size = Number(metadata.size || 0);
        if (!Number.isFinite(size) || size <= 0) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Uploaded attachment is empty or invalid.",
                errorCode: "attachment_invalid",
            }, { status: 400 }));
        }
        const mediaLimitPolicy = await resolveServerChatMediaLimitPolicy({
            threadId: payload.threadId,
            actorUid: caller.uid,
        });
        if (size > CHAT_MEDIA_LIMIT_BYTES_FAN_PASS) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "This file is too large for chat upload.",
                errorCode: "file_too_large",
                maxBytes: CHAT_MEDIA_LIMIT_BYTES_FAN_PASS,
                actualBytes: size,
            }, { status: 400 }));
        }
        if (size > mediaLimitPolicy.maxBytes) {
            const code = mediaLimitPolicy.hasFanPass ? "fan_pass_file_limit_exceeded" : "file_too_large_requires_fan_pass";
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: mediaLimitPolicy.hasFanPass
                    ? "This file is too large. Fan Pass uploads support up to 500 MB. Please upload a smaller file."
                    : "This file is too large. Chat uploads are limited to 25 MB unless you have a Fan Pass.",
                errorCode: code,
                maxBytes: mediaLimitPolicy.maxBytes,
                actualBytes: size,
            }, { status: 400 }));
        }

        const operationRef = db
            .collection(CREATOR_EXPERIENCE_OPERATION_COLLECTION)
            .doc(attachmentOperation.operationId);
        const messageRef = db
            .collection(CHAT_COLLECTIONS.messages)
            .doc(attachmentOperation.messageId);
        const completionAttemptId = randomUUID();
        const claimState = await db.runTransaction(async (transaction) => {
            const [operationSnapshot, messageSnapshot] = await Promise.all([
                transaction.get(operationRef),
                transaction.get(messageRef),
            ]);
            const operationData = operationSnapshot.data() as Record<string, unknown> | undefined;
            if (operationSnapshot.exists && !matchesChatAttachmentOperationIdentity(operationData, attachmentOperation)) {
                return "forbidden" as const;
            }
            if (messageSnapshot.exists || operationData?.status === "attached") {
                return "attached" as const;
            }
            if (operationData?.status === "canceled") {
                return "canceled" as const;
            }
            if (operationData?.status === "canceling") {
                return "canceling" as const;
            }
            if (operationData?.storageCleanupRequested === true) {
                return "cancel_requested" as const;
            }
            const completionLeaseActive = operationData?.status === "finalizing"
                && Number.isFinite(Number(operationData.updatedAt))
                && Date.now() - Number(operationData.updatedAt) < CHAT_ATTACHMENT_COMPLETION_LEASE_MS;
            if (completionLeaseActive) {
                return "finalizing" as const;
            }

            const now = Date.now();
            transaction.set(operationRef, {
                ...attachmentOperation,
                status: "finalizing",
                completionAttemptId,
                attachedMessageId: null,
                storageCleanupRequested: false,
                storageCleanupCompleted: false,
                errorCode: null,
                updatedAt: now,
                ...(operationSnapshot.exists ? {} : { createdAt: now }),
            }, { merge: true });
            return "claimed" as const;
        });
        if (claimState === "attached") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment is already attached to a message.",
                errorCode: "attachment_already_attached",
            }, { status: 409 }));
        }
        if (claimState === "forbidden") {
            return finalize(buildAttachmentCompleteForbiddenResponse({ viewerUserId: caller.uid }));
        }
        if (claimState === "cancel_requested" || claimState === "canceling" || claimState === "finalizing") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: claimState === "cancel_requested"
                    ? "Attachment cancellation was already requested."
                    : claimState === "canceling"
                        ? "Attachment cancellation is already in progress."
                    : "Attachment completion is already in progress.",
                errorCode: claimState === "cancel_requested"
                    ? "attachment_cancel_requested"
                    : claimState === "canceling"
                        ? "attachment_cancel_in_progress"
                    : "attachment_complete_in_progress",
                retryable: true,
            }, { status: 409 }));
        }
        if (claimState === "canceled") {
            const observedFile = bucket.file(payload.storagePath, {
                generation: objectVersion.generation,
                preconditionOpts: { ifGenerationMatch: objectVersion.generation },
            });
            try {
                await observedFile.delete();
            } catch (error) {
                if (!isStorageNotFoundFailure(error) && !isStoragePreconditionFailure(error)) throw error;
            }
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment was already canceled.",
                errorCode: "attachment_canceled",
            }, { status: 409 }));
        }

        try {
            await file.setMetadata({
                contentType,
                metadata: {
                    ...(metadata.metadata || {}),
                    firebaseStorageDownloadTokens: metadataToken,
                    chatAttachmentFinalized: "true",
                    chatAttachmentOperationId: attachmentOperation.operationId,
                },
            }, {
                ifGenerationMatch: objectVersion.generation,
                ifMetagenerationMatch: objectVersion.metageneration,
            });
        } catch (error) {
            const preconditionFailed = isStoragePreconditionFailure(error);
            const failureState = await db.runTransaction(async (transaction) => {
                const [operationSnapshot, messageSnapshot] = await Promise.all([
                    transaction.get(operationRef),
                    transaction.get(messageRef),
                ]);
                const operationData = operationSnapshot.data() as Record<string, unknown> | undefined;
                if (operationSnapshot.exists && !matchesChatAttachmentOperationIdentity(operationData, attachmentOperation)) {
                    return "forbidden" as const;
                }
                if (messageSnapshot.exists || operationData?.status === "attached") {
                    return "attached" as const;
                }
                if (
                    operationData?.storageCleanupRequested === true
                    || operationData?.status === "canceling"
                    || operationData?.status === "canceled"
                ) {
                    return "canceled" as const;
                }
                if (
                    operationSnapshot.exists
                    && matchesChatAttachmentOperationIdentity(operationData, attachmentOperation)
                    && operationData?.status === "finalizing"
                    && operationData.completionAttemptId === completionAttemptId
                ) {
                    transaction.set(operationRef, {
                        status: "failed",
                        completionAttemptId: null,
                        errorCode: preconditionFailed
                            ? "attachment_generation_conflict"
                            : "attachment_complete_failed",
                        updatedAt: Date.now(),
                    }, { merge: true });
                    return "failed" as const;
                }
                return "conflict" as const;
            });
            if (failureState === "forbidden") {
                return finalize(buildAttachmentCompleteForbiddenResponse({ viewerUserId: caller.uid }));
            }
            if (failureState === "attached") {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                    error: "Attachment is already attached to a message.",
                    errorCode: "attachment_already_attached",
                }, { status: 409 }));
            }
            if (failureState === "canceled") {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                    error: "Attachment was canceled before completion finished.",
                    errorCode: "attachment_canceled",
                }, { status: 409 }));
            }
            if (preconditionFailed) {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                    error: "Attachment changed while it was being completed. Retry with the same message key.",
                    errorCode: "attachment_complete_conflict",
                    retryable: true,
                    preserveIdempotencyKey: true,
                }, { status: 409 }), error);
            }
            throw error;
        }

        const lifecycleState = await db.runTransaction(async (transaction) => {
            const [operationSnapshot, messageSnapshot] = await Promise.all([
                transaction.get(operationRef),
                transaction.get(messageRef),
            ]);
            const operationData = operationSnapshot.data() as Record<string, unknown> | undefined;
            if (operationSnapshot.exists && !matchesChatAttachmentOperationIdentity(operationData, attachmentOperation)) {
                return "forbidden" as const;
            }
            if (messageSnapshot.exists || operationData?.status === "attached") {
                return "attached" as const;
            }
            if (
                operationData?.storageCleanupRequested === true
                || operationData?.status === "canceling"
                || operationData?.status === "canceled"
            ) {
                return "canceled" as const;
            }
            if (
                !operationSnapshot.exists
                || operationData?.status !== "finalizing"
                || operationData.completionAttemptId !== completionAttemptId
            ) {
                return "conflict" as const;
            }

            const now = Date.now();
            transaction.set(operationRef, {
                status: "finalized",
                completionAttemptId: null,
                finalizedAt: now,
                updatedAt: now,
            }, { merge: true });
            return "finalized" as const;
        });
        if (lifecycleState === "attached") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment is already attached to a message.",
                errorCode: "attachment_already_attached",
            }, { status: 409 }));
        }
        if (lifecycleState === "forbidden") {
            return finalize(buildAttachmentCompleteForbiddenResponse({ viewerUserId: caller.uid }));
        }
        if (lifecycleState === "canceled") {
            const observedFile = bucket.file(payload.storagePath, {
                generation: objectVersion.generation,
                preconditionOpts: { ifGenerationMatch: objectVersion.generation },
            });
            try {
                await observedFile.delete();
            } catch (error) {
                if (!isStorageNotFoundFailure(error) && !isStoragePreconditionFailure(error)) throw error;
            }
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment was canceled before completion finished.",
                errorCode: "attachment_canceled",
            }, { status: 409 }));
        }
        if (lifecycleState === "conflict") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Attachment completion could not be reconciled.",
                errorCode: "attachment_complete_conflict",
                retryable: true,
            }, { status: 409 }));
        }

        return finalize(NextResponse.json({
            ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
            success: true,
            uploadId,
            correlationId,
            idempotencyKey: clientIdempotencyKey,
            status: "finalized",
            assetUrl: buildFirebaseStorageDownloadUrl(bucket.name, payload.storagePath, metadataToken),
            assetUrlPolicy: "private_url_not_logged",
            assetName: payload.fileName,
            assetMimeType: contentType,
            sizeBytes: size,
            storagePath: payload.storagePath,
            storagePathFingerprint: fingerprintStoragePath(payload.storagePath),
            mediaAccess: buildMediaAccessTelemetry(accessDecision),
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/complete"), error);
    }
}
