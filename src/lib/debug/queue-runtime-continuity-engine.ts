import { QUEUE_RUNTIME_WARNING_CODES } from "../../../shared/runtime/runtime-warning-contract";
import { classifyDispatchOutcomeLane } from "@/lib/debug/dispatch-outcome-lane-status";
import { classifyLegacyQueueAdapterUsage } from "@/lib/debug/legacy-queue-adapter-policy";
import type {
    QueueContinuityStatus,
    QueueHeartbeatLike,
    QueueHeartbeatStatus,
    QueueRuntimeContinuity,
    QueueRuntimeContinuityInput,
    QueueRuntimeWarningLike,
} from "@/lib/debug/queue-runtime-continuity-contract";

function toFiniteNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function lastHeartbeatAt(heartbeat: QueueHeartbeatLike) {
    return Math.max(
        toFiniteNumber(heartbeat.completedAt),
        toFiniteNumber(heartbeat.startedAt),
        toFiniteNumber(heartbeat.updatedAt),
    );
}

export function classifyHeartbeatLane(input: {
    nowMs: number;
    heartbeats: readonly QueueHeartbeatLike[];
    sourceLoaded: boolean;
    expectedCadenceMs: number;
}): QueueRuntimeContinuity["schedulerHeartbeat"] {
    if (!input.sourceLoaded) {
        return {
            status: "source_missing",
            lastHeartbeatAtMs: null,
            expectedCadenceMs: input.expectedCadenceMs,
            freshnessMs: null,
            source: "not_loaded",
        };
    }

    if (input.heartbeats.length === 0) {
        return {
            status: "missing",
            lastHeartbeatAtMs: null,
            expectedCadenceMs: input.expectedCadenceMs,
            freshnessMs: null,
            source: "queue_job_heartbeats",
        };
    }

    const lastHeartbeatAtMs = input.heartbeats.reduce((latest, heartbeat) => Math.max(latest, lastHeartbeatAt(heartbeat)), 0);
    const failed = input.heartbeats.some((heartbeat) => heartbeat.status === "failed");
    const staleAfterMs = input.heartbeats.reduce((windowMs, heartbeat) => {
        const staleAfterMs = toFiniteNumber(heartbeat.staleAfterMs);
        return staleAfterMs > 0 ? Math.min(windowMs, staleAfterMs) : windowMs;
    }, input.expectedCadenceMs * 2);
    const freshnessMs = lastHeartbeatAtMs > 0 ? Math.max(0, input.nowMs - lastHeartbeatAtMs) : null;
    const stale = freshnessMs === null || freshnessMs > staleAfterMs;
    const status: QueueHeartbeatStatus = failed || stale ? "stale" : "observed_current";

    return {
        status,
        lastHeartbeatAtMs: lastHeartbeatAtMs || null,
        expectedCadenceMs: input.expectedCadenceMs,
        freshnessMs,
        source: "queue_job_heartbeats",
    };
}

export function classifyQueueDrift(input: {
    runtimeWarnings: readonly QueueRuntimeWarningLike[];
    sourceLoaded: boolean;
}) {
    const legacyAdapterUsageCount = input.runtimeWarnings.filter((entry) => entry.code === QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked).length;
    const missingDispatchOutcomeCount = input.runtimeWarnings.filter((entry) => entry.code === QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome).length;
    const driftCount = input.runtimeWarnings.filter((entry) => entry.code === QUEUE_RUNTIME_WARNING_CODES.queueMembershipDrift).length;
    const legacyAdapterStatus = classifyLegacyQueueAdapterUsage({
        usageCount: legacyAdapterUsageCount,
        missingDispatchOutcomeCount,
        sourceLoaded: input.sourceLoaded,
    });

    return {
        queueDrift: {
            status: input.sourceLoaded ? "loaded" as const : "source_missing" as const,
            sourceLoaded: input.sourceLoaded,
            driftCount,
            legacyAdapterUsageCount,
            missingDispatchOutcomeCount,
            blockingDriftCount: legacyAdapterStatus.blockingDriftCount + driftCount,
        },
        legacyAdapterStatus,
    };
}

