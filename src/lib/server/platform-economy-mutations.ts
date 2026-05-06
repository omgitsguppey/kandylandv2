import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
    type PlatformEconomyOfferRecord,
    type PlatformEconomyPackageRecord,
    type PlatformEconomyPromoRecord,
    buildPackageWarnings,
    buildPromoWarnings,
    classifyPromoBonusSource,
    computeEffectiveUsdPer100Gd,
    normalizeCount,
    normalizeMoney,
    normalizePromoCode,
} from "@/lib/platform-economy";

const PACKAGE_COLLECTION = "admin_economy_packages";
const PROMO_COLLECTION = "admin_economy_promos";
const OFFER_COLLECTION = "admin_economy_offers";

export class PlatformEconomyMutationError extends Error {
    status: number;
    code: string;

    constructor(message: string, status = 400, code = "platform_economy_invalid_request") {
        super(message);
        this.name = "PlatformEconomyMutationError";
        this.status = status;
        this.code = code;
    }
}

function requireAdminDb() {
    if (!adminDb) {
        throw new PlatformEconomyMutationError("storage_bucket_unavailable", 503, "storage_bucket_unavailable");
    }
    return adminDb;
}

function readString(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function readBoolean(value: unknown, fallback = false) {
    return typeof value === "boolean" ? value : fallback;
}

function ensureReasonForRisk(warnings: Array<{ code: string }>, reason: string | null) {
    const needsReason = warnings.some((warning) =>
        warning.code === "package_below_floor"
        || warning.code === "promo_below_floor"
        || warning.code === "missing_usd_basis",
    );
    if (needsReason && (!reason || reason.trim().length < 8)) {
        throw new PlatformEconomyMutationError(
            "Risky package or promo overrides require an admin reason.",
            400,
            "below_floor_override_reason_required",
        );
    }
}

export async function savePlatformEconomyPackage(input: {
    packageId?: string;
    body: Record<string, unknown>;
    actorUid: string;
    mode: "create" | "update";
}) {
    const db = requireAdminDb();
    const now = Date.now();
    const requestedId = readString(input.body.packageId || input.packageId);
    const packageId = requestedId || `pkg_${now}`;
    const ref = db.collection(PACKAGE_COLLECTION).doc(packageId);
    const existing = await ref.get();
    if (input.mode === "update" && !existing.exists) {
        throw new PlatformEconomyMutationError("Package not found.", 404, "not_found");
    }

    const existingRaw = existing.data() as Record<string, unknown> | undefined;
    const priceUsd = normalizeMoney(input.body.priceUsd ?? existingRaw?.priceUsd);
    const basePaidGd = normalizeCount(input.body.basePaidGd ?? existingRaw?.basePaidGd);
    const bonusPaidGd = normalizeCount(input.body.bonusPaidGd ?? existingRaw?.bonusPaidGd);
    const totalGd = normalizeCount(input.body.totalGd ?? (basePaidGd + bonusPaidGd));
    const effectiveUsdPer100Gd = computeEffectiveUsdPer100Gd(priceUsd, totalGd);
    const warnings = buildPackageWarnings({
        effectiveUsdPer100Gd,
        sourceSurface: "platform_economy.packages",
    });
    const overrideReason = readString(input.body.overrideReason ?? existingRaw?.overrideReason);
    ensureReasonForRisk(warnings, overrideReason || null);

    const nextVersion = (normalizeCount(existingRaw?.version) || 0) + 1;
    const active = readBoolean(input.body.active, input.mode === "create" ? false : readBoolean(existingRaw?.active));
    if (active && warnings.some((warning) => warning.code === "missing_usd_basis")) {
        throw new PlatformEconomyMutationError("Packages with missing USD basis cannot be activated.", 400, "missing_usd_basis");
    }

    const nextRecord: PlatformEconomyPackageRecord = {
        packageId,
        label: readString(input.body.label ?? existingRaw?.label, packageId),
        priceUsd,
        basePaidGd,
        bonusPaidGd,
        totalGd,
        effectiveUsdPer100Gd: effectiveUsdPer100Gd ?? 0,
        active,
        featured: readBoolean(input.body.featured, readBoolean(existingRaw?.featured)),
        sortOrder: normalizeCount(input.body.sortOrder ?? existingRaw?.sortOrder),
        createdAtUtc: typeof existingRaw?.createdAtUtc === "string" ? String(existingRaw.createdAtUtc) : new Date(now).toISOString(),
        updatedAtUtc: new Date(now).toISOString(),
        version: nextVersion,
        source: "admin_config",
        warnings,
        overrideReason: overrideReason || null,
    };

    await ref.set({
        ...nextRecord,
        createdAt: existing.exists ? existingRaw?.createdAt ?? now : now,
        updatedAt: now,
        createdByUid: existingRaw?.createdByUid ?? input.actorUid,
        updatedByUid: input.actorUid,
    }, { merge: true });

    return nextRecord;
}

export async function savePlatformEconomyPromo(input: {
    promoId?: string;
    body: Record<string, unknown>;
    actorUid: string;
    mode: "create" | "update";
}) {
    const db = requireAdminDb();
    const now = Date.now();
    const requestedId = readString(input.body.promoId || input.promoId);
    const promoId = requestedId || `promo_${now}`;
    const ref = db.collection(PROMO_COLLECTION).doc(promoId);
    const existing = await ref.get();
    if (input.mode === "update" && !existing.exists) {
        throw new PlatformEconomyMutationError("Promo not found.", 404, "not_found");
    }

    const existingRaw = existing.data() as Record<string, unknown> | undefined;
    const appliesToPackageIds = readStringArray(input.body.appliesToPackageIds ?? existingRaw?.appliesToPackageIds);
    const discountValue = normalizeMoney(input.body.discountValue ?? existingRaw?.discountValue);
    const bonusGd = normalizeCount(input.body.bonusGd ?? existingRaw?.bonusGd);
    const minPurchaseUsdValue = input.body.minPurchaseUsd ?? existingRaw?.minPurchaseUsd;
    const minPurchaseUsd = minPurchaseUsdValue == null ? null : normalizeMoney(minPurchaseUsdValue);
    const effectiveImpact = appliesToPackageIds.length > 0 && (discountValue > 0 || bonusGd > 0) && minPurchaseUsd
        ? computeEffectiveUsdPer100Gd(Math.max(0, minPurchaseUsd - discountValue), bonusGd + appliesToPackageIds.length * 100)
        : null;
    const promoType = readString(input.body.promoType ?? existingRaw?.promoType, "retention") as PlatformEconomyPromoRecord["promoType"];
    const warnings = buildPromoWarnings({
        effectiveUsdPer100GdImpact: effectiveImpact,
        promo: {
            active: readBoolean(input.body.active, input.mode === "create" ? false : readBoolean(existingRaw?.active)),
            stackable: readBoolean(input.body.stackable, readBoolean(existingRaw?.stackable)),
            maxRedemptions: (input.body.maxRedemptions ?? existingRaw?.maxRedemptions) == null ? null : normalizeCount(input.body.maxRedemptions ?? existingRaw?.maxRedemptions),
            maxPerUser: (input.body.maxPerUser ?? existingRaw?.maxPerUser) == null ? null : normalizeCount(input.body.maxPerUser ?? existingRaw?.maxPerUser),
            endsAtUtc: typeof (input.body.endsAtUtc ?? existingRaw?.endsAtUtc) === "string" ? String(input.body.endsAtUtc ?? existingRaw?.endsAtUtc) : null,
        },
    });
    const reason = readString(input.body.reason ?? existingRaw?.reason);
    ensureReasonForRisk(warnings, reason || null);

    const nextVersion = (normalizeCount(existingRaw?.version) || 0) + 1;
    const nextRecord: PlatformEconomyPromoRecord = {
        promoId,
        code: normalizePromoCode(readString(input.body.code ?? existingRaw?.code, promoId)),
        title: readString(input.body.title ?? existingRaw?.title, promoId),
        promoType,
        discountValue,
        bonusGd,
        appliesToPackageIds,
        appliesToUserIds: readStringArray(input.body.appliesToUserIds ?? existingRaw?.appliesToUserIds),
        appliesToCreatorIds: readStringArray(input.body.appliesToCreatorIds ?? existingRaw?.appliesToCreatorIds),
        startsAtUtc: typeof (input.body.startsAtUtc ?? existingRaw?.startsAtUtc) === "string" ? String(input.body.startsAtUtc ?? existingRaw?.startsAtUtc) : null,
        endsAtUtc: typeof (input.body.endsAtUtc ?? existingRaw?.endsAtUtc) === "string" ? String(input.body.endsAtUtc ?? existingRaw?.endsAtUtc) : null,
        maxRedemptions: (input.body.maxRedemptions ?? existingRaw?.maxRedemptions) == null ? null : normalizeCount(input.body.maxRedemptions ?? existingRaw?.maxRedemptions),
        maxPerUser: (input.body.maxPerUser ?? existingRaw?.maxPerUser) == null ? null : normalizeCount(input.body.maxPerUser ?? existingRaw?.maxPerUser),
        minPurchaseUsd,
        active: readBoolean(input.body.active, input.mode === "create" ? false : readBoolean(existingRaw?.active)),
        stackable: readBoolean(input.body.stackable, false),
        createdByUid: typeof existingRaw?.createdByUid === "string" ? String(existingRaw.createdByUid) : input.actorUid,
        createdAtUtc: typeof existingRaw?.createdAtUtc === "string" ? String(existingRaw.createdAtUtc) : new Date(now).toISOString(),
        updatedAtUtc: new Date(now).toISOString(),
        reason: reason || null,
        sourceTruth: "platform_economy",
        version: nextVersion,
        warnings,
        effectiveUsdPer100GdImpact: effectiveImpact,
        bonusClassification: classifyPromoBonusSource({
            promoType,
            bonusGd,
            appliesToPackageIds,
        }),
    };

    await ref.set({
        ...nextRecord,
        createdAt: existing.exists ? existingRaw?.createdAt ?? now : now,
        updatedAt: now,
        updatedByUid: input.actorUid,
    }, { merge: true });

    return nextRecord;
}

export async function savePlatformEconomyOffer(input: {
    offerId?: string;
    body: Record<string, unknown>;
    actorUid: string;
    mode: "create" | "update";
}) {
    const db = requireAdminDb();
    const now = Date.now();
    const requestedId = readString(input.body.offerId || input.offerId);
    const offerId = requestedId || `offer_${now}`;
    const ref = db.collection(OFFER_COLLECTION).doc(offerId);
    const existing = await ref.get();
    if (input.mode === "update" && !existing.exists) {
        throw new PlatformEconomyMutationError("Offer not found.", 404, "not_found");
    }

    const existingRaw = existing.data() as Record<string, unknown> | undefined;
    const nextVersion = (normalizeCount(existingRaw?.version) || 0) + 1;
    const nextRecord: PlatformEconomyOfferRecord = {
        offerId,
        offerType: readString(input.body.offerType ?? existingRaw?.offerType, "limited_time"),
        eligibleAudience: readString(input.body.eligibleAudience ?? existingRaw?.eligibleAudience, "all"),
        packageIds: readStringArray(input.body.packageIds ?? existingRaw?.packageIds),
        promoId: typeof (input.body.promoId ?? existingRaw?.promoId) === "string" ? String(input.body.promoId ?? existingRaw?.promoId) : null,
        startsAtUtc: typeof (input.body.startsAtUtc ?? existingRaw?.startsAtUtc) === "string" ? String(input.body.startsAtUtc ?? existingRaw?.startsAtUtc) : null,
        endsAtUtc: typeof (input.body.endsAtUtc ?? existingRaw?.endsAtUtc) === "string" ? String(input.body.endsAtUtc ?? existingRaw?.endsAtUtc) : null,
        active: readBoolean(input.body.active, false),
        sourceTruth: "platform_economy",
        createdAtUtc: typeof existingRaw?.createdAtUtc === "string" ? String(existingRaw.createdAtUtc) : new Date(now).toISOString(),
        updatedAtUtc: new Date(now).toISOString(),
        version: nextVersion,
        warnings: [],
    };

    await ref.set({
        ...nextRecord,
        createdAt: existing.exists ? existingRaw?.createdAt ?? now : now,
        updatedAt: now,
        updatedByUid: input.actorUid,
    }, { merge: true });

    return nextRecord;
}
