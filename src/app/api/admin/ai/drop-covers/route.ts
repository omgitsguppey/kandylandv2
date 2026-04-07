import { NextRequest, NextResponse } from "next/server";

import { isAdminAiDropCoverSelectableModel } from "@/lib/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import { buildAdminAiDropCoverDashboard, saveAdminAiDropCoverSettings } from "@/lib/server/ai-drop-covers";
import { ADMIN_AI_CONTROL, ADMIN_AI_DASHBOARD_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers",
            preAuthRouteName: "admin/ai/drop-covers/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
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
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            enabled?: unknown;
            model?: unknown;
            useTemplateReference?: unknown;
            useRecentDropCoverReferences?: unknown;
        };
        const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
        if (requestedModel && !isAdminAiDropCoverSelectableModel(requestedModel)) {
            return NextResponse.json({ error: "Unsupported default AI image model" }, { status: 400 });
        }
        if (
            typeof body.enabled !== "boolean"
            && !requestedModel
            && typeof body.useTemplateReference !== "boolean"
            && typeof body.useRecentDropCoverReferences !== "boolean"
        ) {
            return NextResponse.json({ error: "Missing AI settings update fields" }, { status: 400 });
        }

        const settings = await saveAdminAiDropCoverSettings({
            enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
            model: requestedModel && isAdminAiDropCoverSelectableModel(requestedModel) ? requestedModel : undefined,
            useTemplateReference: typeof body.useTemplateReference === "boolean" ? body.useTemplateReference : undefined,
            useRecentDropCoverReferences: typeof body.useRecentDropCoverReferences === "boolean" ? body.useRecentDropCoverReferences : undefined,
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
