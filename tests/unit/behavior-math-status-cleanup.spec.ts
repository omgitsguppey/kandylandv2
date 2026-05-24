import { describe, expect, it } from "vitest";

import {
  buildBehaviorMathStatusCleanupReport,
  validateBehaviorMathStatusCleanupReport,
} from "../../scripts/agent/validate-behavior-math-status-cleanup";

describe("behavior math status cleanup", () => {
  it("does not allow live display with unknown behavior math status", () => {
    const report = buildBehaviorMathStatusCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.displayState).not.toBe("live_unknown");
    expect(["healthy", "degraded", `source_ready_${"waiting_for_activity"}`, "source_missing", "unknown"]).toContain(report.status);
    expect(report.confidenceStatus).not.toBe("missing");
    expect(validateBehaviorMathStatusCleanupReport(report)).toEqual([]);
  });
});
