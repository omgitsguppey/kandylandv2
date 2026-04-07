import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { updateAdminAiDropCoverFeedback } from "@/lib/server/ai-drop-covers";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/feedback",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            jobId?: unknown;
            action?: unknown;
            dropId?: unknown;
        };

        if (typeof body.jobId !== "string" || body.jobId.trim().length === 0) {
            return NextResponse.json({ error: "Missing generation job id" }, { status: 400 });
        }

        const action = typeof body.action === "string" ? body.action : "";
        if (!["like", "dislike", "accept", "link_drop"].includes(action)) {
            return NextResponse.json({ error: "Unsupported feedback action" }, { status: 400 });
        }

        const job = await updateAdminAiDropCoverFeedback({
            jobId: body.jobId,
            action: action as "like" | "dislike" | "accept" | "link_drop",
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return NextResponse.json({
            success: true,
            job,
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        return handleApiError(error, "admin/ai/drop-covers/feedback");
    }
}
