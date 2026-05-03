import type { Drop } from "@/types/db";
import { getDropViewCount } from "@/lib/drop-engagement";
import {
    DROP_COUNTDOWN_ONE_DAY_MS,
    DROP_COUNTDOWN_ONE_HOUR_MS,
    DROP_COUNTDOWN_ONE_MINUTE_MS,
} from "@/lib/drop-countdown";

export type DropPreviewCtaState = "signup" | "unwrap" | "refill" | "unlocked_success" | "unavailable";
export type DropPreviewCoverTreatment = "clear" | "guest_protected" | "insufficient_softened" | "owned";
export type DropPreviewUrgencyTier = "calm" | "warm" | "urgent" | "critical" | "expired";
export type DropPreviewSocialProofType = "views" | "unwraps";

export interface LockedDropPreviewSafeDrop {
    id: string;
    creatorId?: string;
    title: string;
    description: string;
    imageUrl: string;
    unlockCost: number;
    validFrom: number;
    validUntil?: number;
    status: Drop["status"];
    requiresActiveSubscription?: boolean;
    totalUnlocks: number;
    totalViews?: number;
    totalClicks?: number;
    type?: Drop["type"];
    tags?: string[];
    fileMetadata?: Drop["fileMetadata"];
    coverFileName?: string;
    mediaCounts?: Drop["mediaCounts"];
}

export interface LockedDropPreviewCreator {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    isVerified: boolean;
}

export interface LockedDropPreviewTruth {
    dropId: string;
    isGuest: boolean;
    isUnlocked: boolean;
    isExpired: boolean;
    isActive: boolean;
    canAfford: boolean;
    balanceGd: number;
    shortfallGd: number;
    ctaState: DropPreviewCtaState;
    coverTreatment: DropPreviewCoverTreatment;
    urgencyTier: DropPreviewUrgencyTier;
    socialProofType: DropPreviewSocialProofType;
    socialProofCount: number;
    safePreviewFieldsOnly: true;
    libraryOpenHref: string;
    keepUnwrappingHref: string;
    reasonCodes: string[];
}

export function toLockedDropPreviewSafeDrop(drop: Drop): LockedDropPreviewSafeDrop {
    return {
        id: drop.id,
        creatorId: drop.creatorId,
        title: drop.title,
        description: drop.description,
        imageUrl: drop.imageUrl,
        unlockCost: drop.unlockCost,
        validFrom: drop.validFrom,
        validUntil: typeof drop.validUntil === "number" ? drop.validUntil : undefined,
        status: drop.status,
        requiresActiveSubscription: drop.requiresActiveSubscription,
        totalUnlocks: normalizeGd(drop.totalUnlocks),
        totalViews: typeof drop.totalViews === "number" ? normalizeGd(drop.totalViews) : undefined,
        totalClicks: typeof drop.totalClicks === "number" ? normalizeGd(drop.totalClicks) : undefined,
        type: drop.type,
        tags: Array.isArray(drop.tags) ? [...drop.tags] : undefined,
        fileMetadata: drop.fileMetadata ? { ...drop.fileMetadata } : undefined,
        coverFileName: drop.coverFileName,
        mediaCounts: drop.mediaCounts ? { ...drop.mediaCounts } : undefined,
    };
}

export function getLockedDropPreviewMediaCounts(drop: LockedDropPreviewSafeDrop) {
    const images = normalizeGd(drop.mediaCounts?.images);
    const videos = normalizeGd(drop.mediaCounts?.videos);
    if (images > 0 || videos > 0) {
        return { images, videos };
    }

    const mimeType = drop.fileMetadata?.type?.toLowerCase() ?? "";
    return mimeType.startsWith("video/") ? { images: 0, videos: 1 } : { images: 1, videos: 0 };
}

export function resolveDropPreviewUrgencyTier(validUntil: number | undefined, nowMs = Date.now()): DropPreviewUrgencyTier {
    if (!Number.isFinite(validUntil)) {
        return "calm";
    }

    const msLeft = Math.max(0, (validUntil as number) - nowMs);
    if (msLeft === 0) {
        return "expired";
    }

    if (msLeft <= 30 * DROP_COUNTDOWN_ONE_MINUTE_MS) {
        return "critical";
    }

    if (msLeft <= 4 * DROP_COUNTDOWN_ONE_HOUR_MS) {
        return "urgent";
    }

    if (msLeft <= DROP_COUNTDOWN_ONE_DAY_MS) {
        return "warm";
    }

    return "calm";
}

export function getLockedDropPreviewSocialProof(drop: LockedDropPreviewSafeDrop): {
    type: DropPreviewSocialProofType;
    count: number;
    label: string;
} {
    const totalUnlocks = normalizeGd(drop.totalUnlocks);
    if (totalUnlocks > 10) {
        return {
            type: "unwraps",
            count: totalUnlocks,
            label: `${totalUnlocks.toLocaleString()} unwrapped`,
        };
    }

    const views = getDropViewCount(drop);
    return {
        type: "views",
        count: views,
        label: `${views.toLocaleString()} views`,
    };
}

