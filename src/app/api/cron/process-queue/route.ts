import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { processQueueLifecycleRuntime } from "@/lib/server/queue-runtime";
import { CRON } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRuntimeWarning } from "@/lib/server/runtime-warning-store";
import { QUEUE_RUNTIME_WARNING_CODES } from "../../../../../shared/runtime/runtime-warning-contract";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ROUTE_NAME = "cron/process-queue";
const STALE_AFTER_MS = 60 * 60 * 1000;

async function recordLegacyAdapterUse() {
    recordRouteWarning(ROUTE_NAME, "Legacy queue lifecycle adapter invoked; Firebase scheduler is canonical.", undefined, {
        channel: "cron",
        moduleKey: "queue_lifecycle_adapter",
    });

    await recordRuntimeWarning({
        code: QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked,
        severity: "warn",
        surface: ROUTE_NAME,
        moduleKey: "process_queue",
        executionLayer: "next_route",
        status: "degraded",
        detail: {
            canonicalRuntime: "firebase_function",
            routeRole: "legacy_manual_trigger_adapter",
        },
    });
}

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: ROUTE_NAME,
            rateLimit: CRON,
        });
        const cronSecret = process.env.CRON_SECRET?.trim();
        const authHeader = request.headers.get("authorization");

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            if (!cronSecret) {
                recordRouteWarning(ROUTE_NAME, "CRON_SECRET is not configured", undefined, {
                    channel: "cron",
                });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await recordLegacyAdapterUse();
        const result = await processQueueLifecycleRuntime({
            executionLayer: "next_route",
            surface: ROUTE_NAME,
            staleAfterMs: STALE_AFTER_MS,
        });

        return NextResponse.json({
            ...result,
            legacyAdapter: true,
        });
    } catch (error: unknown) {
        return handleApiError(error, "Cron.ProcessQueue.GET");
    }
}

export let GET = withRouteRuntimeHealth("cron/process-queue:GET", GET_handler);
