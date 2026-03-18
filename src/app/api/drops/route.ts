import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import { Drop } from "@/types/db";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";

function compareDropFeedOrder(left: Drop, right: Drop) {
    if (left.validFrom !== right.validFrom) {
        return right.validFrom - left.validFrom;
    }

    return right.id.localeCompare(left.id);
}

function buildCursor(drop: Drop) {
    return `${drop.validFrom}|${drop.id}`;
}

function parseCursor(cursor: string | null) {
    if (!cursor) {
        return null;
    }

    const separatorIndex = cursor.indexOf("|");
    if (separatorIndex < 0) {
        return null;
    }

    const validFrom = Number.parseInt(cursor.slice(0, separatorIndex), 10);
    const id = cursor.slice(separatorIndex + 1);
    if (!Number.isFinite(validFrom) || !id) {
        return null;
    }

    return { validFrom, id };
}

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "drops/feed",
            rateLimit: STANDARD,
        });

        const { searchParams } = new URL(request.url);
        const limitParam = parseInt(searchParams.get("limit") || "12", 10);
        const cursorParam = searchParams.get("cursor");
        const now = Date.now();
        const parsedCursor = parseCursor(cursorParam);
        const allDrops = await getDrops();
        const visibleDrops = allDrops
            .filter((drop) => isDropActiveNow(drop, now))
            .sort(compareDropFeedOrder);

        let pageIndex = 0;
        if (parsedCursor) {
            const exactCursorIndex = visibleDrops.findIndex(
                (drop) => drop.validFrom === parsedCursor.validFrom && drop.id === parsedCursor.id,
            );
            if (exactCursorIndex >= 0) {
                pageIndex = exactCursorIndex + 1;
            } else {
                const fallbackIndex = visibleDrops.findIndex((drop) => (
                    drop.validFrom < parsedCursor.validFrom
                    || (drop.validFrom === parsedCursor.validFrom && drop.id.localeCompare(parsedCursor.id) < 0)
                ));
                pageIndex = fallbackIndex < 0 ? visibleDrops.length : fallbackIndex;
            }
        }

        const drops: Drop[] = visibleDrops.slice(pageIndex, pageIndex + limitParam);
        const nextCursor = drops.length === limitParam && drops[drops.length - 1]
            ? buildCursor(drops[drops.length - 1])
            : null;
        const etag = buildWeakEtag({
            cursor: cursorParam ?? "",
            nextCursor,
            drops: drops.map((drop) => [drop.id, drop.validFrom, drop.validUntil ?? 0, drop.status]),
        });

        if (requestMatchesEtag(request, etag)) {
            return buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL);
        }

        return NextResponse.json({
            drops,
            nextCursor,
        }, {
            headers: {
                ETag: etag,
                "Cache-Control": PRIVATE_REVALIDATE_CACHE_CONTROL,
            },
        });
    } catch (error) {
        return handleApiError(error, "Drops.List");
    }
}
