import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch23QueueContinuityReport,
  validateDebugCockpitBatch23QueueContinuityReport,
} from "@/lib/debug/debug-cockpit-batch23-queue-continuity";

describe("debug cockpit batch23 queue continuity", () => {
  it("locks missing heartbeat cleanup while preserving dispatch outcome readability", () => {
    const report = buildDebugCockpitBatch23QueueContinuityReport();

    expect(report.heartbeatLaneBefore).toBe("unknown");
    expect(report.heartbeatLaneAfter).toBe("missing");
    expect(report.outcomeLaneBefore).toBe("unknown");
    expect(report.outcomeLaneAfter).toBe("observed_current");
    expect(report.continuityStatusAfter).toBe("degraded_missing_heartbeat");
    expect(report.outcomesCount).toBe(40);
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(Object.keys(report.scoreDimensions).length).toBeGreaterThan(0);
    expect(validateDebugCockpitBatch23QueueContinuityReport(report)).toEqual([]);
  });
});
