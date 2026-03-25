export type GumdropLedgerStatus = "completed" | "failed" | "pending";
export type SourceAwareGumdropBalance = {
    total: number;
    purchased: number;
    reward: number;
};

const CREATOR_SPEND_TRANSACTION_TYPES = new Set([
    "creator_message_text",
    "creator_message_image",
    "creator_message_video",
    "creator_subscription",
    "creator_subscription_renewal",
    "creator_custom_request",
    "creator_booking_phone",
    "creator_booking_video",
]);

export function normalizeGumdropAmount(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.trunc(value);
}

export function normalizeGumdropBalance(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.trunc(value));
}

export function computeNextGumdropBalance(currentBalance: unknown, delta: unknown) {
    return normalizeGumdropBalance(currentBalance) + normalizeGumdropAmount(delta);
}

export function readSourceAwareBalance(source: {
    gumDropsBalance?: unknown;
    gumDropsPurchasedBalance?: unknown;
    gumDropsRewardBalance?: unknown;
}) {
    const total = normalizeGumdropBalance(source.gumDropsBalance);
    const purchased = normalizeGumdropBalance(source.gumDropsPurchasedBalance);
    const reward = normalizeGumdropBalance(source.gumDropsRewardBalance);

    if (purchased === 0 && reward === 0 && total > 0) {
        return {
            total,
            purchased: total,
            reward: 0,
        };
    }

    return {
        total: normalizeGumdropBalance(purchased + reward),
        purchased,
        reward,
    };
}

export function buildSourceAwareBalancePatch(next: SourceAwareGumdropBalance) {
    return {
        gumDropsBalance: normalizeGumdropBalance(next.purchased + next.reward),
        gumDropsPurchasedBalance: normalizeGumdropBalance(next.purchased),
        gumDropsRewardBalance: normalizeGumdropBalance(next.reward),
    };
}

export function creditSourceAwareGumdrops(
    current: SourceAwareGumdropBalance,
    amount: unknown,
    source: "purchased" | "reward",
) {
    const credit = Math.max(0, normalizeGumdropAmount(amount));
    if (credit === 0) {
        return current;
    }

    if (source === "reward") {
        return {
            total: current.total + credit,
            purchased: current.purchased,
            reward: current.reward + credit,
        };
    }

    return {
        total: current.total + credit,
        purchased: current.purchased + credit,
        reward: current.reward,
    };
}

export function spendSourceAwareGumdrops(
    current: SourceAwareGumdropBalance,
    amount: unknown,
    options?: { purchasedOnly?: boolean },
) {
    const required = Math.max(0, normalizeGumdropAmount(amount));
    const purchasedOnly = options?.purchasedOnly === true;

    if (required === 0) {
        return {
            ok: true as const,
            next: current,
            purchasedSpent: 0,
            rewardSpent: 0,
        };
    }

    if (purchasedOnly) {
        if (current.purchased < required) {
            return {
                ok: false as const,
                error: "Insufficient purchased Gum Drops for this creator experience.",
            };
        }

        return {
            ok: true as const,
            next: {
                total: current.total - required,
                purchased: current.purchased - required,
                reward: current.reward,
            },
            purchasedSpent: required,
            rewardSpent: 0,
        };
    }

    const purchasedSpent = Math.min(current.purchased, required);
    const rewardSpent = Math.max(0, required - purchasedSpent);
    if (purchasedSpent + rewardSpent < required || rewardSpent > current.reward) {
        return {
            ok: false as const,
            error: "Insufficient Gum Drops for this creator experience.",
        };
    }

    return {
        ok: true as const,
        next: {
            total: current.total - required,
            purchased: current.purchased - purchasedSpent,
            reward: current.reward - rewardSpent,
        },
        purchasedSpent,
        rewardSpent,
    };
}

export function normalizeLedgerStatus(value: unknown): GumdropLedgerStatus {
    if (value === "failed" || value === "pending") {
        return value;
    }

    return "completed";
}

export function isCompletedLedgerStatus(value: unknown) {
    return normalizeLedgerStatus(value) === "completed";
}

export function getTransactionRevenueCents(input: {
    type?: string;
    cost?: number;
    grossRevenueUsd?: number;
    grossRevenueCents?: number;
}) {
    if (input.type !== "purchase_currency") {
        return 0;
    }

    if (typeof input.grossRevenueCents === "number" && Number.isFinite(input.grossRevenueCents)) {
        return Math.max(0, Math.round(input.grossRevenueCents));
    }

    if (typeof input.grossRevenueUsd === "number" && Number.isFinite(input.grossRevenueUsd)) {
        return Math.max(0, Math.round(input.grossRevenueUsd * 100));
    }

    if (typeof input.cost === "number" && Number.isFinite(input.cost)) {
        return Math.max(0, Math.round(input.cost * 100));
    }

    return 0;
}

