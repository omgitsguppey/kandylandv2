import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import type { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { readThroughStaleWhileRevalidateEphemeralRouteCache } from "@/lib/server/ephemeral-route-cache";
import { recordRuntimeWarning } from "@/lib/server/runtime-warning-store";
import { buildActivityItems, toTimestampNumber, type toTaskEvent } from "./activity-route-test-helpers";

type ActivityItem =
    | {
        id: string;
        timestamp: number;
        kind: "transaction";
        label: string;
        transaction: ReturnType<typeof normalizeTransactionRecord>;
    }
    | {
        id: string;
        timestamp: number;
        kind: "task";
        label: string;
        taskEvent: ReturnType<typeof toTaskEvent>;
    };

const USER_ACTIVITY_CACHE_TTL_MS = 20_000;
const USER_ACTIVITY_CACHE_STALE_TTL_MS = 10 * 60_000;

type UserActivityPayload = {
    success: true;
    view: "summary" | "history";
    activities: ActivityItem[];
    transactions: Array<ReturnType<typeof normalizeTransactionRecord>>;
    taskEvents: Array<ReturnType<typeof toTaskEvent>>;
};

function validateUserActivityPayload(value: UserActivityPayload) {
    const issues: string[] = [];
    if (!value || value.success !== true) {
        issues.push("missing success marker");
    }
    if (!Array.isArray(value.activities)) {
        issues.push("missing activities array");
    }
    if (!Array.isArray(value.transactions)) {
        issues.push("missing transactions array");
    }
    if (!Array.isArray(value.taskEvents)) {
        issues.push("missing taskEvents array");
    }
    return issues;
}

async function fetchTransactions(uid: string, limitCount?: number) {
    try {
        let query = adminDb.collection("transactions")
            .where("userId", "==", uid)
            .orderBy("timestamp", "desc");
        if (typeof limitCount === "number") {
            query = query.limit(limitCount);
        }
        return await query.get();
    } catch (error) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "warn",
            message: "Recent activity transactions query fell back to client sorting",
            detail: {
                route: "user/activity",
                userId: uid,
                collection: "transactions",
                message: error instanceof Error ? error.message : String(error),
            },
        });
        await recordRuntimeWarning({
            code: "user_activity_query_fallback",
            severity: "warn",
            executionLayer: "next_route",
            status: "fallback",
            surface: "user/activity",
            moduleKey: "transactions",
            detail: {
                routeName: "user/activity",
                collection: "transactions",
                userId: uid,
                message: error instanceof Error ? error.message : String(error),
            },
        });

        let fallbackQuery = adminDb.collection("transactions")
            .where("userId", "==", uid);
        if (typeof limitCount === "number") {
            fallbackQuery = fallbackQuery.limit(Math.max(limitCount * 3, 24));
        }
        const fallbackSnapshot = await fallbackQuery.get();

        const sortedDocs = [...fallbackSnapshot.docs].sort((left, right) => {
            const leftTimestamp = toTimestampNumber(left.data().timestamp);
            const rightTimestamp = toTimestampNumber(right.data().timestamp);
            return rightTimestamp - leftTimestamp;
        });

        return {
            docs: typeof limitCount === "number" ? sortedDocs.slice(0, limitCount) : sortedDocs,
        };
    }
}

