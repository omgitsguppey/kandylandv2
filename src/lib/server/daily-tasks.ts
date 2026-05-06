import "server-only";

import { FieldPath, FieldValue, type Transaction } from "firebase-admin/firestore";

import { normalizeNotificationDoc } from "@/lib/notification-contracts";
import { buildNotificationRecord } from "@/lib/notification-contracts";
import { randomBytes } from "node:crypto";
import { adminDb } from "@/lib/server/firebase-admin";
import { hasUnreadNotificationsForUser, isUnreadNotificationForUser } from "@/lib/server/notification-inbox";
import { getDropAssetCount } from "@/lib/drop-presentation";
import {
  BUILT_IN_DAILY_TASKS,
  DAILY_TASK_COOLDOWN_DAYS,
  DAILY_TASK_LIMIT,
  DAILY_TASK_REWARD_VERSION,
  isRetiredLegacyDailyTaskId,
  resolveLegacyDailyTaskId,
  type DailyTaskActionType,
  type DailyTaskAssignment,
  type DailyTaskCriteria,
  type DailyTaskDefinition,
  type DailyTaskGroup,
  type DailyTaskIconName,
  type DailyTasksState,
  buildDailyTaskRewardContract,
  resolveDailyTaskReward,
} from "@/lib/tasks/task-catalog";
import { readTaskTimestampMs } from "@/lib/tasks/task-timestamps";
import { isDropActiveNow } from "@/lib/drop-status";
import { getCSTDateKey, getCSTDayBoundaries, isSameCSTDay } from "@/lib/timezone";
import {
  buildSourceAwareBalancePatch,
  computeNextGumdropBalance,
  creditSourceAwareGumdrops,
  readSourceAwareBalance,
} from "@/lib/gumdrop-ledger";
import type { UserProfile } from "@/types/db";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";

const TASK_DEFINITION_COLLECTION = "daily_task_definitions";
const TASK_EVENT_COLLECTION = "daily_task_events";
const EVENT_STATS_COLLECTION = "analytics_event_stats";
const TASK_RECEIPT_COLLECTION = "daily_task_event_receipts";
const TASK_MATERIALIZER_RUN_COLLECTION = "daily_task_materializer_runs";
const TASK_MATERIALIZER_HEARTBEAT_COLLECTION = "_system";
const DAILY_TASK_STATE_SCHEMA_VERSION = 2;
const DAILY_TASK_MATERIALIZER_MAX_USERS = 200;
const DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS = 45_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

type EventParams = Record<string, string | number | boolean> | undefined;
type DailyTaskAssignmentSource = "daily_task_materializer" | "on_demand_backfill" | "debug_repair";
type DailyTaskReasonCode =
  | "daily_window_started"
  | "daily_window_expired"
  | "on_demand_backfill"
  | "user_ineligible"
  | "catalog_unavailable"
  | "materializer_retry"
  | "debug_repair"
  | "inactivity_policy";
type RotationReason = "initial" | "cycle_complete" | "window_expired";

export type DailyTaskWindow = {
  dailyTaskWindowId: string;
  windowStartAtUtc: string;
  windowEndAtUtc: string;
  resetAtUtc: string;
  windowStartMs: number;
  windowEndMs: number;
};

interface TaskStateBuildResult {
  state: DailyTasksState;
  rotated: boolean;
  rotationReason: RotationReason | null;
  reasonCode: DailyTaskReasonCode | null;
  source: DailyTaskAssignmentSource;
  dailyTaskWindow: DailyTaskWindow;
  assignedTasks: DailyTaskAssignment[];
  failedTasks: DailyTaskAssignment[];
}

interface RotationSideEffectContext {
  transaction: Transaction;
  uid: string;
  username: string | null;
  notificationSettings: UserProfile["notificationSettings"];
  result: TaskStateBuildResult;
  nowMs: number;
}

interface RotationSideEffectResult {
  notificationQueued: boolean;
}

interface TaskEligibilityContext {
  hasUnlockedContent: boolean;
  hasLiveDrops: boolean;
  hasUnreadNotifications: boolean;
  hasCheckedInToday: boolean;
  hasMultiAssetUnlockedContent: boolean;
  hasRelatedUnlockedDrops: boolean;
  hasDownloadableUnlockedContent: boolean;
  hasShareableLiveDrop: boolean;
}

export function getDailyTaskWindow(
  nowMs: number = Date.now(),
  timezonePolicy: "app_checkin_central" = "app_checkin_central",
): DailyTaskWindow {
  void timezonePolicy;
  const { startOfDay, endOfDay } = getCSTDayBoundaries(nowMs);
  return {
    dailyTaskWindowId: getCSTDateKey(nowMs),
    windowStartAtUtc: new Date(startOfDay).toISOString(),
    windowEndAtUtc: new Date(endOfDay).toISOString(),
    resetAtUtc: new Date(startOfDay).toISOString(),
    windowStartMs: startOfDay,
    windowEndMs: endOfDay,
  };
}

function buildDailyTaskIdempotencyKey(userId: string, dailyTaskWindowId: string) {
  return `daily_tasks:${userId}:${dailyTaskWindowId}`;
}

function buildTaskRewardCreditIdempotencyKey(userId: string, dailyTaskWindowId: string, taskId: string) {
  return `task_reward:${userId}:${dailyTaskWindowId}:${taskId}`;
}

function getAssignmentReasonCode(source: DailyTaskAssignmentSource): DailyTaskReasonCode {
  if (source === "daily_task_materializer") return "daily_window_started";
  if (source === "debug_repair") return "debug_repair";
  return "on_demand_backfill";
}

async function readQuerySnapshot(
  query: FirebaseFirestore.Query,
  transaction?: Transaction,
) {
  if (transaction) {
    return transaction.get(query);
  }

  return query.get();
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
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

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => typeof entryValue !== "undefined")
        .map(([key, entryValue]) => [key, stripUndefinedDeep(entryValue)]),
    ) as T;
  }

  return value;
}

function normalizeTaskAssignment(raw: unknown): Partial<DailyTaskAssignment> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const rawId = typeof source.id === "string" ? source.id : "";
  const id = resolveLegacyDailyTaskId(rawId);
  if (!id) {
    return null;
  }

  if (isRetiredLegacyDailyTaskId(rawId)) {
    return null;
  }

  return {
    id,
    title: typeof source.title === "string" ? source.title : undefined,
    subtitle: typeof source.subtitle === "string" ? source.subtitle : undefined,
    reward: Number.isFinite(source.reward) ? Number(source.reward) : undefined,
    maxProgress: Number.isFinite(source.maxProgress) ? Number(source.maxProgress) : undefined,
    eventName: typeof source.eventName === "string" ? source.eventName : undefined,
    actionType: typeof source.actionType === "string"
      ? source.actionType as DailyTaskAssignment["actionType"]
      : undefined,
    ctaLabel: typeof source.ctaLabel === "string" ? source.ctaLabel : undefined,
    icon: typeof source.icon === "string" ? source.icon as DailyTaskAssignment["icon"] : undefined,
    group: typeof source.group === "string" ? source.group as DailyTaskAssignment["group"] : undefined,
    source: typeof source.source === "string" ? source.source as DailyTaskAssignment["source"] : undefined,
    customTaskId: typeof source.customTaskId === "string" ? source.customTaskId : undefined,
    targetUserId: typeof source.targetUserId === "string" ? source.targetUserId : undefined,
    progress: Number.isFinite(source.progress) ? Number(source.progress) : 0,
    claimed: source.claimed === true,
    assignedAt: Number.isFinite(source.assignedAt) ? Number(source.assignedAt) : 0,
    startedAt: Number.isFinite(source.startedAt) ? Number(source.startedAt) : undefined,
    claimedAt: Number.isFinite(source.claimedAt) ? Number(source.claimedAt) : undefined,
    dailyTaskWindowId: typeof source.dailyTaskWindowId === "string" ? source.dailyTaskWindowId : undefined,
    expiresAtUtc: typeof source.expiresAtUtc === "string" ? source.expiresAtUtc : undefined,
    status: typeof source.status === "string" ? source.status as DailyTaskAssignment["status"] : undefined,
    reasonCode: typeof source.reasonCode === "string" ? source.reasonCode as DailyTaskAssignment["reasonCode"] : undefined,
    assignmentSource: typeof source.assignmentSource === "string" ? source.assignmentSource as DailyTaskAssignment["assignmentSource"] : undefined,
    progressKeys: normalizeStringArray(source.progressKeys),
    uniqueByParamKey: typeof source.uniqueByParamKey === "string" ? source.uniqueByParamKey : undefined,
    cooldownDays: Number.isFinite(source.cooldownDays) ? Number(source.cooldownDays) : undefined,
    rewardVersion: Number.isFinite(source.rewardVersion) ? Number(source.rewardVersion) : undefined,
    criteria: source.criteria as DailyTaskCriteria | undefined,
  };
}

