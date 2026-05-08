import { describe, expect, it } from "vitest";

import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import {
  buildDailyTaskRuntimeSnapshot,
  buildDailyTaskRewardTotals,
  validateDailyTaskRewardTotals,
} from "@/lib/server/daily-task-runtime";
import { normalizeDailyTaskRewardVNext } from "@/lib/tasks/daily-task-reward-contract";

const ELIGIBILITY = {
  hasUnlockedContent: true,
  hasLiveDrops: true,
  hasUnreadNotifications: true,
  hasCheckedInToday: false,
  hasMultiAssetUnlockedContent: true,
  hasRelatedUnlockedDrops: true,
  hasDownloadableUnlockedContent: true,
  hasShareableLiveDrop: true,
};

describe("daily task engine rewrite", () => {
  it("keeps assigned task ids stable across reloads inside the same window", () => {
    const nowMs = 1_777_000_000_000;
    const definitions = BUILT_IN_DAILY_TASKS.slice(0, 8);

    const first = buildDailyTaskRuntimeSnapshot({
      uid: "fan_1",
      definitions,
      nowMs,
      eligibility: ELIGIBILITY,
      source: "on_demand_backfill",
    });

    const second = buildDailyTaskRuntimeSnapshot({
      uid: "fan_1",
      definitions,
      state: first.state,
      nowMs,
      eligibility: ELIGIBILITY,
      source: "on_demand_backfill",
    });

    expect(second.state.tasks.map((task) => task.id)).toEqual(first.state.tasks.map((task) => task.id));
    expect(second.assignedTasks).toEqual([]);
  });

  it("repairs metadata without reselecting active tasks when nextRefresh is malformed", () => {
    const nowMs = 1_777_000_000_000;
    const definitions = BUILT_IN_DAILY_TASKS.slice(0, 8);

    const initial = buildDailyTaskRuntimeSnapshot({
      uid: "fan_2",
      definitions,
      nowMs,
      eligibility: ELIGIBILITY,
      source: "on_demand_backfill",
    });

    const repaired = buildDailyTaskRuntimeSnapshot({
      uid: "fan_2",
      definitions,
      state: {
        ...initial.state,
        nextRefreshMs: 0,
      },
      nowMs,
      eligibility: ELIGIBILITY,
      source: "debug_repair",
      repairRequired: true,
    });

    expect(repaired.state.tasks.map((task) => task.id)).toEqual(initial.state.tasks.map((task) => task.id));
    expect(repaired.assignedTasks).toEqual([]);
    expect(repaired.windowState).toBe("repair_required");
  });

  it("normalizes legacy and custom rewards once and keeps reward totals auditable", () => {
    expect(normalizeDailyTaskRewardVNext({ rawReward: 150, rewardVersion: 2 }).rewardGd).toBe(120);

    const customReward = normalizeDailyTaskRewardVNext({
      rawReward: 5_000,
      rewardVersion: 1,
      rewardTier: "premium",
    });

    expect(customReward.rewardGd).toBe(600);
    expect(customReward.normalizationIssue.length).toBeGreaterThan(0);
  });

  it("computes and validates reward totals for the stable assignment set", () => {
    const nowMs = 1_777_000_000_000;
    const definitions = BUILT_IN_DAILY_TASKS.slice(0, 8);

    const snapshot = buildDailyTaskRuntimeSnapshot({
      uid: "fan_3",
      definitions,
      nowMs,
      eligibility: ELIGIBILITY,
      source: "on_demand_backfill",
    });

    const totals = buildDailyTaskRewardTotals(snapshot.state.tasks);
    expect(totals.assignedRewardTotalGd).toBeGreaterThan(0);
    expect(validateDailyTaskRewardTotals({ assignments: snapshot.state.tasks, totals })).toEqual([]);
  });
});
