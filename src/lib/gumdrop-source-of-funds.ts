import { GUMDROPS_PER_USD } from "@/lib/gumdrop-economics";

export type GumdropSourceClass =
    | "paid_base"
    | "paid_bonus"
    | "reward_promo"
    | "reward_daily"
    | "reward_onboarding"
    | "reward_referral"
    | "admin_adjustment"
    | "unknown_legacy";

export type GumdropPurchaseCredit = {
    deliveredGd: number;
    paidBaseGd: number;
    paidBonusGd: number;
    rewardCreditGd: number;
    purchasedCreditGd: number;
    sourceClassification: "paid_purchase_including_bonus";
};

export type GumdropRewardCredit = {
    amountGd: number;
    rewardSource: Exclude<GumdropSourceClass, "paid_base" | "paid_bonus">;
    purchasedCreditGd: 0;
    rewardCreditGd: number;
    sourceClass: Exclude<GumdropSourceClass, "paid_base" | "paid_bonus">;
};

function normalizeGd(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.round(value))
        : 0;
}

function normalizeUsd(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}

export function buildPaidBundleCredit(input: {
    deliveredGd: number;
    priceUsd: number;
    gumdropsPerUsd?: number;
}): GumdropPurchaseCredit {
    const deliveredGd = normalizeGd(input.deliveredGd);
    const gumdropsPerUsd = normalizeGd(input.gumdropsPerUsd ?? GUMDROPS_PER_USD) || GUMDROPS_PER_USD;
    const paidBaseGd = normalizeGd(normalizeUsd(input.priceUsd) * gumdropsPerUsd);
    const paidBonusGd = Math.max(0, deliveredGd - paidBaseGd);

    return {
        deliveredGd,
        paidBaseGd,
        paidBonusGd,
        rewardCreditGd: 0,
        purchasedCreditGd: deliveredGd,
        sourceClassification: "paid_purchase_including_bonus",
    };
}

export function buildRewardCredit(input: {
    amountGd: number;
    rewardSource: Exclude<GumdropSourceClass, "paid_base" | "paid_bonus">;
}): GumdropRewardCredit {
    const amountGd = normalizeGd(input.amountGd);
    return {
        amountGd,
        rewardSource: input.rewardSource,
        purchasedCreditGd: 0,
        rewardCreditGd: amountGd,
        sourceClass: input.rewardSource,
    };
}

export function assertCreatorExperienceSpendIsPurchasedOnly(input: {
    purchasedAmountSpent: number;
    rewardAmountSpent: number;
    amount: number;
}) {
    const amount = normalizeGd(input.amount);
    const purchasedAmountSpent = normalizeGd(input.purchasedAmountSpent);
    const rewardAmountSpent = normalizeGd(input.rewardAmountSpent);

    if (rewardAmountSpent !== 0 || purchasedAmountSpent !== amount) {
        throw new Error("Creator experience spend must be purchased-only.");
    }

    return {
        ok: true as const,
        amount,
        purchasedAmountSpent,
        rewardAmountSpent,
        ledgerSource: "purchased" as const,
    };
}
