import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { safeGetChatThreadDetailForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const cancelAttachmentSchema = z.object({
    threadId: z.string().trim().min(1),
    storagePath: z.string().trim().min(1),
});

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
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const parsedPayload = cancelAttachmentSchema.safeParse(await request.json());
        if (!parsedPayload.success) {
            return finalize(NextResponse.json({
                error: "Invalid chat attachment cancel request.",
                errorCode: "invalid_attachment_cancel_request",
            }, { status: 400 }));
        }

        const payload = parsedPayload.data;
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

        const file = adminStorage.bucket().file(payload.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return finalize(NextResponse.json({
                success: true,
                removed: false,
                storagePath: payload.storagePath,
            }));
        }

        await file.delete({ ignoreNotFound: true });

        return finalize(NextResponse.json({
            success: true,
            removed: true,
            storagePath: payload.storagePath,
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/cancel"), error);
    }
}
