import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  BUILT_IN_DAILY_TASKS,
  DAILY_TASK_COOLDOWN_DAYS,
  DAILY_TASK_LIMIT,
  DailyTaskActionType,
  DailyTaskAssignment,
  DailyTaskCriteria,
  DailyTaskDefinition,
  DailyTaskGroup,
  DailyTaskIconName,
  DailyTasksState,
} from "@/lib/tasks/task-catalog";
import { getCSTDayBoundaries } from "@/lib/timezone";
import { UserProfile } from "@/types/db";

const TASK_DEFINITION_COLLECTION = "daily_task_definitions";
const TASK_EVENT_COLLECTION = "daily_task_events";
const EVENT_STATS_COLLECTION = "analytics_event_stats";

type EventParams = Record<string, string | number | boolean> | undefined;

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
    actionType: typeof source.actionType === "string" ? source.actionType as DailyTaskAssignment["actionType"] : undefined,
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

  const definitionId = partial.id;
  if (!definitionId) {
    return null;
  }

  const definition = definitions.get(definitionId);
  if (!definition) {
    return null;
  }

  return {
    ...definition,
    progress: Math.max(0, Math.min(partial.progress ?? 0, definition.maxProgress)),
    claimed: partial.claimed ?? false,
    progressKeys: partial.progressKeys ?? [],
    assignedAt: partial.assignedAt || nowMs,
    startedAt: partial.startedAt,
    claimedAt: partial.claimedAt,
  };
}

function getCooldownMs(task: DailyTaskDefinition): number {
  const days = task.cooldownDays ?? DAILY_TASK_COOLDOWN_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }
  return next;
}

function pickTasksForCycle(
  definitions: DailyTaskDefinition[],
  history: Record<string, number>,
  nowMs: number,
): DailyTaskDefinition[] {
  const eligible = definitions.filter((task) => {
    const lastCompletedAt = history[task.id] ?? 0;
    return nowMs - lastCompletedAt >= getCooldownMs(task);
  });

  const pool = eligible.length >= DAILY_TASK_LIMIT ? eligible : definitions;
  const prioritized = shuffle(pool.filter((task) => task.source !== "built_in"));
  const builtIns = shuffle(pool.filter((task) => task.source === "built_in"));
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

  prioritized.forEach(pushIfPossible);
  builtIns.forEach(pushIfPossible);

  if (selected.length < DAILY_TASK_LIMIT) {
    shuffle(pool).forEach((task) => {
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
      reward: Number.isFinite(data.reward) ? Number(data.reward) : 100,
      maxProgress: Number.isFinite(data.maxProgress) ? Number(data.maxProgress) : 1,
      eventName: data.eventName,
      actionType: data.actionType as DailyTaskActionType,
      ctaLabel: typeof data.ctaLabel === "string" ? data.ctaLabel : "Keep going",
      icon: data.icon as DailyTaskIconName,
      group: data.group as DailyTaskGroup,
      cooldownDays: Number.isFinite(data.cooldownDays) ? Number(data.cooldownDays) : DAILY_TASK_COOLDOWN_DAYS,
      active: data.active === true,
      targetUserId: typeof data.targetUserId === "string" ? data.targetUserId : null,
      customTaskId: doc.id,
      createdAt: Number.isFinite(data.createdAt) ? Number(data.createdAt) : undefined,
      updatedAt: Number.isFinite(data.updatedAt) ? Number(data.updatedAt) : undefined,
    });
  });

  return tasks;
}

function createDefinitionMap(definitions: DailyTaskDefinition[]) {
  return new Map(definitions.map((task) => [task.id, task]));
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
    completedTaskHistory: normalizeHistory(currentState?.completedTaskHistory),
    completedOneTimeTasks: normalizeStringArray(currentState?.completedOneTimeTasks),
  };
}

export async function resolveTaskDefinitionsForUser(uid: string): Promise<DailyTaskDefinition[]> {
  const customDefinitions = await fetchCustomTaskDefinitions(uid);
  return [...BUILT_IN_DAILY_TASKS, ...customDefinitions];
}

export function buildFreshTaskState(
  userData: UserProfile,
  definitions: DailyTaskDefinition[],
  nowMs: number,
): { state: DailyTasksState; rotated: boolean } {
  const definitionMap = createDefinitionMap(definitions);
  const normalizedState = normalizeTaskState(userData, definitionMap, nowMs);
  const { startOfDay, endOfDay } = getCSTDayBoundaries(nowMs);
  const needsRotation = normalizedState.lastResetMs < startOfDay || normalizedState.tasks.length === 0;

  if (!needsRotation) {
    return {
      rotated: false,
      state: {
        ...normalizedState,
        nextRefreshMs: normalizedState.nextRefreshMs || endOfDay,
      },
    };
  }

  const selectedDefinitions = pickTasksForCycle(definitions, normalizedState.completedTaskHistory ?? {}, nowMs);
  const tasks = selectedDefinitions.map((task) => hydrateAssignment(task, nowMs));

  return {
    rotated: true,
    state: {
      lastResetMs: startOfDay,
      nextRefreshMs: endOfDay,
      tasks,
      completedTaskHistory: normalizedState.completedTaskHistory ?? {},
      completedOneTimeTasks: normalizedState.completedOneTimeTasks ?? [],
    },
  };
}

