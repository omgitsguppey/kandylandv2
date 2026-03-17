import type { Drop } from "@/types/db";

type DropTiming = Pick<Drop, "validFrom" | "validUntil">;

export function resolveDropStatusFromTiming(drop: DropTiming, now = Date.now()): Drop["status"] {
    if (now < drop.validFrom) {
        return "scheduled";
    }

    if (drop.validUntil && now >= drop.validUntil) {
        return "expired";
    }

    return "active";
}

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

export function isDropActiveNow(drop: DropTiming, now = Date.now()): boolean {
    return resolveDropStatusFromTiming(drop, now) === "active";
}