function hydrateAssignment(
  definition: DailyTaskDefinition,
  nowMs: number,
  window: DailyTaskWindow,
  source: DailyTaskAssignmentSource,
  reasonCode: DailyTaskReasonCode,
): DailyTaskAssignment {
  return {
    ...definition,
    progress: 0,
    claimed: false,
    progressKeys: [],
    assignedAt: nowMs,
    dailyTaskWindowId: window.dailyTaskWindowId,
    expiresAtUtc: window.windowEndAtUtc,
    status: source === "on_demand_backfill" ? "backfilled" : "assigned",
    reasonCode,
    assignmentSource: source,
  };
}

function upgradeAssignment(
  rawTask: unknown,
  definitions: Map<string, DailyTaskDefinition>,
  nowMs: number,
): DailyTaskAssignment | null {
  const partial = normalizeTaskAssignment(rawTask);
  if (!partial) {
    return null;
  }

  const definition = definitions.get(partial.id ?? "");
  if (!definition) {
    return null;
  }

  const assignedAt = partial.assignedAt || nowMs;
  const startedAt = partial.startedAt ?? ((partial.progress ?? 0) > 0 ? assignedAt : undefined);
  const claimedAt = partial.claimedAt;

  return {
    ...definition,
    progress: Math.max(0, Math.min(partial.progress ?? 0, definition.maxProgress)),
    claimed: partial.claimed ?? false,
    progressKeys: partial.progressKeys ?? [],
    assignedAt,
    dailyTaskWindowId: partial.dailyTaskWindowId,
    expiresAtUtc: partial.expiresAtUtc,
    status: partial.status,
    reasonCode: partial.reasonCode,
    assignmentSource: partial.assignmentSource,
    ...(typeof startedAt === "number" ? { startedAt } : {}),
    ...(typeof claimedAt === "number" ? { claimedAt } : {}),
  };
}

