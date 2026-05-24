import type { DailyTaskStatus } from "@/lib/tasks/daily-task-contract";

export type DailyTaskDurationConfidence = "exact" | "active_session_estimated" | "unavailable";
export type DailyTaskVisibilityState = "visible" | "hidden" | "unknown";
export type DailyTaskAbandonmentReason =
  | "inactive_after_start"
  | "hidden_after_start"
  | "not_abandoned";

export type DailyTaskDurationStart = {
  taskId: string;
  startedAt: number;
  pageViewedAt: number | null;
  confidence: Exclude<DailyTaskDurationConfidence, "unavailable">;
};

export type DailyTaskDurationResult = {
  durationMs: number | null;
  confidence: DailyTaskDurationConfidence;
  usedPassivePageTime: false;
};

export type DailyTaskFinishedDuration = DailyTaskDurationResult & {
  status: Extract<DailyTaskStatus, "completed" | "rewarded" | "failed"> | "abandoned";
  startedAt: number | null;
  finishedAt: number;
  failureReason: string | null;
};

export const DAILY_TASK_ABANDON_THRESHOLD_MS = 60_000;

function normalizeTimestamp(value: unknown): number | null {
  if (!Number.isFinite(value)) return null;
  const normalized = Math.floor(Number(value));
  return normalized > 0 ? normalized : null;
}

function isVisible(visibilityState?: DailyTaskVisibilityState) {
  return visibilityState === "visible" || visibilityState === undefined || visibilityState === "unknown";
}

export function startDailyTaskDuration(input: {
  taskId: string;
  nowMs?: number;
  pageViewedAt?: number | null;
  visibilityState?: DailyTaskVisibilityState;
}): DailyTaskDurationStart {
  const nowMs = normalizeTimestamp(input.nowMs) ?? Date.now();
  return {
    taskId: input.taskId,
    startedAt: nowMs,
    pageViewedAt: normalizeTimestamp(input.pageViewedAt),
    confidence: isVisible(input.visibilityState) ? "exact" : "active_session_estimated",
  };
}

export function computeDailyTaskActiveDuration(input: {
  startedAt?: number | null;
  attemptedAt?: number | null;
  completedAt?: number | null;
  failedAt?: number | null;
  abandonedAt?: number | null;
  pageViewedAt?: number | null;
  visibilityState?: DailyTaskVisibilityState;
}): DailyTaskDurationResult {
  const activeStart = normalizeTimestamp(input.attemptedAt) ?? normalizeTimestamp(input.startedAt);
  const activeEnd = normalizeTimestamp(input.completedAt) ?? normalizeTimestamp(input.failedAt) ?? normalizeTimestamp(input.abandonedAt);

  if (!activeStart || !activeEnd || activeEnd < activeStart || input.visibilityState === "hidden") {
    return {
      durationMs: null,
      confidence: "unavailable",
      usedPassivePageTime: false,
    };
  }

  return {
    durationMs: Math.max(0, activeEnd - activeStart),
    confidence: normalizeTimestamp(input.attemptedAt) ? "exact" : "active_session_estimated",
    usedPassivePageTime: false,
  };
}

export function finishDailyTaskDuration(input: {
  startedAt?: number | null;
  attemptedAt?: number | null;
  finishedAt?: number;
  status: DailyTaskFinishedDuration["status"];
  failureReason?: string | null;
  visibilityState?: DailyTaskVisibilityState;
}): DailyTaskFinishedDuration {
  const finishedAt = normalizeTimestamp(input.finishedAt) ?? Date.now();
  const duration = computeDailyTaskActiveDuration({
    startedAt: input.startedAt,
    attemptedAt: input.attemptedAt,
    completedAt: input.status === "completed" || input.status === "rewarded" ? finishedAt : null,
    failedAt: input.status === "failed" ? finishedAt : null,
    abandonedAt: input.status === "abandoned" ? finishedAt : null,
    visibilityState: input.visibilityState,
  });

  return {
    ...duration,
    status: input.status,
    startedAt: normalizeTimestamp(input.startedAt),
    finishedAt,
    failureReason: input.failureReason ?? null,
  };
}

export function classifyDailyTaskAbandonment(input: {
  startedAt?: number | null;
  lastInteractionAt?: number | null;
  nowMs?: number;
  thresholdMs?: number;
  visibilityState?: DailyTaskVisibilityState;
}): {
  abandoned: boolean;
  thresholdMs: number;
  failureReason: DailyTaskAbandonmentReason;
  abandonedAt: number | null;
} {
  const thresholdMs = Math.max(1, Math.floor(input.thresholdMs ?? DAILY_TASK_ABANDON_THRESHOLD_MS));
  const startedAt = normalizeTimestamp(input.startedAt);
  const nowMs = normalizeTimestamp(input.nowMs) ?? Date.now();
  const lastInteractionAt = normalizeTimestamp(input.lastInteractionAt) ?? startedAt;

  if (!startedAt || !lastInteractionAt) {
    return {
      abandoned: false,
      thresholdMs,
      failureReason: "not_abandoned",
      abandonedAt: null,
    };
  }

  if (input.visibilityState === "hidden" && nowMs - lastInteractionAt >= thresholdMs) {
    return {
      abandoned: true,
      thresholdMs,
      failureReason: "hidden_after_start",
      abandonedAt: nowMs,
    };
  }

  if (nowMs - lastInteractionAt >= thresholdMs) {
    return {
      abandoned: true,
      thresholdMs,
      failureReason: "inactive_after_start",
      abandonedAt: nowMs,
    };
  }

  return {
    abandoned: false,
    thresholdMs,
    failureReason: "not_abandoned",
    abandonedAt: null,
  };
}
