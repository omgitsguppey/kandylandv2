import type { Drop } from "@/types/db";

export type DropCoverTreatment = "clear" | "blurred_guest" | "blurred_insufficient_balance" | "creator_preview" | "hidden_expired" | "owned";
export type DropCtaState = "create_profile" | "unwrap" | "refill" | "preview" | "view" | "unavailable";
export type DropCardAuthState = "guest" | "authenticated";
export type DropBalanceState = "guest" | "pending" | "sufficient" | "insufficient" | "owned" | "unavailable";
export type DropAffordabilityReasonCode =
    | "guest_protected"
    | "authenticated_balance_pending"
    | "authenticated_can_afford"
    | "authenticated_insufficient_balance"
    | "creator_cover_preview"
    | "owned"
    | "expired_unavailable";

export interface DropCardVisibilityState {
    coverTreatment: DropCoverTreatment;
    ctaState: DropCtaState;
    canAfford: boolean;
    isGuest: boolean;
    isOwnerOrCreator: boolean;
    isUnlocked: boolean;
    hasUnlockedDrop: boolean;
    hasEnoughGumDrops: boolean;
    shouldBlurCover: boolean;
    shouldShowSignupCta: boolean;
    shouldShowTopUpCta: boolean;
    shouldShowUnwrapCta: boolean;
    shouldShowViewOwnedCta: boolean;
    shouldShowCreatorShareCta: boolean;
    shortfallGd: number;
    reasonCode: DropAffordabilityReasonCode;
    authState: DropCardAuthState;
    balanceState: DropBalanceState;
}

interface DropCardVisibilityInput {
    drop: Pick<Drop, "unlockCost" | "validUntil" | "creatorId" | "submittedByCreatorId">;
    isAuthenticated: boolean;
    isUnlocked?: boolean;
    gumDropsBalance?: number | null;
    actorUserId?: string | null;
    activeCreatorId?: string | null;
    nowMs?: number;
}

