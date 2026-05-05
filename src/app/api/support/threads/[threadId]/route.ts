import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { addSupportMessage, getSupportThreadForUser, updateSupportThreadStatus } from "@/lib/server/support-threads";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";

const supportMessageSchema = z.object({
    message: z.string().trim().min(1).max(2_000),
});

const supportStatusSchema = z.object({
    action: z.enum(["resolve", "reopen"]),
});

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

async function GET_handler(request: NextRequest, context: RouteContext) {
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

async function POST_handler(request: NextRequest, context: RouteContext) {
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
        if (refreshed?.thread?.id) {
            await trackServerEvent("support_reply_sent", {
                source_component: "support_thread_route",
                route: "/dashboard/support",
                page_path: "/dashboard/support",
                thread_id: threadId,
                ticket_id: threadId,
                category: refreshed.thread.category,
                support_category: refreshed.thread.category,
                source_truth: "server",
            }, caller.uid);
        }
        return NextResponse.json({
            success: true,
            ...refreshed,
        });
    } catch (error) {
        return handleApiError(error, "support/thread");
    }
}

async function PATCH_handler(request: NextRequest, context: RouteContext) {
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

export let GET = withRouteRuntimeHealth("support/threads/[threadId]:GET", GET_handler);
export let POST = withRouteRuntimeHealth("support/threads/[threadId]:POST", POST_handler);
export let PATCH = withRouteRuntimeHealth("support/threads/[threadId]:PATCH", PATCH_handler);