function getCooldownMs(task: DailyTaskDefinition): number {
  const days = task.cooldownDays ?? DAILY_TASK_COOLDOWN_DAYS;
  return days * ONE_DAY_MS;
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

function computeTaskPriorityScore(
  task: DailyTaskDefinition,
  history: Record<string, number>,
  nowMs: number,
) {
  const lastCompletedAt = history[task.id] ?? 0;
  const daysSinceCompletion = lastCompletedAt > 0
    ? Math.min(14, Math.floor((nowMs - lastCompletedAt) / ONE_DAY_MS))
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

function rankTasksForCycle(
  tasks: DailyTaskDefinition[],
  history: Record<string, number>,
  nowMs: number,
) {
  return tasks
    .map((task) => {
      let tieBreaker = 0;
      try {
        tieBreaker = randomBytes(4).readUInt32BE(0) / 0xffffffff;
      } catch {
        throw new Error("Cryptographically secure random number generation is not available in this environment.");
      }

      return {
        task,
        score: computeTaskPriorityScore(task, history, nowMs),
        tieBreaker,
      };
    })
    .sort((left, right) => right.score - left.score || right.tieBreaker - left.tieBreaker)
    .map((entry) => entry.task);
}

function pickTasksForCycle(
  definitions: DailyTaskDefinition[],
  history: Record<string, number>,
  nowMs: number,
  userData: UserProfile,
  retiredTaskIds: string[],
  eligibility: TaskEligibilityContext,
): DailyTaskDefinition[] {
  const basePool = definitions.filter((task) => {
    if (retiredTaskIds.includes(task.id)) {
      return false;
    }

    if (task.oneTime && (history[task.id] ?? 0) > 0) {
      return false;
    }

    if (task.actionType === "enable_notifications" && userData.notificationSettings?.browserPushEnabled === true) {
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

    if (task.eventName === "file_viewed" && !eligibility.hasMultiAssetUnlockedContent) {
      return false;
    }

    if (task.eventName === "viewer_related_drop_clicked" && !eligibility.hasRelatedUnlockedDrops) {
      return false;
    }

    if (task.eventName === "viewer_source_downloaded" && !eligibility.hasDownloadableUnlockedContent) {
      return false;
    }

    const requiresLiveDrops = task.eventName === "drop_preview_opened"
      || task.eventName === "view_drop_details"
      || task.eventName === "unlock_drop_success";

    if (requiresLiveDrops && !eligibility.hasLiveDrops) {
      return false;
    }

    if (task.eventName === "drop_share_copied" && !eligibility.hasShareableLiveDrop) {
      return false;
    }

    const requiresUnreadNotification = task.eventName === "notification_read"
      || task.eventName === "notification_opened";

    if (requiresUnreadNotification && !eligibility.hasUnreadNotifications) {
      return false;
    }

    return true;
  });

  const eligible = basePool.filter((task) => {
    const lastCompletedAt = history[task.id] ?? 0;
    return nowMs - lastCompletedAt >= getCooldownMs(task);
  });

  const pool = eligible.length >= DAILY_TASK_LIMIT ? eligible : basePool;
  const rankedPool = rankTasksForCycle(pool, history, nowMs);
  const selected: DailyTaskDefinition[] = [];
  const usedGroups = new Set<string>();

  const pushIfPossible = (task: DailyTaskDefinition) => {
    if (selected.length >= DAILY_TASK_LIMIT) {
      return;
    }
    if (selected.some((entry) => entry.id === task.id)) {
      return;
    }
    if (usedGroups.has(task.group) && pool.length > DAILY_TASK_LIMIT) {
      return;
    }

    selected.push(task);
    usedGroups.add(task.group);
  };

  rankedPool.forEach(pushIfPossible);

  if (selected.length < DAILY_TASK_LIMIT) {
    rankedPool.forEach((task) => {
      if (selected.length < DAILY_TASK_LIMIT && !selected.some((entry) => entry.id === task.id)) {
        selected.push(task);
      }
    });
  }

  if (selected.length < DAILY_TASK_LIMIT) {
    rankTasksForCycle(basePool, history, nowMs).forEach((task) => {
      if (selected.length < DAILY_TASK_LIMIT && !selected.some((entry) => entry.id === task.id)) {
        selected.push(task);
      }
    });
  }

  return selected.slice(0, DAILY_TASK_LIMIT);
}

function taskMatchesEvent(
  task: DailyTaskDefinition,
  eventName: string,
  eventParams: EventParams,
  assignment: DailyTaskAssignment,
): { matched: boolean; nextKeys?: string[] } {
  if (task.eventName !== eventName) {
    return { matched: false };
  }

  const params = eventParams ?? {};
  const criteria = task.criteria;

  if (criteria?.paramEquals && params[criteria.paramEquals.key] !== criteria.paramEquals.value) {
    return { matched: false };
  }

  if (criteria?.minNumberParam) {
    const numericValue = Number(params[criteria.minNumberParam.key]);
    if (!Number.isFinite(numericValue) || numericValue < criteria.minNumberParam.value) {
      return { matched: false };
    }
  }

  if (criteria?.includesAnyParam) {
    const rawValue = params[criteria.includesAnyParam.key];
    if (typeof rawValue !== "string") {
      return { matched: false };
    }

    const normalizedValues = rawValue.split("|").map((value) => value.trim()).filter(Boolean);
    if (!criteria.includesAnyParam.values.some((value) => normalizedValues.includes(value))) {
      return { matched: false };
    }
  }

  if (task.uniqueByParamKey) {
    const rawValue = params[task.uniqueByParamKey];
    const normalizedValue = typeof rawValue === "number" || typeof rawValue === "boolean"
      ? String(rawValue)
      : typeof rawValue === "string"
        ? rawValue
        : "";

    if (!normalizedValue || assignment.progressKeys?.includes(normalizedValue)) {
      return { matched: false };
    }

    return {
      matched: true,
      nextKeys: [...(assignment.progressKeys ?? []), normalizedValue],
    };
  }

  return { matched: true };
}

async function fetchCustomTaskDefinitions(uid: string): Promise<DailyTaskDefinition[]> {
  const snapshot = await adminDb.collection(TASK_DEFINITION_COLLECTION)
    .where("active", "==", true)
    .get();

  const tasks: DailyTaskDefinition[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (typeof data.title !== "string" || typeof data.subtitle !== "string" || typeof data.eventName !== "string") {
      return;
    }

    if (data.scope === "user" && data.targetUserId !== uid) {
      return;
    }

    if (data.scope !== "global" && data.scope !== "user") {
      return;
    }

    const rewardContract = buildDailyTaskRewardContract({
      id: `custom:${doc.id}`,
      title: data.title,
      eventName: data.eventName,
      reward: Number(data.reward),
      maxProgress: Number.isFinite(data.maxProgress) ? Number(data.maxProgress) : 1,
    });

    tasks.push({
      id: `custom:${doc.id}`,
      source: data.scope === "user" ? "user" : "global",
      title: data.title,
      subtitle: data.subtitle,
      reward: resolveDailyTaskReward(data.reward, data.rewardVersion),
      rewardTier: rewardContract.rewardTier,
      minRewardGd: rewardContract.minRewardGd,
      maxRewardGd: rewardContract.maxRewardGd,
      rewardSource: rewardContract.rewardSource,
      payoutPolicy: rewardContract.payoutPolicy,
      repeatPolicy: rewardContract.repeatPolicy,
      economyRisk: rewardContract.economyRisk,
      maxProgress: Number.isFinite(data.maxProgress) ? Number(data.maxProgress) : 1,
      eventName: data.eventName,
      actionType: data.actionType as DailyTaskActionType,
      ctaLabel: typeof data.ctaLabel === "string" ? data.ctaLabel : "Keep going",
      icon: data.icon as DailyTaskIconName,
      group: data.group as DailyTaskGroup,
      cooldownDays: Number.isFinite(data.cooldownDays) ? Number(data.cooldownDays) : DAILY_TASK_COOLDOWN_DAYS,
      oneTime: data.oneTime === true,
      active: data.active === true,
      targetUserId: typeof data.targetUserId === "string" ? data.targetUserId : null,
      customTaskId: doc.id,
      createdAt: Number.isFinite(data.createdAt) ? Number(data.createdAt) : undefined,
      updatedAt: Number.isFinite(data.updatedAt) ? Number(data.updatedAt) : undefined,
      rewardVersion: data.rewardVersion === DAILY_TASK_REWARD_VERSION ? DAILY_TASK_REWARD_VERSION : undefined,
    });
  });

  return tasks;
}

function createDefinitionMap(definitions: DailyTaskDefinition[]) {
  return new Map(definitions.map((task) => [task.id, task]));
}

function getUserDisplayName(userData: UserProfile): string | null {
  if (typeof userData.username === "string" && userData.username.trim().length > 0) {
    return userData.username.trim();
  }

  if (typeof userData.displayName === "string" && userData.displayName.trim().length > 0) {
    return userData.displayName.trim();
  }

  return null;
}

function normalizeTaskState(
  userData: UserProfile,
  definitionMap: Map<string, DailyTaskDefinition>,
  nowMs: number,
): DailyTasksState {
  const currentState = userData.dailyTasksState;
  const tasks = Array.isArray(currentState?.tasks)
    ? currentState.tasks
      .map((task) => upgradeAssignment(task, definitionMap, nowMs))
      .filter((task): task is DailyTaskAssignment => Boolean(task))
    : [];

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
  };
}

function shouldRotateIncompleteCycle(
  state: DailyTasksState,
  nowMs: number,
) {
  if (state.tasks.length === 0 || state.tasks.every((task) => task.claimed)) {
    return false;
  }

  const { startOfDay } = getCSTDayBoundaries(nowMs);
  if (state.lastResetMs < startOfDay) {
    return true;
  }

  if (!Number.isFinite(state.nextRefreshMs) || state.nextRefreshMs <= state.lastResetMs) {
    return true;
  }

  return state.nextRefreshMs < startOfDay;
}

function shouldRotateCompletedCycle(state: DailyTasksState, nowMs: number): boolean {
  if (state.tasks.length === 0 || !state.tasks.every((task) => task.claimed)) {
    return false;
  }

  const { startOfDay } = getCSTDayBoundaries(nowMs);
  return state.lastResetMs < startOfDay;
}

function buildRotatedState(
  uid: string,
  normalizedState: DailyTasksState,
  definitions: DailyTaskDefinition[],
  nowMs: number,
  rotationReason: RotationReason,
  source: DailyTaskAssignmentSource,
  reasonCode: DailyTaskReasonCode,
  failedTasks: DailyTaskAssignment[],
  userData: UserProfile,
  eligibility: TaskEligibilityContext,
): TaskStateBuildResult {
  const window = getDailyTaskWindow(nowMs);
  const selectedDefinitions = pickTasksForCycle(
    definitions,
    normalizedState.completedTaskHistory ?? {},
    nowMs,
    userData,
    normalizedState.retiredTaskIds ?? [],
    eligibility,
  );
  const tasks = selectedDefinitions.map((task) => hydrateAssignment(task, nowMs, window, source, reasonCode));

  return {
    rotated: true,
    rotationReason,
    reasonCode,
    source,
    dailyTaskWindow: window,
    assignedTasks: tasks,
    failedTasks: failedTasks.map((task) => ({
      ...task,
      status: "expired",
      reasonCode: "daily_window_expired",
    })),
    state: {
      lastResetMs: nowMs,
      nextRefreshMs: window.windowEndMs,
      tasks,
      dailyTaskWindowId: window.dailyTaskWindowId,
      windowStartAtUtc: window.windowStartAtUtc,
      windowEndAtUtc: window.windowEndAtUtc,
      resetAtUtc: window.resetAtUtc,
      assignedAtUtc: new Date(nowMs).toISOString(),
      expiresAtUtc: window.windowEndAtUtc,
      source,
      schemaVersion: DAILY_TASK_STATE_SCHEMA_VERSION,
      idempotencyKey: buildDailyTaskIdempotencyKey(uid, window.dailyTaskWindowId),
      retiredTaskIds: normalizedState.retiredTaskIds ?? [],
      completedTaskHistory: normalizedState.completedTaskHistory ?? {},
      lastProgressAt: nowMs,
      lastDeadlineReminderAt: normalizedState.lastDeadlineReminderAt ?? 0,
    },
  };
}

export async function resolveTaskDefinitionsForUser(uid: string): Promise<DailyTaskDefinition[]> {
  const customDefinitions = await fetchCustomTaskDefinitions(uid);
  return [...BUILT_IN_DAILY_TASKS, ...customDefinitions];
}

async function resolveTaskEligibilityContext(
  uid: string,
  userData: UserProfile,
  nowMs: number,
  transaction?: Transaction,
): Promise<TaskEligibilityContext> {
  const unlockedContentIds = Array.isArray(userData.unlockedContent)
    ? Array.from(new Set(userData.unlockedContent.filter((value): value is string => typeof value === "string" && value.trim().length > 0)))
    : [];
  const hasUnlockedContent = unlockedContentIds.length > 0;

  const [liveDropsResult, unreadNotificationsResult, unlockedDropDocsResult] = await Promise.allSettled([
    (async () => {
      const snapshot = await readQuerySnapshot(
        adminDb.collection("drops")
        .where("validFrom", "<=", nowMs)
        .orderBy("validFrom", "desc")
        .limit(40),
        transaction,
      );

      return snapshot.docs.some((doc) => {
        const data = doc.data();
        const validFrom = Number(data.validFrom);
        const validUntil = Number.isFinite(data.validUntil) ? Number(data.validUntil) : undefined;
        if (!Number.isFinite(validFrom)) {
          return false;
        }

        return isDropActiveNow({ validFrom, validUntil }, nowMs);
      });
    })(),
    (async () => {
      if (!transaction) {
        return hasUnreadNotificationsForUser(uid, nowMs);
      }

      const snapshot = await readQuerySnapshot(
        adminDb.collection("notifications").orderBy("createdAt", "desc").limit(200),
        transaction,
      );

      return snapshot.docs.some((doc) => {
        const normalized = normalizeNotificationDoc(doc.id, doc.data() as Record<string, unknown>);
        if (!normalized) {
          return false;
        }

        return isUnreadNotificationForUser({
          readBy: normalized.readBy,
          target: normalized.target,
          createdAtMs: normalized.createdAtMs ?? 0,
        }, uid, nowMs);
      });
    })(),
    (async () => {
      if (!hasUnlockedContent) {
        return [];
      }

      const dropRefs = unlockedContentIds.map((dropId) => adminDb.collection("drops").doc(dropId));

      const snapshots = dropRefs.length > 0
        ? (transaction
            ? await transaction.getAll(...dropRefs)
            : await adminDb.getAll(...dropRefs))
        : [];

      return snapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        })) as Array<Record<string, unknown> & { id: string }>;
    })(),
  ]);

  const unlockedDropDocs = unlockedDropDocsResult.status === "fulfilled" ? unlockedDropDocsResult.value : [];
  const hasMultiAssetUnlockedContent = unlockedDropDocs.some((drop) => getDropAssetCount({
    contentUrl: typeof drop.contentUrl === "string" ? drop.contentUrl : "",
    contentUrls: Array.isArray(drop.contentUrls)
      ? drop.contentUrls.filter((value): value is string => typeof value === "string")
      : [],
    mediaCounts: drop.mediaCounts && typeof drop.mediaCounts === "object"
      ? {
        images: Number((drop.mediaCounts as Record<string, unknown>).images) || 0,
        videos: Number((drop.mediaCounts as Record<string, unknown>).videos) || 0,
      }
      : undefined,
  }) > 1);
  const hasRelatedUnlockedDrops = unlockedContentIds.length > 1;
  const hasDownloadableUnlockedContent = unlockedDropDocs.some((drop) => (
    typeof drop.creatorId === "string" && drop.creatorId === uid
  ));
  const hasLiveDrops = liveDropsResult.status === "fulfilled" ? liveDropsResult.value : false;

  return {
    hasUnlockedContent,
    hasLiveDrops,
    hasUnreadNotifications: unreadNotificationsResult.status === "fulfilled" ? unreadNotificationsResult.value : false,
    hasCheckedInToday: isSameCSTDay(userData.lastCheckIn ?? 0, nowMs),
    hasMultiAssetUnlockedContent,
    hasRelatedUnlockedDrops,
    hasDownloadableUnlockedContent,
    hasShareableLiveDrop: hasLiveDrops,
  };
}

