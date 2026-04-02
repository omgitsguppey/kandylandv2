import { buildDropQueueLifecycleProjection } from "@/lib/drop-queue-lifecycle";
import { formatAdminTimeLabel } from "@/lib/admin-drop-formatting";
import type { Drop } from "@/types/db";

export interface AdminDropQueueConfig {
    queue: string[];
    dropsPerDay: number;
    cooldownDays: number;
    timesPerDay: string[];
}

export function buildQueueScheduleSummary(config: AdminDropQueueConfig) {
    const dropLabel = config.dropsPerDay === 1 ? "drop/day" : "drops/day";
    const times = config.timesPerDay.slice(0, config.dropsPerDay).map(formatAdminTimeLabel).join(" · ");
    return `${config.dropsPerDay} ${dropLabel} · ${times} · ${config.cooldownDays}-day cooldown`;
}

export function buildReadableQueueScheduleSummary(config: AdminDropQueueConfig) {
    const dropLabel = config.dropsPerDay === 1 ? "drop/day" : "drops/day";
    const times = config.timesPerDay.slice(0, config.dropsPerDay).map(formatAdminTimeLabel).join(" | ");
    return `${config.dropsPerDay} ${dropLabel} | ${times} | ${config.cooldownDays}-day cooldown`;
}

export function buildAdminQueueProjection(input: {
    getDropById: (dropId: string) => Drop | undefined;
    queueOrder: readonly string[];
    legacyQueueIds?: Iterable<string>;
    cooldownDays: number;
    timesPerDay: readonly string[];
    now: number;
}) {
    const legacyIds = Array.from(input.legacyQueueIds ?? []);
    const visibleQueueIds = new Set<string>([...legacyIds, ...input.queueOrder]);
    const queuedIds = new Set(input.queueOrder);
    const queueProjectionOrder = [
        ...input.queueOrder,
        ...legacyIds.filter((dropId) => !queuedIds.has(dropId)),
    ];

    if (queueProjectionOrder.length === 0 || input.timesPerDay.length === 0) {
        return {
            visibleQueueIds,
            queueProjectionOrder,
            lifecycleMap: new Map(),
        };
    }

    const queueEntries = queueProjectionOrder
        .map((dropId) => input.getDropById(dropId))
        .filter((drop): drop is Drop => Boolean(drop));

    return {
        visibleQueueIds,
        queueProjectionOrder,
        lifecycleMap: buildDropQueueLifecycleProjection(queueEntries, {
            cooldownDays: input.cooldownDays,
            timesPerDay: [...input.timesPerDay],
            now: input.now,
        }),
    };
}
