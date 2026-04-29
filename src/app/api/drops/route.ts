import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { Drop } from "@/types/db";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";

const DEFAULT_DROPS_LIMIT = 12;
const DROPS_FEED_ROUTE_NAME = "drops";
const DROPS_LIST_ERROR_CONTEXT = "Drops.List";

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

function parseFeedLimit(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    return parseInt(searchParams.get("limit") || String(DEFAULT_DROPS_LIMIT), 10);
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "drops:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: DROPS_FEED_ROUTE_NAME,
            rateLimit: STANDARD,
        });

        const { searchParams } = new URL(request.url);
        const limitParam = parseFeedLimit(request);
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
            return finalize(buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL));
        }

        return finalize(NextResponse.json({
            drops,
            nextCursor,
        }, {
            headers: {
                ETag: etag,
                "Cache-Control": PRIVATE_REVALIDATE_CACHE_CONTROL,
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, DROPS_LIST_ERROR_CONTEXT), error);
    }
}
