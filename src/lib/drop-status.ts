import type { Drop } from "@/types/db";

export type DropTiming = {
    validFrom?: number | null;
    validUntil?: number | null;
    status?: Drop["status"] | null;
};

export function getFiniteDropTimestamp(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function resolveDropStatusFromTiming(drop: DropTiming, now = Date.now()): Drop["status"] {
    const validFrom = getFiniteDropTimestamp(drop.validFrom);
    const validUntil = getFiniteDropTimestamp(drop.validUntil);

    if (validFrom !== null) {
        if (now < validFrom) {
            return "scheduled";
        }

        if (validUntil !== null && now >= validUntil) {
            return "expired";
        }

        return "active";
    }

    if (validUntil !== null && now >= validUntil) {
        return "expired";
    }

    if (drop.status === "active" || drop.status === "expired" || drop.status === "scheduled") {
        return drop.status;
    }

    return "scheduled";
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
