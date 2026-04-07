import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { addSupportMessage, getSupportThreadForUser, updateSupportThreadStatus } from "@/lib/server/support-threads";

const supportMessageSchema = z.object({
    message: z.string().trim().min(1).max(2_000),
});

const supportStatusSchema = z.object({
    action: z.enum(["resolve", "reopen"]),
});

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "support/thread",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { threadId } = await context.params;
        const thread = await getSupportThreadForUser(caller.uid, threadId);

        if (!thread) {
            return NextResponse.json({ success: true, thread: null, messages: [] });
        }

        return NextResponse.json({
            success: true,
            ...thread,
        });
    } catch (error) {
        return handleApiError(error, "support/thread");
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "support/thread",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { threadId } = await context.params;
        const existing = await getSupportThreadForUser(caller.uid, threadId, { markRead: false });
        if (!existing) {
            throw new AuthError("Support thread not found", 404);
        }

        const { message } = supportMessageSchema.parse(await request.json());
        await addSupportMessage({
            threadId,
            senderRole: "user",
            senderId: caller.uid,
            senderLabel: caller.email || "User",
            body: message,
        });

        const refreshed = await getSupportThreadForUser(caller.uid, threadId, { markRead: false });
        return NextResponse.json({
            success: true,
            ...refreshed,
        });
    } catch (error) {
        return handleApiError(error, "support/thread");
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "support/thread",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { threadId } = await context.params;
        const existing = await getSupportThreadForUser(caller.uid, threadId, { markRead: false });
        if (!existing) {
            throw new AuthError("Support thread not found", 404);
        }

        const { action } = supportStatusSchema.parse(await request.json());
        const nextStatus = action === "resolve" ? "resolved" : "waiting_on_support";
        await updateSupportThreadStatus(threadId, nextStatus);
        const refreshed = await getSupportThreadForUser(caller.uid, threadId, { markRead: false });

        return NextResponse.json({
            success: true,
            ...refreshed,
        });
    } catch (error) {
        return handleApiError(error, "support/thread");
    }
}
