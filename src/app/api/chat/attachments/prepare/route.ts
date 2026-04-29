import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_ATTACHMENT_MAX_BYTES, isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";
import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
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
    sizeBytes: z.number().int().positive().max(CHAT_ATTACHMENT_MAX_BYTES),
});

function sanitizeFileName(fileName: string) {
    const normalized = fileName
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .trim();
    return normalized.length > 0 ? normalized : "attachment";
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
            rawBody = await request.json();
        } catch {
            return finalize(NextResponse.json({
                error: "Malformed request body.",
                errorCode: "malformed_body",
            }, { status: 400 }));
        }
        const parsedPayload = prepareAttachmentSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment request.",
                errorCode: "invalid_attachment_request",
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
            return finalize(buildNotFoundResponse("thread", "Chat thread not found.", "thread_not_found"));
        }

        const safeName = sanitizeFileName(payload.fileName);
        const storagePath = `creator/messages/${caller.uid}/${payload.threadId}/${Date.now()}_${safeName}`;

        return finalize(NextResponse.json({
            success: true,
            threadId: payload.threadId,
            storagePath,
            fileName: safeName,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/prepare"), error);
    }
}
