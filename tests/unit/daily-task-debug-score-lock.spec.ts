import { describe, expect, it } from "vitest";

import {
  buildDailyTaskDebugScoreLockReport,
  validateDailyTaskDebugScoreLockReport,
} from "../../scripts/agent/validate-daily-task-debug-score-lock";

describe("daily task debug score lock", () => {
  it("locks reset, lifecycle, reward, guidance, metrics, and score evidence", () => {
    const report = buildDailyTaskDebugScoreLockReport({
      now: "2026-05-24T04:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });

    expect(report.resetTruthStatus).toBe("pass");
    expect(report.lifecycleTelemetryStatus).toBe("pass");
    expect(report.durationTrackingStatus).toBe("active_duration_only");
    expect(report.rewardLedgerStatus).toBe("pass");
    expect(report.guidanceRouteStatus).toBe("pass");
    expect(report.taskFailureDebugStatus).toBe("present");
    expect(report.taskPersonMetricsStatus).toBe("present");
    expect(report.taskScoreCoverageStatus).toBe("present");
    expect(report.rewardGdSourceTruth).toBe("reward_gd_only");
    expect(report.duplicateRewardRiskCount).toBe(0);
    expect(report.activeTaskRouteMismatchCount).toBe(0);
    expect(report.scoreDimensions.sourceHealth.target).toBe(80);
    expect(report.nextExactSteps.length).toBeGreaterThan(0);

    expect(validateDailyTaskDebugScoreLockReport(report)).toEqual([]);
  });

  it("fails when task duration falls back to page time or reward source is unsafe", () => {
    const report = buildDailyTaskDebugScoreLockReport({
      now: "2026-05-24T04:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });

    report.durationTrackingStatus = "passive_page_time";
    report.rewardGdSourceTruth = "paid_gd";

    expect(validateDailyTaskDebugScoreLockReport(report)).toEqual(
      expect.arrayContaining([
        "task duration uses page time.",
        "reward GD source incorrect.",
      ]),
    );
  });
});
