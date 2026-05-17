import { describe, expect, it } from "vitest";

import {
    assertCreatorExperienceSpendIsPurchasedOnly,
    buildPaidBundleCredit,
    buildRewardCredit,
} from "@/lib/gumdrop-source-of-funds";
import {
    buildCreatorExperienceAttribution,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";

describe("gumdrop economy accuracy contract", () => {
    it("classifies paid bundle bonus GumDrops as purchased balance", () => {
        expect(buildPaidBundleCredit({ deliveredGd: 2_500, priceUsd: 20 })).toEqual({
            deliveredGd: 2_500,
            paidBaseGd: 2_000,
            paidBonusGd: 500,
            rewardCreditGd: 0,
            purchasedCreditGd: 2_500,
            sourceClassification: "paid_purchase_including_bonus",
        });

        expect(buildPaidBundleCredit({ deliveredGd: 5_000, priceUsd: 25 })).toEqual({
            deliveredGd: 5_000,
            paidBaseGd: 2_500,
            paidBonusGd: 2_500,
            rewardCreditGd: 0,
            purchasedCreditGd: 5_000,
            sourceClassification: "paid_purchase_including_bonus",
        });
    });

    it("keeps daily onboarding and referral rewards out of purchased balance", () => {
        expect(buildRewardCredit({ amountGd: 25, rewardSource: "reward_daily" })).toMatchObject({
            purchasedCreditGd: 0,
            rewardCreditGd: 25,
            sourceClass: "reward_daily",
        });
        expect(buildRewardCredit({ amountGd: 50, rewardSource: "reward_onboarding" })).toMatchObject({
            purchasedCreditGd: 0,
            rewardCreditGd: 50,
            sourceClass: "reward_onboarding",
        });
        expect(buildRewardCredit({ amountGd: 100, rewardSource: "reward_referral" })).toMatchObject({
            purchasedCreditGd: 0,
            rewardCreditGd: 100,
            sourceClass: "reward_referral",
        });
    });

    it("requires creator experience spend to be purchased-only", () => {
        const spend = spendCreatorExperienceGumdrops({
            total: 1_000,
            purchased: 100,
            reward: 900,
        }, 500, "custom_request");

        expect(spend).toMatchObject({
            ok: false,
        });

        expect(() => assertCreatorExperienceSpendIsPurchasedOnly({
            amount: 500,
            purchasedAmountSpent: 400,
            rewardAmountSpent: 100,
        })).toThrow(/purchased-only/i);
    });

    it("builds creator attribution with paid-source truth and cashout value", () => {
        const attribution = buildCreatorExperienceAttribution({
            creatorId: "creator_1",
            userId: "fan_1",
            sourceType: "custom_request",
            sourceId: "request_1",
            grossSpendGd: 500,
            purchasedAmountSpent: 500,
            rewardAmountSpent: 0,
            userTransactionId: "txn_1",
            creatorAccrualId: "accrual_1",
            creatorExperienceRecordId: "request_1",
            idempotencyKey: "idem_1",
            sourceAwareBalanceBefore: { total: 1_000, purchased: 1_000, reward: 0 },
            sourceAwareBalanceAfter: { total: 500, purchased: 500, reward: 0 },
        });

        expect(attribution).toMatchObject({
            creatorId: "creator_1",
            userId: "fan_1",
            sourceType: "custom_request",
            sourceId: "request_1",
            grossSpendGd: 500,
            purchasedAmountSpent: 500,
            rewardAmountSpent: 0,
            creatorShareGd: 250,
            platformShareGd: 250,
            cashoutValueUsd: 2.5,
            paidSourceRequired: true,
            attributionTruth: "creator_experience_paid_source",
        });
    });
});
