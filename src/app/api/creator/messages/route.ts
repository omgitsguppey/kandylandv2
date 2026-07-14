import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildChatThreadId, CHAT_COLLECTIONS } from "@/lib/chat";
import { buildCreatorMessagesCompatibilityHeaders } from "@/lib/creator-message-compatibility";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import {
    safeGetChatThreadDetailForViewer,
    safeListChatThreadsForViewer,
    safeSendChatMessageForViewer,
    toChatClientError,
} from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

function withCompatibilityHeaders(response: NextResponse) {
    const headers = buildCreatorMessagesCompatibilityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

const sendMessageSchema = z.object({
    creatorId: z.string().trim().min(1),
    threadId: z.string().trim().optional(),
    text: z.string().trim().max(1200).optional(),
    assetUrl: z.string().trim().url().optional(),
    assetName: z.string().trim().max(260).optional(),
    assetMimeType: z.string().trim().max(160).optional(),
    messageKind: z.enum(["text", "image", "video"]).default("text"),
    targetUserId: z.string().trim().optional(),
    idempotencyKey: z.string().trim().max(180).optional(),
});
const CREATOR_MESSAGES_BODY_LIMIT_BYTES = 32_768;

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/messages:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 })));
        }

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        const threadId = request.nextUrl.searchParams.get("threadId")?.trim() || "";
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";
        const callerIsCreator = callerRole === "creator";

        if (threadId) {
            const detail = await safeGetChatThreadDetailForViewer({
                viewerUid: caller.uid,
                callerRole,
                threadId,
            });

            return finalize(withCompatibilityHeaders(NextResponse.json({
                success: true,
                thread: detail?.thread ?? null,
                messages: detail?.messages ?? [],
            })));
        }

        if (callerIsCreator && !creatorId) {
            const result = await safeListChatThreadsForViewer({
                viewerUid: caller.uid,
                viewerRole: "creator",
            });

            return finalize(withCompatibilityHeaders(NextResponse.json({ success: true, threads: result.threads })));
        }

        if (!creatorId) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ success: true, thread: null, messages: [] })));
        }

        const detail = await safeGetChatThreadDetailForViewer({
            viewerUid: caller.uid,
            callerRole,
            threadId: buildChatThreadId(creatorId, caller.uid),
        });

        return finalize(withCompatibilityHeaders(NextResponse.json({
            success: true,
            thread: detail?.thread ?? null,
            messages: detail?.messages ?? [],
        })));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(withCompatibilityHeaders(NextResponse.json(chatError.body, { status: chatError.status })), error);
        }

        return finalize(withCompatibilityHeaders(handleApiError(error, "Creator.Messages.GET")), error);
    }
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/messages:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 })));
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";
        let rawBody: unknown;
        try {
            rawBody = await readBoundedJsonBody<unknown>(request, {
                maxBytes: CREATOR_MESSAGES_BODY_LIMIT_BYTES,
                routeName: "creator/messages",
            });
        } catch (error) {
            const payloadTooLarge = isBoundedJsonBodyError(error) && error.code === "payload_too_large";
            return finalize(withCompatibilityHeaders(NextResponse.json({
                error: payloadTooLarge ? "Request payload is too large." : "Malformed request body.",
                errorCode: payloadTooLarge ? "payload_too_large" : "malformed_body",
                retryable: false,
            }, { status: payloadTooLarge ? 413 : 400 })));
        }
        const parsedPayload = sendMessageSchema.safeParse(rawBody);
        if (!parsedPayload.success) {
            return finalize(withCompatibilityHeaders(NextResponse.json({
                error: "Invalid creator message request.",
                errorCode: "invalid_message_request",
            }, { status: 400 })));
        }

        const payload = parsedPayload.data;
        const resolvedThreadId = payload.threadId
            || (payload.targetUserId
                ? buildChatThreadId(payload.creatorId, payload.targetUserId)
                : buildChatThreadId(payload.creatorId, caller.uid));

        const result = await safeSendChatMessageForViewer({
            callerUid: caller.uid,
            callerEmail: caller.email,
            callerRole,
            threadId: resolvedThreadId,
            text: payload.text,
            assetUrl: payload.assetUrl,
            assetName: payload.assetName,
            assetMimeType: payload.assetMimeType,
            messageKind: payload.messageKind,
            idempotencyKey: payload.idempotencyKey,
        });

        return finalize(withCompatibilityHeaders(NextResponse.json({
            success: true,
            ...result,
        })));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(withCompatibilityHeaders(NextResponse.json(chatError.body, { status: chatError.status })), error);
        }

        return finalize(withCompatibilityHeaders(handleApiError(error, "Creator.Messages.POST")), error);
    }
}

export async function DELETE(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/messages:DELETE",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 })));
        }

        const messageId = request.nextUrl.searchParams.get("messageId")?.trim() || "";
        if (!messageId) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ error: "Missing messageId" }, { status: 400 })));
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const messageRef = adminDb.collection(CHAT_COLLECTIONS.messages).doc(messageId);
        const messageSnap = await messageRef.get();
        if (!messageSnap.exists) {
            return finalize(withCompatibilityHeaders(buildNotFoundResponse("message", "Message not found")));
        }

        const messageData = messageSnap.data() as Record<string, unknown>;
        const creatorId = typeof messageData.creatorId === "string" ? messageData.creatorId : "";
        const userId = typeof messageData.userId === "string" ? messageData.userId : "";
        const canModerate = callerData?.role === "admin" || caller.uid === creatorId;
        if (!canModerate) {
            return finalize(withCompatibilityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 })));
        }

        await messageRef.set({
            moderationRemovedAt: Date.now(),
            moderationRemovedBy: caller.uid,
        }, { merge: true });

        return finalize(withCompatibilityHeaders(NextResponse.json({ success: true, creatorId, userId })));
    } catch (error) {
        return finalize(withCompatibilityHeaders(handleApiError(error, "Creator.Messages.DELETE")), error);
    }
}