async function fetchTaskEvents(uid: string, limitCount?: number) {
    try {
        let query = adminDb.collection("daily_task_events")
            .where("userId", "==", uid)
            .orderBy("timestamp", "desc");
        if (typeof limitCount === "number") {
            query = query.limit(limitCount);
        }
        return await query.get();
    } catch (error) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "warn",
            message: "Recent activity task-event query fell back to client sorting",
            detail: {
                route: "user/activity",
                userId: uid,
                collection: "daily_task_events",
                message: error instanceof Error ? error.message : String(error),
            },
        });
        await recordRuntimeWarning({
            code: "user_activity_query_fallback",
            severity: "warn",
            executionLayer: "next_route",
            status: "fallback",
            surface: "user/activity",
            moduleKey: "daily_task_events",
            detail: {
                routeName: "user/activity",
                collection: "daily_task_events",
                userId: uid,
                message: error instanceof Error ? error.message : String(error),
            },
        });

        let fallbackQuery = adminDb.collection("daily_task_events")
            .where("userId", "==", uid);
        if (typeof limitCount === "number") {
            fallbackQuery = fallbackQuery.limit(Math.max(limitCount * 3, 24));
        }
        const fallbackSnapshot = await fallbackQuery.get();

        const sortedDocs = [...fallbackSnapshot.docs].sort((left, right) => {
            const leftTimestamp = toTimestampNumber(left.data().timestamp);
            const rightTimestamp = toTimestampNumber(right.data().timestamp);
            return rightTimestamp - leftTimestamp;
        });

        return {
            docs: typeof limitCount === "number" ? sortedDocs.slice(0, limitCount) : sortedDocs,
        };
    }
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "user/activity:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/activity",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const uid = caller.uid;
        const view = request.nextUrl.searchParams.get("view") === "history" ? "history" : "summary";
        const itemLimit = view === "history" ? undefined : 1;

        const cacheResult = await readThroughStaleWhileRevalidateEphemeralRouteCache<UserActivityPayload>({
            key: `user-activity:${uid}:${view}`,
            ttlMs: USER_ACTIVITY_CACHE_TTL_MS,
            staleTtlMs: USER_ACTIVITY_CACHE_STALE_TTL_MS,
            validate: validateUserActivityPayload,
            loader: async () => {
                const [transactionsSnapshot, taskEventsSnapshot] = await Promise.all([
                    fetchTransactions(uid, itemLimit),
                    fetchTaskEvents(uid, itemLimit),
                ]);

                const activities = buildActivityItems(transactionsSnapshot, taskEventsSnapshot);
                return {
                    success: true,
                    view,
                    activities,
                    transactions: activities.flatMap((item) => item.kind === "transaction" ? [item.transaction] : []),
                    taskEvents: activities.flatMap((item) => item.kind === "task" && item.taskEvent ? [item.taskEvent] : []),
                };
            },
        });
        const payload = cacheResult.value;

        const etag = buildWeakEtag({
            view,
            activities: payload.activities.map((item) => item.kind === "transaction"
                ? [item.id, item.timestamp, item.kind, item.transaction.amount, item.transaction.type, item.transaction.rewardSource ?? ""]
                : [item.id, item.timestamp, item.kind, item.taskEvent?.type ?? "", item.taskEvent?.progress ?? 0, item.taskEvent?.maxProgress ?? 0]),
        });

        if (requestMatchesEtag(request, etag)) {
            return finalize(buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL));
        }

        return finalize(NextResponse.json({
            ...payload,
            cache: {
                cacheKey: `user-activity:${view}`,
                cacheStatus: cacheResult.cacheStatus,
                cachedAtMs: cacheResult.cachedAtMs,
                cacheAgeMs: cacheResult.cacheAgeMs,
                revalidating: cacheResult.revalidating,
                staleButVerified: cacheResult.staleButVerified,
                retainedBeyondStaleTtl: cacheResult.retainedBeyondStaleTtl,
            },
            debugTiming: {
                route: "user/activity",
                firstUsefulRenderSource: cacheResult.cacheStatus === "miss" ? "fresh_backend" : "verified_route_cache",
                firstUsefulValueMs: Date.now() - startedAt,
                refreshStatus: cacheResult.revalidating ? "refreshing" : "idle",
                waitingShownBecause: payload.activities.length > 0 ? null : "no verified activity yet",
                waitingAllowed: payload.activities.length === 0,
                blocksOnRealtime: false,
                blocksOnRefresh: cacheResult.cacheStatus === "miss",
                blocksOnTimeExpiry: false,
                staleButVerified: cacheResult.staleButVerified,
            },
        }, {
            headers: {
                ETag: etag,
                "Cache-Control": PRIVATE_REVALIDATE_CACHE_CONTROL,
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, "User.Activity.GET"), error);
    }
}
