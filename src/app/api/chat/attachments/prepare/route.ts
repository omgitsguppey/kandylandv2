import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const prepareAttachmentSchema = z.object({
    threadId: z.string().trim().min(1),
    fileName: z.string().trim().min(1).max(260),
    mimeType: z.string().trim().min(1).max(160),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
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

        const payload = prepareAttachmentSchema.parse(await request.json());
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

        const safeName = sanitizeFileName(payload.fileName);
        const storagePath = `chat-attachments/${payload.threadId}/${caller.uid}/${Date.now()}_${safeName}`;

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
