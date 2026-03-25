import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";

import { normalizeNotificationDoc } from "@/lib/notification-contracts";
import { adminDb } from "@/lib/server/firebase-admin";
import { hasUnreadNotificationsForUser, isUnreadNotificationForUser } from "@/lib/server/notification-inbox";
import { getDropAssetCount } from "@/lib/drop-presentation";
import {
  BUILT_IN_DAILY_TASKS,
  DAILY_TASK_COOLDOWN_DAYS,
  DAILY_TASK_LIMIT,
  DAILY_TASK_REWARD_VERSION,
  type DailyTaskActionType,
  type DailyTaskAssignment,
  type DailyTaskCriteria,
  type DailyTaskDefinition,
  type DailyTaskGroup,
  type DailyTaskIconName,
  type DailyTasksState,
  resolveDailyTaskReward,
} from "@/lib/tasks/task-catalog";
import { isDropActiveNow } from "@/lib/drop-status";
import { getCSTDayBoundaries, isSameCSTDay } from "@/lib/timezone";
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
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const CANONICAL_TASK_EVENT_NAMES = new Set([
  "daily_check_in_claim",
  "unlock_drop_success",
  "gumdrops_purchase_completed",
  "task_notifications_enabled",
  "feedback_submitted",
]);

type EventParams = Record<string, string | number | boolean> | undefined;
type RotationReason = "initial" | "cycle_complete" | "missed_progress";

interface TaskStateBuildResult {
  state: DailyTasksState;
  rotated: boolean;
  rotationReason: RotationReason | null;
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
  const id = typeof source.id === "string" ? source.id : "";
  if (!id) {
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
    progressKeys: normalizeStringArray(source.progressKeys),
    uniqueByParamKey: typeof source.uniqueByParamKey === "string" ? source.uniqueByParamKey : undefined,
    cooldownDays: Number.isFinite(source.cooldownDays) ? Number(source.cooldownDays) : undefined,
    rewardVersion: Number.isFinite(source.rewardVersion) ? Number(source.rewardVersion) : undefined,
    criteria: source.criteria as DailyTaskCriteria | undefined,
  };
}

