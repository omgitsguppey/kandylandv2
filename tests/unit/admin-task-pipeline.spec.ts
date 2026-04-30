import { describe, expect, it } from "vitest";

import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
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
      taskLeaderboard: [],
    });

    expect(model.pipelineMode).toBe("mixed");
    expect(model.lifecycleMetrics.map((metric) => metric.label)).toEqual(["Assigned", "Started", "Completed", "Failed"]);
    expect(model.guidanceMetrics.map((metric) => metric.label)).toEqual(["Reminded", "Guides shown", "Guide taps"]);
    expect(model.startRate).toMatchObject({ value: 0.6, formula: "started / assigned", denominator: "assigned" });
    expect(model.completionRate).toMatchObject({ value: 0.75, formula: "completed / started", denominator: "started" });
    expect(model.failRate.value).toBeCloseTo(5 / 60);
    expect(model.stuckAssignedCount).toBe(40);
    expect(model.startedNotCompletedCount).toBe(15);
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
      taskLeaderboard: [
        {
          taskId: "task-a",
          title: "Watch 2 unlocked files",
          assigned: 1,
          started: 2,
          completed: 3,
          failed: 1,
          rewardTotal: 20,
          avgDurationMs: 1000,
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
  });

  it("prevents fake zeros while the task pipeline is waiting", () => {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "24h",
      loading: true,
      items: [],
      taskLeaderboard: [],
    });

    expect(model.assignedCount.value).toBeNull();
    expect(model.startRate.value).toBeNull();
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.badgeLabel).toBe("WAIT");
  });
});
