import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";
import { createSupportThread, listSupportThreadsForUser } from "@/lib/server/support-threads";
import { SUPPORT_THREAD_CATEGORIES } from "@/lib/support-readiness";

const createSupportThreadSchema = z.object({
    subject: z.string().trim().min(4).max(140),
    category: z.enum(SUPPORT_THREAD_CATEGORIES).default("general"),
    message: z.string().trim().min(10).max(2_000),
    sourcePath: z.string().trim().max(240).optional(),
});

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "support/threads:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "support/threads",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const threads = await listSupportThreadsForUser(caller.uid);

        return finalize(NextResponse.json({
            success: true,
            threads,
        }));
    } catch (error) {
        return finalize(handleApiError(error, "support/threads"), error);
    }
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "support/threads:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "support/threads",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const { subject, category, message, sourcePath } = createSupportThreadSchema.parse(await request.json());
        const profileSnapshot = adminDb ? await adminDb.collection("users").doc(caller.uid).get() : null;
        const profileData = profileSnapshot?.data() as Record<string, unknown> | undefined;
        const thread = await createSupportThread({
            userId: caller.uid,
            userEmail: caller.email,
            userDisplayName: typeof profileData?.displayName === "string" ? profileData.displayName : null,
            userHandle: typeof profileData?.username === "string" ? profileData.username : null,
            subject,
            category,
            body: message,
            sourcePath: sourcePath || null,
        });

        if (thread?.thread?.id) {
            await trackServerEvent("support_ticket_created", {
                source_component: "support_threads_route",
                route: sourcePath || "/dashboard/support",
                page_path: sourcePath || "/dashboard/support",
                thread_id: thread.thread.id,
                ticket_id: thread.thread.id,
                category,
                support_category: category,
                source_truth: "server",
            }, caller.uid);
        }

        return finalize(NextResponse.json({
            success: true,
            thread,
        }));
    } catch (error) {
        return finalize(handleApiError(error, "support/threads"), error);
    }
}