export async function rotateUserTasks(uid: string) {
  const userRef = adminDb.collection("users").doc(uid);
  const definitions = await resolveTaskDefinitionsForUser(uid);
  let responseTasks: DailyTaskAssignment[] = [];
  let responseNextRefreshMs = 0;
  let rotated = false;

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      throw new Error("User not found");
    }

    const userData = snapshot.data() as UserProfile;
    const result = buildFreshTaskState(userData, definitions, Date.now());
    responseTasks = result.state.tasks;
    responseNextRefreshMs = result.state.nextRefreshMs;
    rotated = result.rotated;

    transaction.update(userRef, {
      dailyTasksState: result.state,
    });

    if (result.rotated) {
      result.state.tasks.forEach((task) => {
        const eventRef = adminDb.collection(TASK_EVENT_COLLECTION).doc();
        transaction.set(eventRef, {
          type: "assigned",
          taskId: task.id,
          title: task.title,
          triggerEvent: task.eventName,
          userId: uid,
          reward: task.reward,
          progress: 0,
          maxProgress: task.maxProgress,
          timestamp: Date.now(),
        });
        transaction.set(adminDb.collection(EVENT_STATS_COLLECTION).doc("daily_task_assigned"), {
          eventName: "daily_task_assigned",
          totalCount: FieldValue.increment(1),
          lastSeenAt: Date.now(),
          lastParams: {
            task_id: task.id,
            reward: task.reward,
          },
        }, { merge: true });
      });
    }
  });

  return {
    tasks: responseTasks,
    nextRefreshMs: responseNextRefreshMs,
    rotated,
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

export async function recordDailyTaskProgressFromEvent(
  uid: string,
  username: string | null,
  eventName: string,
  eventParams: EventParams,
) {
  const userRef = adminDb.collection("users").doc(uid);
  const definitions = await resolveTaskDefinitionsForUser(uid);
  const definitionMap = createDefinitionMap(definitions);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      return;
    }

    const userData = snapshot.data() as UserProfile;
    const nowMs = Date.now();
    const { state } = buildFreshTaskState(userData, definitions, nowMs);
    const updatedTasks = [...state.tasks];
    let totalReward = 0;
    let stateChanged = false;

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
        const eventRef = adminDb.collection(TASK_EVENT_COLLECTION).doc();
        transaction.set(eventRef, {
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
        });
        transaction.set(adminDb.collection(EVENT_STATS_COLLECTION).doc("daily_task_started"), {
          eventName: "daily_task_started",
          totalCount: FieldValue.increment(1),
          lastSeenAt: nowMs,
          lastParams: {
            task_id: task.id,
            trigger_event: eventName,
          },
        }, { merge: true });
      }

      if (justCompleted) {
        totalReward += task.reward;
        const completionRef = adminDb.collection(TASK_EVENT_COLLECTION).doc();
        transaction.set(completionRef, {
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
        });
        transaction.set(adminDb.collection(EVENT_STATS_COLLECTION).doc("daily_task_completed"), {
          eventName: "daily_task_completed",
          totalCount: FieldValue.increment(1),
          lastSeenAt: nowMs,
          lastParams: {
            task_id: task.id,
            trigger_event: eventName,
            reward: task.reward,
          },
        }, { merge: true });

        const txRef = adminDb.collection("transactions").doc();
        transaction.set(txRef, {
          userId: uid,
          amount: task.reward,
          type: "daily_reward",
          description: `Daily Task: ${task.title}`,
          timestamp: FieldValue.serverTimestamp(),
        });
      }
    });

    if (!stateChanged) {
      if (state.lastResetMs !== (userData.dailyTasksState?.lastResetMs ?? 0)) {
        transaction.update(userRef, { dailyTasksState: state });
      }
      return;
    }

    const completedTaskHistory = {
      ...(state.completedTaskHistory ?? {}),
    };

    updatedTasks.forEach((task) => {
      if (task.claimed && task.claimedAt) {
        completedTaskHistory[task.id] = task.claimedAt;
      }
    });

    transaction.update(userRef, {
      dailyTasksState: {
        ...state,
        tasks: updatedTasks,
        completedTaskHistory,
      },
      ...(totalReward > 0 ? { gumDropsBalance: FieldValue.increment(totalReward) } : {}),
    });
  });
}
