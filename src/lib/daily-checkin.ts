import { isPreviousCSTDay, isSameCSTDay } from "@/lib/timezone";

export const DAILY_CHECK_IN_REWARD_LADDER = [10, 20, 30, 40, 50, 60, 70] as const;

function normalizeTimestamp(value: unknown): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const timestamp = Number(value);
    return timestamp > 0 ? Math.floor(timestamp) : 0;
}

function clampStoredStreak(value: unknown): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(7, Math.floor(Number(value))));
}

function getWrappedDailyStreak(streak: number) {
    const normalized = Math.max(1, Math.min(7, Math.floor(streak)));
    return normalized >= 7 ? 1 : normalized + 1;
}

function getDailyCheckInReward(streak: number) {
    const normalized = Math.max(1, Math.min(7, Math.floor(streak)));
    return DAILY_CHECK_IN_REWARD_LADDER[normalized - 1];
}

interface DailyCheckInProgress {
    lastCheckInMs: number;
    activeStreak: number;
    isClaimedToday: boolean;
    checkedInYesterday: boolean;
    claimStreak: number;
    claimRewardAmount: number;
    nextRewardAmount: number;
    displayedStreakCount: number;
}

export function getDailyCheckInProgress(
    lastCheckInValue: unknown,
    streakCountValue: unknown,
    nowMs = Date.now(),
): DailyCheckInProgress {
    const lastCheckInMs = normalizeTimestamp(lastCheckInValue);
    const storedStreak = clampStoredStreak(streakCountValue);
    const isClaimedToday = lastCheckInMs > 0 && isSameCSTDay(lastCheckInMs, nowMs);
    const checkedInYesterday = lastCheckInMs > 0 && isPreviousCSTDay(lastCheckInMs, nowMs);

    const activeStreak = isClaimedToday
        ? Math.max(storedStreak, 1)
        : checkedInYesterday
            ? storedStreak
            : 0;

    const claimStreak = isClaimedToday
        ? Math.max(activeStreak, 1)
        : checkedInYesterday
            ? activeStreak > 0 ? getWrappedDailyStreak(activeStreak) : 1
            : 1;

    return {
        lastCheckInMs,
        activeStreak,
        isClaimedToday,
        checkedInYesterday,
        claimStreak,
        claimRewardAmount: getDailyCheckInReward(claimStreak),
        nextRewardAmount: getDailyCheckInReward(getWrappedDailyStreak(claimStreak)),
        displayedStreakCount: isClaimedToday ? Math.max(activeStreak, 1) : claimStreak,
    };
}
