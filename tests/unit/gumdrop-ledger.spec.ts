import { describe, expect, it } from "vitest";

import {
    classifyGumdropTransaction,
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

    it("classifies purchase transactions using explicit paid and bonus GumDrop splits", () => {
        const result = classifyGumdropTransaction({
            type: "purchase_currency",
            status: "completed",
            amount: 550,
            paidGumDrops: 500,
            bonusGumDrops: 50,
        });

        expect(result.gumdropCreditTotal).toBe(550);
        expect(result.gumdropPurchaseTotal).toBe(500);
        expect(result.gumdropRewardTotal).toBe(50);
        expect(result.purchaseTransactionCount).toBe(1);
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
