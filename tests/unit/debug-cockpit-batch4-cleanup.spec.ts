import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch4CleanupReport,
  validateDebugCockpitBatch4CleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("debug cockpit batch4 cleanup", () => {
  it("locks admin user auth notification and task lane statuses", () => {
    const report = buildDebugCockpitBatch4CleanupReport();

    expect(validateDebugCockpitBatch4CleanupReport(report)).toEqual([]);
    expect(report.emptyLiveLanesAfter).toBe(0);
    expect(report.staleBadgeConflictsAfter).toBe(0);
    expect(report.sourceReadyCollectingLanes).toEqual(expect.arrayContaining([
      "auth_persistence",
      "auth_runtime",
      "notification_permission",
      "push_token_health",
      "daily_task_lifecycle",
      "daily_task_reward_ledger",
    ]));
    expect(report.healthyCurrentLanes).toEqual(expect.arrayContaining([
      "testing_coverage",
      "settings_health",
      "auth_provider_conflict",
      "daily_tasks_reset",
      "daily_task_guidance_health",
    ]));
  });
});
