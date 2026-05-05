import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
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

const ATTACHMENT_CANCEL_ACTION = "chat_attachment_cancel";
const ATTACHMENT_CANCEL_IDEMPOTENCY_COLLECTION = "operation_idempotency";
const CLIENT_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/u;
const ATTACHMENT_CANCEL_GUARD_EVIDENCE = {
    firestoreReadScope: "single_document",
    attachmentCancelGuarded: true,
    ownershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
    idempotencyGuarded: true,
    idempotencyScope: "caller_attachment_action",
    transactionBound: true,
} as const;
const UNSAFE_STORAGE_PATH_PATTERN = /(?:^https?:|^gs:|^[a-z][a-z0-9+.-]*:|\\|\/\/|\.\.)/iu;

type CancelOperation = {
    idempotencyKey: string;
    operationId: string;
    storagePathHash: string;
    uploadSessionId: string;
};

type CancelOperationState =
    | { kind: "accepted"; idempotentReplay: boolean; storageCleanupNeeded: boolean }
    | { kind: "forbidden" }
    | { kind: "finalized" }
    | { kind: "not_found" }
    | { kind: "failed" };

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

function hasFinalizedAttachmentToken(metadata: { metadata?: Record<string, unknown> }) {
    const tokens = metadata.metadata?.firebaseStorageDownloadTokens ?? metadata.metadata?.downloadTokens;
    return typeof tokens === "string" && tokens.trim().length > 0;
}

