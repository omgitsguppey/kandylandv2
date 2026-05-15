import { NextRequest, NextResponse } from "next/server";

import {
    type AdminDebugRouteRuntimeFilter,
    type AdminDebugTabOption,
    isAdminDebugRouteRuntimeFilter,
    isAdminDebugTabOption,
} from "@/lib/admin-debug-preferences";
import {
    getAdminDebugPreferences,
    saveAdminDebugPreferences,
} from "@/lib/server/admin-debug-preferences";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const ADMIN_DEBUG_PREFERENCES_BODY_LIMIT_BYTES = 64_000;

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug/preferences:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/debug/preferences",
            preAuthRouteName: "admin/debug/preferences/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        return finalize(NextResponse.json({
            success: true,
            preferences: await getAdminDebugPreferences(caller.uid),
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/debug/preferences"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug/preferences:PUT",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/debug/preferences",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const body = await readBoundedJsonBody<{
            activeTab?: unknown;
            routeRuntimeFilter?: unknown;
        }>(request, {
            maxBytes: ADMIN_DEBUG_PREFERENCES_BODY_LIMIT_BYTES,
            routeName: "admin/debug/preferences",
            allowEmpty: false,
        });
        const hasActiveTab = body.activeTab !== undefined;
        const hasRouteRuntimeFilter = body.routeRuntimeFilter !== undefined;

        if (!hasActiveTab && !hasRouteRuntimeFilter) {
            return finalize(NextResponse.json({ error: "Missing debug preference fields" }, { status: 400 }));
        }
        if (hasActiveTab && !isAdminDebugTabOption(body.activeTab)) {
            return finalize(NextResponse.json({ error: "Invalid debug tab" }, { status: 400 }));
        }
        if (hasRouteRuntimeFilter && !isAdminDebugRouteRuntimeFilter(body.routeRuntimeFilter)) {
            return finalize(NextResponse.json({ error: "Invalid route runtime filter" }, { status: 400 }));
        }

        const activeTab = hasActiveTab ? body.activeTab as AdminDebugTabOption : undefined;
        const routeRuntimeFilter = hasRouteRuntimeFilter
            ? body.routeRuntimeFilter as AdminDebugRouteRuntimeFilter
            : undefined;

        return finalize(NextResponse.json({
            success: true,
            preferences: await saveAdminDebugPreferences({
                uid: caller.uid,
                activeTab,
                routeRuntimeFilter,
            }),
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
            }, { status: error.status }), error);
        }
        return finalize(handleApiError(error, "admin/debug/preferences"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/debug/preferences:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/debug/preferences:PUT", PUT_handler);
