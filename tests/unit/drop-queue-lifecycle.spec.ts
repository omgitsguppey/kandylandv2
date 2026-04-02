import { describe, expect, it } from "vitest";

import { buildDropQueueLifecycleProjection } from "@/lib/drop-queue-lifecycle";
import { fromCSTInput } from "@/lib/timezone";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("buildDropQueueLifecycleProjection", () => {
    it("keeps future scheduled queue slots and pushes later ready drops behind them", () => {
        const now = fromCSTInput("2026-04-02T09:00");
        const scheduledSlot = fromCSTInput("2026-04-03T12:00");
        const cooledDropEnd = fromCSTInput("2026-03-20T12:00");

        const projection = buildDropQueueLifecycleProjection([
            {
                id: "scheduled_first",
                validFrom: scheduledSlot,
                validUntil: scheduledSlot + ONE_DAY_MS,
                status: "scheduled",
            },
            {
                id: "ready_second",
                validFrom: cooledDropEnd - ONE_DAY_MS,
                validUntil: cooledDropEnd,
                status: "expired",
            },
        ], {
            cooldownDays: 7,
            timesPerDay: ["12:00"],
            now,
        });

        expect(projection.get("scheduled_first")).toMatchObject({
            queueStatus: "scheduled",
            queueSlotMs: scheduledSlot,
        });
        expect(projection.get("ready_second")?.queueStatus).toBe("queued");
        expect(projection.get("ready_second")?.queueSlotMs).toBeGreaterThan(scheduledSlot);
    });

    it("treats currently active queue members as live instead of projecting a new queued slot", () => {
        const now = fromCSTInput("2026-04-02T09:00");
        const activeStart = fromCSTInput("2026-04-02T08:00");
        const activeEnd = fromCSTInput("2026-04-03T08:00");

        const projection = buildDropQueueLifecycleProjection([
            {
                id: "live_drop",
                validFrom: activeStart,
                validUntil: activeEnd,
                status: "scheduled",
            },
        ], {
            cooldownDays: 7,
            timesPerDay: ["12:00"],
            now,
        });

        expect(projection.get("live_drop")).toMatchObject({
            liveStatus: "active",
            queueStatus: "live",
            queueSlotMs: null,
            eligibleAfterMs: activeEnd,
        });
    });

    it("surfaces cooldown windows before a queued drop is eligible again", () => {
        const now = fromCSTInput("2026-04-02T09:00");
        const validUntil = fromCSTInput("2026-04-01T12:00");
        const cooldownEndsAt = validUntil + (7 * ONE_DAY_MS);

        const projection = buildDropQueueLifecycleProjection([
            {
                id: "cooling_drop",
                validFrom: validUntil - ONE_DAY_MS,
                validUntil,
                status: "expired",
            },
        ], {
            cooldownDays: 7,
            timesPerDay: ["12:00"],
            now,
        });

        expect(projection.get("cooling_drop")).toMatchObject({
            liveStatus: "expired",
            queueStatus: "cooldown",
            queueSlotMs: null,
            cooldownEndsAt,
            eligibleAfterMs: cooldownEndsAt,
        });
    });

    it("recovers legacy scheduled queue entries that lost their validFrom timestamp", () => {
        const now = fromCSTInput("2026-04-02T09:00");
        const expectedSlot = fromCSTInput("2026-04-02T12:00");

        const projection = buildDropQueueLifecycleProjection([
            {
                id: "legacy_scheduled",
                status: "scheduled",
            },
        ], {
            cooldownDays: 7,
            timesPerDay: ["12:00"],
            now,
        });

        expect(projection.get("legacy_scheduled")).toMatchObject({
            liveStatus: "scheduled",
            queueStatus: "queued",
            queueSlotMs: expectedSlot,
        });
    });
});
