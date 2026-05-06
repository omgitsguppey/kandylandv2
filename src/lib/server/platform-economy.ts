import "server-only";

import { AggregateField } from "firebase-admin/firestore";

import { buildCommerceMetricsFromRollup, buildEmptyCommerceMetrics } from "@/lib/admin-user-commerce";
import { getBundlePresentation } from "@/lib/gumdrop-economics";
import { readSourceAwareBalance } from "@/lib/gumdrop-ledger";
import { FIXED_GUMDROP_PACKAGES, resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";
import {
    PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE,
    type PlatformEconomyDriftRecord,
    type PlatformEconomyOfferRecord,
    type PlatformEconomyPackageRecord,
    type PlatformEconomyPromoRecord,
    type PlatformEconomyRedemptionRecord,
    type PlatformEconomyTreasurySummary,
    type PlatformEconomyWalletRow,
    type PlatformEconomyWarning,
    buildPackageWarnings,
    buildPromoWarnings,
    classifyPromoBonusSource,
    computeEffectiveUsdPer100Gd,
    normalizeCount,
    normalizeMoney,
    normalizePromoCode,
    roundCurrency,
    toShortId,
} from "@/lib/platform-economy";
import { calculateGumdropValueBasis } from "@/lib/deterministic-admin-truth";
import { adminDb } from "@/lib/server/firebase-admin";
import { readAdminUserMetricsSnapshot } from "@/lib/server/admin-user-metrics-snapshot";

const PACKAGE_COLLECTION = "admin_economy_packages";
const PROMO_COLLECTION = "admin_economy_promos";
const OFFER_COLLECTION = "admin_economy_offers";
const MAX_CONFIG_ROWS = 50;
const MAX_WALLET_SCAN_ROWS = 101;
const MAX_REDEMPTION_ROWS = 51;

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
}