export function classifyGumdropTransaction(input: {
    type?: string;
    amount?: number;
    rewardSource?: string;
    status?: unknown;
    purchasedAmountSpent?: number;
    rewardAmountSpent?: number;
}) {
    const amount = normalizeGumdropAmount(input.amount);
    const type = typeof input.type === "string" ? input.type : "";
    const rewardSource = typeof input.rewardSource === "string" ? input.rewardSource : "";
    const isCompleted = isCompletedLedgerStatus(input.status);

    if (!isCompleted) {
        return {
            gumdropDelta: 0,
            gumdropCreditTotal: 0,
            gumdropDebitTotal: 0,
            gumdropRewardTotal: 0,
            gumdropPurchaseTotal: 0,
            gumdropSpendTotal: 0,
            gumdropAdjustmentPositiveTotal: 0,
            gumdropAdjustmentNegativeTotal: 0,
            rewardTransactionCount: 0,
            checkInRewardCount: 0,
            taskRewardCount: 0,
            onboardingRewardCount: 0,
            referralBonusCount: 0,
            purchaseTransactionCount: 0,
            spendTransactionCount: 0,
            adminAdjustmentCount: 0,
            creatorSpendTransactionCount: 0,
            creatorPurchasedSpendTotal: 0,
            creatorRewardSpendTotal: 0,
            creatorSpendParityMismatchCount: 0,
            creatorRestrictedSpendViolationCount: 0,
        };
    }

    const positiveAmount = Math.max(0, amount);
    const negativeAmount = Math.max(0, Math.abs(Math.min(0, amount)));
    const isRewardTransaction = type === "daily_reward" || type === "onboarding_reward" || type === "referral_bonus";
    const isPurchaseTransaction = type === "purchase_currency";
    const isCreatorSpendTransaction = CREATOR_SPEND_TRANSACTION_TYPES.has(type);
    const isSpendTransaction = type === "unlock_content" || isCreatorSpendTransaction;
    const isAdminAdjustment = type === "admin_adjustment";
    const creatorPurchasedSpendTotal = isCreatorSpendTransaction
        ? Math.max(0, normalizeGumdropAmount(input.purchasedAmountSpent))
        : 0;
    const creatorRewardSpendTotal = isCreatorSpendTransaction
        ? Math.max(0, normalizeGumdropAmount(input.rewardAmountSpent))
        : 0;
    const creatorSpendParityMismatchCount = isCreatorSpendTransaction
        && creatorPurchasedSpendTotal + creatorRewardSpendTotal !== negativeAmount
        ? 1
        : 0;
    const creatorRestrictedSpendViolationCount = isCreatorSpendTransaction && creatorRewardSpendTotal > 0 ? 1 : 0;

    return {
        gumdropDelta: amount,
        gumdropCreditTotal: positiveAmount,
        gumdropDebitTotal: negativeAmount,
        gumdropRewardTotal: isRewardTransaction ? positiveAmount : 0,
        gumdropPurchaseTotal: isPurchaseTransaction ? positiveAmount : 0,
        gumdropSpendTotal: isSpendTransaction ? negativeAmount : 0,
        gumdropAdjustmentPositiveTotal: isAdminAdjustment ? positiveAmount : 0,
        gumdropAdjustmentNegativeTotal: isAdminAdjustment ? negativeAmount : 0,
        rewardTransactionCount: isRewardTransaction ? 1 : 0,
        checkInRewardCount: type === "daily_reward" && rewardSource === "check_in" ? 1 : 0,
        taskRewardCount: type === "daily_reward" && rewardSource === "task" ? 1 : 0,
        onboardingRewardCount: type === "onboarding_reward" ? 1 : 0,
        referralBonusCount: type === "referral_bonus" ? 1 : 0,
        purchaseTransactionCount: isPurchaseTransaction ? 1 : 0,
        spendTransactionCount: isSpendTransaction ? 1 : 0,
        adminAdjustmentCount: isAdminAdjustment ? 1 : 0,
        creatorSpendTransactionCount: isCreatorSpendTransaction ? 1 : 0,
        creatorPurchasedSpendTotal,
        creatorRewardSpendTotal,
        creatorSpendParityMismatchCount,
        creatorRestrictedSpendViolationCount,
    };
}
