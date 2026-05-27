import { describe, expect, it } from "vitest";

import {
  classifyTreasuryException,
  reconcileCreatorRevenueToEntitlements,
  reconcileGumdropSources,
  reconcileProviderReceiptsToLedger,
  reconcileRefundsAndReversals,
  reconcileTaskRewardsToLedger,
  reconcileWalletDisplayToLedger,
} from "@/lib/treasury/treasury-reconciliation-engine";

describe("treasury reconciliation engine", () => {
  it("does not treat operator-confirmed payments as exact provider truth", () => {
    expect(reconcileProviderReceiptsToLedger({
      providerArtifactAttached: false,
      operatorConfirmed: true,
      ledgerReceiptCents: 1200,
      providerReceiptCents: null,
    })).toMatchObject({
      status: "pending_review",
      confidence: "inferred",
      displayExact: false,
    });
  });

  it("requires wallet display to match source ledger bucket total", () => {
    expect(reconcileWalletDisplayToLedger({
      displayedTotalGd: 575,
      ledgerBuckets: {
        paidGd: 500,
        paidBonusGd: 50,
        rewardGd: 25,
        taskRewardGd: 0,
        adminGrantGd: 0,
        adjustmentGd: 0,
        refundReversalGd: 0,
        legacyUnknownGd: 0,
      },
    })).toMatchObject({ status: "matched", displayExact: true });

    expect(reconcileWalletDisplayToLedger({
      displayedTotalGd: 576,
      ledgerBuckets: {
        paidGd: 500,
        paidBonusGd: 50,
        rewardGd: 25,
        taskRewardGd: 0,
        adminGrantGd: 0,
        adjustmentGd: 0,
        refundReversalGd: 0,
        legacyUnknownGd: 0,
      },
    })).toMatchObject({ status: "exception", exceptionClass: "wallet_display_mismatch" });
  });

  it("keeps source-of-funds and legacy money separated", () => {
    expect(reconcileGumdropSources({ transactionType: "daily_reward", rewardSource: "task", amountGd: 15 })).toMatchObject({
      status: "matched",
      sourceBucket: "task_reward_gd",
      paidOnlyEligible: false,
    });
    expect(reconcileGumdropSources({ transactionType: "legacy_credit", amountGd: 99 })).toMatchObject({
      status: "exception",
      exceptionClass: "unknown_legacy_money",
      displayExact: false,
    });
  });

  it("separates creator revenue confidence and reverses refunds by original source bucket", () => {
    expect(reconcileCreatorRevenueToEntitlements([
      { revenueCents: 1000, providerPaymentArtifact: true, status: "succeeded" },
      { revenueCents: 250, operatorConfirmedRevenue: true, status: "confirmed" },
      { revenueCents: 100, status: "refunded", internalLedgerLinkedToSuccessfulPayment: true },
      { revenueCents: 75, legacyTransaction: true, status: "unknown_legacy" },
    ])).toMatchObject({
      confirmedRevenueCents: 1000,
      inferredRevenueCents: 250,
      reversedRevenueCents: 100,
      unknownLegacyRevenueCents: 75,
    });

    expect(reconcileRefundsAndReversals({ originalSourceBucket: "paid_bonus_gd", amountGd: 50 })).toMatchObject({
      status: "matched",
      reversedSourceBucket: "paid_bonus_gd",
    });
    expect(classifyTreasuryException({ sourceBucket: "legacy_unknown", displayExact: true })).toBe("unknown_legacy_money");
  });

  it("keeps task rewards in reward buckets", () => {
    expect(reconcileTaskRewardsToLedger({ amountGd: 20, sourceTruth: "server_reward_ledger" })).toMatchObject({
      status: "matched",
      sourceBucket: "task_reward_gd",
      paidOnlyEligible: false,
    });
  });
});
