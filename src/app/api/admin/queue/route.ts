import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, saveResolvedQueueConfig } from "@/lib/server/drop-queue";

export async function GET(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue", ADMIN);
        await verifyAdmin(request);
        return NextResponse.json(await getResolvedQueueConfig());
    } catch (error) {
        return handleApiError(error, "Admin.Queue.GET");
    }
}

export async function PUT(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue", ADMIN);
        await verifyAdmin(request);
        const data = await request.json();
        return NextResponse.json({ success: true, config: await saveResolvedQueueConfig(data) });
    } catch (error) {
        return handleApiError(error, "Admin.Queue.PUT");
    }
}
