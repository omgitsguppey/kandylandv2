import { createHash } from "node:crypto";

import {
  DAILY_CHECKIN_PINNED_REWARD_OUTSIDE_RANDOM_POOL,
  DAILY_TASK_COOLDOWN_DAYS,
  DAILY_TASK_LIMIT,
  type DailyTaskActionType,
  type DailyTaskAssignment,
  type DailyTaskDefinition,
  type DailyTaskGroup,
  type DailyTasksState,
} from "@/lib/tasks/task-catalog";
import { readTaskTimestampMs } from "@/lib/tasks/task-timestamps";
import {
  createDailyTaskWindowContract,
  getDailyTaskWindowState,
  type DailyTaskAssignmentStatus,
  type DailyTaskWindowContract,
  type DailyTaskWindowState,
} from "@/lib/tasks/daily-task-window-contract";
import {
  normalizeDailyTaskRewardVNext,
} from "@/lib/tasks/daily-task-reward-contract";

export type DailyTaskAssignmentSource = "daily_task_materializer" | "on_demand_backfill" | "debug_repair";
export type DailyTaskReasonCode =
  | "daily_window_started"
  | "daily_window_expired"
  | "on_demand_backfill"
  | "user_ineligible"
  | "catalog_unavailable"
  | "catalog_insufficient_eligible_tasks"
  | "materializer_retry"
  | "debug_repair"
  | "inactivity_policy";
export type DailyTaskRotationReason = "initial" | "window_expired" | "repair";

export interface DailyTaskEligibilityContext {
  hasUnlockedContent: boolean;
  hasLiveDrops: boolean;
  hasUnreadNotifications: boolean;
  hasCheckedInToday: boolean;
  hasMultiAssetUnlockedContent: boolean;
  hasRelatedUnlockedDrops: boolean;
  hasDownloadableUnlockedContent: boolean;
  hasShareableLiveDrop: boolean;
}

export interface DailyTaskRewardTotals {
  assignedRewardTotalGd: number;
  claimableRewardTotalGd: number;
  claimedRewardTotalGd: number;
  expiredRewardTotalGd: number;
  dailyCheckInRewardGd: number;
  totalPotentialFreeGdForWindow: number;
  totalClaimedFreeGdForWindow: number;
}

export interface DailyTaskAssignmentPlan {
  window: DailyTaskWindowContract;
  windowState: DailyTaskWindowState;
  state: DailyTasksState;
  assignedTasks: DailyTaskAssignment[];
  expiredTasks: DailyTaskAssignment[];
  rewardTotals: DailyTaskRewardTotals;
  rotationReason: DailyTaskRotationReason | null;
  reasonCode: DailyTaskReasonCode | null;
  repaired: boolean;
  repairIssues: string[];
  normalizedRewardIssues: string[];
}

const DAILY_TASK_GROUP_PRIORITY: Record<DailyTaskGroup, number> = {
  unwrap: 150,
  watch: 140,
  visit: 125,
  wallet: 105,
  purchase: 95,
  share: 70,
  notifications: 55,
  feedback: 45,
};

const DAILY_TASK_ACTION_PRIORITY: Record<DailyTaskActionType, number> = {
  open_drops: 32,
  open_library: 30,
  open_experiences: 26,
  open_dashboard: 22,
  open_wallet: 18,
  open_notifications: 8,
  enable_notifications: 6,
  give_feedback: 4,
};

const CORE_LOOP_TASK_EVENTS = new Set([
  "daily_checkin_claimed",
  "drop_preview_opened",
  "view_drop_details",
  "unlock_drop_success",
  "viewer_opened",
  "viewer_session_completed",
  "viewer_asset_completed",
  "viewer_asset_consumed",
  "viewer_watch_checkpoint",
  "file_viewed",
]);

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeHistory(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, rawValue]) => Number.isFinite(rawValue))
      .map(([key, rawValue]) => [key, Number(rawValue)] as const),
  );
}

