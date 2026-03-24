import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, saveResolvedQueueConfig } from "@/lib/server/drop-queue";
import { guardApiRequest } from "@/lib/server/request-guard";

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/queue",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });
        return NextResponse.json(await getResolvedQueueConfig());
    } catch (error) {
        return handleApiError(error, "Admin.Queue.GET");
    }
}

export async function PUT(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/queue",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });
        const data = await request.json();
        return NextResponse.json({ success: true, config: await saveResolvedQueueConfig(data) });
    } catch (error) {
        return handleApiError(error, "Admin.Queue.PUT");
    }
}
