import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { isAllowedLandingAssetKey } from "@/lib/landing-assets";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
                return NextResponse.json({ url: data[key] });
            }
        }

        return NextResponse.json({ url: null });
    } catch (error: any) {
        console.error("Failed to fetch landing custom image:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
