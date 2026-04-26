import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/server/auth";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STRICT } from "@/lib/server/rate-limit";
import { createSupportThread } from "@/lib/server/support-threads";
import { SUPPORT_THREAD_CATEGORIES } from "@/lib/support-readiness";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const guestSupportSchema = z.object({
    email: z.string().trim().email().max(240),
    displayName: z.string().trim().max(100).optional(),
    subject: z.string().trim().min(4).max(140),
    category: z.enum(SUPPORT_THREAD_CATEGORIES).default("general"),
    message: z.string().trim().min(10).max(2_000),
    sourcePath: z.string().trim().max(240).optional(),
});

/**
 * Guest support intake — allows unauthenticated visitors to submit
 * a public support ticket without signing in. Rate-limited by IP.
 */
async function POST_handler(request: NextRequest) {
    try {
        // Pre-auth rate limit by IP — no auth required
        await guardApiRequest(request, {
            routeName: "support/threads/guest",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "none",
        });

        const body = guestSupportSchema.parse(await request.json());

        // Use a stable guest user ID derived from email for thread ownership
        const guestUserId = `guest:${body.email.toLowerCase()}`;

        const thread = await createSupportThread({
            userId: guestUserId,
            userEmail: body.email,
            userDisplayName: body.displayName || null,
            userHandle: null,
            subject: body.subject,
            category: body.category,
            body: body.message,
            sourcePath: body.sourcePath || null,
        });

        return NextResponse.json({
            success: true,
            threadId: thread?.thread?.id ?? null,
        });
    } catch (error) {
        return handleApiError(error, "support/threads/guest");
    }
}

export let POST = withRouteRuntimeHealth("support/threads/guest:POST", POST_handler);
