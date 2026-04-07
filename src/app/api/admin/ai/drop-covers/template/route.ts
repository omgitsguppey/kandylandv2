import { NextRequest, NextResponse } from "next/server";

import {
    removeAdminAiDropCoverTemplate,
    toAdminAiDropCoverClientError,
    uploadAdminAiDropCoverTemplate,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_TEMPLATE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/template",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Missing template file" }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Template file must be an image" }, { status: 400 });
        }

        if (file.size > MAX_TEMPLATE_SIZE_BYTES) {
            return NextResponse.json({ error: "Template file must be 10 MB or smaller" }, { status: 400 });
        }

        const result = await uploadAdminAiDropCoverTemplate({
            fileName: file.name,
            mimeType: file.type,
            bytes: Buffer.from(await file.arrayBuffer()),
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return NextResponse.json({
            success: true,
            settings: result.settings,
            template: result.template,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return NextResponse.json(aiError.body, { status: aiError.status });
        }
        return handleApiError(error, "admin/ai/drop-covers/template");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/template",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const settings = await removeAdminAiDropCoverTemplate({
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return NextResponse.json({
            success: true,
            settings,
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return NextResponse.json(aiError.body, { status: aiError.status });
        }
        return handleApiError(error, "admin/ai/drop-covers/template");
    }
}
