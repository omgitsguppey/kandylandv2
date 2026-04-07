import type { Drop } from "@/types/db";

export type DropTiming = {
    validFrom?: number | TimestampLike | null;
    validUntil?: number | TimestampLike | null;
    status?: Drop["status"] | null;
};

type TimestampLike = {
    toMillis?: () => number;
    _seconds?: number;
    _nanoseconds?: number;
    seconds?: number;
    nanoseconds?: number;
};

export function getFiniteDropTimestamp(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (typeof value === "object" && value !== null) {
        const candidate = value as TimestampLike;
        if (typeof candidate.toMillis === "function") {
            try {
                const millis = candidate.toMillis();
                return Number.isFinite(millis) && millis > 0 ? millis : null;
            } catch {
                return null;
            }
        }

        if (typeof candidate._seconds === "number") {
            const millis = (candidate._seconds * 1000) + Math.floor((candidate._nanoseconds || 0) / 1_000_000);
            return Number.isFinite(millis) && millis > 0 ? millis : null;
        }

        if (typeof candidate.seconds === "number") {
            const millis = (candidate.seconds * 1000) + Math.floor((candidate.nanoseconds || 0) / 1_000_000);
            return Number.isFinite(millis) && millis > 0 ? millis : null;
        }
    }

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
