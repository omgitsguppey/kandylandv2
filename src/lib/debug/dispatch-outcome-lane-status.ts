export type DispatchOutcomeLaneStatus =
    | "observed_current"
    | "observed_stale"
    | "missing"
    | "source_missing"
    | "unknown";

export type SavedDataStatus =
    | "no_saved_payload_expected"
    | "saved_payload_missing"
    | "source_not_loaded"
    | "unknown";

export type DispatchOutcomeLike = {
    status?: string | null;
    outcome?: string | null;
    updatedAt?: number | null;
    lastOutcomeAtMs?: number | null;
    savedDataCount?: number | null;
};

export type DispatchOutcomeLaneInput = {
    nowMs: number;
    outcomes: readonly DispatchOutcomeLike[];
    sourceLoaded: boolean;
    savedDataCount?: number;
    freshnessWindowMs?: number;
};

export type DispatchOutcomeLane = {
    status: DispatchOutcomeLaneStatus;
    outcomeCount: number;
    failedCount: number;
    warningCount: number;
    savedDataCount: number;
    savedDataStatus: SavedDataStatus;
    lastOutcomeAtMs: number | null;
    source: "notification_dispatch_outcomes" | "not_loaded";
    sourceWindow: "current" | "stale" | "empty" | "not_loaded";
    healthProven: boolean;
    readableWhenHeartbeatMissing: true;
    nextAction: string;
};

function toFiniteNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function normalizeOutcomeStatus(entry: DispatchOutcomeLike) {
    return String(entry.outcome || entry.status || "unknown");
}

export function classifyDispatchOutcomeLane(input: DispatchOutcomeLaneInput): DispatchOutcomeLane {
    const freshnessWindowMs = input.freshnessWindowMs ?? 24 * 60 * 60 * 1000;
    const outcomeCount = input.outcomes.length;
    const lastOutcomeAtMs = input.outcomes.reduce((latest, entry) => Math.max(
        latest,
        toFiniteNumber(entry.lastOutcomeAtMs),
        toFiniteNumber(entry.updatedAt),
    ), 0);
    const failedCount = input.outcomes.filter((entry) => normalizeOutcomeStatus(entry) === "failed").length;
    const warningCount = input.outcomes.filter((entry) => {
        const status = normalizeOutcomeStatus(entry);
        return status === "skipped" || status === "duplicate" || status === "skipped_existing_owner" || status === "unknown";
    }).length;
    const savedDataCount = input.savedDataCount ?? input.outcomes.reduce((total, entry) => total + toFiniteNumber(entry.savedDataCount), 0);

    if (!input.sourceLoaded) {
        return {
            status: "source_missing",
            outcomeCount,
            failedCount,
            warningCount,
            savedDataCount,
            savedDataStatus: "source_not_loaded",
            lastOutcomeAtMs: lastOutcomeAtMs || null,
            source: "not_loaded",
            sourceWindow: "not_loaded",
            healthProven: false,
            readableWhenHeartbeatMissing: true,
            nextAction: "Load dispatch outcome source before using failed=0 or warnings=0 as queue health evidence.",
        };
    }

    if (outcomeCount === 0) {
        return {
            status: "missing",
            outcomeCount,
            failedCount,
            warningCount,
            savedDataCount,
            savedDataStatus: savedDataCount > 0 ? "unknown" : "no_saved_payload_expected",
            lastOutcomeAtMs: null,
            source: "notification_dispatch_outcomes",
            sourceWindow: "empty",
            healthProven: false,
            readableWhenHeartbeatMissing: true,
            nextAction: "Keep outcome lane source-ready and wait for dispatch outcome rows or scheduler evidence.",
        };
    }

    const stale = lastOutcomeAtMs <= 0 || input.nowMs - lastOutcomeAtMs > freshnessWindowMs;

    return {
        status: stale ? "observed_stale" : "observed_current",
        outcomeCount,
        failedCount,
        warningCount,
        savedDataCount,
        savedDataStatus: savedDataCount > 0 ? "unknown" : "no_saved_payload_expected",
        lastOutcomeAtMs: lastOutcomeAtMs || null,
        source: "notification_dispatch_outcomes",
        sourceWindow: stale ? "stale" : "current",
        healthProven: !stale && failedCount === 0,
        readableWhenHeartbeatMissing: true,
        nextAction: stale
            ? "Refresh dispatch outcome evidence before treating failed=0 as current queue health."
            : "Dispatch outcomes are readable; keep heartbeat evidence separate from outcome health.",
    };
}
