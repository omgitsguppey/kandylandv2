import type { Drop } from "@/types/db";

export type DropCoverTreatment = "clear" | "blurred_guest" | "blurred_insufficient_balance" | "hidden_expired" | "owned";
export type DropCtaState = "create_profile" | "unwrap" | "refill" | "view" | "unavailable";
export type DropCardAuthState = "guest" | "authenticated";
export type DropBalanceState = "guest" | "pending" | "sufficient" | "insufficient" | "owned" | "unavailable";
export type DropAffordabilityReasonCode =
    | "guest_protected"
    | "authenticated_balance_pending"
    | "authenticated_can_afford"
    | "authenticated_insufficient_balance"
    | "owned"
    | "expired_unavailable";

export interface DropCardVisibilityState {
    coverTreatment: DropCoverTreatment;
    ctaState: DropCtaState;
    canAfford: boolean;
    isGuest: boolean;
    isUnlocked: boolean;
    shortfallGd: number;
    reasonCode: DropAffordabilityReasonCode;
    authState: DropCardAuthState;
    balanceState: DropBalanceState;
}

interface DropCardVisibilityInput {
    drop: Pick<Drop, "unlockCost" | "validUntil">;
    isAuthenticated: boolean;
    isUnlocked?: boolean;
    gumDropsBalance?: number | null;
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
    nowMs = Date.now(),
}: DropCardVisibilityInput): DropCardVisibilityState {
    const unlockCost = normalizeGd(drop.unlockCost);
    const hasKnownBalance = typeof gumDropsBalance === "number" && Number.isFinite(gumDropsBalance);
    const balance = hasKnownBalance ? normalizeGd(gumDropsBalance) : 0;
    const isGuest = !isAuthenticated;

    if (isUnlocked) {
        return {
            coverTreatment: "owned",
            ctaState: "view",
            canAfford: true,
            isGuest,
            isUnlocked: true,
            shortfallGd: 0,
            reasonCode: "owned",
            authState: isGuest ? "guest" : "authenticated",
            balanceState: "owned",
        };
    }

    if (drop.validUntil && nowMs > drop.validUntil) {
        return {
            coverTreatment: "hidden_expired",
            ctaState: "unavailable",
            canAfford: false,
            isGuest,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: "expired_unavailable",
            authState: isGuest ? "guest" : "authenticated",
            balanceState: "unavailable",
        };
    }

    if (isGuest) {
        return {
            coverTreatment: "blurred_guest",
            ctaState: "create_profile",
            canAfford: false,
            isGuest: true,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: "guest_protected",
            authState: "guest",
            balanceState: "guest",
        };
    }

    if (!hasKnownBalance) {
        return {
            coverTreatment: "clear",
            ctaState: "refill",
            canAfford: false,
            isGuest: false,
            isUnlocked: false,
            shortfallGd: unlockCost,
            reasonCode: "authenticated_balance_pending",
            authState: "authenticated",
            balanceState: "pending",
        };
    }

    const shortfallGd = Math.max(0, unlockCost - balance);
    const canAfford = shortfallGd === 0;

    return {
        coverTreatment: canAfford ? "clear" : "blurred_insufficient_balance",
        ctaState: canAfford ? "unwrap" : "refill",
        canAfford,
        isGuest: false,
        isUnlocked: false,
        shortfallGd,
        reasonCode: canAfford ? "authenticated_can_afford" : "authenticated_insufficient_balance",
        authState: "authenticated",
        balanceState: canAfford ? "sufficient" : "insufficient",
    };
}

export function getDropCardVisibilityTelemetryPayload(state: DropCardVisibilityState) {
    return {
        cover_treatment: state.coverTreatment,
        cta_state: state.ctaState,
        affordability_reason: state.reasonCode,
        balance_state: state.balanceState,
    };
}
