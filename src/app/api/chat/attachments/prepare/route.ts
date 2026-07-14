import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { CHAT_MEDIA_LIMIT_BYTES_FAN_PASS } from "@/lib/chat/chat-media-limits";
import { MEDIA_UPLOAD_ORPHAN_AFTER_MS, fingerprintStoragePath } from "@/lib/media/media-upload-contract";
import { resolveServerChatMediaLimitPolicy } from "@/lib/server/chat-media-limit-policy";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const prepareAttachmentSchema = z.object({
    threadId: z.string().trim().min(1),
    fileName: z.string().trim().min(1).max(260),
    mimeType: z.string().trim().min(1).max(160),
    sizeBytes: z.number().int().positive(),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
});

const CLIENT_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/u;
const CHAT_JSON_BODY_LIMIT_BYTES = 64_000;

function sanitizeFileName(fileName: string) {
    const normalized = fileName
        .normalize("NFC")
        .replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, "")
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\.{2,}/g, ".")
        .replace(/\s+/g, " ")
        .trim();
    return normalized.length > 0 ? normalized : "attachment";
}

function hashAttachmentPreparePart(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getClientIdempotencyKey(request: NextRequest, bodyKey?: string) {
    return bodyKey
        ?? request.headers.get("idempotency-key")?.trim()
        ?? request.headers.get("x-idempotency-key")?.trim()
        ?? undefined;
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/attachments/prepare:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/attachments/prepare",
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
            rawBody = await readBoundedJsonBody<unknown>(request, {
                maxBytes: CHAT_JSON_BODY_LIMIT_BYTES,
                routeName: "chat/attachments/prepare",
            });
        } catch (error) {
            const payloadTooLarge = isBoundedJsonBodyError(error) && error.code === "payload_too_large";
            return finalize(NextResponse.json({
                error: payloadTooLarge ? "Request payload is too large." : "Malformed request body.",
                errorCode: payloadTooLarge ? "payload_too_large" : "malformed_body",
                retryable: false,
            }, { status: payloadTooLarge ? 413 : 400 }));
        }
        const parsedPayload = prepareAttachmentSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment request.",
                errorCode: "invalid_attachment_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
        const clientIdempotencyKey = getClientIdempotencyKey(request, payload.idempotencyKey);
        if (clientIdempotencyKey && !CLIENT_IDEMPOTENCY_KEY_PATTERN.test(clientIdempotencyKey)) {
            return finalize(NextResponse.json({
                error: "Invalid idempotency key.",
                errorCode: "invalid_idempotency_key",
            }, { status: 400 }));
        }
        const mediaLimitPolicy = await resolveServerChatMediaLimitPolicy({
            threadId: payload.threadId,
            actorUid: caller.uid,
        });
        if (payload.sizeBytes > CHAT_MEDIA_LIMIT_BYTES_FAN_PASS) {
            return finalize(NextResponse.json({
                error: "This file is too large for chat upload.",
                errorCode: "file_too_large",
                maxBytes: CHAT_MEDIA_LIMIT_BYTES_FAN_PASS,
                actualBytes: payload.sizeBytes,
            }, { status: 400 }));
        }
        if (payload.sizeBytes > mediaLimitPolicy.maxBytes) {
            const code = mediaLimitPolicy.hasFanPass ? "fan_pass_file_limit_exceeded" : "file_too_large_requires_fan_pass";
            return finalize(NextResponse.json({
                error: mediaLimitPolicy.hasFanPass
                    ? "This file is too large. Fan Pass uploads support up to 500 MB. Please upload a smaller file."
                    : "This file is too large. Chat uploads are limited to 25 MB unless you have a Fan Pass.",
                errorCode: code,
                maxBytes: mediaLimitPolicy.maxBytes,
                actualBytes: payload.sizeBytes,
            }, { status: 400 }));
        }
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
            return finalize(buildNotFoundResponse("thread", "Chat thread not found.", "thread_not_found"));
        }

        const safeName = sanitizeFileName(payload.fileName);
        const pathNonce = clientIdempotencyKey
            // idempotency: a caller-provided key deterministically reuses the same pending upload path.
            ? hashAttachmentPreparePart(`${caller.uid}:${payload.threadId}:${clientIdempotencyKey}:${safeName}:${payload.mimeType}:${payload.sizeBytes}`)
            : `${Date.now()}_${hashAttachmentPreparePart(`${safeName}:${payload.mimeType}:${payload.sizeBytes}`)}`;
        const storagePath = `creator/messages/${caller.uid}/${payload.threadId}/${pathNonce}_${safeName}`;
        const uploadId = pathNonce;
        const correlationId = clientIdempotencyKey ?? uploadId;

        return finalize(NextResponse.json({
            success: true,
            uploadId,
            correlationId,
            idempotencyKey: clientIdempotencyKey ?? null,
            threadId: payload.threadId,
            storagePath,
            storagePathFingerprint: fingerprintStoragePath(storagePath),
            fileName: safeName,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            orphanDetectionAfterMs: MEDIA_UPLOAD_ORPHAN_AFTER_MS,
            assetUrlPolicy: "private_url_not_logged",
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/prepare"), error);
    }
}
