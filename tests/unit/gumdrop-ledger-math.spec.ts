import { describe, expect, it } from "vitest";

import {
  calculateLedgerBalanceBySource,
  calculateRefundReversal,
  calculateSpendEligibility,
  classifyGumdropSource,
  explainGumdropMath,
  validateDisplayedBalance,
} from "@/lib/math/gumdrop-ledger-math";

describe("gumdrop ledger math", () => {
  it("keeps paid base and paid bundle bonus separate without labeling bonus as reward", () => {
    const source = classifyGumdropSource({
      transactionType: "purchase_currency",
      amountGd: 550,
      paidGumDrops: 500,
      bonusGumDrops: 50,
      tiedToPaidPurchase: true,
      sourceTruth: "server_purchase_ledger",
    });

    expect(source).toMatchObject({
      sourceBucket: "paid_gd",
      paidGd: 500,
      paidBonusGd: 50,
      rewardGd: 0,
      userVisibleLabel: "paid GD",
      confidence: "exact",
    });
    expect(source.sourceBuckets).toEqual(["paid_gd", "paid_bonus_gd"]);
  });

  it("classifies task rewards and admin grants as non-paid sources", () => {
    expect(classifyGumdropSource({
      transactionType: "daily_reward",
      rewardSource: "task",
      amountGd: 25,
      sourceTruth: "server_reward_ledger",
    })).toMatchObject({
      sourceBucket: "task_reward_gd",
      taskRewardGd: 25,
      paidGd: 0,
      paidBonusGd: 0,
      userVisibleLabel: "reward GD",
    });

    expect(classifyGumdropSource({
      transactionType: "admin_adjustment",
      amountGd: 100,
      adjustmentSource: "admin_balance_route",
    })).toMatchObject({
      sourceBucket: "admin_grant_gd",
      adminGrantGd: 100,
      paidGd: 0,
      userVisibleLabel: "reward GD",
    });
  });

  it("blocks reward, admin grant, and legacy unknown from paid-only spend eligibility", () => {
    const ledgerBalance = calculateLedgerBalanceBySource([
      { sourceBucket: "paid_gd", amountGd: 500, direction: "credit" },
      { sourceBucket: "paid_bonus_gd", amountGd: 50, direction: "credit" },
      { sourceBucket: "task_reward_gd", amountGd: 25, direction: "credit" },
      { sourceBucket: "admin_grant_gd", amountGd: 100, direction: "credit" },
      { sourceBucket: "legacy_unknown", amountGd: 900, direction: "credit" },
    ]);

    expect(calculateSpendEligibility({
      balanceBySource: ledgerBalance,
      amountGd: 550,
      spendPolicy: "paid_only",
    })).toMatchObject({
      eligible: true,
      paidGdSpent: 500,
      paidBonusGdSpent: 50,
      rewardGdSpent: 0,
      legacyUnknownSpent: 0,
    });

    expect(calculateSpendEligibility({
      balanceBySource: ledgerBalance,
      amountGd: 551,
      spendPolicy: "paid_only",
    })).toMatchObject({
      eligible: false,
      reason: "insufficient_paid_source_gd",
    });
  });

  it("reverses refunds against the original source bucket and validates display parity", () => {
    const ledgerBalance = calculateLedgerBalanceBySource([
      { sourceBucket: "paid_gd", amountGd: 500, direction: "credit" },
      calculateRefundReversal({ originalSourceBucket: "paid_gd", amountGd: 100 }),
      { sourceBucket: "reward_gd", amountGd: 25, direction: "credit" },
      { sourceBucket: "adjustment_gd", amountGd: -5, direction: "adjustment" },
    ]);

    expect(ledgerBalance).toMatchObject({
      paidGd: 400,
      rewardGd: 25,
      adjustmentGd: -5,
      totalGd: 420,
    });
    expect(validateDisplayedBalance({ displayedTotalGd: 420, ledgerBalance })).toMatchObject({ valid: true });
    expect(validateDisplayedBalance({ displayedTotalGd: 421, ledgerBalance })).toMatchObject({
      valid: false,
      reason: "displayed_wallet_total_mismatch",
    });
  });

  it("keeps legacy source confidence weak or unknown instead of promoting it to paid truth", () => {
    const legacy = classifyGumdropSource({
      legacyLabel: "free GD",
      amountGd: 10,
    });

    expect(legacy).toMatchObject({
      sourceBucket: "reward_gd",
      rewardGd: 10,
      confidence: "inferred",
    });

    const unknown = classifyGumdropSource({
      transactionType: "legacy_credit",
      amountGd: 10,
    });

    expect(unknown).toMatchObject({
      sourceBucket: "legacy_unknown",
      legacyUnknownGd: 10,
      confidence: "unknown",
    });
    expect(explainGumdropMath(unknown)).toContain("legacy_unknown");
  });
});
