import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { addDays, startOfDay, set } from "date-fns";
import { getResolvedQueueConfig } from "@/lib/server/drop-queue";

// This cron job should be called periodically (e.g. daily/hourly)
export async function GET(request: NextRequest) {
    try {
        // Enforce basic auth/cron secret in production.
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});

        const config = await getResolvedQueueConfig();

        if (!config.queue || config.queue.length === 0) {
            return NextResponse.json({ message: "Queue is empty" });
        }

        const dropsRef = adminDb.collection("drops");
        const queuedDropsSnap = await dropsRef.where("__name__", "in", config.queue).get();

        const dropsMap: Record<string, FirebaseFirestore.DocumentData> = {};
        queuedDropsSnap.forEach(doc => {
            dropsMap[doc.id] = { id: doc.id, ...doc.data() };
        });

        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const cooldownMs = (config.cooldownDays || 7) * ONE_DAY_MS;

        // 1. Identify all scheduled/active drops to find the latest occupied slot
        let latestScheduledTime = now;

        for (const dropId of config.queue) {
            const drop = dropsMap[dropId];
            if (!drop) continue;

            const isScheduledOrActive = drop.validUntil
                ? now < drop.validUntil
                : drop.validFrom > now; // No expiration, but future start

            if (isScheduledOrActive) {
                if (drop.validFrom > latestScheduledTime) {
                    latestScheduledTime = drop.validFrom;
                }
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
            return NextResponse.json({ message: "No drops eligible for scheduling at this time.", latestScheduledTime });
        }

        const updates: any[] = [];
        let currentSlotTime = new Date(Math.max(now, latestScheduledTime));

        // Ensure starting on a clean day boundary logic
        // Find the next available time string from the setting array
        // We'll just increment days and assign times

        let batch = adminDb.batch();
        let opsCount = 0;

        // Base slot day is tomorrow if latest slot is today, or same day if empty
        let slotBaseDate = startOfDay(addDays(currentSlotTime, 1));
        let timeIndex = 0;

        for (const dropId of eligibleDropIds) {
            const drop = dropsMap[dropId];
            const timeStr = config.timesPerDay[timeIndex] || "12:00";
            const [hours, minutes] = timeStr.split(":").map(Number);

            const nextValidFrom = set(slotBaseDate, { hours, minutes, seconds: 0, milliseconds: 0 }).getTime();
            const nextValidUntil = nextValidFrom + ONE_DAY_MS; // Active for 24h

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

            // Notification Payload Generation (Will actually trigger when the drop becomes active via another listener/cron, 
            // but for simplicity we can just prep or fire it if it's happening soon. Since it's a future schedule, 
            // the system needs a separate "just went live" cron, but we will schedule a notification task or simulate it here).

            // Increment slot
            timeIndex++;
            if (timeIndex >= config.dropsPerDay) {
                timeIndex = 0;
                slotBaseDate = addDays(slotBaseDate, 1);
            }
        }

        if (opsCount > 0) {
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
