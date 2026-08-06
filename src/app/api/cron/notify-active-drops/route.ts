import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { notifyActiveDropsRuntime } from "@/lib/server/queue-runtime";
import { CRON } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRuntimeWarning } from "@/lib/server/runtime-warning-store";
import { QUEUE_RUNTIME_WARNING_CODES } from "../../../../../shared/runtime/runtime-warning-contract";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ROUTE_NAME = "cron/notify-active-drops";
const STALE_AFTER_MS = 20 * 60 * 1000;

async function recordLegacyAdapterUse() {
    recordRouteWarning(ROUTE_NAME, "Legacy activation adapter invoked; Firebase scheduler is canonical.", undefined, {
        channel: "cron",
        moduleKey: "notify_active_drops_adapter",
    });

    await recordRuntimeWarning({
        code: QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked,
        severity: "warn",
        surface: ROUTE_NAME,
        moduleKey: "notify_active_drops",
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
        const authHeader = request.headers.get("authorization")?.trim() ?? "";

        const actualSecretBytes = Buffer.from(authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "");
        const expectedSecretBytes = Buffer.from(cronSecret ?? "");
        const isAuthorized = cronSecret && actualSecretBytes.length === expectedSecretBytes.length && timingSafeEqual(actualSecretBytes, expectedSecretBytes);

        if (!isAuthorized) {
            if (!cronSecret) {
                recordRouteWarning(ROUTE_NAME, "CRON_SECRET is not configured", undefined, {
                    channel: "cron",
                });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await recordLegacyAdapterUse();
        const result = await notifyActiveDropsRuntime({
            executionLayer: "next_route",
            surface: ROUTE_NAME,
            staleAfterMs: STALE_AFTER_MS,
        });

        return NextResponse.json({
            ...result,
            legacyAdapter: true,
        });
    } catch (error: unknown) {
        return handleApiError(error, "Cron.NotifyActiveDrops.GET");
    }
}

export let GET = withRouteRuntimeHealth("cron/notify-active-drops:GET", GET_handler);
