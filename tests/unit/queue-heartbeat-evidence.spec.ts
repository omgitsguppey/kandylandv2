import { describe, expect, it } from "vitest";

import { buildQueueHeartbeatRecord, QUEUE_HEARTBEAT_INTEGRATION_POINTS } from "@/lib/server/queue-heartbeat";

describe("queue heartbeat evidence", () => {
  it("builds a cadence-aware heartbeat record without writing provider state", () => {
    const heartbeat = buildQueueHeartbeatRecord({
      queueName: "drop_lifecycle",
      jobName: "notify_active_drops",
      heartbeatAtMs: 1_000,
      cadenceMs: 3_600_000,
      status: "completed",
      outcomeCount: 2,
      warningCount: 0,
      source: "unit_contract",
    });

    expect(heartbeat.queueName).toBe("drop_lifecycle");
    expect(heartbeat.jobName).toBe("notify_active_drops");
    expect(heartbeat.cadenceMs).toBe(3_600_000);
    expect(heartbeat.freshnessMs).toBe(0);
    expect(heartbeat.providerWriteInTestsAllowed).toBe(false);
  });

  it("documents scheduler integration points without running jobs", () => {
    expect(QUEUE_HEARTBEAT_INTEGRATION_POINTS).toEqual(expect.arrayContaining([
      "src/lib/server/queue-runtime.ts:processQueueLifecycleRuntime",
      "src/lib/server/queue-runtime.ts:notifyActiveDropsRuntime",
      "functions/src/queue-runtime.ts",
    ]));
  });
});
