import type { DailyTaskDefinition, DailyTasksState } from "@/lib/tasks/task-catalog";
import {
  buildDailyTaskAssignmentPlan,
  buildDailyTaskRewardTotals,
  createDailyTaskDefinitionMap,
  deriveDailyTaskWindowStateFromSnapshot,
  normalizeDailyTaskAssignmentSnapshot,
  normalizeDailyTaskStateSnapshot,
  repairDailyTaskStateMetadata,
  selectStableDailyTaskDefinitions,
  validateDailyTaskRewardTotals,
  type DailyTaskAssignmentSource,
  type DailyTaskEligibilityContext,
  type DailyTaskRewardTotals,
} from "@/lib/tasks/daily-task-assignment-engine";
import { createDailyTaskWindowContract, type DailyTaskWindowContract, type DailyTaskWindowState } from "@/lib/tasks/daily-task-window-contract";

export {
  buildDailyTaskAssignmentPlan,
  buildDailyTaskRewardTotals,
  createDailyTaskDefinitionMap,
  createDailyTaskWindowContract,
  deriveDailyTaskWindowStateFromSnapshot,
  normalizeDailyTaskAssignmentSnapshot,
  normalizeDailyTaskStateSnapshot,
  repairDailyTaskStateMetadata,
  selectStableDailyTaskDefinitions,
  validateDailyTaskRewardTotals,
};

export type {
  DailyTaskAssignmentSource,
  DailyTaskEligibilityContext,
  DailyTaskRewardTotals,
  DailyTaskWindowContract,
  DailyTaskWindowState,
};

export interface DailyTaskRuntimeSnapshotInput {
  uid: string;
  definitions: DailyTaskDefinition[];
  state?: DailyTasksState;
  nowMs: number;
  eligibility: DailyTaskEligibilityContext;
  source?: DailyTaskAssignmentSource;
  repairRequired?: boolean;
}

export function buildDailyTaskRuntimeSnapshot(input: DailyTaskRuntimeSnapshotInput) {
  const definitionMap = createDailyTaskDefinitionMap(input.definitions);
  const window = createDailyTaskWindowContract(input.nowMs);
  const normalizedState = normalizeDailyTaskStateSnapshot(input.state, definitionMap, window, input.nowMs);
  const plan = buildDailyTaskAssignmentPlan({
    uid: input.uid,
    definitions: input.definitions,
    normalizedState,
    nowMs: input.nowMs,
    eligibility: input.eligibility,
    source: input.source ?? "on_demand_backfill",
    repairRequired: input.repairRequired,
  });

  return {
    ...plan,
    definitionMap,
    normalizedState,
    validationIssues: validateDailyTaskRewardTotals({
      assignments: plan.state.tasks,
      totals: plan.rewardTotals,
    }),
  };
}