function toIsoOrNow(value: unknown) {
    const timestamp = toTimestampNumber(value);
    return timestamp > 0 ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function toIsoOrNull(value: unknown) {
    const timestamp = toTimestampNumber(value);
    return timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function readStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function readBoolean(value: unknown, fallback = false) {
    return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function buildDefaultPackageRecord(input: {
    drops: number;
    priceUsd: number;
    label: string;
    sortOrder: number;
}): PlatformEconomyPackageRecord {
    const bundle = getBundlePresentation(input.drops);
    const effectiveUsdPer100Gd = computeEffectiveUsdPer100Gd(input.priceUsd, input.drops);

    return {
        packageId: bundle.bundleKey,
        label: input.label,
        priceUsd: roundCurrency(input.priceUsd),
        basePaidGd: bundle.baseAmount,
        bonusPaidGd: bundle.bonus,
        totalGd: input.drops,
        effectiveUsdPer100Gd: effectiveUsdPer100Gd ?? 0,
        active: true,
        featured: input.sortOrder === 0,
        sortOrder: input.sortOrder,
        createdAtUtc: new Date(0).toISOString(),
        updatedAtUtc: new Date(0).toISOString(),
        version: 1,
        source: "admin_config",
        warnings: buildPackageWarnings({
            effectiveUsdPer100Gd,
            sourceSurface: "platform_economy.packages",
        }),
        overrideReason: null,
    };
}

function normalizePackageDoc(id: string, raw: Record<string, unknown>): PlatformEconomyPackageRecord {
    const totalGd = normalizeCount(raw.totalGd) || Math.max(0, normalizeCount(raw.basePaidGd) + normalizeCount(raw.bonusPaidGd));
    const effectiveUsdPer100Gd = computeEffectiveUsdPer100Gd(normalizeMoney(raw.priceUsd), totalGd);
    return {
        packageId: readString(raw.packageId, id),
        label: readString(raw.label, id),
        priceUsd: normalizeMoney(raw.priceUsd),
        basePaidGd: normalizeCount(raw.basePaidGd),
        bonusPaidGd: normalizeCount(raw.bonusPaidGd),
        totalGd,
        effectiveUsdPer100Gd: effectiveUsdPer100Gd ?? 0,
        active: readBoolean(raw.active, false),
        featured: readBoolean(raw.featured, false),
        sortOrder: normalizeCount(raw.sortOrder),
        createdAtUtc: toIsoOrNow(raw.createdAtUtc ?? raw.createdAt),
        updatedAtUtc: toIsoOrNow(raw.updatedAtUtc ?? raw.updatedAt),
        version: Math.max(1, normalizeCount(raw.version) || 1),
        source: "admin_config",
        warnings: buildPackageWarnings({
            effectiveUsdPer100Gd,
            sourceSurface: "platform_economy.packages",
        }),
        overrideReason: typeof raw.overrideReason === "string" ? raw.overrideReason : null,
    };
}

function normalizePromoDoc(id: string, raw: Record<string, unknown>): PlatformEconomyPromoRecord {
    const promoType = readString(raw.promoType, "retention") as PlatformEconomyPromoRecord["promoType"];
    const bonusGd = normalizeCount(raw.bonusGd);
    const appliesToPackageIds = readStringArray(raw.appliesToPackageIds);
    const discountValue = normalizeMoney(raw.discountValue);
    const effectiveImpact = appliesToPackageIds.length > 0 && bonusGd > 0
        ? computeEffectiveUsdPer100Gd(
            Math.max(0, (normalizeMoney(raw.minPurchaseUsd) || 0) - discountValue),
            bonusGd + appliesToPackageIds.length * 100,
        )
        : null;

    const promo: PlatformEconomyPromoRecord = {
        promoId: readString(raw.promoId, id),
        code: normalizePromoCode(readString(raw.code, id)),
        title: readString(raw.title, id),
        promoType,
        discountValue,
        bonusGd,
        appliesToPackageIds,
        appliesToUserIds: readStringArray(raw.appliesToUserIds),
        appliesToCreatorIds: readStringArray(raw.appliesToCreatorIds),
        startsAtUtc: toIsoOrNull(raw.startsAtUtc ?? raw.startsAt),
        endsAtUtc: toIsoOrNull(raw.endsAtUtc ?? raw.endsAt),
        maxRedemptions: raw.maxRedemptions == null ? null : normalizeCount(raw.maxRedemptions),
        maxPerUser: raw.maxPerUser == null ? null : normalizeCount(raw.maxPerUser),
        minPurchaseUsd: raw.minPurchaseUsd == null ? null : normalizeMoney(raw.minPurchaseUsd),
        active: readBoolean(raw.active, false),
        stackable: readBoolean(raw.stackable, false),
        createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : null,
        createdAtUtc: toIsoOrNow(raw.createdAtUtc ?? raw.createdAt),
        updatedAtUtc: toIsoOrNow(raw.updatedAtUtc ?? raw.updatedAt),
        reason: typeof raw.reason === "string" ? raw.reason : null,
        sourceTruth: "platform_economy",
        version: Math.max(1, normalizeCount(raw.version) || 1),
        warnings: [],
        effectiveUsdPer100GdImpact: effectiveImpact,
        bonusClassification: classifyPromoBonusSource({
            promoType,
            bonusGd,
            appliesToPackageIds,
        }),
    };

    promo.warnings = buildPromoWarnings({
        effectiveUsdPer100GdImpact: promo.effectiveUsdPer100GdImpact,
        promo,
    });

    return promo;
}

function normalizeOfferDoc(id: string, raw: Record<string, unknown>): PlatformEconomyOfferRecord {
    return {
        offerId: readString(raw.offerId, id),
        offerType: readString(raw.offerType, "limited_time"),
        eligibleAudience: readString(raw.eligibleAudience, "all"),
        packageIds: readStringArray(raw.packageIds),
        promoId: typeof raw.promoId === "string" ? raw.promoId : null,
        startsAtUtc: toIsoOrNull(raw.startsAtUtc ?? raw.startsAt),
        endsAtUtc: toIsoOrNull(raw.endsAtUtc ?? raw.endsAt),
        active: readBoolean(raw.active, false),
        sourceTruth: "platform_economy",
        createdAtUtc: toIsoOrNow(raw.createdAtUtc ?? raw.createdAt),
        updatedAtUtc: toIsoOrNow(raw.updatedAtUtc ?? raw.updatedAt),
        version: Math.max(1, normalizeCount(raw.version) || 1),
        warnings: [],
    };
}

export async function readPlatformEconomyPackages() {
    if (!adminDb) {
        return FIXED_GUMDROP_PACKAGES.map((pkg, index) => buildDefaultPackageRecord({ ...pkg, sortOrder: index }));
    }

    const snapshot = await adminDb.collection(PACKAGE_COLLECTION).limit(MAX_CONFIG_ROWS).get();
    if (snapshot.empty) {
        return FIXED_GUMDROP_PACKAGES.map((pkg, index) => buildDefaultPackageRecord({ ...pkg, sortOrder: index }));
    }

    return snapshot.docs
        .map((doc) => normalizePackageDoc(doc.id, doc.data() as Record<string, unknown>))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

export async function readPlatformEconomyPromos() {
    if (!adminDb) {
        return [] as PlatformEconomyPromoRecord[];
    }

    const snapshot = await adminDb.collection(PROMO_COLLECTION).limit(MAX_CONFIG_ROWS).get();
    return snapshot.docs
        .map((doc) => normalizePromoDoc(doc.id, doc.data() as Record<string, unknown>))
        .sort((left, right) => Number(right.active) - Number(left.active) || left.code.localeCompare(right.code));
}

export async function readPlatformEconomyOffers() {
    if (!adminDb) {
        return [] as PlatformEconomyOfferRecord[];
    }

    const snapshot = await adminDb.collection(OFFER_COLLECTION).limit(MAX_CONFIG_ROWS).get();
    return snapshot.docs
        .map((doc) => normalizeOfferDoc(doc.id, doc.data() as Record<string, unknown>))
        .sort((left, right) => Number(right.active) - Number(left.active) || left.offerType.localeCompare(right.offerType));
}

export async function readPlatformEconomyRedemptions(input: {
    page?: number;
    pageSize?: number;
} = {}) {
    if (!adminDb) {
        return [] as PlatformEconomyRedemptionRecord[];
    }

    const pageSize = Math.min(Math.max(1, input.pageSize ?? PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE), PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE);
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(MAX_REDEMPTION_ROWS, page * pageSize + 1);
    const snapshot = await adminDb.collection("transactions")
        .where("type", "==", "purchase_currency")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

    return snapshot.docs
        .slice((page - 1) * pageSize, page * pageSize)
        .map((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const basePaidGd = normalizeCount(raw.paidGumDrops);
            const bonusPaidGd = normalizeCount(raw.bonusGumDrops);
            const rewardPromoGd = normalizeCount(raw.rewardPromoGd);
            const totalIssuedGd = normalizeCount(raw.deliveredGumDrops || (basePaidGd + bonusPaidGd + rewardPromoGd));
            const effectiveUsdPer100Gd = computeEffectiveUsdPer100Gd(normalizeMoney(raw.grossRevenueUsd ?? raw.priceUsdPaid), totalIssuedGd);
            const warnings: PlatformEconomyWarning[] = [];
            if (raw.promoId && raw.priceUsdPaid == null) {
                warnings.push({
                    code: "ledger_promo_missing",
                    severity: "warn",
                    label: "Promo metadata incomplete",
                    detail: "A promo id is present, but discounted paid USD is missing from the ledger row.",
                    sourceSurface: "platform_economy.redemptions",
                });
            }

            return {
                redemptionId: doc.id,
                createdAtUtc: toIsoOrNow(raw.timestamp ?? raw.createdAtUtc),
                userId: readString(raw.userId, ""),
                shortUserId: toShortId(readString(raw.userId, "")),
                packageId: typeof raw.packageId === "string" ? raw.packageId : null,
                packageLabel: typeof raw.bundleLabel === "string" ? raw.bundleLabel : (typeof raw.packageId === "string" ? raw.packageId : "Package"),
                promoId: typeof raw.promoId === "string" ? raw.promoId : null,
                promoCode: typeof raw.promoCode === "string" ? raw.promoCode : null,
                offerId: typeof raw.offerId === "string" ? raw.offerId : null,
                priceUsdBeforeDiscount: normalizeMoney(raw.priceUsdBeforeDiscount ?? raw.grossRevenueUsd),
                discountUsd: normalizeMoney(raw.discountUsd),
                priceUsdPaid: normalizeMoney(raw.priceUsdPaid ?? raw.grossRevenueUsd),
                basePaidGd,
                bonusPaidGd,
                rewardPromoGd,
                totalIssuedGd,
                effectiveUsdPer100Gd,
                warnings,
            } satisfies PlatformEconomyRedemptionRecord;
        });
}

export async function buildPlatformEconomyTreasurySummary(input: {
    walletPage?: number;
    walletPageSize?: number;
} = {}): Promise<PlatformEconomyTreasurySummary> {
    const generatedAtUtc = new Date().toISOString();

    if (!adminDb) {
        return {
            generatedAtUtc,
            sourceTruth: "platform_economy",
            freshnessState: "unknown",
            outstandingGd: null,
            paidGd: null,
            paidBonusGd: null,
            rewardFreeGd: null,
            paidSourceAvgUsdPer100Gd: null,
            floorState: "unknown",
            warnings: [{
                code: "wallet_balance_source_mismatch",
                severity: "warn",
                label: "Admin database unavailable",
                detail: "Treasury totals are unavailable because Firebase Admin is not configured.",
                sourceSurface: "platform_economy.treasury",
            }],
            walletRows: [],
            walletPage: 1,
            walletPageSize: input.walletPageSize ?? PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE,
            walletHasMore: false,
        };
    }

    const walletPageSize = Math.min(Math.max(1, input.walletPageSize ?? PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE), PLATFORM_ECONOMY_DEFAULT_PAGE_SIZE);
    const walletPage = Math.max(1, input.walletPage ?? 1);
    const walletLimit = Math.min(MAX_WALLET_SCAN_ROWS, walletPage * walletPageSize + 1);

    const [balanceAggregate, walletSnapshot, metricsSnapshotMeta, commerceSummarySnap] = await Promise.all([
        adminDb.collection("users").aggregate({
            totalBalance: AggregateField.sum("gumDropsBalance"),
            purchasedBalance: AggregateField.sum("gumDropsPurchasedBalance"),
            rewardBalance: AggregateField.sum("gumDropsRewardBalance"),
        }).get(),
        adminDb.collection("users")
            .orderBy("gumDropsBalance", "desc")
            .limit(walletLimit)
            .get(),
        readAdminUserMetricsSnapshot({ db: adminDb, generatedAt: Date.now() }),
        adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
    ]);

    const commerceMetrics = commerceSummarySnap.exists
        ? buildCommerceMetricsFromRollup(commerceSummarySnap.data() as Record<string, unknown>, {
            commerceTruthLabel: "live",
            commerceSourceLabel: "analytics_commerce_rollup.summary",
        })
        : buildEmptyCommerceMetrics({
            commerceTruthLabel: "partial",
            commerceSourceLabel: "analytics_commerce_rollup.summary_missing",
            commerceEmptyReason: "Commerce rollup summary is unavailable.",
        });

    const aggregate = balanceAggregate.data();
    const outstandingGd = normalizeCount(aggregate.totalBalance);
    const paidGd = normalizeCount(aggregate.purchasedBalance);
    const rewardFreeGd = normalizeCount(aggregate.rewardBalance);
    const paidBonusGd = Math.max(0, normalizeCount(commerceMetrics.bonusGumDrops));
    const warnings: PlatformEconomyWarning[] = [];

    if (paidGd + rewardFreeGd !== outstandingGd) {
        warnings.push({
            code: "wallet_balance_source_mismatch",
            severity: "warn",
            label: "Wallet balance source mismatch",
            detail: "Outstanding balance does not equal paid plus reward/free balance.",
            sourceSurface: "platform_economy.treasury",
        });
    }

    if (paidBonusGd > 0 && paidGd < paidBonusGd) {
        warnings.push({
            code: "paid_bonus_classified_as_free",
            severity: "warn",
            label: "Paid bonus balance looks under-classified",
            detail: "Issued paid-source bonus GD exceeds current purchased balance. Review source-of-funds continuity before treating this as a bug.",
            sourceSurface: "platform_economy.treasury",
        });
    }

    const walletRows = walletSnapshot.docs
        .slice((walletPage - 1) * walletPageSize, walletPage * walletPageSize)
        .map((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const balance = readSourceAwareBalance(raw);
            const rowWarnings: PlatformEconomyWarning[] = [];
            if (balance.purchased + balance.reward !== balance.total) {
                rowWarnings.push({
                    code: "wallet_balance_source_mismatch",
                    severity: "warn",
                    label: "Wallet source split mismatch",
                    detail: "This wallet total does not equal paid plus reward/free balance.",
                    sourceSurface: "platform_economy.wallets",
                });
            }
            return {
                userId: doc.id,
                shortUserId: toShortId(doc.id),
                displayName: readString(raw.displayName, readString(raw.username, "Unknown user")),
                totalGd: balance.total,
                paidGd: balance.purchased,
                rewardFreeGd: balance.reward,
                pendingGd: null,
                heldGd: null,
                spentGd: null,
                sourceWarnings: rowWarnings,
                adminUserHref: `/admin/user/${encodeURIComponent(doc.id)}`,
            } satisfies PlatformEconomyWalletRow;
        });

    const gumdropValueBasis = calculateGumdropValueBasis({
        paidUsdCollected: normalizeMoney(commerceMetrics.grossRevenueUsd),
        paidGdIssued: Math.max(0, normalizeCount(commerceMetrics.deliveredGumDrops) - paidBonusGd),
        paidBonusGdIssued: paidBonusGd,
        rewardFreeGdIssued: rewardFreeGd,
    });
    const paidSourceAvgUsdPer100Gd = gumdropValueBasis.averageUsdPer100PaidSourceGd;
    const floorState = gumdropValueBasis.floorState === "error"
        ? "critical"
        : gumdropValueBasis.floorState === "warn"
            ? "warn"
            : gumdropValueBasis.floorState === "healthy"
                ? "healthy"
                : "unknown";

    return {
        generatedAtUtc,
        sourceTruth: "platform_economy",
        freshnessState: metricsSnapshotMeta.snapshot.freshnessState === "live" ? "live" : "review",
        outstandingGd,
        paidGd,
        paidBonusGd,
        rewardFreeGd,
        paidSourceAvgUsdPer100Gd,
        floorState,
        warnings,
        walletRows,
        walletPage,
        walletPageSize,
        walletHasMore: walletSnapshot.docs.length > walletPage * walletPageSize,
    };
}

export async function buildPlatformEconomyDriftReport(): Promise<PlatformEconomyDriftRecord[]> {
    const [packages, promos, treasury, metricsSnapshotMeta, commerceSummarySnap, redemptionRows] = await Promise.all([
        readPlatformEconomyPackages(),
        readPlatformEconomyPromos(),
        buildPlatformEconomyTreasurySummary(),
        adminDb ? readAdminUserMetricsSnapshot({ db: adminDb, generatedAt: Date.now() }) : Promise.resolve(null),
        adminDb ? adminDb.collection("analytics_commerce_rollup").doc("summary").get() : Promise.resolve(null),
        readPlatformEconomyRedemptions({ page: 1, pageSize: 20 }),
    ]);

    const drift: PlatformEconomyDriftRecord[] = [];

    packages.forEach((pkg) => {
        const expectedPrice = resolveExpectedGumdropPrice(pkg.totalGd);
        const actualPrice = pkg.priceUsd.toFixed(2);
        if (expectedPrice && expectedPrice !== actualPrice) {
            drift.push({
                driftId: `package:${pkg.packageId}`,
                surface: "packages",
                severity: "error",
                expected: `$${expectedPrice} for ${pkg.totalGd} GD`,
                actual: `$${actualPrice} for ${pkg.totalGd} GD`,
                validator: "npm run check:platform-economy-commerce-controls",
                nextAction: "Align package config with PayPal order and capture helpers before activation.",
            });
        }
    });

    promos.forEach((promo) => {
        if (promo.active && promo.warnings.some((warning) => warning.code === "expired_promo_active")) {
            drift.push({
                driftId: `promo:${promo.promoId}`,
                surface: "promo",
                severity: "error",
                expected: "Inactive promo after end time",
                actual: `${promo.code} remains active after its end window`,
                validator: "npm run check:platform-economy-commerce-controls",
                nextAction: "Disable the promo or extend the window with a reason.",
            });
        }
    });

    if (treasury.outstandingGd !== null && treasury.paidGd !== null && treasury.rewardFreeGd !== null) {
        const expectedOutstanding = treasury.paidGd + treasury.rewardFreeGd;
        if (expectedOutstanding !== treasury.outstandingGd) {
            drift.push({
                driftId: "wallet:aggregate-balance",
                surface: "wallet",
                severity: "warn",
                expected: `${expectedOutstanding} GD from paid + reward/free`,
                actual: `${treasury.outstandingGd} GD outstanding`,
                validator: "npm run check:gumdrop-source-of-funds-truth",
                nextAction: "Inspect wallet source-aware balance writes and rebuild the aggregate if needed.",
            });
        }
    }

    const commerceMetrics = commerceSummarySnap?.exists
        ? buildCommerceMetricsFromRollup(commerceSummarySnap.data() as Record<string, unknown>, {
            commerceTruthLabel: "live",
            commerceSourceLabel: "analytics_commerce_rollup.summary",
        })
        : buildEmptyCommerceMetrics();
    if (metricsSnapshotMeta && Math.abs(metricsSnapshotMeta.snapshot.totalRevenueUsd - commerceMetrics.grossRevenueUsd) > 0.01) {
        drift.push({
            driftId: "revenue:overview-vs-economy",
            surface: "revenue",
            severity: "warn",
            expected: `$${metricsSnapshotMeta.snapshot.totalRevenueUsd.toFixed(2)} from admin metrics snapshot`,
            actual: `$${commerceMetrics.grossRevenueUsd.toFixed(2)} from commerce rollup`,
            validator: "npm run check:platform-economy-treasury",
            nextAction: "Review revenue rollup freshness and ensure the admin overview is using transaction-backed commerce totals.",
        });
    }

    redemptionRows.forEach((row) => {
        if ((row.promoId || row.offerId) && row.effectiveUsdPer100Gd === null) {
            drift.push({
                driftId: `ledger:${row.redemptionId}`,
                surface: "ledger",
                severity: "warn",
                expected: "Promo/offer redemptions should carry effective rate metadata",
                actual: `Missing effective rate on ${row.redemptionId}`,
                validator: "npm run check:platform-economy-commerce-controls",
                nextAction: "Write package/promo/offer metadata into future purchase ledger rows.",
            });
        }
    });

    return drift;
}
