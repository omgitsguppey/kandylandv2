import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
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

export async function GET(request: NextRequest, context: RouteContext) {
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
            return NextResponse.json({ success: true, thread: null, messages: [] });
        }

        return NextResponse.json({
            success: true,
            ...thread,
        });
    } catch (error) {
        return handleApiError(error, "admin/support/thread");
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
        return NextResponse.json({
            success: true,
            ...refreshed,
        });
    } catch (error) {
        return handleApiError(error, "admin/support/thread");
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

        return NextResponse.json({
            success: true,
            ...refreshed,
        });
    } catch (error) {
        return handleApiError(error, "admin/support/thread");
    }
}
