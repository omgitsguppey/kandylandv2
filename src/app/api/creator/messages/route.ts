import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildChatThreadId, CHAT_COLLECTIONS } from "@/lib/chat";
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

const sendMessageSchema = z.object({
    creatorId: z.string().trim().min(1),
    threadId: z.string().trim().optional(),
    text: z.string().trim().max(1200).optional(),
    assetUrl: z.string().trim().url().optional(),
    assetName: z.string().trim().max(260).optional(),
    assetMimeType: z.string().trim().max(160).optional(),
    messageKind: z.enum(["text", "image", "video"]).default("text"),
    targetUserId: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

            return NextResponse.json({
                success: true,
                thread: detail?.thread ?? null,
                messages: detail?.messages ?? [],
            });
        }

        if (callerIsCreator && !creatorId) {
            const result = await safeListChatThreadsForViewer({
                viewerUid: caller.uid,
                viewerRole: "creator",
            });

            return NextResponse.json({ success: true, threads: result.threads });
        }

        if (!creatorId) {
            return NextResponse.json({ success: true, thread: null, messages: [] });
        }

        const detail = await safeGetChatThreadDetailForViewer({
            viewerUid: caller.uid,
            callerRole,
            threadId: buildChatThreadId(creatorId, caller.uid),
        });

        return NextResponse.json({
            success: true,
            thread: detail?.thread ?? null,
            messages: detail?.messages ?? [],
        });
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return NextResponse.json(chatError.body, { status: chatError.status });
        }

        return handleApiError(error, "Creator.Messages.GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";
        const payload = sendMessageSchema.parse(await request.json());
        const resolvedThreadId = payload.threadId
            || (payload.targetUserId
                ? buildChatThreadId(payload.creatorId, payload.targetUserId)
                : buildChatThreadId(payload.creatorId, caller.uid));

        await safeSendChatMessageForViewer({
            callerUid: caller.uid,
            callerEmail: caller.email,
            callerRole,
            threadId: resolvedThreadId,
            text: payload.text,
            assetUrl: payload.assetUrl,
            assetName: payload.assetName,
            assetMimeType: payload.assetMimeType,
            messageKind: payload.messageKind,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return NextResponse.json(chatError.body, { status: chatError.status });
        }

        return handleApiError(error, "Creator.Messages.POST");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messageId = request.nextUrl.searchParams.get("messageId")?.trim() || "";
        if (!messageId) {
            return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const messageRef = adminDb.collection(CHAT_COLLECTIONS.messages).doc(messageId);
        const messageSnap = await messageRef.get();
        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        const messageData = messageSnap.data() as Record<string, unknown>;
        const creatorId = typeof messageData.creatorId === "string" ? messageData.creatorId : "";
        const userId = typeof messageData.userId === "string" ? messageData.userId : "";
        const canModerate = callerData?.role === "admin" || caller.uid === creatorId;
        if (!canModerate) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await messageRef.set({
            moderationRemovedAt: Date.now(),
            moderationRemovedBy: caller.uid,
        }, { merge: true });

        return NextResponse.json({ success: true, creatorId, userId });
    } catch (error) {
        return handleApiError(error, "Creator.Messages.DELETE");
    }
}
