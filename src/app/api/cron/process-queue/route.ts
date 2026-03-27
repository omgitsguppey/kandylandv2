import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { getResolvedQueueConfig } from "@/lib/server/drop-queue";
import { CRON } from "@/lib/server/rate-limit";
import { getNextQueueSlotAfter } from "@/lib/drop-queue-schedule";
import { markDropsRuntimeChanged } from "@/lib/server/drop-runtime";
import { guardApiRequest } from "@/lib/server/request-guard";

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

// This cron job should be called periodically (e.g. daily/hourly)
export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "cron/process-queue",
            rateLimit: CRON,
        });
        const cronSecret = process.env.CRON_SECRET?.trim();
        if (!cronSecret) {
            console.error("CRON_SECRET is not configured for cron/process-queue");
            return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) return NextResponse.json({ error: "Database not available" }, { status: 500 });

        const config = await getResolvedQueueConfig();

        if (!config.queue || config.queue.length === 0) {
            return NextResponse.json({ message: "Queue is empty" });
        }

        const dropsRef = adminDb.collection("drops");

        const dropsMap: Record<string, FirebaseFirestore.DocumentData> = {};
        const dropRefs = config.queue.map(id => dropsRef.doc(id));
        const chunkedRefs = chunkArray(dropRefs, 100);

        for (const refsChunk of chunkedRefs) {
            if (refsChunk.length === 0) continue;
            const docs = await adminDb.getAll(...refsChunk);
            for (const doc of docs) {
                if (doc.exists) {
                    dropsMap[doc.id] = { id: doc.id, ...doc.data() };
                }
            }
        }

        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const cooldownMs = (config.cooldownDays || 7) * ONE_DAY_MS;

        const occupiedSlots = new Set<number>();

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) continue;

            const validFrom = Number(drop.validFrom);
            const validUntil = Number.isFinite(drop.validUntil) ? Number(drop.validUntil) : null;
            const isScheduledOrActive = Number.isFinite(validFrom)
                && (!validUntil || now < validUntil);

            if (isScheduledOrActive) {
                occupiedSlots.add(validFrom);
            }
        }

        // 2. Identify eligible drops (expired AND cooled down)
        const eligibleDropIds: string[] = [];

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) continue;

            const isExpired = drop.validUntil && now >= drop.validUntil;

            if (isExpired) {
                const timeSinceExpiry = now - drop.validUntil;
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
            const nextValidFrom = getNextQueueSlotAfter(currentSlotAnchorMs, config.timesPerDay, occupiedSlots);
            if (!Number.isFinite(nextValidFrom) || nextValidFrom <= currentSlotAnchorMs) {
                throw new Error(`Unable to resolve the next queue slot for drop ${dropId}`);
            }
            const nextValidUntil = nextValidFrom + ONE_DAY_MS;

            const activationCount = (drop.activationCount || 0) + 1;

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
