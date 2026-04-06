import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { getTransactionDisplayLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";

type TaskEventType = "assigned" | "started" | "completed" | "failed" | "reminder_sent";
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

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ) {
        try {
            return Number((value as { toMillis: () => number }).toMillis()) || 0;
        } catch {
            return 0;
        }
    }

    return 0;
}

function toTaskEvent(raw: Record<string, unknown>, id: string) {
    const type = raw.type;
    if (
        typeof type !== "string"
        || !["assigned", "started", "completed", "failed", "reminder_sent"].includes(type)
        || typeof raw.title !== "string"
    ) {
        return null;
    }

    return {
        id,
        type: type as TaskEventType,
        title: raw.title,
        reward: Number(raw.reward) || 0,
        progress: Number(raw.progress) || 0,
        maxProgress: Number(raw.maxProgress) || 0,
        timestamp: toTimestampNumber(raw.timestamp),
    };
}

function renderTransactionLabel(transaction: ReturnType<typeof normalizeTransactionRecord>) {
    return getTransactionDisplayLabel(transaction);
}

function renderTaskEventLabel(taskEvent: NonNullable<ReturnType<typeof toTaskEvent>>) {
    if (taskEvent.type === "assigned") {
        return `Task ready: ${taskEvent.title}`;
    }

    if (taskEvent.type === "started") {
        return `Task in progress: ${taskEvent.title}`;
    }

    if (taskEvent.type === "completed") {
        return `Task complete: ${taskEvent.title}`;
    }

    if (taskEvent.type === "failed") {
        return `Task reset: ${taskEvent.title}`;
    }

    return `Task reminder: ${taskEvent.title}`;
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

function buildActivityItems(
    transactionsSnapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
    taskEventsSnapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
) {
    const transactionItems = transactionsSnapshot.docs.flatMap((doc) => {
        try {
            const transaction = normalizeTransactionRecord(doc.data(), doc.id);
            return [{
                id: transaction.id,
                timestamp: typeof transaction.timestamp === "number" ? transaction.timestamp : toTimestampNumber(transaction.timestamp),
                kind: "transaction" as const,
                label: renderTransactionLabel(transaction),
                transaction,
            }];
        } catch {
            return [];
        }
    });

    const taskItems = taskEventsSnapshot.docs.flatMap((doc) => {
        const normalized = toTaskEvent(doc.data() as Record<string, unknown>, doc.id);
        if (!normalized) {
            return [];
        }

        return [{
            id: normalized.id,
            timestamp: normalized.timestamp,
            kind: "task" as const,
            label: renderTaskEventLabel(normalized),
            taskEvent: normalized,
        }];
    });

    return [...transactionItems, ...taskItems].sort((left, right) => right.timestamp - left.timestamp);
}

export const __test = {
    toTimestampNumber,
    toTaskEvent,
    buildActivityItems,
    renderTaskEventLabel,
};

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/activity",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        const uid = caller?.uid ?? "";
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
            return buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL);
        }

        return NextResponse.json({
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
        });
    } catch (error) {
        return handleApiError(error, "User.Activity.GET");
    }
}
