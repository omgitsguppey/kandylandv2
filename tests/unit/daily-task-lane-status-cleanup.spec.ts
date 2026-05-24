import { describe, expect, it } from "vitest";

import {
  buildDailyTaskLaneStatusCleanupReport,
  validateDailyTaskLaneStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("daily task lane status cleanup", () => {
  it("separates task config health from zero live activity samples", () => {
    const report = buildDailyTaskLaneStatusCleanupReport();

    expect(validateDailyTaskLaneStatusCleanupReport(report)).toEqual([]);
    expect(report.resetStatusAfter).toBe("healthy_current");
    expect(report.guidanceStatusAfter).toBe("healthy_current");
    expect(report.lifecycleStatusAfter).toBe("source_ready_collecting");
    expect(report.rewardLedgerStatusAfter).toBe("source_ready_collecting");
    expect(report.rewardSourceCanBePaidGd).toBe(false);
  });
});
