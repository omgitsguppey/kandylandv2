import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_ATTACHMENT_MAX_BYTES, isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
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

function buildFirebaseStorageDownloadUrl(bucketName: string, storagePath: string, token: string) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
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
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

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
                errorCode: "invalid_attachment_finalize_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
        if (!isSupportedChatAttachmentMimeType(payload.mimeType)) {
            return finalize(NextResponse.json({
                error: "Only image and video attachments are supported in chat.",
                errorCode: "unsupported_attachment_type",
            }, { status: 400 }));
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";

        const detail = await safeGetChatThreadDetailForViewer({
            viewerUid: caller.uid,
            callerRole,
            threadId: payload.threadId,
        });
        if (!detail) {
            return finalize(NextResponse.json({
                error: "Chat thread not found.",
                errorCode: "thread_not_found",
            }, { status: 404 }));
        }

        const expectedPrefix = `creator/messages/${caller.uid}/${payload.threadId}/`;
        if (!payload.storagePath.startsWith(expectedPrefix)) {
            return finalize(NextResponse.json({
                error: "Attachment path does not match this chat thread.",
                errorCode: "invalid_attachment_path",
            }, { status: 400 }));
        }

        const bucket = adminStorage.bucket();
        const file = bucket.file(payload.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return finalize(NextResponse.json({
                error: "Uploaded attachment not found.",
                errorCode: "attachment_missing",
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
                error: "Only image and video attachments are supported in chat.",
                errorCode: "unsupported_attachment_type",
            }, { status: 400 }));
        }
        const size = Number(metadata.size || 0);
        if (!Number.isFinite(size) || size <= 0) {
            return finalize(NextResponse.json({
                error: "Uploaded attachment is empty or invalid.",
                errorCode: "attachment_invalid",
            }, { status: 400 }));
        }
        if (size > CHAT_ATTACHMENT_MAX_BYTES) {
            return finalize(NextResponse.json({
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
            success: true,
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