function normalizeGd(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function resolveDropCardVisibilityState({
    drop,
    isAuthenticated,
    isUnlocked = false,
    gumDropsBalance,
    actorUserId,
    activeCreatorId,
    nowMs = Date.now(),
}: DropCardVisibilityInput): DropCardVisibilityState {
    const unlockCost = normalizeGd(drop.unlockCost);
    const hasKnownBalance = typeof gumDropsBalance === "number" && Number.isFinite(gumDropsBalance);
    const balance = hasKnownBalance ? normalizeGd(gumDropsBalance) : 0;
    const isGuest = !isAuthenticated;
    const isOwnerOrCreator = isAuthenticated && isDropCreatorPreviewEligible({ drop, actorUserId, activeCreatorId });
    const shortfallGd = Math.max(0, unlockCost - balance);
    const hasEnoughGumDrops = hasKnownBalance && shortfallGd === 0;
    const shouldBlurCover = isGuest || (!isUnlocked && !isOwnerOrCreator && !hasEnoughGumDrops);

    if (isUnlocked) {
        return buildDropCardVisibilityState({
            coverTreatment: "owned",
            ctaState: "view",
            canAfford: true,
            isGuest,
            isOwnerOrCreator,
            isUnlocked: true,
            shortfallGd: 0,
            reasonCode: "owned",
            authState: isGuest ? "guest" : "authenticated",
            balanceState: "owned",
            hasEnoughGumDrops: true,
            shouldBlurCover: false,
        });
    }

    if (drop.validUntil && nowMs > drop.validUntil) {
        return buildDropCardVisibilityState({
            coverTreatment: "hidden_expired",
            ctaState: "unavailable",
            canAfford: false,
            isGuest,
            isOwnerOrCreator,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: "expired_unavailable",
            authState: isGuest ? "guest" : "authenticated",
            balanceState: "unavailable",
            hasEnoughGumDrops: false,
            shouldBlurCover: false,
        });
    }

    if (isGuest) {
        return buildDropCardVisibilityState({
            coverTreatment: "blurred_guest",
            ctaState: "create_profile",
            canAfford: false,
            isGuest: true,
            isOwnerOrCreator: false,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: "guest_protected",
            authState: "guest",
            balanceState: "guest",
            hasEnoughGumDrops: false,
            shouldBlurCover: true,
        });
    }

    if (!hasKnownBalance) {
        return buildDropCardVisibilityState({
            coverTreatment: isOwnerOrCreator ? "creator_preview" : "blurred_insufficient_balance",
            ctaState: isOwnerOrCreator ? "preview" : "refill",
            canAfford: false,
            isGuest: false,
            isOwnerOrCreator,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: isOwnerOrCreator ? "creator_cover_preview" : "authenticated_balance_pending",
            authState: "authenticated",
            balanceState: "pending",
            hasEnoughGumDrops: false,
            shouldBlurCover,
        });
    }

    if (isOwnerOrCreator) {
        return buildDropCardVisibilityState({
            coverTreatment: "creator_preview",
            ctaState: "preview",
            canAfford: hasEnoughGumDrops,
            isGuest: false,
            isOwnerOrCreator: true,
            isUnlocked: false,
            shortfallGd,
            reasonCode: "creator_cover_preview",
            authState: "authenticated",
            balanceState: hasEnoughGumDrops ? "sufficient" : "insufficient",
            hasEnoughGumDrops,
            shouldBlurCover: false,
        });
    }

    return buildDropCardVisibilityState({
        coverTreatment: hasEnoughGumDrops ? "clear" : "blurred_insufficient_balance",
        ctaState: hasEnoughGumDrops ? "unwrap" : "refill",
        canAfford: hasEnoughGumDrops,
        isGuest: false,
        isOwnerOrCreator: false,
        isUnlocked: false,
        shortfallGd,
        reasonCode: hasEnoughGumDrops ? "authenticated_can_afford" : "authenticated_insufficient_balance",
        authState: "authenticated",
        balanceState: hasEnoughGumDrops ? "sufficient" : "insufficient",
        hasEnoughGumDrops,
        shouldBlurCover,
    });
}

export function getDropCardVisibilityTelemetryPayload(state: DropCardVisibilityState) {
    return {
        cover_treatment: state.coverTreatment,
        cta_state: state.ctaState,
        affordability_reason: state.reasonCode,
        balance_state: state.balanceState,
        is_owner_or_creator: state.isOwnerOrCreator,
        has_enough_gumdrops: state.hasEnoughGumDrops,
        has_unlocked_drop: state.hasUnlockedDrop,
        should_blur_cover: state.shouldBlurCover,
    };
}

function buildDropCardVisibilityState(input: Omit<DropCardVisibilityState,
    "hasUnlockedDrop"
    | "shouldShowSignupCta"
    | "shouldShowTopUpCta"
    | "shouldShowUnwrapCta"
    | "shouldShowViewOwnedCta"
    | "shouldShowCreatorShareCta"
>) {
    return {
        ...input,
        hasUnlockedDrop: input.isUnlocked,
        shouldShowSignupCta: input.ctaState === "create_profile",
        shouldShowTopUpCta: input.ctaState === "refill",
        shouldShowUnwrapCta: input.ctaState === "unwrap",
        shouldShowViewOwnedCta: input.ctaState === "view",
        shouldShowCreatorShareCta: input.ctaState === "preview",
    };
}

function isDropCreatorPreviewEligible(input: {
    drop: Pick<Drop, "creatorId" | "submittedByCreatorId">;
    actorUserId?: string | null;
    activeCreatorId?: string | null;
}) {
    const ownerIds = new Set(
        [input.drop.creatorId, input.drop.submittedByCreatorId]
            .map(readIdentity)
            .filter((value): value is string => Boolean(value)),
    );
    if (ownerIds.size === 0) {
        return false;
    }

    const actorUserId = readIdentity(input.actorUserId);
    const activeCreatorId = readIdentity(input.activeCreatorId);
    return Boolean(
        (actorUserId && ownerIds.has(actorUserId))
        || (activeCreatorId && ownerIds.has(activeCreatorId)),
    );
}

function readIdentity(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}
