import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { getResolvedQueueConfig } from "@/lib/server/drop-queue";
import { CRON } from "@/lib/server/rate-limit";
import { getNextQueueSlotAfter } from "@/lib/drop-queue-schedule";
import { markDropsRuntimeChanged } from "@/lib/server/drop-runtime";
import { buildQueuedDropsMap } from "@/lib/server/process-queue-drops";
import { guardApiRequest } from "@/lib/server/request-guard";

type QueuedDropRuntime = {
    id: string;
    validFrom: number | null;
    validUntil: number | null;
    activationCount: number;
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
                console.error("CRON_SECRET is not configured for cron/process-queue");
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) return NextResponse.json({ error: "Database not available" }, { status: 500 });

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
                };
            },
        });

        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const cooldownMs = (config.cooldownDays || 7) * ONE_DAY_MS;

        const occupiedSlots = new Set<number>();

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) continue;

            const validFrom = drop.validFrom;
            const validUntil = drop.validUntil;
            const isScheduledOrActive = typeof validFrom === "number"
                && (validUntil === null || now < validUntil);

            if (isScheduledOrActive) {
                occupiedSlots.add(validFrom);
            }
        }

        // 2. Identify eligible drops (expired AND cooled down)
        const eligibleDropIds: string[] = [];

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) continue;

            const validUntil = drop.validUntil;
            const isExpired = typeof validUntil === "number" && now >= validUntil;

            if (isExpired) {
                const timeSinceExpiry = now - validUntil;
                if (timeSinceExpiry >= cooldownMs) {
                    eligibleDropIds.push(dropId);
                }
            } else if (!drop.validFrom && !drop.validUntil) {
                // Draft drops cleanly entering the queue
                eligibleDropIds.push(dropId);
            }
        }

        // 3. Assign slots to eligible drops
        if (eligibleDropIds.length === 0) {
            return NextResponse.json({ message: "No drops eligible for scheduling at this time." });
        }

        const updates: any[] = [];
        let currentSlotAnchorMs = now;

        let batch = adminDb.batch();
        let opsCount = 0;

        for (const dropId of eligibleDropIds) {
            const drop = dropsMap[dropId];
            if (!drop) continue;
            const nextValidFrom = getNextQueueSlotAfter(currentSlotAnchorMs, config.timesPerDay, occupiedSlots);
            if (!Number.isFinite(nextValidFrom) || nextValidFrom <= currentSlotAnchorMs) {
                throw new Error(`Unable to resolve the next queue slot for drop ${dropId}`);
            }
            const nextValidUntil = nextValidFrom + ONE_DAY_MS;

            const activationCount = drop.activationCount + 1;

            const dropRef = dropsRef.doc(dropId);
            batch.update(dropRef, {
                validFrom: nextValidFrom,
                validUntil: nextValidUntil,
                status: "scheduled",
                activationCount: activationCount
            });

            opsCount++;
            updates.push({ dropId, validFrom: nextValidFrom, activationCount });
            occupiedSlots.add(nextValidFrom);
            currentSlotAnchorMs = nextValidFrom;
        }

        if (opsCount > 0) {
            markDropsRuntimeChanged(batch, now);
            await batch.commit();
        }

        return NextResponse.json({
            message: `Scheduled ${updates.length} drops`,
            updates
        });

    } catch (error: any) {
        console.error("Queue process error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
