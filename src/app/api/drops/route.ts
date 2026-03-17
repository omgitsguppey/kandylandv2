import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STANDARD } from "@/lib/server/rate-limit";
import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import { Drop } from "@/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "drops/feed", STANDARD);

        const { searchParams } = new URL(request.url);
        const limitParam = parseInt(searchParams.get("limit") || "12", 10);
        const cursorParam = searchParams.get("cursor");
        const now = Date.now();
        const cursorTimestamp = cursorParam ? parseInt(cursorParam, 10) : null;
        const allDrops = await getDrops();
        const visibleDrops = allDrops
            .filter((drop) => isDropActiveNow(drop, now))
            .sort((a, b) => b.validFrom - a.validFrom);

        const startIndex = cursorTimestamp == null || Number.isNaN(cursorTimestamp)
            ? 0
            : visibleDrops.findIndex((drop) => drop.validFrom < cursorTimestamp);
        const pageIndex = startIndex < 0 ? visibleDrops.length : startIndex;
        const drops: Drop[] = visibleDrops.slice(pageIndex, pageIndex + limitParam);
        const nextCursor = drops.length === limitParam ? drops[drops.length - 1]?.validFrom ?? null : null;

        return NextResponse.json({
            drops,
            nextCursor,
        });
    } catch (error) {
        return handleApiError(error, "Drops.List");
    }
}
