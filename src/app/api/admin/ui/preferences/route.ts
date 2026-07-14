import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import {
    getAdminUiPreferences,
    saveAdminUiCollapsedModulePreference,
} from "@/lib/server/admin-ui-preferences";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_UI_PREFERENCES_BODY_LIMIT_BYTES = 64_000;

function finalize(startedAt: number, key: RouteRuntimeHealthKey, response: NextResponse, error?: unknown) {
    void recordRouteRuntimeSample({
        key,
        durationMs: Date.now() - startedAt,
        statusCode: response.status,
        errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
}

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ui/preferences",
            preAuthRouteName: "admin/ui/preferences/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(startedAt, "admin/ui/preferences:GET", NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        return finalize(startedAt, "admin/ui/preferences:GET", NextResponse.json({
            success: true,
            preferences: await getAdminUiPreferences(caller.uid),
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ui/preferences:GET", handleApiError(error, "admin/ui/preferences"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ui/preferences",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(startedAt, "admin/ui/preferences:PUT", NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const body = await readBoundedJsonBody<{
            key?: unknown;
            collapsed?: unknown;
        }>(request, {
            maxBytes: ADMIN_UI_PREFERENCES_BODY_LIMIT_BYTES,
            routeName: "admin/ui/preferences",
            allowEmpty: false,
        });
        const key = typeof body.key === "string" ? body.key.trim() : "";
        if (!key) {
            return finalize(startedAt, "admin/ui/preferences:PUT", NextResponse.json({ error: "Missing module key" }, { status: 400 }));
        }
        if (typeof body.collapsed !== "boolean") {
            return finalize(startedAt, "admin/ui/preferences:PUT", NextResponse.json({ error: "Missing collapsed flag" }, { status: 400 }));
        }

        return finalize(startedAt, "admin/ui/preferences:PUT", NextResponse.json({
            success: true,
            preferences: await saveAdminUiCollapsedModulePreference({
                uid: caller.uid,
                key,
                collapsed: body.collapsed,
            }),
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(startedAt, "admin/ui/preferences:PUT", NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalize(startedAt, "admin/ui/preferences:PUT", handleApiError(error, "admin/ui/preferences"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ui/preferences:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/ui/preferences:PUT", PUT_handler);
