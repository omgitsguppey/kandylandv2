import { NextRequest, NextResponse } from "next/server";

import { safeMarkChatThreadReadForViewer, toChatClientError } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

type RouteContext = {
    params: Promise<{
        threadId: string;
    }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/threads/[threadId]/read:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/read",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const { threadId } = await context.params;
        const result = await safeMarkChatThreadReadForViewer({
            viewerUid: caller.uid,
            threadId,
        });

        return finalize(NextResponse.json(result));
    } catch (error) {
        const chatError = toChatClientError(error);
        if (chatError) {
            return finalize(NextResponse.json(chatError.body, { status: chatError.status }), error);
        }

        return finalize(handleApiError(error, "chat/read"), error);
    }
}
