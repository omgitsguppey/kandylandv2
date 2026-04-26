import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildDeterministicDropRecommendations } from "@/lib/server/behavioral-intelligence";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

export const dynamic = "force-dynamic";

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "drops/retention",
            rateLimit: STANDARD,
            auth: "user",
        });

        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentDropId = request.nextUrl.searchParams.get("currentDropId") || "";

        const userDoc = await adminDb.collection("users").doc(caller.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ drops: [] });
        }

        const userData = userDoc.data();
        const unlockedDropIds = Array.isArray(userData?.unlockedContent) ? userData.unlockedContent : [];

        if (unlockedDropIds.length === 0) {
            return NextResponse.json({ drops: [] });
        }

        const retentionDrops = await buildDeterministicDropRecommendations({
            userId: caller.uid,
            currentDropId,
            candidateDropIds: unlockedDropIds,
            limit: 4,
        });

        return NextResponse.json({
            mode: retentionDrops[0]?.mode || "deterministic-fallback",
            drops: retentionDrops.map((entry) => ({
                ...entry.drop,
                rankScore: entry.score,
                rankLabels: entry.labels,
            })),
        });
    } catch (error) {
        recordRouteWarning("drops/retention", "Error fetching retention drops", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export let GET = withRouteRuntimeHealth("drops/retention:GET", GET_handler);
