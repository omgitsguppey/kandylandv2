import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { addSupportMessage, getSupportThreadForAdmin, updateSupportThreadStatus } from "@/lib/server/support-threads";
import { normalizeSupportThreadStatus } from "@/lib/support-readiness";

const adminReplySchema = z.object({
    message: z.string().trim().min(1).max(2_000),
});

const adminStatusSchema = z.object({
    status: z.string().trim().min(1).max(60),
});

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

function finalizeAdminSupportThreadRoute(
    key: "admin/support/thread:GET" | "admin/support/thread:POST" | "admin/support/thread:PATCH",
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

export async function GET(request: NextRequest, context: RouteContext) {
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
            return finalizeAdminSupportThreadRoute("admin/support/thread:GET", startedAt, NextResponse.json({ success: true, thread: null, messages: [] }));
        }

        return finalizeAdminSupportThreadRoute("admin/support/thread:GET", startedAt, NextResponse.json({
            success: true,
            ...thread,
        }));
    } catch (error) {
        return finalizeAdminSupportThreadRoute("admin/support/thread:GET", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
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

        const { message } = adminReplySchema.parse(await request.json());
        await addSupportMessage({
            threadId,
            senderRole: "admin",
            senderId: caller.uid,
            senderLabel: caller.email || "Support",
            body: message,
        });

        const refreshed = await getSupportThreadForAdmin(threadId, { markRead: false });
        return finalizeAdminSupportThreadRoute("admin/support/thread:POST", startedAt, NextResponse.json({
            success: true,
            ...refreshed,
        }));
    } catch (error) {
        return finalizeAdminSupportThreadRoute("admin/support/thread:POST", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

        const { status } = adminStatusSchema.parse(await request.json());
        await updateSupportThreadStatus(threadId, normalizeSupportThreadStatus(status));
        const refreshed = await getSupportThreadForAdmin(threadId, { markRead: false });

        return finalizeAdminSupportThreadRoute("admin/support/thread:PATCH", startedAt, NextResponse.json({
            success: true,
            ...refreshed,
        }));
    } catch (error) {
        return finalizeAdminSupportThreadRoute("admin/support/thread:PATCH", startedAt, handleApiError(error, "admin/support/thread"), error);
    }
}