function resolveAssignmentStatus(task: Partial<DailyTaskAssignment>, window: DailyTaskWindowContract): DailyTaskAssignmentStatus {
  const rawStatus = typeof task.status === "string" ? task.status : null;
  if (typeof rawStatus === "string") {
    if (rawStatus === "assigned" || rawStatus === "in_progress" || rawStatus === "completed" || rawStatus === "claimed" || rawStatus === "expired" || rawStatus === "repair_required") {
      return rawStatus;
    }

    if (rawStatus === "backfilled") {
      return "assigned";
    }

    if (rawStatus === "failed" || rawStatus === "skipped") {
      return task.claimed || task.claimedAt ? "expired" : "repair_required";
    }
  }

  if (task.claimed) {
    return "claimed";
  }

  if ((task.progress ?? 0) > 0) {
    return (task.progress ?? 0) >= (task.maxProgress ?? 0) ? "completed" : "in_progress";
  }

  void window;
  return "assigned";
}

function computeTaskPriorityScore(
  task: DailyTaskDefinition,
  history: Record<string, number>,
  nowMs: number,
) {
  const lastCompletedAt = history[task.id] ?? 0;
  const daysSinceCompletion = lastCompletedAt > 0
    ? Math.min(14, Math.floor((nowMs - lastCompletedAt) / (24 * 60 * 60 * 1000)))
    : 10;
  const sourceBonus = task.source === "user"
    ? 26
    : task.source === "global"
      ? 18
      : 0;
  const coreLoopBonus = CORE_LOOP_TASK_EVENTS.has(task.eventName) ? 22 : 0;
  const oneTimeBonus = task.oneTime ? 10 : 0;
  const uniquenessBonus = task.uniqueByParamKey ? 6 : 0;
  const progressPenalty = task.maxProgress > 3 ? (task.maxProgress - 3) * 6 : 0;
  const noisyPenalty = task.group === "notifications"
    ? 10
    : task.group === "feedback"
      ? 18
      : task.group === "share"
        ? 8
        : 0;

  return (
    DAILY_TASK_GROUP_PRIORITY[task.group]
    + DAILY_TASK_ACTION_PRIORITY[task.actionType]
    + sourceBonus
    + coreLoopBonus
    + oneTimeBonus
    + uniquenessBonus
    + Math.min(task.reward, 220)
    + daysSinceCompletion
    - progressPenalty
    - noisyPenalty
  );
}

