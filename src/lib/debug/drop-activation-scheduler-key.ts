export type DropActivationSchedulerKeyParseResult = {
    ok: boolean;
    kind: "drop_activation" | "unknown";
    dropId: string | null;
    scheduledAtMs: number | null;
    scheduledAtUtc: string | null;
    parseError: string | null;
    rawValue: string;
};

const CANONICAL_SCHEDULER_KEY = /^drop-activation:([^:]+):([^:]+)$/u;
const STABLE_ID_SCHEDULER_KEY = /^notification_dispatch__drop-activation__([^_]+)__(\d+)$/u;

function parseTimestamp(value: string) {
    if (!/^\d+$/u.test(value)) return null;
    const timestamp = Number(value);
    return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null;
}

function toUtc(timestamp: number | null) {
    return timestamp ? new Date(timestamp).toISOString() : null;
}

export function parseDropActivationSchedulerKey(value: unknown): DropActivationSchedulerKeyParseResult {
    const rawValue = typeof value === "string" ? value.trim() : "";
    if (!rawValue) {
        return {
            ok: false,
            kind: "unknown",
            dropId: null,
            scheduledAtMs: null,
            scheduledAtUtc: null,
            parseError: "missing_scheduler_key",
            rawValue,
        };
    }

    const canonicalMatch = CANONICAL_SCHEDULER_KEY.exec(rawValue);
    const stableMatch = canonicalMatch ? null : STABLE_ID_SCHEDULER_KEY.exec(rawValue);
    const match = canonicalMatch ?? stableMatch;
    if (!match) {
        return {
            ok: false,
            kind: "unknown",
            dropId: null,
            scheduledAtMs: null,
            scheduledAtUtc: null,
            parseError: "unrecognized_scheduler_key",
            rawValue,
        };
    }

    const dropId = match[1] || null;
    const scheduledAtRaw = match[2] || "";
    const scheduledAtMs = parseTimestamp(scheduledAtRaw);
    if (!scheduledAtMs) {
        return {
            ok: false,
            kind: "drop_activation",
            dropId,
            scheduledAtMs: null,
            scheduledAtUtc: null,
            parseError: "invalid_scheduled_at",
            rawValue,
        };
    }

    return {
        ok: true,
        kind: "drop_activation",
        dropId,
        scheduledAtMs,
        scheduledAtUtc: toUtc(scheduledAtMs),
        parseError: null,
        rawValue,
    };
}

export function isDropActivationSchedulerKey(value: unknown) {
    return parseDropActivationSchedulerKey(value).ok;
}

export function formatSchedulerKeyTimestampUtc(value: unknown) {
    return parseDropActivationSchedulerKey(value).scheduledAtUtc;
}

export function buildDropActivationSchedulerDebug(input: { schedulerKey: unknown }) {
    const parsed = parseDropActivationSchedulerKey(input.schedulerKey);
    return {
        ...parsed,
        mutationAllowed: false,
        nextAction: parsed.ok
            ? "Use parsed scheduler timestamp for debug display without mutating queue outcome data."
            : "Keep raw scheduler key visible in drilldown and classify the parse error.",
    };
}
