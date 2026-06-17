import { describe, expect, it } from "vitest";

import {
    buildPaidPurchaseBalanceCredit,
    classifyGumdropTransaction,
    creditSourceAwareGumdrops,
    getTransactionRevenueCents,
    readPaidSourceBalanceForRestrictedSpend,
    readSourceAwareBalance,
    spendSourceAwareGumdrops,
} from "@/lib/gumdrop-ledger";

describe("gumdrop ledger", () => {
    it("treats legacy gumDropsBalance as purchased balance when split balances are absent", () => {
        expect(readSourceAwareBalance({
            gumDropsBalance: 24,
        })).toEqual({
            total: 24,
            purchased: 24,
            reward: 0,
        });
    });

    it("does not promote legacy total-only balances to paid-source restricted spend", () => {
        expect(readPaidSourceBalanceForRestrictedSpend({
            gumDropsBalance: 24,
        })).toEqual({
            balance: {
                total: 24,
                purchased: 0,
                reward: 0,
            },
            sourceState: "legacy_total_only",
            paidSourceEligible: false,
        });

        expect(readPaidSourceBalanceForRestrictedSpend({
            gumDropsBalance: 24,
            gumDropsPurchasedBalance: 12,
            gumDropsRewardBalance: 12,
        })).toEqual({
            balance: {
                total: 24,
                purchased: 12,
                reward: 12,
            },
            sourceState: "explicit_paid_source",
            paidSourceEligible: true,
        });
    });

    it("spends reward balance first for unrestricted GumDrop spends", () => {
        const spend = spendSourceAwareGumdrops({
            total: 20,
            purchased: 7,
            reward: 13,
        }, 5);

        expect(spend).toMatchObject({
            ok: true,
            purchasedSpent: 0,
            rewardSpent: 5,
            next: {
                total: 15,
                purchased: 7,
                reward: 8,
            },
        });
    });

    it("requires purchased balance for restricted creator spends", () => {
        const spend = spendSourceAwareGumdrops({
            total: 8,
            purchased: 0,
            reward: 8,
        }, 1, { purchasedOnly: true });

        expect(spend).toMatchObject({
            ok: false,
            error: "Insufficient purchased Gum Drops for this creator experience.",
        });
    });

    it("credits paid purchase base and bonus GumDrops into purchased source", () => {
        const credit = buildPaidPurchaseBalanceCredit({
            deliveredGumDrops: 5_000,
            paidGumDrops: 2_500,
            bonusGumDrops: 2_500,
        });
        const next = creditSourceAwareGumdrops({
            total: 0,
            purchased: 0,
            reward: 0,
        }, credit.purchasedCreditGumDrops, "purchased");

        expect(credit).toMatchObject({
            deliveredGumDrops: 5_000,
            paidGumDrops: 2_500,
            bonusGumDrops: 2_500,
            purchaseBonusGumDrops: 2_500,
            purchasedCreditGumDrops: 5_000,
            rewardCreditGumDrops: 0,
            sourceClassification: "paid_purchase_including_bonus",
        });
        expect(next).toEqual({
            total: 5_000,
            purchased: 5_000,
            reward: 0,
        });
    });

    it("credits paid purchase packages without bonuses into purchased source only", () => {
        const credit = buildPaidPurchaseBalanceCredit({
            deliveredGumDrops: 100,
            paidGumDrops: 100,
            bonusGumDrops: 0,
        });

        expect(credit).toMatchObject({
            purchasedCreditGumDrops: 100,
            rewardCreditGumDrops: 0,
            purchaseBonusGumDrops: 0,
        });
    });

    it("keeps daily and task rewards in reward source only", () => {
        expect(creditSourceAwareGumdrops({
            total: 10,
            purchased: 10,
            reward: 0,
        }, 25, "reward")).toEqual({
            total: 35,
            purchased: 10,
            reward: 25,
        });
    });

    it("lets creator paid-only spend use paid-pack bonus after it is credited as purchased", () => {
        const purchaseCredit = buildPaidPurchaseBalanceCredit({
            deliveredGumDrops: 550,
            paidGumDrops: 500,
            bonusGumDrops: 50,
        });
        const balance = creditSourceAwareGumdrops({
            total: 0,
            purchased: 0,
            reward: 0,
        }, purchaseCredit.purchasedCreditGumDrops, "purchased");

        const spend = spendSourceAwareGumdrops(balance, 525, { purchasedOnly: true });

        expect(spend).toMatchObject({
            ok: true,
            purchasedSpent: 525,
            rewardSpent: 0,
            next: {
                total: 25,
                purchased: 25,
                reward: 0,
            },
        });
    });

    it("classifies purchase transactions as paid-source credit while preserving bonus metadata", () => {
        const result = classifyGumdropTransaction({
            type: "purchase_currency",
            status: "completed",
            amount: 550,
            paidGumDrops: 500,
            bonusGumDrops: 50,
        });

        expect(result.gumdropCreditTotal).toBe(550);
        expect(result.gumdropPurchaseTotal).toBe(550);
        expect(result.gumdropRewardTotal).toBe(0);
        expect(result.gumdropPurchaseBonusTotal).toBe(50);
        expect(result.purchaseTransactionCount).toBe(1);
    });

    it("does not count admin adjustments or reward credits as revenue purchases", () => {
        expect(getTransactionRevenueCents({
            type: "admin_adjustment",
            status: "completed",
            cost: 10,
            grossRevenueCents: 1000,
        })).toBe(0);
        expect(getTransactionRevenueCents({
            type: "daily_reward",
            status: "completed",
            cost: 10,
            grossRevenueCents: 1000,
        })).toBe(0);
        expect(getTransactionRevenueCents({
            type: "purchase_currency",
            status: "completed",
            grossRevenueCents: 500,
        })).toBe(500);
        expect(getTransactionRevenueCents({
            type: "purchase_currency",
            status: "completed",
            grossRevenueCents: 500,
            verifiedServerSide: false,
        })).toBe(0);
        expect(getTransactionRevenueCents({
            type: "purchase_currency",
            status: "completed",
            grossRevenueCents: 500,
            sourceTruth: "client_supporting",
        })).toBe(0);

        expect(classifyGumdropTransaction({
            type: "admin_adjustment",
            status: "completed",
            amount: 100,
        })).toMatchObject({
            purchaseTransactionCount: 0,
            gumdropPurchaseTotal: 0,
            gumdropAdjustmentPositiveTotal: 100,
        });

        expect(classifyGumdropTransaction({
            type: "daily_reward",
            rewardSource: "task",
            status: "completed",
            amount: 25,
        })).toMatchObject({
            purchaseTransactionCount: 0,
            gumdropPurchaseTotal: 0,
            gumdropRewardTotal: 25,
        });
    });

    it("flags creator spend parity mismatches and restricted reward spend violations", () => {
        const result = classifyGumdropTransaction({
            type: "creator_message_text",
            status: "completed",
            amount: -3,
            purchasedAmountSpent: 1,
            rewardAmountSpent: 1,
        });

        expect(result.creatorPurchasedSpendTotal).toBe(1);
        expect(result.creatorRewardSpendTotal).toBe(1);
        expect(result.creatorSpendParityMismatchCount).toBe(1);
        expect(result.creatorRestrictedSpendViolationCount).toBe(1);
    });
});
