export type TaskRewardTier = "easy" | "medium" | "high" | "premium";

const DAILY_TASK_GLOBAL_MIN_REWARD_GD = 30;
const DAILY_TASK_GLOBAL_MAX_REWARD_GD = 600;
const DAILY_TASK_REWARD_VERSION = 3;
const DAILY_TASK_REWARD_MULTIPLIERS = {
  2: 0.75,
  3: 0.6,
} as const;

const TASK_REWARD_TIER_BOUNDS: Record<TaskRewardTier, { minRewardGd: number; maxRewardGd: number }> = {
  easy: { minRewardGd: DAILY_TASK_GLOBAL_MIN_REWARD_GD, maxRewardGd: 100 },
  medium: { minRewardGd: 50, maxRewardGd: 300 },
  high: { minRewardGd: 100, maxRewardGd: 600 },
  premium: { minRewardGd: 250, maxRewardGd: 600 },
};

export type DailyTaskRewardNormalizationIssue =
  | "legacy_reward_version_converted"
  | "reward_clamped_to_global_bounds"
  | "reward_clamped_to_tier_bounds"
  | "reward_version_missing"
  | "zero_reward_diagnostic";

export interface NormalizedDailyTaskReward {
  rewardGd: number;
  rewardTier: TaskRewardTier;
  rewardVersion: number;
  rewardSource: "daily_task";
  sourceAwareCreditType: "reward";
  economyRisk: "low" | "medium" | "high";
  minRewardGd: number;
  maxRewardGd: number;
  normalizationIssue: DailyTaskRewardNormalizationIssue[];
}

function resolveRewardTier(rewardGd: number, explicitTier?: TaskRewardTier): TaskRewardTier {
  if (explicitTier && TASK_REWARD_TIER_BOUNDS[explicitTier]) {
    return explicitTier;
  }

  if (rewardGd <= TASK_REWARD_TIER_BOUNDS.easy.maxRewardGd) {
    return "easy";
  }

  if (rewardGd <= TASK_REWARD_TIER_BOUNDS.medium.maxRewardGd) {
    return "medium";
  }

  if (rewardGd <= TASK_REWARD_TIER_BOUNDS.high.maxRewardGd) {
    return "high";
  }

  return "premium";
}

export function normalizeDailyTaskRewardVNext(input: {
  rawReward: unknown;
  rewardVersion?: unknown;
  rewardTier?: TaskRewardTier;
  allowZeroRewardDiagnostic?: boolean;
}): NormalizedDailyTaskReward {
  const normalizationIssue: DailyTaskRewardNormalizationIssue[] = [];
  const numericReward = Number(input.rawReward);
  const storedRewardVersion = Number(input.rewardVersion);
  const hasStoredVersion = Number.isFinite(storedRewardVersion) && storedRewardVersion > 0;

  let normalizedReward = Number.isFinite(numericReward) ? numericReward : DAILY_TASK_GLOBAL_MIN_REWARD_GD;
  if (hasStoredVersion && storedRewardVersion !== DAILY_TASK_REWARD_VERSION) {
    const storedMultiplier = DAILY_TASK_REWARD_MULTIPLIERS[storedRewardVersion as keyof typeof DAILY_TASK_REWARD_MULTIPLIERS];
    if (typeof storedMultiplier === "number" && storedMultiplier > 0) {
      const rawEquivalent = normalizedReward / storedMultiplier;
      const currentMultiplier = DAILY_TASK_REWARD_MULTIPLIERS[DAILY_TASK_REWARD_VERSION];
      normalizedReward = rawEquivalent * currentMultiplier;
      normalizationIssue.push("legacy_reward_version_converted");
    } else {
      normalizationIssue.push("reward_version_missing");
    }
  } else if (!hasStoredVersion) {
    normalizationIssue.push("reward_version_missing");
  }

  if (input.allowZeroRewardDiagnostic === true && normalizedReward === 0) {
    normalizationIssue.push("zero_reward_diagnostic");
  }

  const clampedGlobalReward = Math.min(DAILY_TASK_GLOBAL_MAX_REWARD_GD, Math.max(DAILY_TASK_GLOBAL_MIN_REWARD_GD, Math.round(normalizedReward)));
  if (clampedGlobalReward !== Math.round(normalizedReward)) {
    normalizationIssue.push("reward_clamped_to_global_bounds");
  }

  const rewardTier = resolveRewardTier(clampedGlobalReward, input.rewardTier);
  const tierBounds = TASK_REWARD_TIER_BOUNDS[rewardTier];
  const tierClampedReward = Math.min(tierBounds.maxRewardGd, Math.max(tierBounds.minRewardGd, clampedGlobalReward));
  if (tierClampedReward !== clampedGlobalReward) {
    normalizationIssue.push("reward_clamped_to_tier_bounds");
  }

  const rewardGd = Math.max(DAILY_TASK_GLOBAL_MIN_REWARD_GD, Math.min(DAILY_TASK_GLOBAL_MAX_REWARD_GD, tierClampedReward));
  const economyRisk = rewardTier === "premium" ? "high" : rewardTier === "high" ? "medium" : "low";

  return {
    rewardGd,
    rewardTier,
    rewardVersion: DAILY_TASK_REWARD_VERSION,
    rewardSource: "daily_task",
    sourceAwareCreditType: "reward",
    economyRisk,
    minRewardGd: DAILY_TASK_GLOBAL_MIN_REWARD_GD,
    maxRewardGd: DAILY_TASK_GLOBAL_MAX_REWARD_GD,
    normalizationIssue,
  };
}

export function getDailyTaskRewardBounds() {
  return {
    minRewardGd: DAILY_TASK_GLOBAL_MIN_REWARD_GD,
    maxRewardGd: DAILY_TASK_GLOBAL_MAX_REWARD_GD,
  };
}
