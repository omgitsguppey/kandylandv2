import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { addSupportMessage, getSupportThreadForAdmin, updateSupportThreadStatus } from "@/lib/server/support-threads";
import { normalizeSupportThreadStatus } from "@/lib/support-readiness";

const ADMIN_SUPPORT_THREAD_BODY_LIMIT_BYTES = 64_000;

const adminReplySchema = z.object({
    message: z.string().trim().min(1).max(2_000),
});

const adminStatusSchema = z.object({
    status: z.string().trim().min(1).max(60),
});

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

function buildAdminSupportThreadVerification(input: {
    operation: "GET" | "POST" | "PATCH";
    threadId: string;
    threadFound: boolean;
    messageCount: number;
    freshnessTimestamp?: number | null;
}) {
    return buildServerAdminModuleVerification({
        module: `admin_support_threads_threadId_${input.operation}`,
        canonicalSource: "support_threads/support_messages",
        fallbackSource: null,
        freshnessTimestamp: input.freshnessTimestamp ?? Date.now(),
        status: input.threadFound ? "live" : "degraded",
        degradedReason: input.threadFound ? null : `Admin support thread ${input.threadId} was not found.`,
        countComposition: {
            threadFound: input.threadFound ? 1 : 0,
            messages: input.messageCount,
        },
        sources: [{
            key: "support_threads",
            label: "support_threads",
            role: "canonical",
            status: input.threadFound ? "live" : "degraded",
            freshnessTimestamp: input.freshnessTimestamp ?? null,
            detail: input.threadFound
                ? "Admin detail route loaded the support thread and nested support_messages."
                : `Admin support thread ${input.threadId} was not found.`,
        }],
    });
}

function finalizeAdminSupportThreadRoute(
    key: "admin/support/threads/[threadId]:GET" | "admin/support/threads/[threadId]:POST" | "admin/support/threads/[threadId]:PATCH",
    startedAt: number,
    response: NextResponse,
    error?: unknown,
) {
    void recordRouteRuntimeSample({
        key,
        durationMs: Date.now() - startedAt,
        statusCode: response.status,
        errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
}

async function GET_handler(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/support/thread",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { threadId } = await context.params;
        const thread = await getSupportThreadForAdmin(threadId);
        if (!thread) {
            return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:GET", startedAt, NextResponse.json({
                success: true,
                thread: null,
                messages: [],
                verification: buildAdminSupportThreadVerification({
                    operation: "GET",
                    threadId,
                    threadFound: false,
                    messageCount: 0,
                }),
            }));
        }

        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:GET", startedAt, NextResponse.json({
            success: true,
            ...thread,
            verification: buildAdminSupportThreadVerification({
                operation: "GET",
                threadId,
                threadFound: true,
                messageCount: thread.messages.length,
                freshnessTimestamp: thread.thread.lastMessageAt || thread.thread.updatedAt || thread.thread.createdAt,
            }),
        }));
    } catch (error) {
        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:GET", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}

async function POST_handler(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/support/thread",
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

        const body = await readBoundedJsonBody<z.infer<typeof adminReplySchema>>(request, {
            maxBytes: ADMIN_SUPPORT_THREAD_BODY_LIMIT_BYTES,
            routeName: "admin/support/thread",
            allowEmpty: false,
        });
        const { message } = adminReplySchema.parse(body);
        await addSupportMessage({
            threadId,
            senderRole: "admin",
            senderId: caller.uid,
            senderLabel: caller.email || "Support",
            body: message,
        });

        const refreshed = await getSupportThreadForAdmin(threadId, { markRead: false });
        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:POST", startedAt, NextResponse.json({
            success: true,
            ...refreshed,
            verification: buildAdminSupportThreadVerification({
                operation: "POST",
                threadId,
                threadFound: Boolean(refreshed?.thread),
                messageCount: refreshed?.messages.length ?? 0,
                freshnessTimestamp: refreshed?.thread.lastMessageAt ?? Date.now(),
            }),
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:POST", startedAt, NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:POST", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}

async function PATCH_handler(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/support/thread",
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

        const body = await readBoundedJsonBody<z.infer<typeof adminStatusSchema>>(request, {
            maxBytes: ADMIN_SUPPORT_THREAD_BODY_LIMIT_BYTES,
            routeName: "admin/support/thread",
            allowEmpty: false,
        });
        const { status } = adminStatusSchema.parse(body);
        await updateSupportThreadStatus(threadId, normalizeSupportThreadStatus(status));
        const refreshed = await getSupportThreadForAdmin(threadId, { markRead: false });

        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:PATCH", startedAt, NextResponse.json({
            success: true,
            ...refreshed,
            verification: buildAdminSupportThreadVerification({
                operation: "PATCH",
                threadId,
                threadFound: Boolean(refreshed?.thread),
                messageCount: refreshed?.messages.length ?? 0,
                freshnessTimestamp: refreshed?.thread.lastMessageAt ?? Date.now(),
            }),
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:PATCH", startedAt, NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalizeAdminSupportThreadRoute("admin/support/threads/[threadId]:PATCH", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/support/threads/[threadId]:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/support/threads/[threadId]:POST", POST_handler);
export let PATCH = withRouteRuntimeHealth("admin/support/threads/[threadId]:PATCH", PATCH_handler);