export function resolveLockedDropPreviewTruth({
    drop,
    isAuthenticated,
    isUnlocked,
    gumDropsBalance,
    nowMs = Date.now(),
}: {
    drop: LockedDropPreviewSafeDrop;
    isAuthenticated: boolean;
    isUnlocked: boolean;
    gumDropsBalance?: number | null;
    nowMs?: number;
}): LockedDropPreviewTruth {
    const unlockCost = normalizeGd(drop.unlockCost);
    const balanceKnown = typeof gumDropsBalance === "number" && Number.isFinite(gumDropsBalance);
    const balanceGd = balanceKnown ? normalizeGd(gumDropsBalance) : 0;
    const shortfallGd = Math.max(0, unlockCost - balanceGd);
    const isGuest = !isAuthenticated;
    const isExpired = drop.status === "expired" || (typeof drop.validUntil === "number" && nowMs >= drop.validUntil);
    const isScheduled = drop.status === "scheduled" || nowMs < drop.validFrom;
    const isActive = !isExpired && !isScheduled && drop.status === "active";
    const urgencyTier = isExpired ? "expired" : resolveDropPreviewUrgencyTier(drop.validUntil, nowMs);
    const socialProof = getLockedDropPreviewSocialProof(drop);
    const reasonCodes: string[] = [];

    if (isUnlocked) {
        reasonCodes.push("owned");
        return buildTruth({
            drop,
            isGuest,
            isUnlocked: true,
            isExpired,
            isActive,
            canAfford: true,
            balanceGd,
            shortfallGd: 0,
            ctaState: "unlocked_success",
            coverTreatment: "owned",
            urgencyTier,
            socialProof,
            reasonCodes,
        });
    }

    if (!isActive) {
        reasonCodes.push(isExpired ? "expired_unavailable" : "scheduled_unavailable");
        return buildTruth({
            drop,
            isGuest,
            isUnlocked: false,
            isExpired,
            isActive,
            canAfford: false,
            balanceGd,
            shortfallGd: unlockCost,
            ctaState: "unavailable",
            coverTreatment: "clear",
            urgencyTier,
            socialProof,
            reasonCodes,
        });
    }

    if (isGuest) {
        reasonCodes.push("guest_protected");
        return buildTruth({
            drop,
            isGuest: true,
            isUnlocked: false,
            isExpired,
            isActive,
            canAfford: false,
            balanceGd: 0,
            shortfallGd: unlockCost,
            ctaState: "signup",
            coverTreatment: "guest_protected",
            urgencyTier,
            socialProof,
            reasonCodes,
        });
    }

    if (!balanceKnown) {
        reasonCodes.push("authenticated_balance_pending");
    } else if (shortfallGd > 0) {
        reasonCodes.push("authenticated_insufficient_balance");
    } else {
        reasonCodes.push("authenticated_can_afford");
    }

    return buildTruth({
        drop,
        isGuest: false,
        isUnlocked: false,
        isExpired,
        isActive,
        canAfford: balanceKnown && shortfallGd === 0,
        balanceGd,
        shortfallGd,
        ctaState: balanceKnown && shortfallGd === 0 ? "unwrap" : "refill",
        coverTreatment: balanceKnown && shortfallGd > 0 ? "insufficient_softened" : "clear",
        urgencyTier,
        socialProof,
        reasonCodes,
    });
}

function buildTruth(input: {
    drop: LockedDropPreviewSafeDrop;
    isGuest: boolean;
    isUnlocked: boolean;
    isExpired: boolean;
    isActive: boolean;
    canAfford: boolean;
    balanceGd: number;
    shortfallGd: number;
    ctaState: DropPreviewCtaState;
    coverTreatment: DropPreviewCoverTreatment;
    urgencyTier: DropPreviewUrgencyTier;
    socialProof: ReturnType<typeof getLockedDropPreviewSocialProof>;
    reasonCodes: string[];
}): LockedDropPreviewTruth {
    return {
        dropId: input.drop.id,
        isGuest: input.isGuest,
        isUnlocked: input.isUnlocked,
        isExpired: input.isExpired,
        isActive: input.isActive,
        canAfford: input.canAfford,
        balanceGd: input.balanceGd,
        shortfallGd: input.shortfallGd,
        ctaState: input.ctaState,
        coverTreatment: input.coverTreatment,
        urgencyTier: input.urgencyTier,
        socialProofType: input.socialProof.type,
        socialProofCount: input.socialProof.count,
        safePreviewFieldsOnly: true,
        libraryOpenHref: `/dashboard/library?drop=${encodeURIComponent(input.drop.id)}`,
        keepUnwrappingHref: "/drops",
        reasonCodes: input.reasonCodes,
    };
}

function normalizeGd(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return Math.max(0, Math.floor(numeric));
}
