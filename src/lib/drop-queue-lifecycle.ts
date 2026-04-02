import type { Drop } from "@/types/db";

import { getNextQueueSlotAfter } from "@/lib/drop-queue-schedule";
import { getFiniteDropTimestamp, resolveDropStatusFromTiming } from "@/lib/drop-status";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type QueueLifecycleStatus = "queued" | "scheduled" | "live" | "cooldown";

export type QueueManagedDropLike = {
    id: string;
    validFrom?: number | null;
    validUntil?: number | null;
    status?: Drop["status"] | null;
};

export type DropQueueLifecycleProjection = {
    id: string;
    liveStatus: Drop["status"];
    queueStatus: QueueLifecycleStatus;
    queueSlotMs: number | null;
    eligibleAfterMs: number | null;
    cooldownEndsAt: number | null;
};

export function buildDropQueueLifecycleProjection(
    entries: QueueManagedDropLike[],
    input: {
        cooldownDays: number;
        timesPerDay: string[];
        now?: number;
    },
): Map<string, DropQueueLifecycleProjection> {
    const now = input.now ?? Date.now();
    const cooldownDays = Math.max(1, Math.floor(Number(input.cooldownDays) || 1));
    const cooldownMs = cooldownDays * ONE_DAY_MS;
    const projectionMap = new Map<string, DropQueueLifecycleProjection>();
    const occupiedSlots = new Set<number>();
    let lastAssignedSlotMs = now;

    for (const entry of entries) {
        const validFrom = getFiniteDropTimestamp(entry.validFrom);
        const liveStatus = resolveDropStatusFromTiming(entry, now);

        if (liveStatus === "scheduled" && validFrom !== null && validFrom > now) {
            occupiedSlots.add(validFrom);
        }
    }

    for (const entry of entries) {
        const validFrom = getFiniteDropTimestamp(entry.validFrom);
        const validUntil = getFiniteDropTimestamp(entry.validUntil);
        const liveStatus = resolveDropStatusFromTiming(entry, now);

        if (liveStatus === "scheduled" && validFrom !== null && validFrom > now) {
            projectionMap.set(entry.id, {
                id: entry.id,
                liveStatus,
                queueStatus: "scheduled",
                queueSlotMs: validFrom,
                eligibleAfterMs: validFrom,
                cooldownEndsAt: null,
            });
            lastAssignedSlotMs = Math.max(lastAssignedSlotMs, validFrom);
            continue;
        }

        if (liveStatus === "active") {
            projectionMap.set(entry.id, {
                id: entry.id,
                liveStatus,
                queueStatus: "live",
                queueSlotMs: null,
                eligibleAfterMs: validUntil,
                cooldownEndsAt: null,
            });
            continue;
        }

        if (liveStatus === "expired" && validUntil !== null) {
            const cooldownEndsAt = validUntil + cooldownMs;
            if (now < cooldownEndsAt) {
                projectionMap.set(entry.id, {
                    id: entry.id,
                    liveStatus,
                    queueStatus: "cooldown",
                    queueSlotMs: null,
                    eligibleAfterMs: cooldownEndsAt,
                    cooldownEndsAt,
                });
                continue;
            }

            const afterMs = Math.max(lastAssignedSlotMs, cooldownEndsAt - 1);
            const queueSlotMs = getNextQueueSlotAfter(afterMs, input.timesPerDay, occupiedSlots);
            const resolvedQueueSlotMs = Number.isFinite(queueSlotMs) && queueSlotMs > afterMs ? queueSlotMs : null;
            if (resolvedQueueSlotMs !== null) {
                occupiedSlots.add(resolvedQueueSlotMs);
                lastAssignedSlotMs = resolvedQueueSlotMs;
            }

            projectionMap.set(entry.id, {
                id: entry.id,
                liveStatus,
                queueStatus: "queued",
                queueSlotMs: resolvedQueueSlotMs,
                eligibleAfterMs: cooldownEndsAt,
                cooldownEndsAt,
            });
            continue;
        }

        const eligibleAfterMs = now;
        const afterMs = Math.max(lastAssignedSlotMs, eligibleAfterMs - 1);
        const queueSlotMs = getNextQueueSlotAfter(afterMs, input.timesPerDay, occupiedSlots);
        const resolvedQueueSlotMs = Number.isFinite(queueSlotMs) && queueSlotMs > afterMs ? queueSlotMs : null;
        if (resolvedQueueSlotMs !== null) {
            occupiedSlots.add(resolvedQueueSlotMs);
            lastAssignedSlotMs = resolvedQueueSlotMs;
        }

        projectionMap.set(entry.id, {
            id: entry.id,
            liveStatus,
            queueStatus: "queued",
            queueSlotMs: resolvedQueueSlotMs,
            eligibleAfterMs,
            cooldownEndsAt: null,
        });
    }

    return projectionMap;
}
