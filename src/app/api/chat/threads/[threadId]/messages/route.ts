import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { safeSendChatMessageForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const sendMessageSchema = z.object({
    text: z.string().trim().max(1200).optional(),
    assetUrl: z.string().trim().url().optional(),
    assetName: z.string().trim().max(260).optional(),
    assetMimeType: z.string().trim().max(160).optional(),
    messageKind: z.enum(["text", "image", "video"]).default("text"),
});

type RouteContext = {
    params: Promise<{
        threadId: string;
    }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/messages:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const { threadId } = await context.params;
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRole = typeof callerData?.role === "string" ? callerData.role : "user";
        const body = sendMessageSchema.parse(await request.json());

        const result = await safeSendChatMessageForViewer({
            callerUid: caller.uid,
            callerEmail: caller.email,
            callerRole,
            threadId,
            ...body,
        });

        return finalize(NextResponse.json({
            success: true,
            ...result,
        }, { status: 201 }));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/messages"), error);
    }
}
