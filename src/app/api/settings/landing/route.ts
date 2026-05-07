import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { isAllowedLandingAssetKey } from "@/lib/landing-assets";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

export const dynamic = 'force-dynamic';
const LANDING_SETTINGS_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=900";

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "settings/landing",
            rateLimit: RELAXED,
        });
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!isAllowedLandingAssetKey(key)) {
            return NextResponse.json({ error: "Invalid key parameter" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const landingDoc = await adminDb.collection("settings").doc("landing").get();

        if (landingDoc.exists) {
            const data = landingDoc.data();
            if (data && data[key]) {
                return NextResponse.json({ url: data[key] }, {
                    headers: {
                        "Cache-Control": LANDING_SETTINGS_CACHE_CONTROL,
                    },
                });
            }
        }

        return NextResponse.json({ url: null }, {
            headers: {
                "Cache-Control": LANDING_SETTINGS_CACHE_CONTROL,
            },
        });
    } catch (error: any) {
        recordRouteWarning("settings/landing", "Failed to fetch landing custom image", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export let GET = withRouteRuntimeHealth("settings/landing:GET", GET_handler);
