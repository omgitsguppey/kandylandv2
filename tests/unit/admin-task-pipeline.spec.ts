import { describe, expect, it } from "vitest";

import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
import { BUILT_IN_DAILY_TASK_MAP } from "@/lib/tasks/task-catalog";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function response(): HistoricalAnalyticsResponse {
  return { success: true, cacheState: "fresh" } as HistoricalAnalyticsResponse;
}

describe("buildAdminTaskPipelineModel", () => {
  it("separates lifecycle states from guidance signals and exposes rates", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "30d",
      response: response(),
      loading: false,
      overviewTruthState: "live",
      items: [
        { label: "Assigned", count: 100 },
        { label: "Guides shown", count: 900 },
        { label: "Guide taps", count: 80 },
        { label: "Started", count: 60 },
        { label: "Completed", count: 45 },
        { label: "Failed", count: 5 },
        { label: "Reminders", count: 10 },
      ],
      taskDurationBuckets: [
        { label: "<1m", count: 30 },
        { label: "1-5m", count: 10 },
        { label: "5-15m", count: 5 },
        { label: "15-60m", count: 0 },
        { label: "60m+", count: 0 },
      ],
      taskLeaderboard: [],
    });

    expect(model.pipelineMode).toBe("mixed");
    expect(model.lifecycleMetrics.map((metric) => metric.label)).toEqual(["Assigned", "Started", "Completed", "Failed"]);
    expect(model.guidanceMetrics.map((metric) => metric.label)).toEqual(["Reminded", "Guides shown", "Guide taps"]);
    expect(model.startRate).toMatchObject({ value: 0.6, formula: "started / assigned", denominator: "assigned" });
    expect(model.completionRate).toMatchObject({ value: 0.75, formula: "completed / started", denominator: "started" });
    expect(model.failRate).toMatchObject({ value: 0.05, formula: "failed / assigned", denominator: "assigned" });
    expect(model.rates).toMatchObject({
      startFromAssignedPct: 0.6,
      completionFromStartedPct: 0.75,
      completionFromAssignedPct: 0.45,
      failureFromAssignedPct: 0.05,
      failureAfterStartPct: null,
    });
    expect(model.stuckAssignedCount).toBe(40);
    expect(model.startedNotCompletedCount).toBe(15);
    expect(model.guidanceTelemetryState).toBe("available");
    expect(model.completionSpeedConsolidated).toBe(true);
    expect(model.standaloneTaskCompletionSpeedRemoved).toBe(true);
    expect(model.totalCompletedCount).toBe(45);
    expect(model.timedCompletionCount).toBe(45);
    expect(model.timingCoveragePercent).toBe(1);
    expect(model.speedBuckets.reduce((total, bucket) => total + (bucket.count ?? 0), 0)).toBe(45);
  });

  it("flags orphan lifecycle aggregates and per-task mismatches", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "7d",
      response: response(),
      loading: false,
      overviewTruthState: "live",
      items: [
        { label: "Assigned", count: 10 },
        { label: "Started", count: 12 },
        { label: "Completed", count: 15 },
        { label: "Failed", count: 1 },
      ],
      taskDurationBuckets: [
        { label: "<1m", count: 8 },
        { label: "1-5m", count: 2 },
      ],
      taskLeaderboard: [
        {
          taskId: "task-a",
          title: "Legacy unmatched task",
          assigned: 1,
          started: 2,
          completed: 3,
          failed: 3,
          rewardTotal: 20,
          avgDurationMs: 1000,
          timedCompletionCount: 2,
          completionRate: 3,
        },
      ],
    });

    expect(model.orphanStartedCount).toBe(2);
    expect(model.orphanCompletedCount).toBe(3);
    expect(model.telemetryStateMismatchCount).toBe(5);
    expect(model.topLeakingStage).toBe("completed_without_start");
    expect(model.perTaskBreakdown[0]).toMatchObject({
      taskId: "task-a",
      mismatches: 2,
    });
    expect(model.taskLeaderboardConsolidated).toBe(true);
    expect(model.standaloneTaskLeaderboardRemoved).toBe(true);
    expect(model.leaderboardMode).toBe("completions");
    expect(model.taskLeaderboardRows[0]).toMatchObject({
      taskId: "task-a",
      completionRateFormula: "completed / assigned",
      startedCompletionRateFormula: "completed / started",
      rewardFormula: "completed * catalog reward",
    });
    expect(model.taskLeaderboardRows[0].mismatches).toContain("failed_exceeds_started");
    expect(model.taskLeaderboardRows[0].mismatches).toContain("catalog_reward_unavailable");
    expect(model.rewardMismatchCount).toBe(1);
    expect(model.lifecycleMismatchCount).toBe(1);
    expect(model.leaderboardPipelineDelta).toBe(-12);
    expect(model.checks.pipelineDeltaExplanation).toContain("leaderboard completed total minus pipeline completed total");
    expect(model.speedBucketReconciliationDelta).toBe(5);
    expect(model.missingStartTimestampCount).toBe(5);
  });

  it("prevents fake zeros while the task pipeline is waiting", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "24h",
      loading: true,
      items: [],
      taskDurationBuckets: [],
      taskLeaderboard: [],
    });

    expect(model.assignedCount.value).toBeNull();
    expect(model.startRate.value).toBeNull();
    expect(model.timedCompletionCount).toBeNull();
    expect(model.avgCompletionSeconds).toBeNull();
    expect(model.taskLeaderboardRows).toEqual([]);
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.badgeLabel).toBe("WAIT");
    expect(model.generatedAtUtc).toBeNull();
  });

  it("keeps timing partial when only some completions have linked durations", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "30d",
      response: response(),
      loading: false,
      overviewTruthState: "live",
      items: [
        { label: "Assigned", count: 20 },
        { label: "Started", count: 18 },
        { label: "Completed", count: 10 },
        { label: "Failed", count: 1 },
      ],
      taskDurationBuckets: [
        { label: "<1m", count: 4 },
        { label: "1-5m", count: 2 },
        { label: "5-15m", count: 1 },
        { label: "15-60m", count: 0 },
        { label: "60m+", count: 0 },
      ],
      taskLeaderboard: [],
    });

    expect(model.totalCompletedCount).toBe(10);
    expect(model.timedCompletionCount).toBe(7);
    expect(model.timingCoveragePercent).toBe(0.7);
    expect(model.speedBucketReconciliationDelta).toBe(3);
    expect(model.durationRejectedCount).toBe(3);
    expect(model.timingRecommendation).toContain("Timing partial");
    expect(model.speedSource).toBe("linked task lifecycle duration buckets");
  });

  it("verifies built-in leaderboard reward math and timing coverage", () => {
    const openDashboardReward = BUILT_IN_DAILY_TASK_MAP.open_dashboard.reward;
    const model = buildAdminTaskPipelineModel({
      selectedRange: "30d",
      response: response(),
      loading: false,
      overviewTruthState: "live",
      items: [
        { label: "Assigned", count: 10 },
        { label: "Started", count: 8 },
        { label: "Completed", count: 4 },
        { label: "Failed", count: 1 },
      ],
      taskDurationBuckets: [
        { label: "<1m", count: 3 },
        { label: "1-5m", count: 1 },
      ],
      taskLeaderboard: [
        {
          taskId: "open_dashboard",
          title: "Open your dashboard",
          assigned: 10,
          started: 8,
          completed: 4,
          failed: 1,
          rewardTotal: 4 * openDashboardReward,
          avgDurationMs: 30_000,
          timedCompletionCount: 3,
          completionRate: 0.4,
        },
      ],
    });

    expect(model.taskLeaderboardRows[0]).toMatchObject({
      rewardVerified: true,
      rewardTotal: 4 * openDashboardReward,
      rewardPerCompletion: openDashboardReward,
      rewardReconciliationDelta: 0,
      timingCoveragePercent: 0.75,
      startedCompletionRate: 0.5,
    });
    expect(model.taskLeaderboardRows[0].avgCompletionTime).toBe(30);
    expect(model.timingPartialCount).toBe(1);
    expect(model.speedTimingDelta).toBe(-1);
  });

  it("does not render a fail rate above 100 percent when failures exceed starts", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "7d",
      response: response(),
      loading: false,
      overviewTruthState: "stale",
      items: [
        { label: "Assigned", count: 2142 },
        { label: "Started", count: 342 },
        { label: "Completed", count: 304 },
        { label: "Failed", count: 634 },
        { label: "Guides shown", count: 0 },
        { label: "Guide taps", count: 0 },
      ],
      taskDurationBuckets: [],
      taskLeaderboard: [],
    });

    expect(model.rates.failureFromAssignedPct).toBeCloseTo(634 / 2142);
    expect(model.rates.failureAfterStartPct).toBeNull();
    expect(model.guidanceTelemetryState).toBe("missing");
    expect(model.guidanceTelemetryExplanation).toContain("Task guidance telemetry is missing");
    expect(model.stuckAssignedBreakdown.explanation).toContain("does not separate");
  });
});