export async function buildFreshTaskStateForUser(
  uid: string,
  userData: UserProfile,
  definitions: DailyTaskDefinition[],
  nowMs: number,
  transaction?: Transaction,
  source: DailyTaskAssignmentSource = "on_demand_backfill",
): Promise<TaskStateBuildResult> {
  const definitionMap = createDefinitionMap(definitions);
  const normalizedState = normalizeTaskState(userData, definitionMap, nowMs);
  const window = getDailyTaskWindow(nowMs);
  const windowIdempotencyKey = buildDailyTaskIdempotencyKey(uid, window.dailyTaskWindowId);
  const normalizedStateWindowId = normalizedState.dailyTaskWindowId
    || (normalizedState.lastResetMs >= window.windowStartMs && normalizedState.lastResetMs < window.windowEndMs
      ? window.dailyTaskWindowId
      : "");

  if (normalizedStateWindowId === window.dailyTaskWindowId && normalizedState.tasks.length === DAILY_TASK_LIMIT) {
    return {
      rotated: false,
      rotationReason: null,
      reasonCode: null,
      source,
      dailyTaskWindow: window,
      assignedTasks: [],
      failedTasks: [],
      state: {
        ...normalizedState,
        nextRefreshMs: window.windowEndMs,
        dailyTaskWindowId: window.dailyTaskWindowId,
        windowStartAtUtc: normalizedState.windowStartAtUtc || window.windowStartAtUtc,
        windowEndAtUtc: window.windowEndAtUtc,
        resetAtUtc: normalizedState.resetAtUtc || window.resetAtUtc,
        source: normalizedState.source || source,
        schemaVersion: normalizedState.schemaVersion || DAILY_TASK_STATE_SCHEMA_VERSION,
        idempotencyKey: normalizedState.idempotencyKey || windowIdempotencyKey,
        expiresAtUtc: window.windowEndAtUtc,
        tasks: normalizedState.tasks.map((task) => ({
          ...task,
          dailyTaskWindowId: task.dailyTaskWindowId || window.dailyTaskWindowId,
          expiresAtUtc: task.expiresAtUtc || window.windowEndAtUtc,
          status: task.status || (task.claimed ? "completed" : task.progress > 0 ? "in_progress" : "assigned"),
          assignmentSource: task.assignmentSource || source,
          reasonCode: task.reasonCode || getAssignmentReasonCode(source),
        })),
      },
    };
  }

  if (normalizedState.tasks.length === 0 || normalizedState.tasks.length !== DAILY_TASK_LIMIT) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(
      uid,
      normalizedState,
      definitions,
      nowMs,
      "initial",
      source,
      getAssignmentReasonCode(source),
      [],
      userData,
      eligibility,
    );
  }

  if (shouldRotateIncompleteCycle(normalizedState, nowMs)) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(
      uid,
      normalizedState,
      definitions,
      nowMs,
      "window_expired",
      source,
      "daily_window_expired",
      normalizedState.tasks.filter((task) => !task.claimed),
      userData,
      eligibility,
    );
  }

  if (shouldRotateCompletedCycle(normalizedState, nowMs)) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(uid, normalizedState, definitions, nowMs, "cycle_complete", source, "daily_window_started", [], userData, eligibility);
  }

  return {
    rotated: false,
    rotationReason: null,
    reasonCode: null,
    source,
    dailyTaskWindow: window,
    assignedTasks: [],
    failedTasks: [],
    state: {
      ...normalizedState,
      nextRefreshMs: window.windowEndMs,
      dailyTaskWindowId: normalizedState.dailyTaskWindowId || window.dailyTaskWindowId,
      windowStartAtUtc: normalizedState.windowStartAtUtc || window.windowStartAtUtc,
      windowEndAtUtc: window.windowEndAtUtc,
      resetAtUtc: normalizedState.resetAtUtc || window.resetAtUtc,
      expiresAtUtc: window.windowEndAtUtc,
      schemaVersion: normalizedState.schemaVersion || DAILY_TASK_STATE_SCHEMA_VERSION,
      idempotencyKey: normalizedState.idempotencyKey || windowIdempotencyKey,
    },
  };
}

