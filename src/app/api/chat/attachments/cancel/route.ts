import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_COLLECTIONS } from "@/lib/chat";
import {
    isStorageNotFoundFailure,
    isStoragePreconditionFailure,
    readStorageObjectVersion,
    type StorageObjectVersion,
} from "@/lib/media/media-upload-contract";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { handleApiError } from "@/lib/server/auth";
import {
    CREATOR_EXPERIENCE_OPERATION_COLLECTION,
    buildChatAttachmentOperationIdentity,
    matchesChatAttachmentOperationIdentity,
    type ChatAttachmentOperationIdentity,
} from "@/lib/server/creator-experiences";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const cancelAttachmentSchema = z.object({
    threadId: z.string().trim().min(1),
    storagePath: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
});

const CLIENT_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/u;
const CHAT_JSON_BODY_LIMIT_BYTES = 64_000;
const ATTACHMENT_CANCEL_GUARD_EVIDENCE = {
    firestoreReadScope: "bounded_documents",
    attachmentCancelGuarded: true,
    ownershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
    idempotencyGuarded: true,
    idempotencyScope: "creator_experience_message_operation",
    transactionBound: true,
} as const;
const UNSAFE_STORAGE_PATH_PATTERN = /(?:^https?:|^gs:|^[a-z][a-z0-9+.-]*:|\\|\/\/|\.\.)/iu;

type CancelOperationState =
    | { kind: "accepted"; idempotentReplay: boolean }
    | { kind: "forbidden" }
    | { kind: "attached" };

function buildAttachmentCancelForbiddenResponse() {
    return NextResponse.json({
        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
        error: "Attachment cancel is not allowed for this file.",
        errorCode: "attachment_cancel_forbidden",
    }, { status: 403 });
}

function isSafePendingAttachmentPath(storagePath: string, expectedPrefix: string) {
    return storagePath.startsWith(expectedPrefix)
        && storagePath.length > expectedPrefix.length
        && !storagePath.endsWith("/")
        && !UNSAFE_STORAGE_PATH_PATTERN.test(storagePath);
}

function getClientIdempotencyKey(request: NextRequest, bodyKey?: string) {
    return bodyKey
        ?? request.headers.get("idempotency-key")?.trim()
        ?? request.headers.get("x-idempotency-key")?.trim()
        ?? undefined;
}

async function beginCancelOperation(input: {
    db: NonNullable<typeof adminDb>;
    operation: ChatAttachmentOperationIdentity;
}) {
    const operationRef = input.db
        .collection(CREATOR_EXPERIENCE_OPERATION_COLLECTION)
        .doc(input.operation.operationId);
    const messageRef = input.db
        .collection(CHAT_COLLECTIONS.messages)
        .doc(input.operation.messageId);
    const now = Date.now();

    // transaction-bound: attachment cancel state transition is guarded by Firestore transaction.
    return input.db.runTransaction<CancelOperationState>(async (transaction) => {
        const [operationSnapshot, messageSnapshot] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(messageRef),
        ]);
        if (messageSnapshot.exists) {
            return { kind: "attached" };
        }
        if (operationSnapshot.exists) {
            const data = operationSnapshot.data() as Record<string, unknown> | undefined;
            if (!matchesChatAttachmentOperationIdentity(data, input.operation)) {
                return { kind: "forbidden" };
            }

            if (data?.status === "attached") return { kind: "attached" };
            if (data?.status === "canceled") {
                return {
                    kind: "accepted",
                    idempotentReplay: true,
                };
            }

            transaction.set(operationRef, {
                status: "canceling",
                storageCleanupRequested: true,
                storageCleanupCompleted: false,
                errorCode: null,
                updatedAt: now,
            }, { merge: true });
            return { kind: "accepted", idempotentReplay: true };
        }

        transaction.set(operationRef, {
            ...input.operation,
            status: "canceling",
            storageCleanupRequested: true,
            storageCleanupCompleted: false,
            createdAt: now,
            updatedAt: now,
        });

        return {
            kind: "accepted",
            idempotentReplay: false,
        };
    });
}

