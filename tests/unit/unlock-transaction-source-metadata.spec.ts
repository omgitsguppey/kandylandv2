import { describe, expect, it } from "vitest";

import { classifyTransactionSourceOfFunds } from "@/lib/commerce/transaction-source-of-funds-contract";
import { classifyGumdropTransaction } from "@/lib/gumdrop-ledger";

describe("unlock transaction source metadata", () => {
  it("classifies new unlock_content transactions by exact purchased/reward spend split", () => {
    expect(classifyTransactionSourceOfFunds({
      transactionId: "tx_reward",
      userId: "tlove81-full-uid",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 0,
      rewardAmountSpent: 1000,
      sourceTruth: "server",
    })).toMatchObject({
      sourceClass: "unlock_reward_spend",
      sourceConfidence: "exact",
      displayLabel: "Reward unlock spend",
      userIdRedacted: "tlov...-uid",
    });

    expect(classifyTransactionSourceOfFunds({
      transactionId: "tx_mixed",
      userId: "tlove81-full-uid",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 250,
      rewardAmountSpent: 750,
      sourceTruth: "server",
    })).toMatchObject({
      sourceClass: "unlock_mixed_spend",
      sourceConfidence: "exact",
    });
  });

  it("does not promote unlock_content without split metadata to exact truth", () => {
    expect(classifyTransactionSourceOfFunds({
      transactionId: "legacy_unlock",
      userId: "tlove81-full-uid",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      timestampMs: Date.parse("2026-05-01T00:00:00.000Z"),
      nowMs: Date.parse("2026-05-24T00:00:00.000Z"),
    })).toMatchObject({
      sourceClass: "legacy_unknown",
      sourceConfidence: "legacy_unknown",
    });

    expect(classifyTransactionSourceOfFunds({
      transactionId: "new_unlock_missing_split",
      userId: "tlove81-full-uid",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      timestampMs: Date.parse("2026-05-24T00:00:00.000Z"),
      nowMs: Date.parse("2026-05-24T01:00:00.000Z"),
    })).toMatchObject({
      sourceClass: "unknown_missing_metadata",
      sourceConfidence: "unknown",
    });
  });

  it("surfaces non-creator unlock source-of-funds totals without changing spend math", () => {
    const classification = classifyGumdropTransaction({
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 400,
      rewardAmountSpent: 600,
    });

    expect(classification.gumdropSpendTotal).toBe(1000);
    expect(classification.unlockPurchasedSpendTotal).toBe(400);
    expect(classification.unlockRewardSpendTotal).toBe(600);
    expect(classification.unlockSpendParityMismatchCount).toBe(0);
  });
});
