import { NextRequest, NextResponse } from "next/server";

import { getAdminAiDropCoverSettings, generateAdminAiDropCover } from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/generate",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const settings = await getAdminAiDropCoverSettings();
        if (!settings.enabled) {
            return NextResponse.json({ error: "AI cover generation is turned off." }, { status: 409 });
        }

        const body = await request.json() as {
            title?: unknown;
            creatorName?: unknown;
            creatorId?: unknown;
            dropId?: unknown;
            dropType?: unknown;
            tags?: unknown;
            previousJobId?: unknown;
        };
        const title = typeof body.title === "string" ? body.title.trim() : "";
        if (title.length < 3) {
            return NextResponse.json({ error: "Drop title must be at least 3 characters before generating a cover." }, { status: 400 });
        }

        const job = await generateAdminAiDropCover({
            title,
            creatorName: typeof body.creatorName === "string" ? body.creatorName : null,
            creatorId: typeof body.creatorId === "string" ? body.creatorId : null,
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            dropType: typeof body.dropType === "string" ? body.dropType : null,
            tags: Array.isArray(body.tags) ? body.tags.filter((value): value is string => typeof value === "string") : [],
            previousJobId: typeof body.previousJobId === "string" ? body.previousJobId : null,
            requestedByUid: caller?.uid || "",
            requestedByEmail: caller?.email,
        });

        return NextResponse.json({
            success: true,
            job,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        return handleApiError(error, "admin/ai/drop-covers/generate");
    }
}
