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

        const [transactionsSnapshot, taskEventsSnapshot] = await Promise.all([
            fetchTransactions(uid, itemLimit),
            fetchTaskEvents(uid, itemLimit),
        ]);

        const activities = buildActivityItems(transactionsSnapshot, taskEventsSnapshot);
        const transactions = activities.flatMap((item) => item.kind === "transaction" ? [item.transaction] : []);
        const taskEvents = activities.flatMap((item) => item.kind === "task" && item.taskEvent ? [item.taskEvent] : []);

        const etag = buildWeakEtag({
            view,
            activities: activities.map((item) => item.kind === "transaction"
                ? [item.id, item.timestamp, item.kind, item.transaction.amount, item.transaction.type, item.transaction.rewardSource ?? ""]
                : [item.id, item.timestamp, item.kind, item.taskEvent?.type ?? "", item.taskEvent?.progress ?? 0, item.taskEvent?.maxProgress ?? 0]),
        });

        if (requestMatchesEtag(request, etag)) {
            return finalize(buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL));
        }

        return finalize(NextResponse.json({
            success: true,
            view,
            activities,
            transactions,
            taskEvents,
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
