import { describe, expect, it } from "vitest";

import {
  buildDailyTaskGuidanceAuditReport,
  buildDailyTaskGuidanceRows,
  buildTaskGuidanceHealthLane,
  isDailyTaskGuidanceActive,
} from "@/lib/tasks/daily-task-guidance-contract";
import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import { validateDailyTaskGuidanceRouteAuditReport } from "../../scripts/agent/validate-daily-task-guidance-route-audit";

describe("daily task guidance route audit", () => {
  it("maps every built-in task to an existing route, feature, telemetry event, and completion signal", () => {
    const rows = buildDailyTaskGuidanceRows(BUILT_IN_DAILY_TASKS);

    expect(rows).toHaveLength(BUILT_IN_DAILY_TASKS.length);
    expect(rows.every((row) => row.targetRouteExists)).toBe(true);
    expect(rows.every((row) => row.featureRegistered)).toBe(true);
    expect(rows.every((row) => row.completionSignalExists)).toBe(true);
    expect(rows.every((row) => row.telemetryEventExists)).toBe(true);
    expect(rows.every((row) => row.personMetricExists)).toBe(true);
    expect(rows.every((row) => row.rewardRuleExists)).toBe(true);
    expect(rows.every((row) => row.currentSiteStatus === "active")).toBe(true);
  });

  it("hides an unavailable task instead of leaving it claimable", () => {
    const [baseTask] = BUILT_IN_DAILY_TASKS;
    const [row] = buildDailyTaskGuidanceRows([
      {
        ...baseTask,
        id: "stale_route_task",
        eventName: "missing_runtime_signal",
        actionType: "open_dashboard",
        ctaLabel: "Open dashboard",
      },
    ]);

    expect(row.currentSiteStatus).toBe("hidden");
    expect(row.fallbackIfRouteMissing).toContain("hidden");
    expect(isDailyTaskGuidanceActive(row)).toBe(false);
  });

  it("summarizes guidance health for admin debug without raw task dumps", () => {
    const report = buildDailyTaskGuidanceAuditReport();
    const lane = buildTaskGuidanceHealthLane(report.rows);

    expect(lane.lane).toBe("Task guidance health");
    expect(lane.activeTasks).toBe(report.summary.activeTasks);
    expect(lane.brokenRoutes).toBe(0);
    expect(lane.missingCompletionSignals).toBe(0);
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
  });

  it("validator rejects broken guidance rows", () => {
    const report = buildDailyTaskGuidanceAuditReport({
      rows: [
        {
          ...buildDailyTaskGuidanceRows(BUILT_IN_DAILY_TASKS.slice(0, 1))[0],
          targetRouteExists: false,
          currentSiteStatus: "active",
        },
      ],
    });

    expect(validateDailyTaskGuidanceRouteAuditReport(report)).toContain("active task points to a missing route.");
  });
});
