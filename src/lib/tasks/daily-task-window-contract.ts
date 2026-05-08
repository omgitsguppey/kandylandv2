import { getCSTDateKey, getCSTDayBoundaries } from "@/lib/timezone";

export type DailyTaskWindowState =
  | "not_started"
  | "active"
  | "completed"
  | "expired"
  | "repair_required";

export type DailyTaskAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "claimed"
  | "expired"
  | "repair_required";

export interface DailyTaskWindowContract {
  dailyTaskWindowId: string;
  windowStartAtUtc: string;
  windowEndAtUtc: string;
  resetAtUtc: string;
  windowStartMs: number;
  windowEndMs: number;
}

export function createDailyTaskWindowContract(nowMs: number = Date.now()): DailyTaskWindowContract {
  const { startOfDay, endOfDay } = getCSTDayBoundaries(nowMs);
  return {
    dailyTaskWindowId: getCSTDateKey(nowMs),
    windowStartAtUtc: new Date(startOfDay).toISOString(),
    windowEndAtUtc: new Date(endOfDay).toISOString(),
    resetAtUtc: new Date(endOfDay).toISOString(),
    windowStartMs: startOfDay,
    windowEndMs: endOfDay,
  };
}

export function isActiveDailyTaskWindow(nowMs: number, window: DailyTaskWindowContract) {
  return nowMs >= window.windowStartMs && nowMs < window.windowEndMs;
}

export function getDailyTaskWindowState(input: {
  nowMs: number;
  window: DailyTaskWindowContract;
  hasAssignments: boolean;
  allClaimed: boolean;
  repairRequired?: boolean;
}): DailyTaskWindowState {
  if (input.repairRequired) {
    return "repair_required";
  }

  if (!input.hasAssignments) {
    return "not_started";
  }

  if (input.nowMs >= input.window.windowEndMs) {
    return input.allClaimed ? "completed" : "expired";
  }

  return input.allClaimed ? "completed" : "active";
}
