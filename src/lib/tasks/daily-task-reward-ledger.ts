import { DAILY_CHECK_IN_TASK_CONTRACT } from "@/lib/tasks/daily-task-contract";

export type DailyTaskRewardGrantSource = "task_reward";
export type DailyTaskRewardSourceOfFunds = "reward_gd";
export type DailyTaskRewardDuplicateClaimPolicy = "block_within_reset_window";
export type DailyTaskRewardLedgerDestination = "gumDropsRewardBalance";
export type DailyTaskRewardDebugStatus = "live" | "review" | "degraded";

export type DailyTaskRewardLedgerGrant = {
  rewardGrantId: string;
  taskId: string;
  userId: string;
  rewardGdAmount: number;
  rewardSource: DailyTaskRewardGrantSource;
  sourceOfFunds: DailyTaskRewardSourceOfFunds;
  grantReason: string;
  resetWindowId: string;
  idempotencyKey: string;
  duplicateClaimPolicy: DailyTaskRewardDuplicateClaimPolicy;
  ledgerDestination: DailyTaskRewardLedgerDestination;
  grantedAtMs: number;
  spendRestrictions: {
    creatorPaidExperiences: "blocked";
    paidChat: "blocked";
    fanPassStartOrRenewal: "blocked";
    normalDropUnlocks: "allowed";
  };
};

export type DailyTaskRewardTransactionExtra = {
  rewardGrantId: string;
  rewardGrantSource: DailyTaskRewardGrantSource;
  sourceOfFunds: DailyTaskRewardSourceOfFunds;
  taskId: string;
  resetWindowId: string;
  idempotencyKey: string;
  duplicateClaimPolicy: DailyTaskRewardDuplicateClaimPolicy;
  ledgerDestination: DailyTaskRewardLedgerDestination;
  spendRestrictions: DailyTaskRewardLedgerGrant["spendRestrictions"];
  sourceTruth: "server_reward_ledger";
  partialGrantPolicy: "atomic_transaction_only";
};

export type DailyTaskRewardDebugLane = {
  lane: "Daily task reward ledger";
  status: DailyTaskRewardDebugStatus;
  grantedRewards: number;
  blockedDuplicateClaims: number;
  ledgerSource: "transactions.daily_reward";
  sourceOfFunds: DailyTaskRewardSourceOfFunds;
  unknownLegacyRewards: number;
  failedGrantCount: number;
  rawDetailsCollapsedByDefault: true;
};

function normalizeSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/gu, "_")
    .slice(0, 220);
}

function normalizeRewardAmount(value: unknown) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(Number(value)));
}

export function buildDailyTaskRewardLedgerGrant(input: {
  taskId: string;
  userId: string;
  rewardGdAmount: number;
  resetWindowId: string;
  grantReason: string;
  grantedAtMs?: number;
}): DailyTaskRewardLedgerGrant {
  const taskId = normalizeSegment(input.taskId || DAILY_CHECK_IN_TASK_CONTRACT.taskId);
  const userId = normalizeSegment(input.userId);
  const resetWindowId = normalizeSegment(input.resetWindowId);
  const idempotencyKey = `task_reward:${userId}:${taskId}:${resetWindowId}`;

  return {
    rewardGrantId: idempotencyKey,
    taskId,
    userId,
    rewardGdAmount: normalizeRewardAmount(input.rewardGdAmount),
    rewardSource: "task_reward",
    sourceOfFunds: "reward_gd",
    grantReason: normalizeSegment(input.grantReason),
    resetWindowId,
    idempotencyKey,
    duplicateClaimPolicy: "block_within_reset_window",
    ledgerDestination: "gumDropsRewardBalance",
    grantedAtMs: Number.isFinite(input.grantedAtMs) ? Math.floor(Number(input.grantedAtMs)) : Date.now(),
    spendRestrictions: {
      creatorPaidExperiences: "blocked",
      paidChat: "blocked",
      fanPassStartOrRenewal: "blocked",
      normalDropUnlocks: "allowed",
    },
  };
}

export function buildDailyTaskRewardTransactionExtra(grant: DailyTaskRewardLedgerGrant): DailyTaskRewardTransactionExtra {
  return {
    rewardGrantId: grant.rewardGrantId,
    rewardGrantSource: grant.rewardSource,
    sourceOfFunds: grant.sourceOfFunds,
    taskId: grant.taskId,
    resetWindowId: grant.resetWindowId,
    idempotencyKey: grant.idempotencyKey,
    duplicateClaimPolicy: grant.duplicateClaimPolicy,
    ledgerDestination: grant.ledgerDestination,
    spendRestrictions: grant.spendRestrictions,
    sourceTruth: "server_reward_ledger",
    partialGrantPolicy: "atomic_transaction_only",
  };
}

export function buildDailyTaskRewardSourceOfFundsExplanation(grant: Pick<DailyTaskRewardLedgerGrant, "taskId" | "sourceOfFunds" | "ledgerDestination" | "duplicateClaimPolicy">) {
  return `Task ${grant.taskId} awarded Reward GD only (${grant.sourceOfFunds}) into ${grant.ledgerDestination}; duplicate policy ${grant.duplicateClaimPolicy}.`;
}

export function buildDailyTaskRewardDebugLane(input: {
  grantedRewards?: number;
  blockedDuplicateClaims?: number;
  unknownLegacyRewards?: number;
  failedGrantCount?: number;
} = {}): DailyTaskRewardDebugLane {
  const grantedRewards = Math.max(0, Math.floor(input.grantedRewards ?? 0));
  const blockedDuplicateClaims = Math.max(0, Math.floor(input.blockedDuplicateClaims ?? 0));
  const unknownLegacyRewards = Math.max(0, Math.floor(input.unknownLegacyRewards ?? 0));
  const failedGrantCount = Math.max(0, Math.floor(input.failedGrantCount ?? 0));
  const status: DailyTaskRewardDebugStatus = failedGrantCount > 0 || unknownLegacyRewards > 0 ? "degraded" : "live";

  return {
    lane: "Daily task reward ledger",
    status,
    grantedRewards,
    blockedDuplicateClaims,
    ledgerSource: "transactions.daily_reward",
    sourceOfFunds: "reward_gd",
    unknownLegacyRewards,
    failedGrantCount,
    rawDetailsCollapsedByDefault: true,
  };
}
