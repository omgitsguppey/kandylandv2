import { NextRequest, NextResponse } from "next/server";

import { resolveChatViewerRole } from "@/lib/chat";
import { safeListChatThreadsForViewer } from "@/lib/server/chat";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "chat/threads:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "chat/threads",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || null;
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const viewerRole = resolveChatViewerRole({
            viewerUid: caller.uid,
            creatorId,
            profile: callerData,
        });

        const result = await safeListChatThreadsForViewer({
            viewerUid: caller.uid,
            viewerRole,
            creatorId,
        });

        return finalize(NextResponse.json({
            success: true,
            ...result,
        }));
    } catch (error) {
        return finalize(handleApiError(error, "chat/threads"), error);
    }
}
