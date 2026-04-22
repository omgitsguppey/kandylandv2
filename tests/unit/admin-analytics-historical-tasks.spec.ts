import { describe, expect, it } from "vitest";

import { buildHistoricalTaskAnalytics } from "@/lib/server/admin-analytics-historical-tasks";

describe("buildHistoricalTaskAnalytics", () => {
  it("keeps failed durations out of completion-speed averages", () => {
    const result = buildHistoricalTaskAnalytics({
      eventsData: {},
      normalizedTaskEvents: [
        {
          id: "assigned_1",
          type: "assigned",
          taskId: "task_alpha",
          title: "Task Alpha",
          triggerEvent: "dashboard_viewed",
          userId: "user_1",
          reward: 0,
          progress: 0,
          maxProgress: 1,
          timestamp: 1_000,
        },
        {
          id: "completed_1",
          type: "completed",
          taskId: "task_alpha",
          title: "Task Alpha",
          triggerEvent: "dashboard_viewed",
          userId: "user_1",
          reward: 50,
          progress: 1,
          maxProgress: 1,
          timestamp: 2_000,
          durationMs: 60_000,
        },
        {
          id: "failed_1",
          type: "failed",
          taskId: "task_alpha",
          title: "Task Alpha",
          triggerEvent: "daily_task_reset_due_inactivity",
          userId: "user_2",
          reward: 0,
          progress: 0,
          maxProgress: 1,
          timestamp: 3_000,
          durationMs: 600_000,
        },
      ],
    });

    expect(result.taskLeaderboard).toEqual([
      expect.objectContaining({
        taskId: "task_alpha",
        completed: 1,
        failed: 1,
        avgDurationMs: 60_000,
      }),
    ]);
    expect(result.taskDurationBuckets).toEqual([
      { label: "<1m", count: 1 },
      { label: "1-5m", count: 0 },
      { label: "5-15m", count: 0 },
      { label: "15-60m", count: 0 },
      { label: "60m+", count: 0 },
    ]);
  });
});
