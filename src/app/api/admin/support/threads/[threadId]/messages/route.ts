import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { addSupportMessage, getSupportThreadForAdmin } from "@/lib/server/support-threads";

const ADMIN_SUPPORT_MESSAGE_BODY_LIMIT_BYTES = 64_000;

const adminMessageSchema = z.object({
    message: z.string().trim().min(1).max(2_000),
});

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

function finalizeAdminSupportMessageRoute(
    startedAt: number,
    response: NextResponse,
    error?: unknown,
) {
    void recordRouteRuntimeSample({
        key: "admin/support/threads/[threadId]/messages:POST",
        durationMs: Date.now() - startedAt,
        statusCode: response.status,
        errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
}

async function POST_handler(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/support/thread/messages",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { threadId } = await context.params;
        const existing = await getSupportThreadForAdmin(threadId, { markRead: false });
        if (!existing) {
            throw new AuthError("Support thread not found", 404);
        }

        const body = await readBoundedJsonBody<z.infer<typeof adminMessageSchema>>(request, {
            maxBytes: ADMIN_SUPPORT_MESSAGE_BODY_LIMIT_BYTES,
            routeName: "admin/support/thread/messages",
            allowEmpty: false,
        });
        const { message } = adminMessageSchema.parse(body);
        await addSupportMessage({
            threadId,
            senderRole: "admin",
            senderId: caller.uid,
            senderLabel: caller.email || "Support",
            body: message,
        });

        const refreshed = await getSupportThreadForAdmin(threadId, { markRead: false });
        return finalizeAdminSupportMessageRoute(startedAt, NextResponse.json({
            success: true,
            ...refreshed,
            verification: buildServerAdminModuleVerification({
                module: "admin_support_threads_threadId_messages_POST",
                canonicalSource: "support_threads/support_messages",
                fallbackSource: null,
                freshnessTimestamp: refreshed?.thread.lastMessageAt ?? Date.now(),
                countComposition: {
                    threadFound: refreshed?.thread ? 1 : 0,
                    messages: refreshed?.messages.length ?? 0,
                },
                sources: [{
                    key: "support_threads/support_messages",
                    label: "support_threads/support_messages",
                    role: "canonical",
                    status: refreshed?.thread ? "live" : "degraded",
                    freshnessTimestamp: refreshed?.thread.lastMessageAt ?? null,
                    detail: "Admin message route wrote an admin reply and reloaded nested support_messages.",
                }],
            }),
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalizeAdminSupportMessageRoute(startedAt, NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalizeAdminSupportMessageRoute(startedAt, handleApiError(error, "admin/support/thread/messages"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/support/threads/[threadId]/messages:POST", POST_handler);