function incrementEventStat(
  transaction: Transaction,
  eventName: string,
  lastSeenAt: number,
  lastParams: Record<string, string | number | boolean>,
) {
  transaction.set(adminDb.collection(EVENT_STATS_COLLECTION).doc(eventName), {
    eventName,
    totalCount: FieldValue.increment(1),
    lastSeenAt,
    lastParams,
  }, { merge: true });
}

function writeTaskLifecycleEvent(
  transaction: Transaction,
  data: {
    type: "assigned" | "started" | "completed" | "failed" | "reminder_sent";
    taskId: string;
    title: string;
    triggerEvent: string;
    userId: string;
    username?: string | null;
    reward: number;
    potentialRewardGd?: number;
    creditedRewardGd?: number;
    forfeitedPotentialRewardGd?: number;
    expiredPotentialRewardGd?: number;
    reminderPotentialRewardGd?: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
    reason?: string;
    assignedAt?: number;
    startedAt?: number;
    durationMs?: number;
    dailyTaskWindowId?: string;
    source?: DailyTaskAssignmentSource | "user_action";
    reasonCode?: DailyTaskReasonCode | "task_progress_started" | "task_completed";
    assignedAtUtc?: string;
    updatedAtUtc?: string;
    expiresAtUtc?: string;
    rewardCreditIdempotencyKey?: string;
    rewardEventState?: "potential" | "credited" | "forfeited" | "expired" | "reminder_only";
    rewardAuditFlag?: "historical_reward_out_of_bounds";
  },
) {
  const eventRef = adminDb.collection(TASK_EVENT_COLLECTION).doc();
  transaction.set(eventRef, stripUndefinedDeep(data));
}

function buildTaskReceiptDocId(uid: string, eventName: string, receiptKey: string) {
  return `${uid}:${eventName}:${receiptKey}`.slice(0, 1500);
}

function buildDefaultReceiptKey(eventName: string, eventParams: EventParams) {
  const params = eventParams ?? {};
  const raw = [
    typeof params.order_id === "string" ? params.order_id : "",
    typeof params.feedback_id === "string" ? params.feedback_id : "",
    typeof params.drop_id === "string" ? params.drop_id : "",
    typeof params.day_key === "string" ? params.day_key : "",
    typeof params.transaction_id === "string" ? params.transaction_id : "",
    typeof params.source === "string" ? params.source : "",
  ].filter(Boolean);

  if (raw.length > 0) {
    return raw.join("|");
  }

  return eventName;
}

function queueUserNotification(
  transaction: Transaction,
  uid: string,
  nowMs: number,
  payload: {
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    link?: string;
  },
) {
  const notificationRef = adminDb.collection("notifications").doc();
  transaction.set(notificationRef, {
    ...buildNotificationRecord({
      title: payload.title,
      message: payload.message,
      type: payload.type,
      target: {
        global: false,
        userIds: [uid],
        excludedUserIds: [],
      },
      targetUserId: uid,
      recipientUserId: uid,
      link: payload.link || "/experiences",
      dropContext: null,
      createdAtMs: nowMs,
      readBy: [],
      actorType: "system",
      sourceComponent: "daily_tasks",
      sourceEntityType: "daily_task_window",
      sourceEntityId: uid,
      surface: "background",
    }),
    createdAt: FieldValue.serverTimestamp(),
  });
  markNotificationsRuntimeChanged(transaction, nowMs);
}

function applyRotationSideEffects({
  transaction,
  uid,
  username,
  notificationSettings,
  result,
  nowMs,
}: RotationSideEffectContext) {
  if (!result.rotated) {
    return { notificationQueued: false } satisfies RotationSideEffectResult;
  }

  let notificationQueued = false;

  result.assignedTasks.forEach((task) => {
    writeTaskLifecycleEvent(transaction, {
      type: "assigned",
      taskId: task.id,
      title: task.title,
      triggerEvent: task.eventName,
      userId: uid,
      username,
      reward: task.reward,
      potentialRewardGd: task.reward,
      creditedRewardGd: 0,
      forfeitedPotentialRewardGd: 0,
      progress: 0,
      maxProgress: task.maxProgress,
      timestamp: nowMs,
      dailyTaskWindowId: result.dailyTaskWindow.dailyTaskWindowId,
      source: result.source,
      reasonCode: result.reasonCode ?? getAssignmentReasonCode(result.source),
      assignedAt: nowMs,
      assignedAtUtc: new Date(nowMs).toISOString(),
      updatedAtUtc: new Date(nowMs).toISOString(),
      expiresAtUtc: result.dailyTaskWindow.windowEndAtUtc,
      rewardEventState: "potential",
      rewardAuditFlag: task.reward < 10 || task.reward > 1000 ? "historical_reward_out_of_bounds" : undefined,
    });
    incrementEventStat(transaction, "daily_task_assigned", nowMs, {
      task_id: task.id,
      reward: task.reward,
      reason: result.rotationReason ?? "initial",
      reason_code: result.reasonCode ?? getAssignmentReasonCode(result.source),
      source: result.source,
      daily_task_window_id: result.dailyTaskWindow.dailyTaskWindowId,
    });
  });

  if (result.failedTasks.length > 0) {
    result.failedTasks.forEach((task) => {
      writeTaskLifecycleEvent(transaction, {
        type: "failed",
        taskId: task.id,
        title: task.title,
        triggerEvent: "daily_window_expired",
        userId: uid,
        username,
        reward: task.reward,
        potentialRewardGd: 0,
        creditedRewardGd: 0,
        forfeitedPotentialRewardGd: task.reward,
        expiredPotentialRewardGd: task.reward,
        progress: task.progress,
        maxProgress: task.maxProgress,
        timestamp: nowMs,
        reason: "daily_window_expired",
        dailyTaskWindowId: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
        source: result.source,
        reasonCode: "daily_window_expired",
        assignedAt: task.assignedAt,
        assignedAtUtc: task.assignedAt ? new Date(task.assignedAt).toISOString() : undefined,
        updatedAtUtc: new Date(nowMs).toISOString(),
        expiresAtUtc: result.dailyTaskWindow.windowEndAtUtc,
        startedAt: task.startedAt,
        durationMs: task.startedAt ? Math.max(0, nowMs - task.startedAt) : undefined,
        rewardEventState: "expired",
        rewardAuditFlag: task.reward < 10 || task.reward > 1000 ? "historical_reward_out_of_bounds" : undefined,
      });
      incrementEventStat(transaction, "daily_task_failed", nowMs, {
        task_id: task.id,
        progress: task.progress,
        duration_ms: task.startedAt ? Math.max(0, nowMs - task.startedAt) : 0,
        reason: "daily_window_expired",
        daily_task_window_id: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
      });
    });

    if (notificationSettings?.inAppEnabled !== false) {
      queueUserNotification(transaction, uid, nowMs, {
        title: "Your daily tasks reset",
        message: "You ran out of time, so unfinished task progress reset. Jump back into Experiences and start stacking again.",
        type: "warning",
        link: "/experiences",
      });
      notificationQueued = true;
    }
  }

  return { notificationQueued } satisfies RotationSideEffectResult;
}

