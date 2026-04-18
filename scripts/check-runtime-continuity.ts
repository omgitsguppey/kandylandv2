import { readJsonFile } from "./agent/shared";
import { checkQueueRuntime } from "./check-queue-runtime";
import { checkSchedulerFreshness } from "./check-scheduler-freshness";
import { checkWarnings } from "./check-warnings";

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

export async function checkRuntimeContinuity() {
    await checkSchedulerFreshness();
    await checkQueueRuntime();
    await checkWarnings();

    const sqlStatus = readJsonFile<{ healthy: boolean; artifacts: Record<string, { stale: boolean }> }>("agent/state/sql-mirror-status.generated.json");
    assert(sqlStatus.healthy, "Agent SQL mirror status is unhealthy.");
    assert(Object.values(sqlStatus.artifacts).every((artifact) => !artifact.stale), "Agent SQL mirror artifacts are stale.");
}

if (require.main === module) {
    checkRuntimeContinuity()
        .then(() => console.log("Runtime continuity check passed."))
        .catch((error) => {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        });
}
