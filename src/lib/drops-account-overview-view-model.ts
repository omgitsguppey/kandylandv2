import type { AccountOverviewState } from "@/components/KandyDropsAccountOverview";

export interface AccountOverviewViewModel {
    state: AccountOverviewState;
    displayName: string;
    subtitle: string;
    avatarUrl: string | null;
    avatarFallback: string;
    balanceLabel: string;
}

function toPositiveInteger(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return Math.max(0, Math.floor(numeric));
}

export function buildAccountOverviewViewModel(params: {
    authLoading: boolean;
    userDisplayName: string | null;
    userEmail: string | null;
    userPhotoURL: string | null;
    profileBalance: number | null;
}): AccountOverviewViewModel {
    if (params.authLoading) {
        return {
            state: "loading",
            displayName: "Loading profile",
            subtitle: "Loading account",
            avatarUrl: null,
            avatarFallback: "...",
            balanceLabel: "Loading GD",
        };
    }

    const normalizedName = params.userDisplayName?.trim() || "Collector";
    const normalizedEmail = params.userEmail?.trim() || "Signed in";
    const normalizedBalance = toPositiveInteger(params.profileBalance);
    const normalizedFallback = normalizedName.charAt(0).toUpperCase() || "K";

    if (!params.userDisplayName && !params.userEmail) {
        return {
            state: "guest",
            displayName: "Guest collector",
            subtitle: "Unwrap now to start your stash",
            avatarUrl: null,
            avatarFallback: "G",
            balanceLabel: "0 GD",
        };
    }

    return {
        state: "authenticated",
        displayName: normalizedName,
        subtitle: normalizedEmail,
        avatarUrl: params.userPhotoURL?.trim() || null,
        avatarFallback: normalizedFallback,
        balanceLabel: `${normalizedBalance.toLocaleString()} GD`,
    };
}
