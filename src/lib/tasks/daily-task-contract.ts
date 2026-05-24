import { APP_TIMEZONE } from "@/lib/timezone";

export type DailyTaskKind = "daily_check_in" | "daily_task" | "legacy_daily_task";
export type DailyTaskRewardSource = "reward_gd_only";
export type DailyTaskResetPolicy = "rolling_24h" | "calendar_day" | "unknown_legacy";
export type DailyTaskStatus =
  | "available"
  | "started"
  | "in_progress"
  | "completed"
  | "rewarded"
  | "failed"
  | "expired"
  | "locked_until_reset"
  | "unknown_legacy";

export type DailyTaskContract = {
  taskId: string;
  taskKind: DailyTaskKind;
  label: string;
  guidancePrompt: string;
  requiredAction: string;
  eligibilitySource: "user_profile.lastCheckIn" | "dailyTasksState" | "legacy_candidate";
  rewardGdAmount: number;
  rewardSource: DailyTaskRewardSource;
  resetPolicy: DailyTaskResetPolicy;
  resetAnchor: "central_midnight" | "completed_at_plus_24h" | "unknown_legacy";
  timezone: typeof APP_TIMEZONE;
  startedAt: number | null;
  completedAt: number | null;
  failedAt: number | null;
  durationMs: number | null;
  status: DailyTaskStatus;
  failureReason: string | null;
  telemetryEvents: string[];
  debugVisibility: {
    lane: "Daily tasks/reset";
    rawDetailsCollapsedByDefault: true;
  };
  featureRegistrationId: "daily_checkin";
};

export type DailyTaskDebugLane = {
  lane: "Daily tasks/reset";
  resetPolicy: DailyTaskResetPolicy;
  resetAnchor: DailyTaskContract["resetAnchor"];
  timezone: typeof APP_TIMEZONE;
  duplicateClaimGuard: boolean;
  rewardSourceTruth: DailyTaskRewardSource;
  failureCount: number;
  unknownLegacyCount: number;
  rawDetailsCollapsedByDefault: true;
  debugVisibility: "summary_first";
};

export const DAILY_CHECK_IN_TASK_CONTRACT: DailyTaskContract = {
  taskId: "check_in_today",
  taskKind: "daily_check_in",
  label: "Daily check-in",
  guidancePrompt: "Claim today's reward before the Central-time daily reset.",
  requiredAction: "Authenticated user submits POST /api/checkin.",
  eligibilitySource: "user_profile.lastCheckIn",
  rewardGdAmount: 10,
  rewardSource: "reward_gd_only",
  resetPolicy: "calendar_day",
  resetAnchor: "central_midnight",
  timezone: APP_TIMEZONE,
  startedAt: null,
  completedAt: null,
  failedAt: null,
  durationMs: null,
  status: "available",
  failureReason: null,
  telemetryEvents: [
    "daily_checkin_claimed",
    "daily_task_progressed",
    "daily_task_claimed",
    "daily_task_claim_duplicate_prevented",
  ],
  debugVisibility: {
    lane: "Daily tasks/reset",
    rawDetailsCollapsedByDefault: true,
  },
  featureRegistrationId: "daily_checkin",
};

export function buildDailyTaskDebugLane(input?: {
  duplicateClaimGuard?: boolean;
  failureCount?: number;
  unknownLegacyCount?: number;
}): DailyTaskDebugLane {
  return {
    lane: "Daily tasks/reset",
    resetPolicy: DAILY_CHECK_IN_TASK_CONTRACT.resetPolicy,
    resetAnchor: DAILY_CHECK_IN_TASK_CONTRACT.resetAnchor,
    timezone: APP_TIMEZONE,
    duplicateClaimGuard: input?.duplicateClaimGuard ?? true,
    rewardSourceTruth: "reward_gd_only",
    failureCount: input?.failureCount ?? 0,
    unknownLegacyCount: input?.unknownLegacyCount ?? 0,
    rawDetailsCollapsedByDefault: true,
    debugVisibility: "summary_first",
  };
}
