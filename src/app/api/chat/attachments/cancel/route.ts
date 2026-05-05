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
});

const ATTACHMENT_CANCEL_GUARD_EVIDENCE = {
    firestoreReadScope: "single_document",
    attachmentCancelGuarded: true,
    ownershipChecked: true,
    storagePathValidated: true,
    rawStorageUrlExposed: false,
} as const;
const UNSAFE_STORAGE_PATH_PATTERN = /(?:^https?:|^gs:|^[a-z][a-z0-9+.-]*:|\\|\/\/|\.\.)/iu;

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
        // cost-bound: single Firestore document read scoped to authenticated attachment cancellation; not a collection scan.
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

        const file = adminStorage.bucket().file(payload.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment was not found.",
                errorCode: "attachment_not_found",
            }, { status: 404 }));
        }

        const [metadata] = await file.getMetadata();
        if (hasFinalizedAttachmentToken(metadata)) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment is already finalized.",
                errorCode: "attachment_already_finalized",
            }, { status: 409 }));
        }

        try {
            await file.delete({ ignoreNotFound: true });
        } catch (error) {
            return finalize(NextResponse.json({
                ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
                error: "Attachment cancel failed.",
                errorCode: "attachment_cancel_failed",
            }, { status: 500 }), error);
        }

        return finalize(NextResponse.json({
            ...ATTACHMENT_CANCEL_GUARD_EVIDENCE,
            success: true,
            removed: true,
        }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/attachments/cancel"), error);
    }
}
