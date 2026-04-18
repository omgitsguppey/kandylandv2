import type { QueueJobHeartbeat, QueueJobId } from "../shared/runtime/runtime-warning-contract";
import { getRuntimeAdminDb } from "./runtime-admin";

const REQUIRED_JOB_IDS: QueueJobId[] = ["process_queue", "notify_active_drops"];

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

export async function checkSchedulerFreshness() {
    const adminDb = getRuntimeAdminDb();
    const snapshot = await adminDb.collection("queue_job_heartbeats").get();
    const heartbeats = new Map<string, QueueJobHeartbeat>(
        snapshot.docs.map((doc) => [doc.id, doc.data() as QueueJobHeartbeat]),
    );
    const now = Date.now();
    const failures: string[] = [];

    for (const jobId of REQUIRED_JOB_IDS) {
        const heartbeat = heartbeats.get(jobId);
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
