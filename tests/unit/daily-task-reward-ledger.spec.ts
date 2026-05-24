import { describe, expect, it } from "vitest";

import { classifyGumdropTransaction, creditSourceAwareGumdrops, spendSourceAwareGumdrops } from "@/lib/gumdrop-ledger";
import {
  buildDailyTaskRewardDebugLane,
  buildDailyTaskRewardLedgerGrant,
  buildDailyTaskRewardTransactionExtra,
} from "@/lib/tasks/daily-task-reward-ledger";

describe("daily task reward ledger", () => {
  it("builds deterministic reward-only grant metadata for daily task rewards", () => {
    const grant = buildDailyTaskRewardLedgerGrant({
      taskId: "check_in_today",
      userId: "user_1",
      rewardGdAmount: 10,
      resetWindowId: "2026-05-24",
      grantReason: "daily_check_in_claim",
      grantedAtMs: 1_764_000_000_000,
    });

    expect(grant).toMatchObject({
      rewardGrantId: "task_reward:user_1:check_in_today:2026-05-24",
      taskId: "check_in_today",
      userId: "user_1",
      rewardGdAmount: 10,
      rewardSource: "task_reward",
      sourceOfFunds: "reward_gd",
      grantReason: "daily_check_in_claim",
      resetWindowId: "2026-05-24",
      idempotencyKey: "task_reward:user_1:check_in_today:2026-05-24",
      duplicateClaimPolicy: "block_within_reset_window",
      ledgerDestination: "gumDropsRewardBalance",
    });
    expect(grant.spendRestrictions.creatorPaidExperiences).toBe("blocked");
  });

  it("stores task reward grants as reward source, never paid or paid bonus", () => {
    const grant = buildDailyTaskRewardLedgerGrant({
      taskId: "watch_a_drop",
      userId: "user_2",
      rewardGdAmount: 25,
      resetWindowId: "daily_window_1",
      grantReason: "daily_task_completed",
      grantedAtMs: 1_764_000_010_000,
    });
    const extra = buildDailyTaskRewardTransactionExtra(grant);
    const next = creditSourceAwareGumdrops({ total: 0, purchased: 0, reward: 0 }, grant.rewardGdAmount, "reward");
    const classified = classifyGumdropTransaction({
      type: "daily_reward",
      rewardSource: "task",
      status: "completed",
      amount: grant.rewardGdAmount,
    });

    expect(extra).toMatchObject({
      sourceOfFunds: "reward_gd",
      rewardGrantSource: "task_reward",
      taskId: "watch_a_drop",
      resetWindowId: "daily_window_1",
      idempotencyKey: grant.idempotencyKey,
      ledgerDestination: "gumDropsRewardBalance",
    });
    expect(next).toEqual({ total: 25, purchased: 0, reward: 25 });
    expect(classified.gumdropRewardTotal).toBe(25);
    expect(classified.gumdropPurchaseTotal).toBe(0);
    expect(classified.gumdropPurchaseBonusTotal).toBe(0);
  });

  it("keeps reward GumDrops blocked from paid creator spend", () => {
    const rewardOnlyBalance = creditSourceAwareGumdrops({ total: 0, purchased: 0, reward: 0 }, 25, "reward");
    const paidCreatorSpend = spendSourceAwareGumdrops(rewardOnlyBalance, 1, { purchasedOnly: true });

    expect(paidCreatorSpend.ok).toBe(false);
  });

  it("summarizes reward ledger health without raw ledger dumps", () => {
    const lane = buildDailyTaskRewardDebugLane({
      grantedRewards: 2,
      blockedDuplicateClaims: 1,
      unknownLegacyRewards: 0,
      failedGrantCount: 0,
    });

    expect(lane).toMatchObject({
      lane: "Daily task reward ledger",
      status: "live",
      grantedRewards: 2,
      blockedDuplicateClaims: 1,
      ledgerSource: "transactions.daily_reward",
      sourceOfFunds: "reward_gd",
      rawDetailsCollapsedByDefault: true,
    });
  });
});
