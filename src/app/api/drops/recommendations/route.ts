import { NextRequest, NextResponse } from "next/server";

import { STANDARD } from "@/lib/server/rate-limit";
import { buildDeterministicDropRecommendations } from "@/lib/server/behavioral-intelligence";
import { guardApiRequest } from "@/lib/server/request-guard";
import { handleApiError } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "drops/recommendations",
      rateLimit: STANDARD,
    });
    const limit = Number(request.nextUrl.searchParams.get("limit") || 8);
    const recommendations = await buildDeterministicDropRecommendations({
      userId: caller?.uid ?? null,
      limit,
    });

    return NextResponse.json({
      mode: recommendations[0]?.mode || "deterministic-fallback",
      profileFreshness: recommendations[0]?.profileFreshness || "unknown",
      profileConfidence: recommendations[0]?.profileConfidence || 0,
      drops: recommendations.map((entry) => ({
        ...entry.drop,
        rankScore: entry.score,
        rankLabels: entry.labels,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Drops.Recommendations.GET");
  }
}