async function markCancelOperation(input: {
    db: NonNullable<typeof adminDb>;
    operation: ChatAttachmentOperationIdentity;
    status: "canceled" | "failed";
    storageCleanupCompleted: boolean;
    errorCode?: string;
}) {
    const operationRef = input.db
        .collection(CREATOR_EXPERIENCE_OPERATION_COLLECTION)
        .doc(input.operation.operationId);
    return input.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(operationRef);
        const data = snapshot.data() as Record<string, unknown> | undefined;
        if (snapshot.exists && !matchesChatAttachmentOperationIdentity(data, input.operation)) {
            return "forbidden" as const;
        }
        if (data?.status === "attached") return "attached" as const;
        if (data?.status === "canceled") {
            if (input.status === "canceled" && input.storageCleanupCompleted && data.storageCleanupCompleted !== true) {
                transaction.set(operationRef, {
                    storageCleanupCompleted: true,
                    errorCode: null,
                    updatedAt: Date.now(),
                }, { merge: true });
            }
            return "canceled" as const;
        }
        if (!snapshot.exists || data?.status !== "canceling") return "conflict" as const;

        transaction.set(operationRef, {
            status: input.status,
            storageCleanupCompleted: input.storageCleanupCompleted,
            errorCode: input.errorCode ?? null,
            updatedAt: Date.now(),
            ...(input.status === "canceled" ? { canceledAt: Date.now() } : {}),
        }, { merge: true });
        return "updated" as const;
    });
}

