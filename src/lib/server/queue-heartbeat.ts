export type QueueHeartbeatRecordStatus =
    | "started"
    | "completed"
    | "skipped"
    | "failed";

export type QueueHeartbeatEvidenceRecord = {
    queueName: string;
    jobName: string;
    heartbeatAtMs: number;
    cadenceMs: number;
    status: QueueHeartbeatRecordStatus;
    outcomeCount: number;
    warningCount: number;
    source: string;
    version: 1;
    freshnessMs: number;
    providerWriteInTestsAllowed: false;
};

export const QUEUE_HEARTBEAT_INTEGRATION_POINTS = [
    "src/lib/server/queue-runtime.ts:processQueueLifecycleRuntime",
    "src/lib/server/queue-runtime.ts:notifyActiveDropsRuntime",
    "functions/src/queue-runtime.ts",
] as const;

export function buildQueueHeartbeatRecord(input: {
    queueName: string;
    jobName: string;
    heartbeatAtMs: number;
    cadenceMs: number;
    status: QueueHeartbeatRecordStatus;
    outcomeCount: number;
    warningCount: number;
    source: string;
    nowMs?: number;
}): QueueHeartbeatEvidenceRecord {
    return {
        queueName: input.queueName,
        jobName: input.jobName,
        heartbeatAtMs: input.heartbeatAtMs,
        cadenceMs: input.cadenceMs,
        status: input.status,
        outcomeCount: Math.max(0, Math.floor(Number(input.outcomeCount) || 0)),
        warningCount: Math.max(0, Math.floor(Number(input.warningCount) || 0)),
        source: input.source,
        version: 1,
        freshnessMs: Math.max(0, (input.nowMs ?? input.heartbeatAtMs) - input.heartbeatAtMs),
        providerWriteInTestsAllowed: false,
    };
}