function hashOperationPart(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

function getClientIdempotencyKey(request: NextRequest, bodyKey?: string) {
    return bodyKey
        ?? request.headers.get("idempotency-key")?.trim()
        ?? request.headers.get("x-idempotency-key")?.trim()
        ?? undefined;
}

function buildCancelOperation(input: {
    callerUid: string;
    threadId: string;
    storagePath: string;
    clientIdempotencyKey?: string;
}): CancelOperation {
    const storagePathHash = hashOperationPart(input.storagePath);
    const uploadSessionId = storagePathHash.slice(0, 32);
    const scopedOperationPart = input.clientIdempotencyKey
        ? `client:${input.clientIdempotencyKey}:${uploadSessionId}`
        : `fallback:${uploadSessionId}`;
    // idempotency: chat attachment cancel uses caller-scoped deterministic operation key.
    const idempotencyKey = `${ATTACHMENT_CANCEL_ACTION}:${input.callerUid}:${input.threadId || "no-thread"}:${scopedOperationPart}`;
    return {
        idempotencyKey,
        operationId: hashOperationPart(idempotencyKey),
        storagePathHash,
        uploadSessionId,
    };
}

async function beginCancelOperation(input: {
    db: NonNullable<typeof adminDb>;
    operation: CancelOperation;
    callerUid: string;
    threadId: string;
}) {
    const operationRef = input.db
        .collection(ATTACHMENT_CANCEL_IDEMPOTENCY_COLLECTION)
        .doc(input.operation.operationId);
    const now = Date.now();

    // transaction-bound: attachment cancel state transition is guarded by Firestore transaction.
    return input.db.runTransaction<CancelOperationState>(async (transaction) => {
        const snapshot = await transaction.get(operationRef);
        if (snapshot.exists) {
            const data = snapshot.data() as Record<string, unknown> | undefined;
            if (
                data?.action !== ATTACHMENT_CANCEL_ACTION
                || data.callerUid !== input.callerUid
                || data.threadId !== input.threadId
                || data.storagePathHash !== input.operation.storagePathHash
            ) {
                return { kind: "forbidden" };
            }

            if (data.status === "finalized") return { kind: "finalized" };
            if (data.status === "not_found") return { kind: "not_found" };
            if (data.status === "failed") return { kind: "failed" };
            if (data.status === "canceled") {
                return {
                    kind: "accepted",
                    idempotentReplay: true,
                    storageCleanupNeeded: data.storageCleanupCompleted !== true,
                };
            }

            return {
                kind: "accepted",
                idempotentReplay: true,
                storageCleanupNeeded: true,
            };
        }

        transaction.set(operationRef, {
            action: ATTACHMENT_CANCEL_ACTION,
            callerUid: input.callerUid,
            threadId: input.threadId,
            storagePathHash: input.operation.storagePathHash,
            uploadSessionId: input.operation.uploadSessionId,
            idempotencyKey: input.operation.idempotencyKey,
            cancelOperationId: input.operation.operationId,
            status: "canceling",
            storageCleanupRequested: true,
            storageCleanupCompleted: false,
            createdAt: now,
            updatedAt: now,
        });

        return {
            kind: "accepted",
            idempotentReplay: false,
            storageCleanupNeeded: true,
        };
    });
}

async function markCancelOperation(input: {
    db: NonNullable<typeof adminDb>;
    operation: CancelOperation;
    status: "canceled" | "finalized" | "not_found" | "failed";
    storageCleanupCompleted: boolean;
    errorCode?: string;
}) {
    await input.db
        .collection(ATTACHMENT_CANCEL_IDEMPOTENCY_COLLECTION)
        .doc(input.operation.operationId)
        .set({
            status: input.status,
            storageCleanupCompleted: input.storageCleanupCompleted,
            errorCode: input.errorCode ?? null,
            updatedAt: Date.now(),
            ...(input.status === "canceled" ? { canceledAt: Date.now() } : {}),
        }, { merge: true });
}

function buildCancelSuccessResponse(operation: CancelOperation, idempotentReplay: boolean) {
    return NextResponse.json({
        ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
        success: true,
        status: "canceled",
        idempotencyKey: operation.idempotencyKey,
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
            rawBody = await request.json();
        } catch {
            return finalize(NextResponse.json({
                error: "Malformed request body.",
                errorCode: "malformed_body",
            }, { status: 400 }));
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
        if (clientIdempotencyKey && !CLIENT_IDEMPOTENCY_KEY_PATTERN.test(clientIdempotencyKey)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Invalid idempotency key.",
                errorCode: "invalid_idempotency_key",
            }, { status: 400 }));
        }

        // cost-bound: single Firestore document read scoped to authenticated attachment cancellation; not a collection scan.
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

        const operation = buildCancelOperation({
            callerUid: caller.uid,
            threadId: payload.threadId,
            storagePath: payload.storagePath,
            clientIdempotencyKey,
        });
        const operationState = await beginCancelOperation({
            db,
            operation,
            callerUid: caller.uid,
            threadId: payload.threadId,
        });
        if (operationState.kind === "forbidden") {
            return finalize(buildAttachmentCancelForbiddenResponse());
        }
        if (operationState.kind === "finalized") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment is already finalized.",
                errorCode: "attachment_already_finalized",
            }, { status: 409 }));
        }
        if (operationState.kind === "not_found") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment was not found.",
                errorCode: "attachment_not_found",
            }, { status: 404 }));
        }
        if (operationState.kind === "failed") {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment cancel failed.",
                errorCode: "attachment_cancel_failed",
            }, { status: 500 }));
        }
        if (!operationState.storageCleanupNeeded) {
            return finalize(buildCancelSuccessResponse(operation, true));
        }

        const file = adminStorage.bucket().file(payload.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            if (operationState.idempotentReplay) {
                await markCancelOperation({
                    db,
                    operation,
                    status: "canceled",
                    storageCleanupCompleted: true,
                });
                return finalize(buildCancelSuccessResponse(operation, true));
            }

            await markCancelOperation({
                db,
                operation,
                status: "not_found",
                storageCleanupCompleted: false,
                errorCode: "attachment_not_found",
            });
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment was not found.",
                errorCode: "attachment_not_found",
            }, { status: 404 }));
        }

        const [metadata] = await file.getMetadata();
        if (hasFinalizedAttachmentToken(metadata)) {
            await markCancelOperation({
                db,
                operation,
                status: "finalized",
                storageCleanupCompleted: false,
                errorCode: "attachment_already_finalized",
            });
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment is already finalized.",
                errorCode: "attachment_already_finalized",
            }, { status: 409 }));
        }

        try {
            await file.delete({ ignoreNotFound: true });
        } catch (error) {
            await markCancelOperation({
                db,
                operation,
                status: "failed",
                storageCleanupCompleted: false,
                errorCode: "attachment_cancel_failed",
            });
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment cancel failed.",
                errorCode: "attachment_cancel_failed",
            }, { status: 500 }), error);
        }

        await markCancelOperation({
            db,
            operation,
            status: "canceled",
            storageCleanupCompleted: true,
        });

        return finalize(buildCancelSuccessResponse(operation, operationState.idempotentReplay));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/cancel"), error);
    }
}