function buildCancelSuccessResponse(clientIdempotencyKey: string, idempotentReplay: boolean) {
    return NextResponse.json({
        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
        success: true,
        status: "canceled",
        idempotencyKey: clientIdempotencyKey,
        idempotentReplay,
    });
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/attachments/cancel:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/attachments/cancel",
            rateLimit: MEDIA_PROXY,
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
                routeName: "chat/attachments/cancel",
            });
        } catch (error) {
            const payloadTooLarge = isBoundedJsonBodyError(error) && error.code === "payload_too_large";
            return finalize(NextResponse.json({
                error: payloadTooLarge ? "Request payload is too large." : "Malformed request body.",
                errorCode: payloadTooLarge ? "payload_too_large" : "malformed_body",
                retryable: false,
            }, { status: payloadTooLarge ? 413 : 400 }));
        }

        const parsedPayload = cancelAttachmentSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment cancel request.",
                errorCode: "invalid_attachment_cancel_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
        const clientIdempotencyKey = getClientIdempotencyKey(request, payload.idempotencyKey);
        if (!clientIdempotencyKey || !CLIENT_IDEMPOTENCY_KEY_PATTERN.test(clientIdempotencyKey)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Invalid idempotency key.",
                errorCode: "invalid_idempotency_key",
            }, { status: 400 }));
        }

        // cost-bound: caller, thread, lifecycle, and deterministic message documents only; never a collection scan.
        const callerSnap = await db.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";

        const detail = await safeGetChatThreadDetailForViewer({
            viewerUid: caller.uid,
            callerRole,
            threadId: payload.threadId,
        });
        if (!detail) {
            return finalize(buildNotFoundResponse("thread", "Chat thread not found.", "thread_not_found"));
        }

        const expectedPrefix = `creator/messages/${caller.uid}/${payload.threadId}/`;
        if (!payload.storagePath.startsWith(expectedPrefix)) {
            return finalize(buildAttachmentCancelForbiddenResponse());
        }
        if (!isSafePendingAttachmentPath(payload.storagePath, expectedPrefix)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Invalid attachment storage path.",
                errorCode: "invalid_attachment_path",
            }, { status: 400 }));
        }

        const operation = buildChatAttachmentOperationIdentity({
            userId: detail.thread.userId,
            creatorId: detail.thread.creatorId,
            callerUid: caller.uid,
            threadId: payload.threadId,
            clientKey: clientIdempotencyKey,
            storagePath: payload.storagePath,
        });
        const bucket = adminStorage.bucket();
        const file = bucket.file(payload.storagePath);
        let exists = true;
        let objectVersion: StorageObjectVersion | null = null;
        try {
            const [metadata] = await file.getMetadata();
            objectVersion = readStorageObjectVersion(metadata);
            if (!objectVersion) {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                    error: "Attachment object version is unavailable. Retry cancellation.",
                    errorCode: "attachment_object_version_missing",
                    retryable: true,
                }, { status: 409 }));
            }
            const boundOperationId = metadata.metadata?.chatAttachmentOperationId;
            if (
                typeof boundOperationId === "string"
                && boundOperationId.trim().length > 0
                && boundOperationId !== operation.operationId
            ) {
                return finalize(buildAttachmentCancelForbiddenResponse());
            }
        } catch (error) {
            if (isStorageNotFoundFailure(error)) {
                exists = false;
            } else {
                throw error;
            }
        }
        const operationState = await beginCancelOperation({
            db,
            operation,
        });
        if (operationState.kind === "forbidden") {
            return finalize(buildAttachmentCancelForbiddenResponse());
        }
        if (operationState.kind === "attached") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment is already attached to a message.",
                errorCode: "attachment_already_attached",
            }, { status: 409 }));
        }
        if (!exists) {
            const markState = await markCancelOperation({
                db,
                operation,
                status: "canceled",
                storageCleanupCompleted: true,
            });
            if (markState === "attached") {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                    error: "Attachment is already attached to a message.",
                    errorCode: "attachment_already_attached",
                }, { status: 409 }));
            }
            if (markState === "forbidden") return finalize(buildAttachmentCancelForbiddenResponse());
            if (markState === "conflict") {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                    error: "Attachment cancellation could not be reconciled.",
                    errorCode: "attachment_cancel_conflict",
                    retryable: true,
                    preserveIdempotencyKey: true,
                }, { status: 409 }));
            }
            return finalize(buildCancelSuccessResponse(clientIdempotencyKey, true));
        }

        try {
            const observedFile = bucket.file(payload.storagePath, {
                generation: objectVersion!.generation,
                preconditionOpts: { ifGenerationMatch: objectVersion!.generation },
            });
            await observedFile.delete();
        } catch (error) {
            if (isStorageNotFoundFailure(error)) {
                const markState = await markCancelOperation({
                    db,
                    operation,
                    status: "canceled",
                    storageCleanupCompleted: true,
                });
                if (markState === "attached") {
                    return finalize(NextResponse.json({
                        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                        error: "Attachment is already attached to a message.",
                        errorCode: "attachment_already_attached",
                    }, { status: 409 }), error);
                }
                if (markState === "forbidden") return finalize(buildAttachmentCancelForbiddenResponse());
                if (markState === "conflict") {
                    return finalize(NextResponse.json({
                        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                        error: "Attachment cancellation could not be reconciled.",
                        errorCode: "attachment_cancel_conflict",
                        retryable: true,
                        preserveIdempotencyKey: true,
                    }, { status: 409 }), error);
                }
                return finalize(buildCancelSuccessResponse(clientIdempotencyKey, true));
            }
            if (isStoragePreconditionFailure(error)) {
                const markState = await markCancelOperation({
                    db,
                    operation,
                    status: "failed",
                    storageCleanupCompleted: false,
                    errorCode: "attachment_cancel_conflict",
                });
                if (markState === "attached") {
                    return finalize(NextResponse.json({
                        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                        error: "Attachment is already attached to a message.",
                        errorCode: "attachment_already_attached",
                    }, { status: 409 }), error);
                }
                if (markState === "forbidden") return finalize(buildAttachmentCancelForbiddenResponse());
                return finalize(NextResponse.json({
                    ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                    error: "Attachment changed while cancellation was in progress. Retry with the same message key.",
                    errorCode: "attachment_cancel_conflict",
                    retryable: true,
                    preserveIdempotencyKey: true,
                }, { status: 409 }), error);
            }
            const markState = await markCancelOperation({
                db,
                operation,
                status: "failed",
                storageCleanupCompleted: false,
                errorCode: "attachment_cancel_failed",
            });
            if (markState === "canceled") {
                return finalize(buildCancelSuccessResponse(clientIdempotencyKey, true));
            }
            if (markState === "attached") {
                return finalize(NextResponse.json({
                    ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                    error: "Attachment is already attached to a message.",
                    errorCode: "attachment_already_attached",
                }, { status: 409 }), error);
            }
            if (markState === "forbidden") return finalize(buildAttachmentCancelForbiddenResponse());
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment cancel failed.",
                errorCode: "attachment_cancel_failed",
            }, { status: 500 }), error);
        }

        const markState = await markCancelOperation({
            db,
            operation,
            status: "canceled",
            storageCleanupCompleted: true,
        });
        if (markState === "attached") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment is already attached to a message.",
                errorCode: "attachment_already_attached",
            }, { status: 409 }));
        }
        if (markState === "forbidden") return finalize(buildAttachmentCancelForbiddenResponse());
        if (markState === "conflict") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment cancellation could not be reconciled.",
                errorCode: "attachment_cancel_conflict",
                retryable: true,
                preserveIdempotencyKey: true,
            }, { status: 409 }));
        }

        return finalize(buildCancelSuccessResponse(clientIdempotencyKey, operationState.idempotentReplay));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/cancel"), error);
    }
}
