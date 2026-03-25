import { describe, expect, it } from "vitest";

import {
  DAILY_TASK_MAX_REWARD,
  DAILY_TASK_MIN_REWARD,
  DAILY_TASK_REWARD_VERSION,
  clampDailyTaskReward,
  resolveDailyTaskReward,
} from "@/lib/tasks/task-catalog";
import {
  getTransactionBadgeLabel,
  getTransactionDisplayLabel,
  normalizeTransactionRecord,
} from "@/lib/transaction-normalizers";

describe("daily task reward contracts", () => {
  it("translates version 2 rewards into the current version without double shrinking", () => {
    expect(DAILY_TASK_REWARD_VERSION).toBe(3);
    expect(resolveDailyTaskReward(150, 2)).toBe(120);
    expect(resolveDailyTaskReward(750, 2)).toBe(600);
  });

  it("clamps current-version configured rewards inside the active display range", () => {
    expect(clampDailyTaskReward(0)).toBe(DAILY_TASK_MIN_REWARD);
    expect(clampDailyTaskReward(10_000)).toBe(DAILY_TASK_MAX_REWARD);
    expect(resolveDailyTaskReward(420, DAILY_TASK_REWARD_VERSION)).toBe(420);
  });
});

describe("creator transaction normalization contracts", () => {
  it("preserves creator spend-source details for admin and activity surfaces", () => {
    const transaction = normalizeTransactionRecord({
      userId: "user_123",
      amount: -500,
      type: "creator_subscription",
      creatorId: "creator_123",
      description: "",
      timestampMs: 123456,
      purchasedAmountSpent: 500,
      rewardAmountSpent: 0,
      ledgerSource: "purchased",
      creatorRevenueShareGd: 250,
      creatorRevenueShareUsd: 2.5,
      creatorAccrualId: "accrual_123",
    }, "tx_123");

    expect(transaction.type).toBe("creator_subscription");
    expect(transaction.creatorId).toBe("creator_123");
    expect(transaction.purchasedAmountSpent).toBe(500);
    expect(transaction.rewardAmountSpent).toBe(0);
    expect(transaction.ledgerSource).toBe("purchased");
    expect(transaction.creatorRevenueShareGd).toBe(250);
    expect(transaction.creatorAccrualId).toBe("accrual_123");
    expect(getTransactionBadgeLabel(transaction)).toBe("Subscription");
    expect(getTransactionDisplayLabel(transaction)).toBe("Creator subscription started");
  });
});
