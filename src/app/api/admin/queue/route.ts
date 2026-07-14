import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, saveResolvedQueueConfig, type DropQueueConfig } from "@/lib/server/drop-queue";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ADMIN_QUEUE_BODY_LIMIT_BYTES = 64_000;

async function GET_handler(request: NextRequest) {
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

async function PUT_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/queue",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });
        const data = await readBoundedJsonBody<Partial<DropQueueConfig>>(request, {
            maxBytes: ADMIN_QUEUE_BODY_LIMIT_BYTES,
            routeName: "admin/queue",
            allowEmpty: false,
        });
        return NextResponse.json({ success: true, config: await saveResolvedQueueConfig(data) });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status });
        }
        return handleApiError(error, "Admin.Queue.PUT");
    }
}

export let GET = withRouteRuntimeHealth("admin/queue:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/queue:PUT", PUT_handler);
