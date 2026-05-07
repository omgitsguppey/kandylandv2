import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import type { CreatorDiscoverySurface } from "@/lib/creator-public-pages";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { listCreatorDiscoveryProfiles } from "@/lib/server/creator-discovery";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const CREATOR_DISCOVERY_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=900";

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/discovery:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "creator/discovery",
            rateLimit: RELAXED,
        });

        const surface = (request.nextUrl.searchParams.get("surface")?.trim() || "drops") as CreatorDiscoverySurface;
        const creators = await listCreatorDiscoveryProfiles(surface);

        return finalize(NextResponse.json({
            success: true,
            creators,
        }, {
            headers: {
                "Cache-Control": CREATOR_DISCOVERY_CACHE_CONTROL,
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Creator.Discovery.GET"), error);
    }
}
