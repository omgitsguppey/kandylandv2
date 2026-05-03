import type { UserProfile } from "@/types/db";

export function applyUnlockedDropPreviewProfilePatch({
    currentProfile,
    dropId,
    unlockCost,
    newBalance,
    unwrappedAt,
}: {
    currentProfile: UserProfile | null;
    dropId: string;
    unlockCost: number;
    newBalance: unknown;
    unwrappedAt: number;
}) {
    if (!currentProfile) return currentProfile;

    const currentUnlocked = Array.isArray(currentProfile.unlockedContent) ? currentProfile.unlockedContent : [];
    const nextUnlockedContent = currentUnlocked.includes(dropId) ? currentUnlocked : [...currentUnlocked, dropId];
    return {
        ...currentProfile,
        gumDropsBalance: Number.isFinite(newBalance) ? Number(newBalance) : currentProfile.gumDropsBalance - unlockCost,
        unlockedContent: nextUnlockedContent,
        unlockedContentTimestamps: {
            ...(currentProfile.unlockedContentTimestamps || {}),
            [dropId]: unwrappedAt,
        },
    };
}
