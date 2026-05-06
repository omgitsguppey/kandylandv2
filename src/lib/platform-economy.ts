export const PLATFORM_ECONOMY_BASE_USD_PER_100_GD = 1;
export const PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.5;
export const PLATFORM_ECONOMY_WARNING_FLOOR_GD_PER_USD = 200;
export const PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE = 20;

export type PlatformEconomyFreshnessState = "live" | "review" | "stale" | "unknown";
export type PlatformEconomySeverity = "info" | "warn" | "error" | "critical";
export type PlatformEconomyWarningCode =
    | "rate_below_floor"
    | "promo_below_floor"
    | "package_below_floor"
    | "missing_usd_basis"
    | "paid_bonus_classified_as_free"
    | "reward_gd_used_for_restricted_creator_spend"
    | "promo_redemption_limit_missing"
    | "expired_promo_active"
    | "stackable_discount_risk"
    | "ledger_promo_missing"
    | "package_version_drift"
    | "wallet_balance_source_mismatch";

export type PlatformEconomyWarning = {
    code: PlatformEconomyWarningCode;
    severity: PlatformEconomySeverity;
    label: string;
    detail: string;
    sourceSurface: string;
};

export type PlatformEconomySourceBreakdown = {
    paidBaseGd: number;
    paidBonusGd: number;
    rewardPromoGd: number;
    purchasedBalanceCreditGd: number;
    rewardBalanceCreditGd: number;
};

export type PlatformEconomyPackageRecord = {
    packageId: string;
    label: string;
    priceUsd: number;
    basePaidGd: number;
    bonusPaidGd: number;
    totalGd: number;
    effectiveUsdPer100Gd: number;
    active: boolean;
    featured: boolean;
    sortOrder: number;
    createdAtUtc: string;
    updatedAtUtc: string;
    version: number;
    source: "admin_config";
    warnings: PlatformEconomyWarning[];
    overrideReason?: string | null;
};

export type PlatformEconomyPromoType =
    | "percent_off"
    | "fixed_usd_off"
    | "bonus_gd"
    | "bundle_bonus"
    | "creator_specific"
    | "first_purchase"
    | "retention";

export type PlatformEconomyPromoRecord = {
    promoId: string;
    code: string;
    title: string;
    promoType: PlatformEconomyPromoType;
    discountValue: number;
    bonusGd: number;
    appliesToPackageIds: string[];
    appliesToUserIds?: string[];
    appliesToCreatorIds?: string[];
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    maxRedemptions: number | null;
    maxPerUser: number | null;
    minPurchaseUsd: number | null;
    active: boolean;
    stackable: boolean;
    createdByUid: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
    reason: string | null;
    sourceTruth: "platform_economy";
    version: number;
    warnings: PlatformEconomyWarning[];
    effectiveUsdPer100GdImpact: number | null;
    bonusClassification: "paid_source_bonus" | "reward_free_admin_promo" | "none";
};

export type PlatformEconomyOfferRecord = {
    offerId: string;
    offerType: string;
    eligibleAudience: string;
    packageIds: string[];
    promoId: string | null;
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    active: boolean;
    sourceTruth: "platform_economy";
    createdAtUtc: string;
    updatedAtUtc: string;
    version: number;
    warnings: PlatformEconomyWarning[];
};

export type PlatformEconomyRedemptionRecord = {
    redemptionId: string;
    createdAtUtc: string;
    userId: string;
    shortUserId: string;
    packageId: string | null;
    packageLabel: string;
    promoId: string | null;
    promoCode: string | null;
    offerId: string | null;
    priceUsdBeforeDiscount: number;
    discountUsd: number;
    priceUsdPaid: number;
    basePaidGd: number;
    bonusPaidGd: number;
    rewardPromoGd: number;
    totalIssuedGd: number;
    effectiveUsdPer100Gd: number | null;
    warnings: PlatformEconomyWarning[];
};

export type PlatformEconomyDriftRecord = {
    driftId: string;
    surface: "packages" | "wallet" | "revenue" | "promo" | "ledger";
    severity: PlatformEconomySeverity;
    expected: string;
    actual: string;
    validator: string;
    nextAction: string;
};

export type PlatformEconomyWalletRow = {
    userId: string;
    shortUserId: string;
    displayName: string;
    totalGd: number;
    paidGd: number;
    rewardFreeGd: number;
    pendingGd: number | null;
    heldGd: number | null;
    spentGd: number | null;
    sourceWarnings: PlatformEconomyWarning[];
    adminUserHref: string;
};

export type PlatformEconomyTreasurySummary = {
    generatedAtUtc: string;
    sourceTruth: "platform_economy";
    freshnessState: PlatformEconomyFreshnessState;
    outstandingGd: number | null;
    paidGd: number | null;
    paidBonusGd: number | null;
    rewardFreeGd: number | null;
    paidSourceAvgUsdPer100Gd: number | null;
    floorState: "healthy" | "warn" | "critical" | "unknown";
    warnings: PlatformEconomyWarning[];
    walletRows: PlatformEconomyWalletRow[];
    walletPage: number;
    walletPageSize: number;
    walletHasMore: boolean;
};

export function roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeCount(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }
    return 0;
}

export function normalizeMoney(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return roundCurrency(Math.max(0, value));
    }
    return 0;
}