function explainQueueContinuity(status: QueueContinuityStatus) {
    switch (status) {
        case "healthy_current":
            return "Queue heartbeat and dispatch outcome lanes are current; keep legacy adapter drift source loaded.";
        case "degraded_missing_heartbeat":
            return "Dispatch outcomes remain readable, but wire scheduler heartbeat evidence or classify scheduler manual/disabled before marking queue continuity live.";
        case "degraded_missing_outcomes":
            return "Heartbeat evidence exists but dispatch outcomes are missing or stale; verify outcome writer without triggering jobs.";
        case "broken_drift":
            return "Legacy adapter usage or missing dispatch outcomes create blocking runtime continuity drift.";
        case "source_ready_no_sample_loaded":
            return "No queue heartbeat or outcome rows are loaded; keep this source-ready/no-sample, not live.";
        case "disabled_manual":
            return "Scheduler is manual or disabled; keep live health separate from operator controls.";
        default:
            return "Classify queue heartbeat, outcome, and drift sources before marking continuity healthy.";
    }
}

export function buildQueueRuntimeContinuity(input: QueueRuntimeContinuityInput): QueueRuntimeContinuity {
    const expectedCadenceMs = input.expectedCadenceMs ?? 6 * 60 * 60 * 1000;
    const heartbeatSourceLoaded = input.heartbeatSourceLoaded ?? true;
    const outcomeSourceLoaded = input.outcomeSourceLoaded ?? true;
    const driftSourceLoaded = input.driftSourceLoaded ?? input.runtimeWarnings.length > 0;
    const schedulerHeartbeat = classifyHeartbeatLane({
        nowMs: input.nowMs,
        heartbeats: input.heartbeats,
        sourceLoaded: heartbeatSourceLoaded,
        expectedCadenceMs,
    });
    const dispatchOutcomes = classifyDispatchOutcomeLane({
        nowMs: input.nowMs,
        outcomes: input.outcomes,
        sourceLoaded: outcomeSourceLoaded,
        freshnessWindowMs: input.freshnessWindowMs,
    });
    const warningCount = input.runtimeWarnings.length;
    const needsReviewCount = input.runtimeWarnings.filter((entry) => entry.status === "failed" || entry.status === "degraded").length;
    const { queueDrift, legacyAdapterStatus } = classifyQueueDrift({
        runtimeWarnings: input.runtimeWarnings,
        sourceLoaded: driftSourceLoaded,
    });

    let continuityStatus: QueueContinuityStatus = "unknown";
    if (legacyAdapterStatus.blocksContinuity || queueDrift.driftCount > 0) {
        continuityStatus = "broken_drift";
    } else if (schedulerHeartbeat.status === "missing" && dispatchOutcomes.outcomeCount > 0) {
        continuityStatus = "degraded_missing_heartbeat";
    } else if (schedulerHeartbeat.status === "source_missing" || dispatchOutcomes.status === "source_missing") {
        continuityStatus = "unknown";
    } else if (schedulerHeartbeat.status === "missing" && dispatchOutcomes.outcomeCount === 0) {
        continuityStatus = "source_ready_no_sample_loaded";
    } else if (schedulerHeartbeat.status === "observed_current" && dispatchOutcomes.status === "observed_current" && dispatchOutcomes.failedCount === 0) {
        continuityStatus = "healthy_current";
    } else if (schedulerHeartbeat.status === "observed_current" && (dispatchOutcomes.status === "missing" || dispatchOutcomes.status === "observed_stale")) {
        continuityStatus = "degraded_missing_outcomes";
    } else if (schedulerHeartbeat.status === "stale") {
        continuityStatus = "degraded_missing_heartbeat";
    }

    const missingSources = [
        schedulerHeartbeat.status === "missing" || schedulerHeartbeat.status === "source_missing" ? "scheduler_heartbeat" : null,
        dispatchOutcomes.status === "missing" || dispatchOutcomes.status === "source_missing" ? "dispatch_outcomes" : null,
        queueDrift.sourceLoaded ? null : "queue_drift_runtime_warnings",
    ].filter((value): value is string => Boolean(value));

    return {
        generatedAtUtc: input.generatedAtUtc ?? new Date(input.nowMs).toISOString(),
        queueName: input.queueName,
        schedulerHeartbeat,
        dispatchOutcomes,
        runtimeWarnings: {
            warningCount,
            needsReviewCount,
        },
        queueDrift,
        legacyAdapterStatus,
        continuityStatus,
        sourceWindows: {
            heartbeat: schedulerHeartbeat.status === "observed_current" ? "current" : schedulerHeartbeat.status === "stale" ? "stale" : schedulerHeartbeat.status === "source_missing" ? "not_loaded" : "missing",
            outcomes: dispatchOutcomes.sourceWindow,
            queueDrift: queueDrift.sourceLoaded ? "loaded" : "not_loaded",
        },
        missingSources,
        nextAction: explainQueueContinuity(continuityStatus),
        liveStatusAllowed: continuityStatus === "healthy_current",
    };
}
