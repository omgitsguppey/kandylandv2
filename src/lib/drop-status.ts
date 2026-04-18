import type { Drop } from "@/types/db";

export type { DropTiming } from "../../shared/runtime/drop-status";
export { getFiniteDropTimestamp, isDropActiveNow, resolveDropStatusFromTiming } from "../../shared/runtime/drop-status";
import { resolveDropStatusFromTiming } from "../../shared/runtime/drop-status";

export function applyDropStatus<T extends Drop>(drop: T, now = Date.now()): T {
    const status = resolveDropStatusFromTiming(drop, now);
    if (drop.status === status) {
        return drop;
    }

    return {
        ...drop,
        status,
    };
}