export function normalizePromoCode(code: string) {
    return code.trim().toUpperCase();
}

export function toShortId(value: string) {
    if (value.length <= 10) {
        return value;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function computeEffectiveUsdPer100Gd(priceUsd: number, totalGd: number) {
    if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isFinite(totalGd) || totalGd <= 0) {
        return null;
    }
    return roundCurrency((priceUsd / totalGd) * 100);
}

export function computeEffectiveGdPerUsd(totalGd: number, priceUsd: number) {
    if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isFinite(totalGd) || totalGd <= 0) {
        return null;
    }
    return roundCurrency(totalGd / priceUsd);
}

export function buildRateBelowFloorWarning(input: {
    code: "rate_below_floor" | "promo_below_floor" | "package_below_floor";
    sourceSurface: string;
    effectiveUsdPer100Gd: number | null;
}) {
    if (
        input.effectiveUsdPer100Gd === null
        || input.effectiveUsdPer100Gd >= PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD
    ) {
        return null;
    }

    return {
        code: input.code,
        severity: input.effectiveUsdPer100Gd < PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD ? "warn" : "info",
        label: "Rate below floor",
        detail: `Effective value is $${input.effectiveUsdPer100Gd.toFixed(2)} per 100 GD, below the $${PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD.toFixed(2)} warning floor.`,
        sourceSurface: input.sourceSurface,
    } satisfies PlatformEconomyWarning;
}

export function buildMissingUsdBasisWarning(sourceSurface: string) {
    return {
        code: "missing_usd_basis",
        severity: "critical",
        label: "Missing USD basis",
        detail: "This item is missing a valid USD basis, so effective rate math cannot be trusted.",
        sourceSurface,
    } satisfies PlatformEconomyWarning;
}

export function classifyPromoBonusSource(input: {
    promoType: PlatformEconomyPromoType;
    bonusGd: number;
    appliesToPackageIds: string[];
}) {
    if (input.bonusGd <= 0) {
        return "none" as const;
    }
    return input.appliesToPackageIds.length > 0 ? "paid_source_bonus" as const : "reward_free_admin_promo" as const;
}

export function isPromoExpired(promo: Pick<PlatformEconomyPromoRecord, "endsAtUtc">, nowMs = Date.now()) {
    if (!promo.endsAtUtc) {
        return false;
    }
    const endsAtMs = Date.parse(promo.endsAtUtc);
    return Number.isFinite(endsAtMs) && endsAtMs < nowMs;
}

export function buildPackageWarnings(input: {
    effectiveUsdPer100Gd: number | null;
    sourceSurface: string;
}) {
    if (input.effectiveUsdPer100Gd === null) {
        return [buildMissingUsdBasisWarning(input.sourceSurface)];
    }

    const floorWarning = buildRateBelowFloorWarning({
        code: "package_below_floor",
        sourceSurface: input.sourceSurface,
        effectiveUsdPer100Gd: input.effectiveUsdPer100Gd,
    });

    return floorWarning ? [floorWarning] : [];
}

export function buildPromoWarnings(input: {
    effectiveUsdPer100GdImpact: number | null;
    promo: Pick<PlatformEconomyPromoRecord, "active" | "stackable" | "maxRedemptions" | "maxPerUser" | "endsAtUtc">;
}) {
    const warnings: PlatformEconomyWarning[] = [];

    const floorWarning = buildRateBelowFloorWarning({
        code: "promo_below_floor",
        sourceSurface: "platform_economy.promos",
        effectiveUsdPer100Gd: input.effectiveUsdPer100GdImpact,
    });
    if (floorWarning) {
        warnings.push(floorWarning);
    }

    if (input.promo.active && isPromoExpired({ endsAtUtc: input.promo.endsAtUtc })) {
        warnings.push({
            code: "expired_promo_active",
            severity: "error",
            label: "Expired promo still active",
            detail: "This promo remains active after its configured end time.",
            sourceSurface: "platform_economy.promos",
        });
    }

    if (input.promo.maxRedemptions === null || input.promo.maxPerUser === null) {
        warnings.push({
            code: "promo_redemption_limit_missing",
            severity: "warn",
            label: "Promo redemption limit missing",
            detail: "Promo redemptions should define both maxRedemptions and maxPerUser.",
            sourceSurface: "platform_economy.promos",
        });
    }

    if (input.promo.stackable) {
        warnings.push({
            code: "stackable_discount_risk",
            severity: "warn",
            label: "Stackable promo risk",
            detail: "Stackable promos can compound discounts and should be reviewed carefully.",
            sourceSurface: "platform_economy.promos",
        });
    }

    return warnings;
}

export function buildPurchaseSourceOfFundsBreakdown(input: {
    paidBaseGd: number;
    paidBonusGd: number;
    rewardPromoGd?: number;
}) {
    const rewardPromoGd = normalizeCount(input.rewardPromoGd);
    return {
        paidBaseGd: normalizeCount(input.paidBaseGd),
        paidBonusGd: normalizeCount(input.paidBonusGd),
        rewardPromoGd,
        purchasedBalanceCreditGd: normalizeCount(input.paidBaseGd) + normalizeCount(input.paidBonusGd),
        rewardBalanceCreditGd: rewardPromoGd,
    } satisfies PlatformEconomySourceBreakdown;
}
