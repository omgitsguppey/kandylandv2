import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { getResolvedQueueConfig } from "@/lib/server/drop-queue";
import { CRON } from "@/lib/server/rate-limit";
import { markDropsRuntimeChanged } from "@/lib/server/drop-runtime";
import { buildQueuedDropsMap } from "@/lib/server/process-queue-drops";
import { guardApiRequest } from "@/lib/server/request-guard";
import { handleApiError } from "@/lib/server/auth";
import { buildDropQueueLifecycleProjection } from "@/lib/drop-queue-lifecycle";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

type QueuedDropRuntime = {
    id: string;
    validFrom: number | null;
    validUntil: number | null;
    activationCount: number;
    status: "active" | "expired" | "scheduled" | null;
};

function toFiniteNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

// This cron job should be called periodically (e.g. daily/hourly)
export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "cron/process-queue",
            rateLimit: CRON,
        });
        const cronSecret = process.env.CRON_SECRET?.trim();
        const authHeader = request.headers.get("authorization");

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            if (!cronSecret) {
                recordRouteWarning("cron/process-queue", "CRON_SECRET is not configured", undefined, {
                    channel: "cron",
                });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) {
            throw new Error("Database not available");
        }

        const config = await getResolvedQueueConfig();

        if (!config.queue || config.queue.length === 0) {
            return NextResponse.json({ message: "Queue is empty" });
        }

        const dropsRef = adminDb.collection("drops");
        const dropsMap = await buildQueuedDropsMap({
            dropIds: config.queue,
            createRef: (dropId) => dropsRef.doc(dropId),
            getAll: (...refs) => adminDb.getAll(...refs),
            materialize: (doc): QueuedDropRuntime | null => {
                const data = doc.data();
                if (!data) {
                    return null;
                }

                return {
                    id: doc.id,
                    validFrom: toFiniteNumber(data.validFrom),
                    validUntil: toFiniteNumber(data.validUntil),
                    activationCount: toFiniteNumber(data.activationCount) ?? 0,
                    status: data.status === "active" || data.status === "expired" || data.status === "scheduled"
                        ? data.status
                        : null,
                };
            },
        });

        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const queueEntries = config.queue
            .map((dropId) => dropsMap[dropId])
            .filter((drop): drop is QueuedDropRuntime => Boolean(drop));
        const queueProjection = buildDropQueueLifecycleProjection(queueEntries, {
            cooldownDays: config.cooldownDays,
            timesPerDay: config.timesPerDay,
            now,
        });
        const pendingUpdates = new Map<string, Record<string, unknown>>();
        const lifecycleReconciled: Array<{ dropId: string; status: "active" | "expired" | "scheduled" }> = [];
        const scheduledUpdates: Array<{ dropId: string; validFrom: number; activationCount: number }> = [];
        let batch = adminDb.batch();
        let opsCount = 0;

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) {
                continue;
            }

            const resolvedStatus = resolveDropStatusFromTiming(drop, now);
            const projection = queueProjection.get(dropId);
            const pending = pendingUpdates.get(dropId) ?? {};

            if (drop.status !== resolvedStatus) {
                pending.status = resolvedStatus;
                lifecycleReconciled.push({ dropId, status: resolvedStatus });
            }

            if (projection?.queueStatus === "queued" && typeof projection.queueSlotMs === "number") {
                pending.validFrom = projection.queueSlotMs;
                pending.validUntil = projection.queueSlotMs + ONE_DAY_MS;
                pending.status = "scheduled";
                pending.activationCount = drop.activationCount + 1;
                scheduledUpdates.push({
                    dropId,
                    validFrom: projection.queueSlotMs,
                    activationCount: drop.activationCount + 1,
                });
            }

            if (Object.keys(pending).length > 0) {
                pendingUpdates.set(dropId, pending);
            }
        }

        for (const [dropId, update] of pendingUpdates) {
            batch.update(dropsRef.doc(dropId), update);
            opsCount += 1;
        }

        if (opsCount > 0) {
            markDropsRuntimeChanged(batch, now);
            await batch.commit();
        }

        return NextResponse.json({
            message: scheduledUpdates.length > 0
                ? `Scheduled ${scheduledUpdates.length} drops`
                : lifecycleReconciled.length > 0
                    ? `Reconciled ${lifecycleReconciled.length} queued drop statuses`
                    : "No drops eligible for scheduling at this time.",
            updates: scheduledUpdates,
            lifecycleReconciled,
        });

    } catch (error: unknown) {
        return handleApiError(error, "Cron.ProcessQueue.GET");
    }
}
