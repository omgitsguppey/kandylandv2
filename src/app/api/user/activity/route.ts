import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { buildNotModifiedResponse, buildWeakEtag, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { STANDARD } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";

type TaskEventType = "assigned" | "started" | "completed" | "failed" | "reminder_sent";

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

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/activity",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        const [transactionsSnapshot, taskEventsSnapshot] = await Promise.all([
            adminDb.collection("transactions")
                .where("userId", "==", caller?.uid ?? "")
                .orderBy("timestamp", "desc")
                .limit(8)
                .get(),
            adminDb.collection("daily_task_events")
                .where("userId", "==", caller?.uid ?? "")
                .orderBy("timestamp", "desc")
                .limit(8)
                .get(),
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
