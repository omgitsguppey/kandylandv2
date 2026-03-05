import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STANDARD } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { sanitizeDropForClient } from "@/lib/server/drops";
import { Drop } from "@/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "drops/feed", STANDARD);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const limitParam = parseInt(searchParams.get("limit") || "12", 10);
        const cursorParam = searchParams.get("cursor");

        let dropsQuery = adminDb.collection("drops")
            .where("status", "in", ["active", "scheduled"])
            .orderBy("validFrom", "asc")
            .limit(limitParam);

        if (cursorParam) {
            const cursorTimestamp = parseInt(cursorParam, 10);
            if (!isNaN(cursorTimestamp)) {
                // startAfter effectively acts as our cursor using the sorted field
                dropsQuery = dropsQuery.startAfter(cursorTimestamp);
            }
        }

        const snapshot = await dropsQuery.get();
        const now = Date.now();

        const drops: Drop[] = [];
        let nextCursor: number | null = null;

        snapshot.forEach((doc) => {
            const raw = normalizeDropRecord(doc.data(), doc.id);
            // Let expired drops pass through so the client can filter or show them based on user ownership
            drops.push(sanitizeDropForClient(raw));
            nextCursor = raw.validFrom; // update next cursor to the last processed validFrom
        });

        // Determine if we hit the limit which implies there MIGHT be a next page
        const hasMore = drops.length === limitParam;

        return NextResponse.json({
            drops,
            nextCursor: hasMore ? nextCursor : null,
        });
    } catch (error) {
        return handleApiError(error, "Drops.List");
    }
}
