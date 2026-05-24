import { describe, expect, it } from "vitest";

import { buildQueueRuntimeContinuity } from "@/lib/debug/queue-runtime-continuity-engine";

const NOW_MS = Date.parse("2026-05-24T18:00:00.000Z");

describe("queue runtime continuity", () => {
  it("marks outcomes-only evidence as missing heartbeat continuity, not live", () => {
    const result = buildQueueRuntimeContinuity({
      nowMs: NOW_MS,
      queueName: "drop_lifecycle",
      heartbeats: [],
      outcomes: Array.from({ length: 40 }, (_, index) => ({
        stable_id: `outcome-${index}`,
        status: "sent",
        updatedAt: NOW_MS - 60_000,
      })),
      runtimeWarnings: [],
      driftSourceLoaded: false,
    });

    expect(result.schedulerHeartbeat.status).toBe("missing");
    expect(result.dispatchOutcomes.status).toBe("observed_current");
    expect(result.dispatchOutcomes.outcomeCount).toBe(40);
    expect(result.continuityStatus).toBe("degraded_missing_heartbeat");
    expect(result.liveStatusAllowed).toBe(false);
    expect(result.nextAction).toContain("wire scheduler heartbeat evidence");
  });

  it("does not treat zero drift as healthy when the drift source is not loaded", () => {
    const result = buildQueueRuntimeContinuity({
      nowMs: NOW_MS,
      queueName: "drop_lifecycle",
      heartbeats: [{ jobId: "process_queue", status: "ok", updatedAt: NOW_MS - 60_000, staleAfterMs: 3_600_000 }],
      outcomes: [],
      runtimeWarnings: [],
      driftSourceLoaded: false,
    });

    expect(result.queueDrift.sourceLoaded).toBe(false);
    expect(result.queueDrift.status).toBe("source_missing");
    expect(result.queueDrift.driftCount).toBe(0);
    expect(result.sourceWindows.queueDrift).toBe("not_loaded");
  });
});
