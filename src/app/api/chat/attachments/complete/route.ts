import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_ATTACHMENT_MAX_BYTES, isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
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
});

const ATTACHMENT_COMPLETE_GUARD_EVIDENCE = {
    firestoreReadScope: "single_document",
    attachmentCompleteGuarded: true,
    ownershipChecked: true,
    threadMembershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
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

function buildAttachmentCompleteForbiddenResponse() {
    return NextResponse.json({
        ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
        error: "Attachment completion is not allowed for this file.",
        errorCode: "attachment_complete_forbidden",
    }, { status: 403 });
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

        const expectedPrefix = `creator/messages/${caller.uid}/${payload.threadId}/`;
        if (!payload.storagePath.startsWith(expectedPrefix)) {
            return finalize(buildAttachmentCompleteForbiddenResponse());
        }
        if (!isSafePendingAttachmentPath(payload.storagePath, expectedPrefix)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Invalid attachment storage path.",
                errorCode: "invalid_attachment_path",
            }, { status: 400 }));
        }

        // TODO(retry-safety): add caller-scoped completion operation records if this route starts creating message/media records.
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
        if (size > CHAT_ATTACHMENT_MAX_BYTES) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_COMPLETE_GUARD_EVIDENCE,
                error: "Uploaded attachment exceeds the chat size limit.",
                errorCode: "attachment_too_large",
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
            status: "finalized",
            assetUrl: buildFirebaseStorageDownloadUrl(bucket.name, payload.storagePath, metadataToken),
            assetName: payload.fileName,
            assetMimeType: contentType,
            sizeBytes: size,
            storagePath: payload.storagePath,
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/complete"), error);
    }
}