export async function rotateUserTasks(uid: string) {
  const userRef = adminDb.collection("users").doc(uid);
  const definitions = await resolveTaskDefinitionsForUser(uid);
  let responseResult: TaskStateBuildResult | undefined;
  let runtimeNowMs = Date.now();
  let notificationChanged = false;

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      throw new Error("User not found");
    }

    const userData = snapshot.data() as UserProfile;
    const nowMs = Date.now();
    runtimeNowMs = nowMs;
    const result = await buildFreshTaskStateForUser(uid, userData, definitions, nowMs, transaction);
    responseResult = result;
    if (result.rotated && result.source === "on_demand_backfill") {
      incrementEventStat(transaction, "daily_task_assignment_backfilled_on_open", nowMs, {
        daily_task_window_id: result.dailyTaskWindow.dailyTaskWindowId,
        reason_code: result.reasonCode ?? "on_demand_backfill",
        idempotency_key: result.state.idempotencyKey ?? buildDailyTaskIdempotencyKey(uid, result.dailyTaskWindow.dailyTaskWindowId),
      });
    }

    transaction.update(userRef, {
      dailyTasksState: stripUndefinedDeep(result.state),
    });

    const sideEffects = applyRotationSideEffects({
      transaction,
      uid,
      username: getUserDisplayName(userData),
      notificationSettings: userData.notificationSettings,
      result,
      nowMs,
    });
    notificationChanged = sideEffects.notificationQueued;
  });

  if (!responseResult) {
    throw new Error("Task rotation failed");
  }

  const finalResult: TaskStateBuildResult = responseResult;

  if (finalResult.rotated || notificationChanged) {
    await touchUserRuntime(uid, {
      ...(finalResult.rotated ? { tasks: true } : {}),
      ...(notificationChanged ? { notifications: true } : {}),
    }, runtimeNowMs);
  }

  return {
    state: finalResult.state,
    tasks: finalResult.state.tasks,
    nextRefreshMs: finalResult.state.nextRefreshMs,
    rotated: finalResult.rotated,
    rotationReason: finalResult.rotationReason,
  };
}

export async function materializeDailyTaskResetWindows(options?: {
  nowMs?: number;
  maxUsers?: number;
  cursorUserId?: string;
  maxRuntimeMs?: number;
  source?: "daily_task_materializer" | "debug_repair";
}) {
  const nowMs = options?.nowMs ?? Date.now();
  const source = options?.source ?? "daily_task_materializer";
  const dailyTaskWindow = getDailyTaskWindow(nowMs);
  const maxUsers = Math.max(1, Math.min(options?.maxUsers ?? DAILY_TASK_MATERIALIZER_MAX_USERS, DAILY_TASK_MATERIALIZER_MAX_USERS));
  const maxRuntimeMs = Math.max(1_000, Math.min(options?.maxRuntimeMs ?? DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS, DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS));
  const startedAtMs = Date.now();
  const runRef = adminDb.collection(TASK_MATERIALIZER_RUN_COLLECTION).doc();
  let query: FirebaseFirestore.Query = adminDb.collection("users")
    .orderBy(FieldPath.documentId())
    .limit(maxUsers);

  if (options?.cursorUserId) {
    query = query.startAfter(options.cursorUserId);
  }

  const snapshot = await query.get();
  let processedUsers = 0;
  let assignedUsers = 0;
  let skippedCurrentWindow = 0;
  let failedUsers = 0;
  let nextCursorUserId: string | null = null;

  for (const userDoc of snapshot.docs) {
    if (Date.now() - startedAtMs >= maxRuntimeMs) {
      nextCursorUserId = userDoc.id;
      break;
    }

    processedUsers += 1;
    nextCursorUserId = userDoc.id;

    try {
      const definitions = await resolveTaskDefinitionsForUser(userDoc.id);
      let rotated = false;
      let runtimeNowMs = nowMs;
      let notificationChanged = false;

      await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userDoc.id);
        const snapshotInTransaction = await transaction.get(userRef);
        if (!snapshotInTransaction.exists) {
          return;
        }

        const userData = snapshotInTransaction.data() as UserProfile;
        runtimeNowMs = Date.now();
        const result = await buildFreshTaskStateForUser(userDoc.id, userData, definitions, runtimeNowMs, transaction, source);
        rotated = result.rotated;
        if (!result.rotated) {
          const currentState = userData.dailyTasksState as DailyTasksState | undefined;
          if (currentState?.idempotencyKey !== result.state.idempotencyKey || currentState?.dailyTaskWindowId !== result.state.dailyTaskWindowId) {
            transaction.update(userRef, {
              dailyTasksState: stripUndefinedDeep(result.state),
            });
          }
          skippedCurrentWindow += 1;
          return;
        }

        transaction.update(userRef, {
          dailyTasksState: stripUndefinedDeep(result.state),
        });

        const sideEffects = applyRotationSideEffects({
          transaction,
          uid: userDoc.id,
          username: getUserDisplayName(userData),
          notificationSettings: userData.notificationSettings,
          result,
          nowMs: runtimeNowMs,
        });
        notificationChanged = sideEffects.notificationQueued;
      });

      if (rotated) {
        assignedUsers += 1;
        await touchUserRuntime(userDoc.id, {
          tasks: true,
          ...(notificationChanged ? { notifications: true } : {}),
        }, runtimeNowMs);
      }
    } catch (error) {
      failedUsers += 1;
      await runRef.collection("errors").doc(userDoc.id).set({
        userId: userDoc.id,
        message: error instanceof Error ? error.message : String(error),
        dailyTaskWindowId: dailyTaskWindow.dailyTaskWindowId,
        reasonCode: "materializer_retry",
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
      }, { merge: true });
    }
  }

  const result = {
    dailyTaskWindowId: dailyTaskWindow.dailyTaskWindowId,
    windowStartAtUtc: dailyTaskWindow.windowStartAtUtc,
    windowEndAtUtc: dailyTaskWindow.windowEndAtUtc,
    resetAtUtc: dailyTaskWindow.resetAtUtc,
    source,
    maxUsers,
    maxRuntimeMs,
    processedUsers,
    assignedUsers,
    skippedCurrentWindow,
    failedUsers,
    cursorUserId: options?.cursorUserId ?? null,
    nextCursorUserId,
    completed: !nextCursorUserId || processedUsers < maxUsers,
    idempotencyScope: `daily_tasks:*:${dailyTaskWindow.dailyTaskWindowId}`,
    generatedAtUtc: new Date().toISOString(),
  };

  await runRef.set({
    ...result,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });
  await adminDb.collection(TASK_MATERIALIZER_HEARTBEAT_COLLECTION).doc("daily_task_materializer").set({
    ...result,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
  }, { merge: true });

  return result;
}

export async function recordTelemetryEventStat(eventName: string, eventParams: EventParams) {
  const statRef = adminDb.collection(EVENT_STATS_COLLECTION).doc(eventName);
  await statRef.set({
    eventName,
    totalCount: FieldValue.increment(1),
    lastSeenAt: Date.now(),
    lastParams: eventParams ?? {},
  }, { merge: true });
}