function hydrateAssignment(definition: DailyTaskDefinition, nowMs: number): DailyTaskAssignment {
  return {
    ...definition,
    progress: 0,
    claimed: false,
    progressKeys: [],
    assignedAt: nowMs,
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
  "daily_check_in_claim",
  "drop_preview_opened",
  "view_drop_details",
  "unlock_drop_success",
  "viewer_opened",
  "viewer_session_completed",
  "viewer_asset_completed",
  "viewer_asset_consumed",
  "viewer_watch_checkpoint",
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
    .map((task) => ({
      task,
      score: computeTaskPriorityScore(task, history, nowMs),
      tieBreaker: Math.random(),
    }))
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

    if (task.eventName === "daily_check_in_claim" && eligibility.hasCheckedInToday) {
      return false;
    }

    const requiresUnlockedContent = task.eventName === "viewer_opened"
      || task.eventName === "viewer_session_completed"
      || task.eventName === "viewer_asset_completed"
      || task.eventName === "viewer_asset_consumed"
      || task.eventName === "viewer_watch_checkpoint"
      || task.eventName === "viewer_asset_changed"
      || task.eventName === "viewer_source_downloaded"
      || task.eventName === "viewer_related_drop_clicked";

    if (requiresUnlockedContent && !eligibility.hasUnlockedContent) {
      return false;
    }

    if (task.eventName === "viewer_asset_changed" && !eligibility.hasMultiAssetUnlockedContent) {
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

    const requiresUnreadNotification = task.eventName === "notification_marked_read"
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

    tasks.push({
      id: `custom:${doc.id}`,
      source: data.scope === "user" ? "user" : "global",
      title: data.title,
      subtitle: data.subtitle,
      reward: resolveDailyTaskReward(data.reward, data.rewardVersion),
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
    lastResetMs: Number.isFinite(currentState?.lastResetMs) ? Number(currentState?.lastResetMs) : 0,
    nextRefreshMs: Number.isFinite(currentState?.nextRefreshMs) ? Number(currentState?.nextRefreshMs) : 0,
    tasks,
    retiredTaskIds: normalizeStringArray(currentState?.retiredTaskIds),
    completedTaskHistory: normalizeHistory(currentState?.completedTaskHistory),
    lastProgressAt: Number.isFinite(currentState?.lastProgressAt) ? Number(currentState?.lastProgressAt) : 0,
    lastDeadlineReminderAt: Number.isFinite(currentState?.lastDeadlineReminderAt)
      ? Number(currentState?.lastDeadlineReminderAt)
      : 0,
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
  normalizedState: DailyTasksState,
  definitions: DailyTaskDefinition[],
  nowMs: number,
  rotationReason: RotationReason,
  failedTasks: DailyTaskAssignment[],
  userData: UserProfile,
  eligibility: TaskEligibilityContext,
): TaskStateBuildResult {
  const { endOfDay } = getCSTDayBoundaries(nowMs);
  const selectedDefinitions = pickTasksForCycle(
    definitions,
    normalizedState.completedTaskHistory ?? {},
    nowMs,
    userData,
    normalizedState.retiredTaskIds ?? [],
    eligibility,
  );
  const tasks = selectedDefinitions.map((task) => hydrateAssignment(task, nowMs));

  return {
    rotated: true,
    rotationReason,
    assignedTasks: tasks,
    failedTasks,
    state: {
      lastResetMs: nowMs,
      nextRefreshMs: endOfDay,
      tasks,
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
          createdAtMs: normalized.createdAt?.toMillis() ?? 0,
        }, uid, nowMs);
      });
    })(),
    (async () => {
      if (!hasUnlockedContent) {
        return [];
      }

      const dropRefs = unlockedContentIds.map((dropId) => adminDb.collection("drops").doc(dropId));
      const snapshots = await Promise.all(dropRefs.map((dropRef) => (
        transaction ? transaction.get(dropRef) : dropRef.get()
      )));

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
): Promise<TaskStateBuildResult> {
  const definitionMap = createDefinitionMap(definitions);
  const normalizedState = normalizeTaskState(userData, definitionMap, nowMs);
  const { endOfDay } = getCSTDayBoundaries(nowMs);

  if (normalizedState.tasks.length === 0 || normalizedState.tasks.length !== DAILY_TASK_LIMIT) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(normalizedState, definitions, nowMs, "initial", [], userData, eligibility);
  }

  if (shouldRotateIncompleteCycle(normalizedState, nowMs)) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(
      normalizedState,
      definitions,
      nowMs,
      "missed_progress",
      normalizedState.tasks.filter((task) => !task.claimed),
      userData,
      eligibility,
    );
  }

  if (shouldRotateCompletedCycle(normalizedState, nowMs)) {
    const eligibility = await resolveTaskEligibilityContext(uid, userData, nowMs, transaction);
    return buildRotatedState(normalizedState, definitions, nowMs, "cycle_complete", [], userData, eligibility);
  }

  return {
    rotated: false,
    rotationReason: null,
    assignedTasks: [],
    failedTasks: [],
    state: {
      ...normalizedState,
      nextRefreshMs: endOfDay,
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
    progress: number;
    maxProgress: number;
    timestamp: number;
    reason?: string;
    assignedAt?: number;
    startedAt?: number;
    durationMs?: number;
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
    title: payload.title,
    message: payload.message,
    type: payload.type,
    target: {
      global: false,
      userIds: [uid],
      excludedUserIds: [],
    },
    link: payload.link || "/experiences",
    dropContext: null,
    createdAt: FieldValue.serverTimestamp(),
    readBy: [],
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
      progress: 0,
      maxProgress: task.maxProgress,
      timestamp: nowMs,
      assignedAt: nowMs,
    });
    incrementEventStat(transaction, "daily_task_assigned", nowMs, {
      task_id: task.id,
      reward: task.reward,
      reason: result.rotationReason ?? "initial",
    });
  });

  if (result.failedTasks.length > 0) {
    result.failedTasks.forEach((task) => {
      writeTaskLifecycleEvent(transaction, {
        type: "failed",
        taskId: task.id,
        title: task.title,
        triggerEvent: "daily_task_reset_due_inactivity",
        userId: uid,
        username,
        reward: task.reward,
        progress: task.progress,
        maxProgress: task.maxProgress,
        timestamp: nowMs,
        reason: "missed_daily_progress",
        assignedAt: task.assignedAt,
        startedAt: task.startedAt,
        durationMs: task.startedAt ? Math.max(0, nowMs - task.startedAt) : undefined,
      });
      incrementEventStat(transaction, "daily_task_failed", nowMs, {
        task_id: task.id,
        progress: task.progress,
        duration_ms: task.startedAt ? Math.max(0, nowMs - task.startedAt) : 0,
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
          progress: nextProgress,
          maxProgress: task.maxProgress,
          timestamp: nowMs,
          assignedAt: task.assignedAt,
          startedAt: nowMs,
        });
        incrementEventStat(transaction, "daily_task_started", nowMs, {
          task_id: task.id,
          trigger_event: eventName,
          assigned_delay_ms: Math.max(0, nowMs - task.assignedAt),
        });
      }

      if (justCompleted) {
        const durationMs = task.startedAt ? Math.max(0, nowMs - task.startedAt) : Math.max(0, nowMs - task.assignedAt);
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
          progress: nextProgress,
          maxProgress: task.maxProgress,
          timestamp: nowMs,
          assignedAt: task.assignedAt,
          startedAt: updatedTasks[index].startedAt,
          durationMs,
        });
        incrementEventStat(transaction, "daily_task_completed", nowMs, {
          task_id: task.id,
          trigger_event: eventName,
          reward: task.reward,
          duration_ms: durationMs,
        });

        const txRef = adminDb.collection("transactions").doc();
        const balanceBefore = ledgerBalanceCursor;
        const balanceAfter = computeNextGumdropBalance(balanceBefore, task.reward);
        ledgerBalanceCursor = balanceAfter;
        sourceAwareBalanceCursor = creditSourceAwareGumdrops(sourceAwareBalanceCursor, task.reward, "reward");
        transaction.set(txRef, buildCompletedGumdropTransaction({
          userId: uid,
          amount: task.reward,
          type: "daily_reward",
          rewardSource: "task",
          description: `Daily Task: ${task.title}`,
          balanceBefore,
          balanceAfter,
          timestampMs: nowMs,
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

    if (result.rotated || shouldSendReminder || (result.state.nextRefreshMs !== (userData.dailyTasksState?.nextRefreshMs ?? 0))) {
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
      progress: unfinishedTasks.length,
      maxProgress: DAILY_TASK_LIMIT,
      timestamp: nowMs,
      reason: pendingCheckIn && unfinishedTasks.length > 0
        ? "tasks_and_checkin"
        : pendingCheckIn
          ? "checkin"
          : "tasks",
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
