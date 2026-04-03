"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { useNow } from "@/hooks/useNow";
import { authFetch } from "@/lib/authFetch";
import { DAILY_CHECK_IN_REWARD_LADDER, getDailyCheckInProgress } from "@/lib/daily-checkin";
import { trackEvent } from "@/lib/telemetry";
import { getCSTDayBoundaries } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";

function formatCountdown(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((segment) => String(segment).padStart(2, "0")).join(":");
}

function emitGuidedCheckIn(status: "success" | "already-claimed" | "error", message?: string) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new CustomEvent("kandydrops:guided-checkin", {
        detail: { status, message },
    }));
}

export function DailyCheckIn() {
    const { user, userProfile, setUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [optimisticCheckInMs, setOptimisticCheckInMs] = useState<number | null>(null);
    const [optimisticStreak, setOptimisticStreak] = useState<number | null>(null);
    const nowMs = useNow({ intervalMs: 1_000 });
    const isMounted = nowMs > 0;

    const lastCheckInMs = userProfile?.lastCheckIn;
    const currentStreak = userProfile?.streakCount;
    const effectiveLastCheckInMs = optimisticCheckInMs ?? lastCheckInMs;
    const effectiveCurrentStreak = optimisticStreak ?? currentStreak;

    const { endOfDay } = useMemo(
        () => (nowMs > 0 ? getCSTDayBoundaries(nowMs) : { endOfDay: 0 }),
        [nowMs],
    );
    const checkInProgress = useMemo(
        () => getDailyCheckInProgress(effectiveLastCheckInMs, effectiveCurrentStreak, nowMs),
        [effectiveCurrentStreak, effectiveLastCheckInMs, nowMs],
    );
    const isClaimedToday = checkInProgress.isClaimedToday;
    const nextCheckInMs = isClaimedToday ? endOfDay : 0;

    useEffect(() => {
        setOptimisticCheckInMs(null);
        setOptimisticStreak(null);
    }, [lastCheckInMs, currentStreak]);

    const remainingMs = useMemo(() => {
        if (nextCheckInMs <= 0 || nextCheckInMs <= nowMs) {
            return 0;
        }

        return nextCheckInMs - nowMs;
    }, [nextCheckInMs, nowMs]);

    const canCheckIn = remainingMs <= 0 && !isClaimedToday && !!user;
    const rewardAmount = checkInProgress.claimRewardAmount;
    const nextRewardAmount = checkInProgress.nextRewardAmount;
    const displayedStreakCount = checkInProgress.displayedStreakCount;

    const handleClaim = async () => {
        if (loading || !canCheckIn) {
            return;
        }

        setLoading(true);

        try {
            const response = await authFetch("/api/checkin", {
                method: "POST",
            });
            const result = await response.json().catch(() => ({})) as {
                alreadyClaimed?: boolean;
                error?: string;
                reward?: number;
                streak?: number;
                lastCheckIn?: number;
                gumDropsBalance?: number | null;
                dailyTasksState?: DailyTasksState | null;
            };

            if (!response.ok) {
                if (result.alreadyClaimed) {
                    setOptimisticCheckInMs(Number.isFinite(result.lastCheckIn) ? Math.floor(Number(result.lastCheckIn)) : Date.now());
                    setOptimisticStreak(Number.isFinite(result.streak) ? Math.max(0, Number(result.streak)) : Number(currentStreak || 0));
                    emitGuidedCheckIn("already-claimed");
                    toast.info("Already claimed today!");
                    return;
                }

                throw new Error(typeof result.error === "string" ? result.error : "Check-in failed");
            }

            const reward = Number.isFinite(result.reward) ? Number(result.reward) : rewardAmount;
            const streak = Number.isFinite(result.streak) ? Math.max(0, Number(result.streak)) : checkInProgress.claimStreak;
            const claimedAt = Number.isFinite(result.lastCheckIn) ? Math.floor(Number(result.lastCheckIn)) : Date.now();

            setOptimisticCheckInMs(claimedAt);
            setOptimisticStreak(streak);
            setUserProfile((currentProfile) => (
                currentProfile
                    ? {
                        ...currentProfile,
                        lastCheckIn: claimedAt,
                        streakCount: streak,
                        gumDropsBalance: Number.isFinite(result.gumDropsBalance)
                            ? Number(result.gumDropsBalance)
                            : currentProfile.gumDropsBalance,
                        dailyTasksState: result.dailyTasksState ?? currentProfile.dailyTasksState,
                    }
                    : currentProfile
            ));
            dispatchActivitySync();

            toast.success(`Claimed ${reward} Gum Drops!`, {
                description: "Your balance will update in a moment.",
            });

            import("canvas-confetti").then((confettiModule) => {
                const launchConfetti = confettiModule.default;
                const end = Date.now() + 1000;
                const colors = ["#ec4899", "#facc15"];

                (function frame() {
                    launchConfetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
                    launchConfetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }).catch(() => { });

            trackEvent("daily_check_in_claim", {
                streak_count: streak,
                gum_drops_awarded: reward,
            });
            emitGuidedCheckIn("success");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to claim reward";
            reportClientIssue({
                channel: "payments",
                message: "Daily check-in reward claim failed",
                error,
                detail: {
                    component: "DailyCheckIn",
                    rewardAmount,
                    canCheckIn,
                },
                consoleLabel: "[DailyCheckIn] claim failed",
            });
            emitGuidedCheckIn("error", message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (!isMounted) {
        return (
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden h-64 animate-pulse">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="h-8 w-48 bg-white/10 rounded-lg mb-2" />
                        <div className="h-4 w-32 bg-white/5 rounded-md" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="daily-reward" className="glass-panel p-4 sm:p-6 rounded-3xl relative overflow-hidden" data-onboarding-target="daily-reward">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-[50px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-brand-purple" /> Daily Rewards
                        </h2>
                        <p className="text-gray-400 text-sm">Check in daily to earn Gum Drops!</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-brand-purple">
                            {displayedStreakCount}
                            <span className="text-sm sm:text-base text-gray-500">/7</span>
                        </div>
                        <div className="text-xs text-brand-purple font-bold uppercase tracking-wider">Day Streak</div>
                    </div>
                </div>

                <div className="flex justify-between gap-1 mb-4">
                    {DAILY_CHECK_IN_REWARD_LADDER.map((reward, index) => {
                        const day = index + 1;
                        const isActive = day <= Math.min(checkInProgress.activeStreak, 7);

                        return (
                            <div key={day} className="flex flex-col items-center gap-2 flex-1">
                                <div
                                    className={cn(
                                        "w-full h-1.5 rounded-full transition-all",
                                        isActive ? "bg-brand-purple shadow-[0_0_10px_#ec4899]" : "bg-white/10"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "text-xs font-bold",
                                        isActive ? "text-white" : "text-gray-600"
                                    )}
                                >
                                    {reward}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <p className="mb-6 text-sm font-medium text-gray-300">
                    {canCheckIn ? "You can check in now." : `Next check-in available in ${formatCountdown(remainingMs)}`}
                </p>

                {!canCheckIn ? (
                    <div className="w-full py-4 rounded-xl bg-white/5 border border-white/5 text-center text-gray-400 font-medium flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-brand-purple" />
                        Come back tomorrow for {nextRewardAmount} Drops!
                    </div>
                ) : (
                    <Button
                        variant="brand"
                        onClick={handleClaim}
                        disabled={loading}
                        data-onboarding-target="daily-reward-claim"
                        data-onboarding-radius="16"
                        className="w-full py-6 text-lg rounded-xl text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] _0_30px_rgba(236,72,153,0.5)]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Claim <span className="text-white mx-1">{rewardAmount}</span> Gum Drops</>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