export async function recordCanonicalTaskEvent(
  uid: string,
  username: string | null,
  eventName: string,
  eventParams: EventParams,
  options?: {
    receiptKey?: string;
  },
) {
  await recordDailyTaskProgressFromEvent(uid, username, eventName, eventParams, {
    source: "canonical",
    receiptKey: options?.receiptKey ?? buildDefaultReceiptKey(eventName, eventParams),
  });
}

export async function recordDailyTaskProgressFromEvent(
  uid: string,
  username: string | null,
  eventName: string,
  eventParams: EventParams,
  options?: {
    source?: "telemetry" | "canonical";
    receiptKey?: string;
  },
) {
  const userRef = adminDb.collection("users").doc(uid);
  const definitions = await resolveTaskDefinitionsForUser(uid);
  const definitionMap = createDefinitionMap(definitions);
  const receiptRef = options?.receiptKey
    ? adminDb.collection(TASK_RECEIPT_COLLECTION).doc(
      buildTaskReceiptDocId(uid, eventName, options.receiptKey),
    )
    : null;

  const progressResult = await adminDb.runTransaction(async (transaction) => {
    let existingReceipt: FirebaseFirestore.DocumentSnapshot | null = null;
    if (receiptRef) {
      existingReceipt = await transaction.get(receiptRef);
    }

    const snapshot = await transaction.get(userRef);

    if (existingReceipt?.exists) {
      return {
        stateChanged: false,
        activityChanged: false,
        taskChanged: false,
        notificationChanged: false,
        profileChanged: false,
        nowMs: Date.now(),
      };
    }

    if (!snapshot.exists) {
      return {
        stateChanged: false,
        activityChanged: false,
        taskChanged: false,
        notificationChanged: false,
        profileChanged: false,
        nowMs: Date.now(),
      };
    }

    const userData = snapshot.data() as UserProfile;
    const nowMs = Date.now();
    incrementEventStat(transaction, eventName, nowMs, eventParams ?? {});
    const result = await buildFreshTaskStateForUser(uid, userData, definitions, nowMs, transaction);
    const sourceAwareBalance = readSourceAwareBalance(userData);
    const currentBalance = sourceAwareBalance.total;
    let ledgerBalanceCursor = currentBalance;
    let sourceAwareBalanceCursor = sourceAwareBalance;
    if (receiptRef) {
      transaction.set(receiptRef, {
        uid,
        eventName,
        receiptKey: options?.receiptKey ?? eventName,
        params: eventParams ?? {},
        createdAt: FieldValue.serverTimestamp(),
        timestamp: nowMs,
        source: options?.source ?? "canonical",
      });
    }
    const updatedTasks = [...result.state.tasks];
    const completedTasks: DailyTaskAssignment[] = [];
    let totalReward = 0;
    let stateChanged = result.rotated;
    let notificationChanged = false;

    const rotationSideEffects = applyRotationSideEffects({
      transaction,
      uid,
      username,
      notificationSettings: userData.notificationSettings,
      result,
      nowMs,
    });
    notificationChanged = rotationSideEffects.notificationQueued;

    updatedTasks.forEach((task, index) => {
      if (task.claimed) {
        return;
      }

      const definition = definitionMap.get(task.id);
      if (!definition) {
        return;
      }

      const match = taskMatchesEvent(definition, eventName, eventParams, task);
      if (!match.matched) {
        return;
      }

      const nextProgress = Math.min(task.maxProgress, task.progress + 1);
      const justStarted = task.progress === 0;
      const justCompleted = nextProgress >= task.maxProgress;

      updatedTasks[index] = {
        ...task,
        progress: nextProgress,
        progressKeys: match.nextKeys ?? task.progressKeys ?? [],
        startedAt: justStarted ? nowMs : task.startedAt,
        claimed: justCompleted ? true : task.claimed,
        claimedAt: justCompleted ? nowMs : task.claimedAt,
        status: justCompleted ? "completed" : "in_progress",
      };
      stateChanged = true;

      if (justStarted) {
        writeTaskLifecycleEvent(transaction, {
          type: "started",
          taskId: task.id,
          title: task.title,
          triggerEvent: eventName,
          userId: uid,
          username,
          reward: task.reward,
          potentialRewardGd: task.reward,
          creditedRewardGd: 0,
          forfeitedPotentialRewardGd: 0,
          progress: nextProgress,
          maxProgress: task.maxProgress,
          timestamp: nowMs,
          dailyTaskWindowId: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
          source: "user_action",
          reasonCode: "task_progress_started",
          assignedAt: task.assignedAt,
          assignedAtUtc: task.assignedAt ? new Date(task.assignedAt).toISOString() : undefined,
          updatedAtUtc: new Date(nowMs).toISOString(),
          expiresAtUtc: task.expiresAtUtc || result.dailyTaskWindow.windowEndAtUtc,
          startedAt: nowMs,
          rewardEventState: "potential",
          rewardAuditFlag: task.reward < 10 || task.reward > 1000 ? "historical_reward_out_of_bounds" : undefined,
        });
        incrementEventStat(transaction, "daily_task_started", nowMs, {
          task_id: task.id,
          trigger_event: eventName,
          assigned_delay_ms: Math.max(0, nowMs - task.assignedAt),
        });
      }

      if (justCompleted) {
        const durationMs = task.startedAt ? Math.max(0, nowMs - task.startedAt) : Math.max(0, nowMs - task.assignedAt);
        const rewardCreditIdempotencyKey = buildTaskRewardCreditIdempotencyKey(
          uid,
          task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
          task.id,
        );
        totalReward += task.reward;
        completedTasks.push({
          ...updatedTasks[index],
          claimed: true,
          claimedAt: nowMs,
        });

        writeTaskLifecycleEvent(transaction, {
          type: "completed",
          taskId: task.id,
          title: task.title,
          triggerEvent: eventName,
          userId: uid,
          username,
          reward: task.reward,
          potentialRewardGd: 0,
          creditedRewardGd: task.reward,
          forfeitedPotentialRewardGd: 0,
          progress: nextProgress,
          maxProgress: task.maxProgress,
          timestamp: nowMs,
          dailyTaskWindowId: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
          source: "user_action",
          reasonCode: "task_completed",
          assignedAt: task.assignedAt,
          assignedAtUtc: task.assignedAt ? new Date(task.assignedAt).toISOString() : undefined,
          updatedAtUtc: new Date(nowMs).toISOString(),
          expiresAtUtc: task.expiresAtUtc || result.dailyTaskWindow.windowEndAtUtc,
          startedAt: updatedTasks[index].startedAt,
          durationMs,
          rewardCreditIdempotencyKey,
          rewardEventState: "credited",
          rewardAuditFlag: task.reward < 10 || task.reward > 1000 ? "historical_reward_out_of_bounds" : undefined,
        });
        incrementEventStat(transaction, "task_completed", nowMs, {
          task_id: task.id,
          trigger_event: eventName,
          reward_gd: task.reward,
          reward: task.reward,
          day_key: getCSTDateKey(nowMs),
          daily_task_window_id: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
          sourceTruth: "canonical",
          duration_ms: durationMs,
        });

        const txRef = adminDb.collection("transactions").doc();
        const rewardReceiptRef = adminDb.collection(TASK_RECEIPT_COLLECTION).doc(
          buildTaskReceiptDocId(uid, "task_reward_credit", rewardCreditIdempotencyKey),
        );
        const balanceBefore = ledgerBalanceCursor;
        const balanceAfter = computeNextGumdropBalance(balanceBefore, task.reward);
        ledgerBalanceCursor = balanceAfter;
        sourceAwareBalanceCursor = creditSourceAwareGumdrops(sourceAwareBalanceCursor, task.reward, "reward");
        transaction.set(rewardReceiptRef, {
          uid,
          eventName: "task_reward_credit",
          receiptKey: rewardCreditIdempotencyKey,
          taskId: task.id,
          dailyTaskWindowId: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
          rewardGd: task.reward,
          createdAt: FieldValue.serverTimestamp(),
          timestamp: nowMs,
          source: "canonical",
        });
        transaction.set(txRef, buildCompletedGumdropTransaction({
          userId: uid,
          amount: task.reward,
          type: "daily_reward",
          rewardSource: "task",
          description: `Daily Task: ${task.title}`,
          balanceBefore,
          balanceAfter,
          timestampMs: nowMs,
          extra: {
            taskRewardCreditIdempotencyKey: rewardCreditIdempotencyKey,
            dailyTaskWindowId: task.dailyTaskWindowId || result.dailyTaskWindow.dailyTaskWindowId,
            taskId: task.id,
          },
        }));
      }
    });

    if (!stateChanged) {
      if (result.rotated) {
        transaction.update(userRef, { dailyTasksState: stripUndefinedDeep(result.state) });
      }
      return {
        stateChanged: result.rotated,
        activityChanged: false,
        taskChanged: result.rotated,
        notificationChanged,
        profileChanged: false,
        nowMs,
      };
    }

    const completedTaskHistory = {
      ...(result.state.completedTaskHistory ?? {}),
    };
    const retiredTaskIds = new Set(result.state.retiredTaskIds ?? []);

    updatedTasks.forEach((task) => {
      if (task.claimed && task.claimedAt) {
        completedTaskHistory[task.id] = task.claimedAt;
        if (task.oneTime) {
          retiredTaskIds.add(task.id);
        }
      }
    });

    const nextState: DailyTasksState = {
      ...result.state,
      tasks: updatedTasks,
      retiredTaskIds: Array.from(retiredTaskIds),
      completedTaskHistory,
      lastProgressAt: nowMs,
    };

    transaction.update(userRef, {
      dailyTasksState: stripUndefinedDeep(nextState),
      ...(totalReward > 0 ? buildSourceAwareBalancePatch(sourceAwareBalanceCursor) : {}),
    });

    if (completedTasks.length > 0 && userData.notificationSettings?.inAppEnabled !== false) {
      const title = completedTasks.length === 1 ? "Task complete" : "Daily tasks complete";
      const message = completedTasks.length === 1
        ? `You finished "${completedTasks[0].title}" and earned ${totalReward} Gum Drops.`
        : `You completed ${completedTasks.length} daily tasks and earned ${totalReward} Gum Drops.`;

      queueUserNotification(transaction, uid, nowMs, {
        title,
        message,
        type: "success",
        link: "/experiences",
      });
      notificationChanged = true;
    }
    return {
      stateChanged: true,
      activityChanged: completedTasks.length > 0,
      taskChanged: true,
      notificationChanged,
      profileChanged: totalReward > 0,
      nowMs,
    };
  });

  if (progressResult?.stateChanged) {
    await touchUserRuntime(uid, {
      ...(progressResult.taskChanged ? { tasks: true } : {}),
      ...(progressResult.activityChanged ? { activity: true } : {}),
      ...(progressResult.notificationChanged ? { notifications: true } : {}),
      ...(progressResult.profileChanged ? { profile: true } : {}),
    }, progressResult.nowMs);
  }
}

