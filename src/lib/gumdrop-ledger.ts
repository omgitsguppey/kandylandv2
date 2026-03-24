export type GumdropLedgerStatus = "completed" | "failed" | "pending";

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
        };
    }

    const positiveAmount = Math.max(0, amount);
    const negativeAmount = Math.max(0, Math.abs(Math.min(0, amount)));
    const isRewardTransaction = type === "daily_reward" || type === "onboarding_reward" || type === "referral_bonus";
    const isPurchaseTransaction = type === "purchase_currency";
    const isSpendTransaction = type === "unlock_content";
    const isAdminAdjustment = type === "admin_adjustment";

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
    };
}

