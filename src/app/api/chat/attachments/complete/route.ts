import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { CHAT_MEDIA_LIMIT_BYTES_FAN_PASS } from "@/lib/chat/chat-media-limits";
import { buildMediaAccessTelemetry, resolveMediaAccess } from "@/lib/media/media-access-resolver";
import { fingerprintStoragePath } from "@/lib/media/media-upload-contract";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { resolveServerChatMediaLimitPolicy } from "@/lib/server/chat-media-limit-policy";
import { handleApiError } from "@/lib/server/auth";
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
    firestoreReadScope: "single_document",
    attachmentCompleteGuarded: true,
    ownershipChecked: true,
    threadMembershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
    idempotencyGuarded: true,
} as const;
const UNSAFE_STORAGE_PATH_PATTERN = /(?:^https?:|^gs:|^[a-z][a-z0-9+.-]*:|\\|\/\/|\.\.)/iu;

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
            rawBody = await request.json();
        } catch {
            return finalize(NextResponse.json({
                error: "Malformed request body.",
                errorCode: "malformed_body",
            }, { status: 400 }));
        }
        const parsedPayload = completeAttachmentSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment finalize request.",
                errorCode: "invalid_attachment_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
        if (!isSupportedChatAttachmentMimeType(payload.mimeType)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Only image and video attachments are supported in chat.",
                errorCode: "unsupported_attachment_type",
            }, { status: 400 }));
        }

        // cost-bound: single Firestore document read scoped to authenticated attachment completion; not a collection scan.
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

        // idempotency: completion only validates the pending object and sets stable metadata/token on the same storage path.
        const bucket = adminStorage.bucket();
        const file = bucket.file(payload.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Uploaded attachment not found.",
                errorCode: "attachment_not_found",
            }, { status: 404 }));
        }

        const [metadata] = await file.getMetadata();
        const rawMetadataToken = metadata.metadata?.firebaseStorageDownloadTokens
            || metadata.metadata?.downloadTokens;
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

        await file.setMetadata({
            contentType,
            metadata: {
                ...(metadata.metadata || {}),
                firebaseStorageDownloadTokens: metadataToken,
            },
        });

        return finalize(NextResponse.json({
            ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
            success: true,
            uploadId,
            correlationId,
            idempotencyKey: payload.idempotencyKey ?? null,
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
