import { fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";

const VALID_QUEUE_TIME = /^\d{2}:\d{2}$/;

function normalizeQueueTimes(timesPerDay: string[]): string[] {
    return timesPerDay
        .filter((value) => VALID_QUEUE_TIME.test(value))
        .sort((left, right) => left.localeCompare(right));
}

export function getNextQueueSlotAfter(afterMs: number, timesPerDay: string[], occupiedSlots: ReadonlySet<number>): number {
    const normalizedTimes = normalizeQueueTimes(timesPerDay);
    if (normalizedTimes.length === 0) {
        return afterMs;
    }

    const startDateKey = getCSTDateKey(afterMs);
    for (let dayOffset = 0; dayOffset < 400; dayOffset += 1) {
        const dateKey = dayOffset === 0 ? startDateKey : shiftCSTDateKey(startDateKey, dayOffset);
        for (const timeStr of normalizedTimes) {
            const slotTimestamp = fromCSTInput(`${dateKey}T${timeStr}`);
            if (Number.isFinite(slotTimestamp) && slotTimestamp > afterMs && !occupiedSlots.has(slotTimestamp)) {
                return slotTimestamp;
            }
        }
    }

    return afterMs;
}

export function buildProjectedQueueSchedule(queueLength: number, timesPerDay: string[], afterMs: number): number[] {
    if (!Number.isFinite(afterMs) || queueLength <= 0) {
        return [];
    }

    const projectedSlots: number[] = [];
    const occupiedSlots = new Set<number>();
    let currentSlotAnchorMs = afterMs;

    for (let index = 0; index < queueLength; index += 1) {
        const nextSlot = getNextQueueSlotAfter(currentSlotAnchorMs, timesPerDay, occupiedSlots);
        if (!Number.isFinite(nextSlot) || nextSlot <= currentSlotAnchorMs) {
            break;
        }

        projectedSlots.push(nextSlot);
        occupiedSlots.add(nextSlot);
        currentSlotAnchorMs = nextSlot;
    }

    return projectedSlots;
}
