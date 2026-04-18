import { readText } from "./agent/shared";
import type { QueueJobHeartbeat, QueueJobId } from "../shared/runtime/runtime-warning-contract";
import { getRuntimeAdminDb } from "./runtime-admin";

const REQUIRED_JOB_IDS: QueueJobId[] = ["process_queue", "notify_active_drops"];

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function verifyStaticSchedulerWiring(input?: {
    indexSource?: string;
    queueRuntimeSource?: string;
}) {
    const indexSource = input?.indexSource ?? readText("functions/src/index.ts");
    const queueRuntimeSource = input?.queueRuntimeSource ?? readText("functions/src/queue-runtime.ts");
    const failures: string[] = [];

    if (!indexSource.includes("export const processQueueLifecycle = onSchedule")) {
        failures.push("functions/src/index.ts is missing the scheduled processQueueLifecycle export.");
    }
    if (!indexSource.includes("export const notifyActiveDropsLifecycle = onSchedule")) {
        failures.push("functions/src/index.ts is missing the scheduled notifyActiveDropsLifecycle export.");
    }
    if (!queueRuntimeSource.includes('jobId: "process_queue"')) {
        failures.push('functions/src/queue-runtime.ts is missing the process_queue heartbeat writer.');
    }
    if (!queueRuntimeSource.includes('jobId: "notify_active_drops"')) {
        failures.push('functions/src/queue-runtime.ts is missing the notify_active_drops heartbeat writer.');
    }
    if (!queueRuntimeSource.includes("recordQueueJobHeartbeat")) {
        failures.push("functions/src/queue-runtime.ts is missing canonical queue heartbeat persistence.");
    }

    return failures;
}

export function evaluateSchedulerFreshness(input: {
    heartbeats: Map<string, QueueJobHeartbeat>;
    now?: number;
    staticWiringFailures?: string[];
}) {
    const now = input.now ?? Date.now();
    const failures: string[] = [];
    const canonicalHeartbeats = new Map<string, QueueJobHeartbeat>(
        Array.from(input.heartbeats.entries()).filter(([, heartbeat]) => heartbeat.executionLayer === "scheduler"),
    );
    const hasAnyLiveHeartbeat = REQUIRED_JOB_IDS.some((jobId) => canonicalHeartbeats.has(jobId));

    if (!hasAnyLiveHeartbeat) {
        failures.push(...(input.staticWiringFailures ?? verifyStaticSchedulerWiring()));
        return failures;
    }

    for (const jobId of REQUIRED_JOB_IDS) {
        const heartbeat = canonicalHeartbeats.get(jobId);
        if (!heartbeat) {
            failures.push(`Missing queue heartbeat for ${jobId}.`);
            continue;
        }
        const staleAfterMs = Number(heartbeat.staleAfterMs) || 0;
        const lastTouch = Number(heartbeat.completedAt) || Number(heartbeat.startedAt) || Number(heartbeat.updatedAt) || 0;
        if (staleAfterMs <= 0) {
            failures.push(`${jobId} is missing staleAfterMs.`);
        }
        if (heartbeat.status === "failed") {
            failures.push(`${jobId} last run failed with ${heartbeat.lastErrorCode || "unknown_error"}.`);
        }
        if (heartbeat.status === "running" && lastTouch > 0 && now - lastTouch > staleAfterMs) {
            failures.push(`${jobId} is stuck in running state beyond staleAfterMs.`);
        }
        if (lastTouch <= 0 || (staleAfterMs > 0 && now - lastTouch > staleAfterMs)) {
            failures.push(`${jobId} heartbeat is stale.`);
        }
    }

    return failures;
}

export async function checkSchedulerFreshness() {
    const adminDb = getRuntimeAdminDb();
    const snapshot = await adminDb.collection("queue_job_heartbeats").get();
    const heartbeats = new Map<string, QueueJobHeartbeat>(
        snapshot.docs.map((doc) => [doc.id, doc.data() as QueueJobHeartbeat]),
    );
    const failures = evaluateSchedulerFreshness({ heartbeats });
    assert(failures.length === 0, failures.join("\n"));
}

if (require.main === module) {
    checkSchedulerFreshness()
        .then(() => console.log("Scheduler freshness check passed."))
        .catch((error) => {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        });
}
