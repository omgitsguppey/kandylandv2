import { APP_TIMEZONE, getCSTDayBoundaries } from "@/lib/timezone";
import type { DailyTaskResetPolicy, DailyTaskRewardSource } from "@/lib/tasks/daily-task-contract";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type TaskResetInput = {
  taskId: string;
  resetPolicy?: DailyTaskResetPolicy;
  completedAt?: number | null;
  nowMs?: number;
};

export type TaskResetResolution = {
  taskId: string;
  resetPolicy: DailyTaskResetPolicy;
  resetAnchor: "central_midnight" | "completed_at_plus_24h" | "unknown_legacy";
  timezone: typeof APP_TIMEZONE;
  completedAt: number | null;
  nowMs: number;
  nextEligibleAt: number | null;
  eligibleNow: boolean;
  legacyClassification: "known" | "unknown_legacy";
};

export type TaskEligibilityResolution = {
  eligible: boolean;
  status: "available" | "locked_until_reset" | "unknown_legacy";
  nextEligibleAt: number | null;
  reason: "available_now" | "locked_until_reset" | "unknown_legacy_reset_anchor";
  explanation: string;
};

export type DuplicateRewardClaimResolution = {
  allowed: boolean;
  reason: "no_prior_claim" | "duplicate_within_reset_window" | "unknown_legacy_reset_anchor";
  rewardSource: DailyTaskRewardSource;
  nextEligibleAt: number | null;
  provenDuplicate: boolean;
  explanation: string;
};

function normalizeTimestamp(value: unknown): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const timestamp = Math.floor(Number(value));
  return timestamp > 0 ? timestamp : null;
}

function inferResetPolicy(input: TaskResetInput): DailyTaskResetPolicy {
  if (input.resetPolicy) {
    return input.resetPolicy;
  }

  return input.taskId === "check_in_today" ? "calendar_day" : "calendar_day";
}

export function resolveTaskResetPolicy(input: TaskResetInput): TaskResetResolution {
  const nowMs = normalizeTimestamp(input.nowMs) ?? Date.now();
  const completedAt = normalizeTimestamp(input.completedAt);
  const resetPolicy = inferResetPolicy(input);

  if (resetPolicy === "unknown_legacy") {
    return {
      taskId: input.taskId,
      resetPolicy,
      resetAnchor: "unknown_legacy",
      timezone: APP_TIMEZONE,
      completedAt,
      nowMs,
      nextEligibleAt: null,
      eligibleNow: false,
      legacyClassification: "unknown_legacy",
    };
  }

  if (!completedAt) {
    return {
      taskId: input.taskId,
      resetPolicy,
      resetAnchor: resetPolicy === "rolling_24h" ? "completed_at_plus_24h" : "central_midnight",
      timezone: APP_TIMEZONE,
      completedAt: null,
      nowMs,
      nextEligibleAt: nowMs,
      eligibleNow: true,
      legacyClassification: "known",
    };
  }

  if (resetPolicy === "rolling_24h") {
    const nextEligibleAt = completedAt + ONE_DAY_MS;
    return {
      taskId: input.taskId,
      resetPolicy,
      resetAnchor: "completed_at_plus_24h",
      timezone: APP_TIMEZONE,
      completedAt,
      nowMs,
      nextEligibleAt,
      eligibleNow: nowMs >= nextEligibleAt,
      legacyClassification: "known",
    };
  }

  const completedWindow = getCSTDayBoundaries(completedAt);
  const nextEligibleAt = completedWindow.endOfDay;
  return {
    taskId: input.taskId,
    resetPolicy: "calendar_day",
    resetAnchor: "central_midnight",
    timezone: APP_TIMEZONE,
    completedAt,
    nowMs,
    nextEligibleAt,
    eligibleNow: nowMs >= nextEligibleAt,
    legacyClassification: "known",
  };
}

export function computeNextEligibleAt(input: TaskResetInput | TaskResetResolution): number | null {
  const resolution = "nextEligibleAt" in input ? input : resolveTaskResetPolicy(input);
  return resolution.nextEligibleAt;
}

export function isTaskEligibleNow(input: TaskResetInput | TaskResetResolution): TaskEligibilityResolution {
  const resolution = "eligibleNow" in input ? input : resolveTaskResetPolicy(input);

  if (resolution.resetPolicy === "unknown_legacy" || resolution.legacyClassification === "unknown_legacy") {
    return {
      eligible: false,
      status: "unknown_legacy",
      nextEligibleAt: null,
      reason: "unknown_legacy_reset_anchor",
      explanation: "Legacy task data is missing a reset anchor, so reward eligibility is unavailable until the source is reconciled.",
    };
  }

  if (resolution.eligibleNow) {
    return {
      eligible: true,
      status: "available",
      nextEligibleAt: resolution.nextEligibleAt,
      reason: "available_now",
      explanation: "Task is eligible now under the explicit reset policy.",
    };
  }

  return {
    eligible: false,
    status: "locked_until_reset",
    nextEligibleAt: resolution.nextEligibleAt,
    reason: "locked_until_reset",
    explanation: explainTaskReset(resolution),
  };
}

export function explainTaskReset(input: TaskResetInput | TaskResetResolution): string {
  const resolution = "eligibleNow" in input ? input : resolveTaskResetPolicy(input);

  if (resolution.resetPolicy === "unknown_legacy") {
    return "Reset timing is unknown because the legacy task record has no trusted reset anchor.";
  }

  if (resolution.resetPolicy === "rolling_24h") {
    return "This task resets on a rolling 24-hour window after the last completed timestamp.";
  }

  return `This task resets by calendar day at Central-time midnight (${resolution.timezone}).`;
}

export function classifyResetBoundary(input: TaskResetInput | TaskResetResolution) {
  const resolution = "eligibleNow" in input ? input : resolveTaskResetPolicy(input);

  return {
    boundary: resolution.resetAnchor,
    policy: resolution.resetPolicy,
    timezone: resolution.timezone,
    legacyClassification: resolution.legacyClassification,
    nextEligibleAt: resolution.nextEligibleAt,
  };
}

export function preventDuplicateRewardClaim(input: TaskResetInput & {
  existingReceiptKey?: string | null;
}): DuplicateRewardClaimResolution {
  const resolution = resolveTaskResetPolicy(input);
  const eligibility = isTaskEligibleNow(resolution);

  if (eligibility.reason === "unknown_legacy_reset_anchor") {
    return {
      allowed: false,
      reason: "unknown_legacy_reset_anchor",
      rewardSource: "reward_gd_only",
      nextEligibleAt: null,
      provenDuplicate: false,
      explanation: eligibility.explanation,
    };
  }

  const hasPriorClaim = Boolean(input.existingReceiptKey) || Boolean(resolution.completedAt);
  if (hasPriorClaim && !eligibility.eligible) {
    return {
      allowed: false,
      reason: "duplicate_within_reset_window",
      rewardSource: "reward_gd_only",
      nextEligibleAt: resolution.nextEligibleAt,
      provenDuplicate: true,
      explanation: "Reward was already claimed inside the current reset window.",
    };
  }

  return {
    allowed: true,
    reason: "no_prior_claim",
    rewardSource: "reward_gd_only",
    nextEligibleAt: resolution.nextEligibleAt,
    provenDuplicate: false,
    explanation: "No duplicate reward claim was found for this reset window.",
  };
}
