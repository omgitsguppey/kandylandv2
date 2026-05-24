import type { DispatchOutcomeLane, DispatchOutcomeLike } from "@/lib/debug/dispatch-outcome-lane-status";
import type { LegacyQueueAdapterPolicy } from "@/lib/debug/legacy-queue-adapter-policy";

export type QueueHeartbeatStatus =
    | "observed_current"
    | "missing"
    | "stale"
    | "source_missing"
    | "disabled_or_manual"
    | "unknown";

export type QueueContinuityStatus =
    | "healthy_current"
    | "degraded_missing_heartbeat"
    | "degraded_missing_outcomes"
    | "source_ready_no_sample_loaded"
    | "disabled_manual"
    | "broken_drift"
    | "unknown";

export type QueueHeartbeatLike = {
    jobId?: string | null;
    status?: string | null;
    startedAt?: number | null;
    completedAt?: number | null;
    updatedAt?: number | null;
    staleAfterMs?: number | null;
    warnings?: readonly string[] | null;
};

export type QueueRuntimeWarningLike = {
    code?: string | null;
    status?: string | null;
};

export type QueueRuntimeContinuityInput = {
    generatedAtUtc?: string;
    nowMs: number;
    queueName: string;
    heartbeats: readonly QueueHeartbeatLike[];
    outcomes: readonly DispatchOutcomeLike[];
    runtimeWarnings: readonly QueueRuntimeWarningLike[];
    heartbeatSourceLoaded?: boolean;
    outcomeSourceLoaded?: boolean;
    driftSourceLoaded?: boolean;
    expectedCadenceMs?: number;
    freshnessWindowMs?: number;
};

export type QueueRuntimeContinuity = {
    generatedAtUtc: string;
    queueName: string;
    schedulerHeartbeat: {
        status: QueueHeartbeatStatus;
        lastHeartbeatAtMs: number | null;
        expectedCadenceMs: number;
        freshnessMs: number | null;
        source: "queue_job_heartbeats" | "not_loaded";
    };
    dispatchOutcomes: DispatchOutcomeLane;
    runtimeWarnings: {
        warningCount: number;
        needsReviewCount: number;
    };
    queueDrift: {
        status: "loaded" | "source_missing";
        sourceLoaded: boolean;
        driftCount: number;
        legacyAdapterUsageCount: number;
        missingDispatchOutcomeCount: number;
        blockingDriftCount: number;
    };
    legacyAdapterStatus: LegacyQueueAdapterPolicy;
    continuityStatus: QueueContinuityStatus;
    sourceWindows: {
        heartbeat: "current" | "missing" | "stale" | "not_loaded";
        outcomes: DispatchOutcomeLane["sourceWindow"];
        queueDrift: "loaded" | "not_loaded";
    };
    missingSources: string[];
    nextAction: string;
    liveStatusAllowed: boolean;
};