export async function syncUserTaskReminder(uid: string) {
  const userRef = adminDb.collection("users").doc(uid);
  const definitions = await resolveTaskDefinitionsForUser(uid);
  let sent = false;
  let nextRefreshMs = 0;

  const reminderResult = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      throw new Error("User not found");
    }

    const userData = snapshot.data() as UserProfile;
    const nowMs = Date.now();
    const result = await buildFreshTaskStateForUser(uid, userData, definitions, nowMs, transaction);
    const { endOfDay } = getCSTDayBoundaries(nowMs);
    const pendingCheckIn = !isSameCSTDay(Number(userData.lastCheckIn ?? 0), nowMs);
    const unfinishedTasks = result.state.tasks.filter((task) => !task.claimed);
    const alreadySentToday = isSameCSTDay(result.state.lastDeadlineReminderAt ?? 0, nowMs);
    const withinWarningWindow = nowMs >= endOfDay - ONE_HOUR_MS && nowMs < endOfDay;
    const shouldSendReminder = withinWarningWindow
      && !alreadySentToday
      && (pendingCheckIn || unfinishedTasks.length > 0);

    nextRefreshMs = result.state.nextRefreshMs;

    const rotationSideEffects = applyRotationSideEffects({
      transaction,
      uid,
      username: getUserDisplayName(userData),
      notificationSettings: userData.notificationSettings,
      result,
      nowMs,
    });
    let notificationChanged = rotationSideEffects.notificationQueued;

    const nextState: DailyTasksState = shouldSendReminder
      ? {
        ...result.state,
        lastDeadlineReminderAt: nowMs,
      }
      : result.state;

    if (result.rotated || shouldSendReminder || (result.state.nextRefreshMs !== readTaskTimestampMs(userData.dailyTasksState?.nextRefreshMs))) {
      transaction.update(userRef, {
        dailyTasksState: stripUndefinedDeep(nextState),
      });
    }

    if (!shouldSendReminder) {
      return {
        sent: false,
        taskChanged: result.rotated,
        notificationChanged,
        nowMs,
      };
    }

    sent = true;
    writeTaskLifecycleEvent(transaction, {
      type: "reminder_sent",
      taskId: unfinishedTasks[0]?.id ?? "daily_deadline",
      title: "Daily deadline reminder",
      triggerEvent: "daily_task_deadline_reminder",
      userId: uid,
      username: getUserDisplayName(userData),
      reward: 0,
      potentialRewardGd: 0,
      creditedRewardGd: 0,
      forfeitedPotentialRewardGd: 0,
      reminderPotentialRewardGd: unfinishedTasks.reduce((sum, task) => sum + Math.max(0, task.reward || 0), 0),
      progress: unfinishedTasks.length,
      maxProgress: DAILY_TASK_LIMIT,
      timestamp: nowMs,
      reason: pendingCheckIn && unfinishedTasks.length > 0
        ? "tasks_and_checkin"
        : pendingCheckIn
          ? "checkin"
          : "tasks",
      rewardEventState: "reminder_only",
    });
    incrementEventStat(transaction, "daily_task_deadline_reminder_sent", nowMs, {
      pending_checkin: pendingCheckIn,
      unfinished_tasks: unfinishedTasks.length,
    });

    if (userData.notificationSettings?.inAppEnabled !== false) {
      queueUserNotification(transaction, uid, nowMs, {
        title: "You're almost out of time!",
        message: "Finish your tasks so you don't lose your Kandy!",
        type: "warning",
        link: "/experiences",
      });
      notificationChanged = true;
    }
    return {
      sent: true,
      taskChanged: true,
      notificationChanged,
      nowMs,
    };
  });

  if (reminderResult?.taskChanged || reminderResult?.notificationChanged) {
    await touchUserRuntime(uid, {
      ...(reminderResult.notificationChanged ? { notifications: true } : {}),
      ...(reminderResult.taskChanged ? { tasks: true } : {}),
    }, reminderResult.nowMs);
  }

  return {
    sent,
    nextRefreshMs,
  };
}
