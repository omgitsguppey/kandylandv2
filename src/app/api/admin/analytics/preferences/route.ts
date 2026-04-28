import { NextRequest, NextResponse } from "next/server";

import {
    isAdminAnalyticsRangeOption,
    type AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import {
    getAdminAnalyticsPreferences,
    saveAdminAnalyticsModuleRange,
} from "@/lib/server/admin-analytics-preferences";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/analytics/preferences:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/analytics/preferences",
            preAuthRouteName: "admin/analytics/preferences/preauth",
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
            preferences: await getAdminAnalyticsPreferences(caller.uid),
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/analytics/preferences"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/analytics/preferences:PUT",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/analytics/preferences",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const body = await request.json() as {
            section?: unknown;
            range?: unknown;
        };
        const section = typeof body.section === "string" ? body.section.trim() : "";
        const range = body.range;

        if (!section) {
            return finalize(NextResponse.json({ error: "Missing analytics section" }, { status: 400 }));
        }
        if (!isAdminAnalyticsRangeOption(range)) {
            return finalize(NextResponse.json({ error: "Invalid analytics range" }, { status: 400 }));
        }

        return finalize(NextResponse.json({
            success: true,
            preferences: await saveAdminAnalyticsModuleRange({
                uid: caller.uid,
                section,
                range: range as AdminAnalyticsRangeOption,
            }),
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/analytics/preferences"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/analytics/preferences:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/analytics/preferences:PUT", PUT_handler);
