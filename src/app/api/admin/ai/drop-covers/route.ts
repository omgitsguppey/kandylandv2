import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { buildAdminAiDropCoverDashboard, saveAdminAiDropCoverSettings } from "@/lib/server/ai-drop-covers";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers",
            preAuthRouteName: "admin/ai/drop-covers/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        return NextResponse.json(await buildAdminAiDropCoverDashboard(), {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        return handleApiError(error, "admin/ai/drop-covers");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as { enabled?: unknown };
        if (typeof body.enabled !== "boolean") {
            return NextResponse.json({ error: "Missing enabled boolean" }, { status: 400 });
        }

        const settings = await saveAdminAiDropCoverSettings({
            enabled: body.enabled,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        return handleApiError(error, "admin/ai/drop-covers");
    }
}
