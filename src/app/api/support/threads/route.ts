import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { createSupportThread, listSupportThreadsForUser } from "@/lib/server/support-threads";
import { SUPPORT_THREAD_CATEGORIES } from "@/lib/support-readiness";

const createSupportThreadSchema = z.object({
    subject: z.string().trim().min(4).max(140),
    category: z.enum(SUPPORT_THREAD_CATEGORIES).default("general"),
    message: z.string().trim().min(10).max(2_000),
    sourcePath: z.string().trim().max(240).optional(),
});

export async function GET(request: NextRequest) {
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

        return NextResponse.json({
            success: true,
            threads,
        });
    } catch (error) {
        return handleApiError(error, "support/threads");
    }
}

export async function POST(request: NextRequest) {
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

        return NextResponse.json({
            success: true,
            thread,
        });
    } catch (error) {
        return handleApiError(error, "support/threads");
    }
}