function buildDeterministicTaskTieBreaker(uid: string, dailyTaskWindowId: string, taskId: string) {
  const digest = createHash("sha256")
    .update(`${uid}:${dailyTaskWindowId}:daily_task_assignment_v2:${taskId}`)
    .digest("hex");
  const seedFragment = digest.slice(0, 8);
  const parsed = Number.parseInt(seedFragment, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rankTasksForWindow(
  tasks: DailyTaskDefinition[],
  history: Record<string, number>,
  nowMs: number,
  uid: string,
  dailyTaskWindowId: string,
) {
  return tasks
    .map((task) => ({
      task,
      score: computeTaskPriorityScore(task, history, nowMs),
      tieBreaker: buildDeterministicTaskTieBreaker(uid, dailyTaskWindowId, task.id),
    }))
    .sort((left, right) => right.score - left.score || right.tieBreaker - left.tieBreaker)
    .map((entry) => entry.task);
}

function getCooldownMs(task: DailyTaskDefinition): number {
  const days = task.cooldownDays ?? DAILY_TASK_COOLDOWN_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

function buildTaskPool(
  definitions: DailyTaskDefinition[],
  history: Record<string, number>,
  nowMs: number,
  uid: string,
  dailyTaskWindowId: string,
  retiredTaskIds: string[],
  eligibility: DailyTaskEligibilityContext,
) {
  const retired = new Set(retiredTaskIds);
  const pool = definitions.filter((task) => {
    if (retired.has(task.id)) {
      return false;
    }

    if (task.oneTime && (history[task.id] ?? 0) > 0) {
      return false;
    }

    if (DAILY_CHECKIN_PINNED_REWARD_OUTSIDE_RANDOM_POOL && task.id === "check_in_today") {
      return false;
    }

    if (task.eventName === "daily_checkin_claimed" && eligibility.hasCheckedInToday) {
      return false;
    }

    const requiresUnlockedContent = task.eventName === "viewer_opened"
      || task.eventName === "viewer_session_completed"
      || task.eventName === "viewer_asset_completed"
      || task.eventName === "viewer_asset_consumed"
      || task.eventName === "viewer_watch_checkpoint"
      || task.eventName === "file_viewed"
      || task.eventName === "viewer_source_downloaded"
      || task.eventName === "viewer_related_drop_clicked";

    if (requiresUnlockedContent && !eligibility.hasUnlockedContent) {
      return false;
    }

    if (task.eventName === "drop_preview_opened" && !eligibility.hasLiveDrops) {
      return false;
    }

    if (task.eventName === "view_drop_details" && !eligibility.hasLiveDrops) {
      return false;
    }

    if (task.eventName === "viewer_source_downloaded" && !eligibility.hasDownloadableUnlockedContent) {
      return false;
    }

    if (task.eventName === "viewer_related_drop_clicked" && !eligibility.hasRelatedUnlockedDrops) {
      return false;
    }

    if (task.eventName === "viewer_watch_checkpoint" && !eligibility.hasUnlockedContent) {
      return false;
    }

    if (task.eventName === "viewer_asset_completed" && !eligibility.hasMultiAssetUnlockedContent) {
      return false;
    }

    if (task.eventName === "drop_share_copied" && !eligibility.hasShareableLiveDrop) {
      return false;
    }

    if (task.cooldownDays && (history[task.id] ?? 0) > 0) {
      const lastCompletedAt = history[task.id] ?? 0;
      if (nowMs - lastCompletedAt < getCooldownMs(task)) {
        return false;
      }
    }

    return true;
  });

  return rankTasksForWindow(pool, history, nowMs, uid, dailyTaskWindowId);
}

export function createDailyTaskDefinitionMap(definitions: DailyTaskDefinition[]) {
  return new Map(definitions.map((task) => [task.id, task]));
}

export function normalizeDailyTaskAssignmentSnapshot(
  rawTask: unknown,
  definitions: Map<string, DailyTaskDefinition>,
  window: DailyTaskWindowContract,
  nowMs: number,
): DailyTaskAssignment | null {
  if (!rawTask || typeof rawTask !== "object" || Array.isArray(rawTask)) {
    return null;
  }

  const source = rawTask as Record<string, unknown>;
  const id = typeof source.id === "string" ? source.id.trim() : "";
  if (!id) {
    return null;
  }

  const definition = definitions.get(id);
  if (!definition) {
    return null;
  }

  const progress = Math.max(0, Math.min(Number.isFinite(source.progress) ? Number(source.progress) : 0, definition.maxProgress));
  const claimed = source.claimed === true;
  const claimedAt = Number.isFinite(source.claimedAt) ? Number(source.claimedAt) : undefined;
  const assignedAt = Number.isFinite(source.assignedAt) ? Number(source.assignedAt) : nowMs;
  const startedAt = Number.isFinite(source.startedAt) ? Number(source.startedAt) : (progress > 0 ? assignedAt : undefined);

  return {
    ...definition,
    progress,
    claimed,
    progressKeys: normalizeStringArray(source.progressKeys),
    assignedAt,
    startedAt,
    claimedAt,
    dailyTaskWindowId: typeof source.dailyTaskWindowId === "string" ? source.dailyTaskWindowId : undefined,
    expiresAtUtc: typeof source.expiresAtUtc === "string" ? source.expiresAtUtc : window.windowEndAtUtc,
    status: resolveAssignmentStatus({
      status: typeof source.status === "string" ? source.status as DailyTaskAssignmentStatus : undefined,
      claimed,
      claimedAt,
      progress,
      maxProgress: definition.maxProgress,
      expiresAtUtc: typeof source.expiresAtUtc === "string" ? source.expiresAtUtc : window.windowEndAtUtc,
    }, window),
    reasonCode: typeof source.reasonCode === "string" ? source.reasonCode as DailyTaskAssignment["reasonCode"] : undefined,
    assignmentSource: typeof source.assignmentSource === "string" ? source.assignmentSource as DailyTaskAssignment["assignmentSource"] : undefined,
    uniqueByParamKey: typeof source.uniqueByParamKey === "string" ? source.uniqueByParamKey : definition.uniqueByParamKey,
    cooldownDays: Number.isFinite(source.cooldownDays) ? Number(source.cooldownDays) : definition.cooldownDays,
    rewardVersion: Number.isFinite(source.rewardVersion) ? Number(source.rewardVersion) : definition.rewardVersion,
    criteria: source.criteria as DailyTaskDefinition["criteria"],
  };
}

export function normalizeDailyTaskStateSnapshot(
  currentState: DailyTasksState | undefined,
  definitions: Map<string, DailyTaskDefinition>,
  window: DailyTaskWindowContract,
  nowMs: number,
) {
  const tasks = Array.isArray(currentState?.tasks)
    ? currentState.tasks
      .map((task) => normalizeDailyTaskAssignmentSnapshot(task, definitions, window, nowMs))
      .filter((task): task is DailyTaskAssignment => Boolean(task))
    : [];

  const hasAssignments = tasks.length > 0;
  const allClaimed = hasAssignments && tasks.every((task) => task.claimed === true || task.status === "claimed");

  return {
    lastResetMs: readTaskTimestampMs(currentState?.lastResetMs),
    nextRefreshMs: readTaskTimestampMs(currentState?.nextRefreshMs),
    tasks,
    dailyTaskWindowId: typeof currentState?.dailyTaskWindowId === "string" ? currentState.dailyTaskWindowId : undefined,
    windowStartAtUtc: typeof currentState?.windowStartAtUtc === "string" ? currentState.windowStartAtUtc : undefined,
    windowEndAtUtc: typeof currentState?.windowEndAtUtc === "string" ? currentState.windowEndAtUtc : undefined,
    resetAtUtc: typeof currentState?.resetAtUtc === "string" ? currentState.resetAtUtc : undefined,
    assignedAtUtc: typeof currentState?.assignedAtUtc === "string" ? currentState.assignedAtUtc : undefined,
    expiresAtUtc: typeof currentState?.expiresAtUtc === "string" ? currentState.expiresAtUtc : undefined,
    source: typeof currentState?.source === "string" ? currentState.source as DailyTasksState["source"] : undefined,
    schemaVersion: Number.isFinite(currentState?.schemaVersion) ? Number(currentState?.schemaVersion) : undefined,
    idempotencyKey: typeof currentState?.idempotencyKey === "string" ? currentState.idempotencyKey : undefined,
    retiredTaskIds: normalizeStringArray(currentState?.retiredTaskIds),
    completedTaskHistory: normalizeHistory(currentState?.completedTaskHistory),
    lastProgressAt: readTaskTimestampMs(currentState?.lastProgressAt),
    lastDeadlineReminderAt: readTaskTimestampMs(currentState?.lastDeadlineReminderAt),
    windowState: currentState?.windowState,
    hasAssignments,
    allClaimed,
  };
}

export function deriveDailyTaskWindowStateFromSnapshot(input: {
  nowMs: number;
  window: DailyTaskWindowContract;
  hasAssignments: boolean;
  allClaimed: boolean;
  repairRequired?: boolean;
}): DailyTaskWindowState {
  return getDailyTaskWindowState(input);
}

export function repairDailyTaskStateMetadata(input: {
  state: DailyTasksState;
  window: DailyTaskWindowContract;
  nowMs: number;
  source: DailyTaskAssignmentSource;
  idempotencyKey?: string;
  repairRequired?: boolean;
}): DailyTasksState {
  const nextRefreshMs = input.window.windowEndMs;
  const hasAssignments = input.state.tasks.length > 0;
  const allClaimed = hasAssignments && input.state.tasks.every((task) => task.claimed);
  const windowState = deriveDailyTaskWindowStateFromSnapshot({
    nowMs: input.nowMs,
    window: input.window,
    hasAssignments,
    allClaimed,
    repairRequired: input.repairRequired,
  });

  return {
    ...input.state,
    lastResetMs: input.state.lastResetMs > 0 ? input.state.lastResetMs : input.window.windowStartMs,
    nextRefreshMs,
    dailyTaskWindowId: input.window.dailyTaskWindowId,
    windowStartAtUtc: input.state.windowStartAtUtc || input.window.windowStartAtUtc,
    windowEndAtUtc: input.window.windowEndAtUtc,
    resetAtUtc: input.state.resetAtUtc || input.window.resetAtUtc,
    assignedAtUtc: input.state.assignedAtUtc || new Date(input.window.windowStartMs).toISOString(),
    expiresAtUtc: input.window.windowEndAtUtc,
    source: input.state.source || input.source,
    schemaVersion: input.state.schemaVersion || 3,
    idempotencyKey: input.idempotencyKey || input.state.idempotencyKey || `daily_tasks:${input.window.dailyTaskWindowId}`,
    windowState,
  };
}

export function hydrateDailyTaskAssignment(
  definition: DailyTaskDefinition,
  nowMs: number,
  window: DailyTaskWindowContract,
  source: DailyTaskAssignmentSource,
  reasonCode: DailyTaskReasonCode,
  status: DailyTaskAssignmentStatus = source === "on_demand_backfill" ? "assigned" : "assigned",
): DailyTaskAssignment {
  const normalizedReward = normalizeDailyTaskRewardVNext({
    rawReward: definition.reward,
    rewardVersion: definition.rewardVersion,
    rewardTier: definition.rewardTier,
  });

  return {
    ...definition,
    reward: normalizedReward.rewardGd,
    rewardTier: normalizedReward.rewardTier,
    rewardVersion: normalizedReward.rewardVersion,
    minRewardGd: normalizedReward.minRewardGd,
    maxRewardGd: normalizedReward.maxRewardGd,
    rewardSource: normalizedReward.rewardSource,
    payoutPolicy: definition.payoutPolicy,
    repeatPolicy: definition.repeatPolicy,
    economyRisk: normalizedReward.economyRisk,
    progress: 0,
    claimed: false,
    progressKeys: [],
    assignedAt: nowMs,
    dailyTaskWindowId: window.dailyTaskWindowId,
    expiresAtUtc: window.windowEndAtUtc,
    status,
    reasonCode,
    assignmentSource: source,
  };
}

export function buildDailyTaskRewardTotals(assignments: DailyTaskAssignment[]): DailyTaskRewardTotals {
  const assignedRewardTotalGd = assignments.reduce((sum, task) => sum + Math.max(0, task.reward || 0), 0);
  const claimedRewardTotalGd = assignments.reduce((sum, task) => sum + ((task.status === "claimed" || task.claimed) ? Math.max(0, task.reward || 0) : 0), 0);
  const expiredRewardTotalGd = assignments.reduce((sum, task) => sum + (task.status === "expired" ? Math.max(0, task.reward || 0) : 0), 0);
  const dailyCheckInTask = assignments.find((task) => task.id === "check_in_today");
  const dailyCheckInRewardGd = DAILY_CHECKIN_PINNED_REWARD_OUTSIDE_RANDOM_POOL ? Math.max(0, dailyCheckInTask?.reward ?? 0) : 0;
  const claimableRewardTotalGd = assignments.reduce((sum, task) => sum + (task.status === "completed" && !task.claimed ? Math.max(0, task.reward || 0) : 0), 0);

  return {
    assignedRewardTotalGd,
    claimableRewardTotalGd,
    claimedRewardTotalGd,
    expiredRewardTotalGd,
    dailyCheckInRewardGd,
    totalPotentialFreeGdForWindow: assignedRewardTotalGd + dailyCheckInRewardGd,
    totalClaimedFreeGdForWindow: claimedRewardTotalGd,
  };
}

export function validateDailyTaskRewardTotals(input: {
  assignments: DailyTaskAssignment[];
  totals: DailyTaskRewardTotals;
}) {
  const issues: string[] = [];
  const taskIds = input.assignments.map((task) => task.id);
  const uniqueTaskIds = new Set(taskIds);
  if (uniqueTaskIds.size !== taskIds.length) {
    issues.push("duplicate_task_ids");
  }

  const expectedAssignedTotal = input.assignments.reduce((sum, task) => sum + Math.max(0, task.reward || 0), 0);
  if (expectedAssignedTotal !== input.totals.assignedRewardTotalGd) {
    issues.push("assigned_total_mismatch");
  }

  const expectedClaimedTotal = input.assignments.reduce((sum, task) => sum + ((task.status === "claimed" || task.claimed) ? Math.max(0, task.reward || 0) : 0), 0);
  if (expectedClaimedTotal !== input.totals.claimedRewardTotalGd) {
    issues.push("claimed_total_mismatch");
  }

  if (DAILY_CHECKIN_PINNED_REWARD_OUTSIDE_RANDOM_POOL) {
    const checkInAssignments = input.assignments.filter((task) => task.id === "check_in_today");
    if (checkInAssignments.length > 1) {
      issues.push("checkin_reward_duplicated");
    }
  }

  return issues;
}

export function selectStableDailyTaskDefinitions(input: {
  definitions: DailyTaskDefinition[];
  history: Record<string, number>;
  nowMs: number;
  uid: string;
  dailyTaskWindowId: string;
  retiredTaskIds: string[];
  eligibility: DailyTaskEligibilityContext;
}) {
  const selected = buildTaskPool(
    input.definitions,
    input.history,
    input.nowMs,
    input.uid,
    input.dailyTaskWindowId,
    input.retiredTaskIds,
    input.eligibility,
  );

  return selected.slice(0, DAILY_TASK_LIMIT);
}

export function buildDailyTaskAssignmentPlan(input: {
  uid: string;
  definitions: DailyTaskDefinition[];
  normalizedState: ReturnType<typeof normalizeDailyTaskStateSnapshot>;
  nowMs: number;
  eligibility: DailyTaskEligibilityContext;
  source: DailyTaskAssignmentSource;
  repairRequired?: boolean;
}): DailyTaskAssignmentPlan {
  const window = createDailyTaskWindowContract(input.nowMs);
  const currentWindowId = input.normalizedState.dailyTaskWindowId;
  const hasCurrentWindowAssignments = Boolean(
    currentWindowId === window.dailyTaskWindowId && input.normalizedState.tasks.length > 0,
  );
  const repairIssues: string[] = [];
  const normalizedRewardIssues: string[] = [];
  if (input.repairRequired === true) {
    const state = repairDailyTaskStateMetadata({
      state: {
        ...input.normalizedState,
        tasks: input.normalizedState.tasks.map((task) => ({
          ...task,
          status: task.status === "claimed" || task.claimed ? "claimed" : task.status === "completed" ? "completed" : task.progress > 0 ? "in_progress" : "assigned",
        })),
        windowState: input.normalizedState.windowState,
      } as DailyTasksState,
      window,
      nowMs: input.nowMs,
      source: input.source,
      idempotencyKey: `daily_tasks:${input.uid}:${window.dailyTaskWindowId}`,
      repairRequired: input.repairRequired,
    });
    const totals = buildDailyTaskRewardTotals(state.tasks);
    return {
      window,
      windowState: state.windowState as DailyTaskWindowState,
      state,
      assignedTasks: [],
      expiredTasks: [],
      rewardTotals: totals,
      rotationReason: input.repairRequired ? "repair" : null,
      reasonCode: input.repairRequired ? "debug_repair" : null,
      repaired: true,
      repairIssues,
      normalizedRewardIssues,
    };
  }

  if (hasCurrentWindowAssignments) {
    const state = repairDailyTaskStateMetadata({
      state: {
        ...input.normalizedState,
        tasks: input.normalizedState.tasks.map((task) => ({
          ...task,
          status: task.status === "claimed" || task.claimed ? "claimed" : task.status === "completed" ? "completed" : task.progress > 0 ? "in_progress" : "assigned",
        })),
        windowState: input.normalizedState.windowState,
      } as DailyTasksState,
      window,
      nowMs: input.nowMs,
      source: input.source,
      idempotencyKey: `daily_tasks:${input.uid}:${window.dailyTaskWindowId}`,
      repairRequired: false,
    });
    const totals = buildDailyTaskRewardTotals(state.tasks);
    return {
      window,
      windowState: state.windowState as DailyTaskWindowState,
      state,
      assignedTasks: [],
      expiredTasks: [],
      rewardTotals: totals,
      rotationReason: null,
      reasonCode: null,
      repaired: false,
      repairIssues,
      normalizedRewardIssues,
    };
  }

  const selectedDefinitions = selectStableDailyTaskDefinitions({
    definitions: input.definitions,
    history: input.normalizedState.completedTaskHistory ?? {},
    nowMs: input.nowMs,
    uid: input.uid,
    dailyTaskWindowId: window.dailyTaskWindowId,
    retiredTaskIds: input.normalizedState.retiredTaskIds ?? [],
    eligibility: input.eligibility,
  });

  const assignedTasks = selectedDefinitions.map((definition) =>
    hydrateDailyTaskAssignment(
      definition,
      input.nowMs,
      window,
      input.source,
      selectedDefinitions.length < DAILY_TASK_LIMIT ? "catalog_insufficient_eligible_tasks" : "daily_window_started",
      "assigned",
    ));

  const expiredTasks = input.normalizedState.tasks.filter((task) => !task.claimed && input.normalizedState.dailyTaskWindowId && input.normalizedState.dailyTaskWindowId !== window.dailyTaskWindowId);
  const state: DailyTasksState = {
    lastResetMs: input.nowMs,
    nextRefreshMs: window.windowEndMs,
    tasks: assignedTasks,
    dailyTaskWindowId: window.dailyTaskWindowId,
    windowStartAtUtc: window.windowStartAtUtc,
    windowEndAtUtc: window.windowEndAtUtc,
    resetAtUtc: window.resetAtUtc,
    assignedAtUtc: new Date(input.nowMs).toISOString(),
    expiresAtUtc: window.windowEndAtUtc,
    source: input.source,
    schemaVersion: 3,
    idempotencyKey: `daily_tasks:${input.uid}:${window.dailyTaskWindowId}`,
    completedTaskHistory: input.normalizedState.completedTaskHistory ?? {},
    retiredTaskIds: input.normalizedState.retiredTaskIds ?? [],
    lastProgressAt: input.nowMs,
    lastDeadlineReminderAt: input.normalizedState.lastDeadlineReminderAt ?? 0,
    windowState: getDailyTaskWindowState({
      nowMs: input.nowMs,
      window,
      hasAssignments: assignedTasks.length > 0,
      allClaimed: assignedTasks.every((task) => task.claimed),
    }),
  };
  const totals = buildDailyTaskRewardTotals(assignedTasks);
  return {
    window,
    windowState: state.windowState as DailyTaskWindowState,
    state,
    assignedTasks,
    expiredTasks,
    rewardTotals: totals,
    rotationReason: "initial",
    reasonCode: selectedDefinitions.length < DAILY_TASK_LIMIT ? "catalog_insufficient_eligible_tasks" : "daily_window_started",
    repaired: false,
    repairIssues,
    normalizedRewardIssues,
  };
}
