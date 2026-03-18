import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";

type TaskEventType = "assigned" | "started" | "completed" | "failed" | "reminder_sent";

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
        timestamp: Number(raw.timestamp) || 0,
    };
}

async function fetchRecentTransactions(uid: string) {
    try {
        return await adminDb.collection("transactions")
            .where("userId", "==", uid)
            .orderBy("timestamp", "desc")
            .limit(8)
            .get();
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

        const fallbackSnapshot = await adminDb.collection("transactions")
            .where("userId", "==", uid)
            .limit(24)
            .get();

        const sortedDocs = [...fallbackSnapshot.docs].sort((left, right) => {
            const leftTimestamp = toTimestampNumber(left.data().timestamp);
            const rightTimestamp = toTimestampNumber(right.data().timestamp);
            return rightTimestamp - leftTimestamp;
        });

        return {
            docs: sortedDocs.slice(0, 8),
        };
    }
}

async function fetchRecentTaskEvents(uid: string) {
    try {
        return await adminDb.collection("daily_task_events")
            .where("userId", "==", uid)
            .orderBy("timestamp", "desc")
            .limit(8)
            .get();
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

        const fallbackSnapshot = await adminDb.collection("daily_task_events")
            .where("userId", "==", uid)
            .limit(24)
            .get();

        const sortedDocs = [...fallbackSnapshot.docs].sort((left, right) => {
            const leftTimestamp = toTimestampNumber(left.data().timestamp);
            const rightTimestamp = toTimestampNumber(right.data().timestamp);
            return rightTimestamp - leftTimestamp;
        });

        return {
            docs: sortedDocs.slice(0, 8),
        };
    }
}

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

        const [transactionsSnapshot, taskEventsSnapshot] = await Promise.all([
            fetchRecentTransactions(uid),
            fetchRecentTaskEvents(uid),
        ]);

        const transactions = transactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        });

        const taskEvents = taskEventsSnapshot.docs.flatMap((doc) => {
            const normalized = toTaskEvent(doc.data() as Record<string, unknown>, doc.id);
            return normalized ? [normalized] : [];
        });

        const etag = buildWeakEtag({
            transactions: transactions.map((transaction) => [transaction.id, transaction.timestamp, transaction.amount, transaction.type, transaction.rewardSource ?? ""]),
            taskEvents: taskEvents.map((event) => [event.id, event.timestamp, event.type, event.progress, event.maxProgress]),
        });

        if (requestMatchesEtag(request, etag)) {
            return buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL);
        }

        return NextResponse.json({
            success: true,
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
