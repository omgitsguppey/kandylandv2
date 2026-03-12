"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { differenceInHours } from "date-fns";
import { Gift, Loader2, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/telemetry";
import { getCSTDayBoundaries } from "@/lib/timezone";

const CHECK_IN_INTERVAL_MS = 24 * 60 * 60 * 1000;

function normalizeTimestamp(value: unknown): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const timestamp = Number(value);
    return timestamp > 0 ? Math.floor(timestamp) : 0;
}

function formatCountdown(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((segment) => String(segment).padStart(2, "0")).join(":");
}

export function DailyCheckIn() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [nowMs, setNowMs] = useState(Date.now());
    const [nextCheckInOverrideMs, setNextCheckInOverrideMs] = useState<number | null>(null);

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timerId = window.setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    const lastCheckInMs = normalizeTimestamp(userProfile?.lastCheckIn);
    const currentStreak = Number.isFinite(userProfile?.streakCount) ? Math.max(0, Number(userProfile?.streakCount)) : 0;

    // Utilize the shared CST boundary logic to find exactly when the CURRENT day ends for the user
    const { startOfDay, endOfDay } = useMemo(() => {
        // We need to fallback to a simple boundary check locally. 
        // We can just query timezone boundaries using the exported timezone lib
        return getCSTDayBoundaries(nowMs);
    }, [nowMs]);

    const isClaimedToday = lastCheckInMs >= startOfDay && lastCheckInMs < endOfDay;

    // If claimed today, the next available check-in is exactly at `endOfDay` (Midnight CST)
    const baseNextCheckInMs = isClaimedToday ? endOfDay : 0;
    const nextCheckInMs = nextCheckInOverrideMs ?? baseNextCheckInMs;

    useEffect(() => {
        setClaimed(false);
        setNextCheckInOverrideMs(null);
    }, [lastCheckInMs]);

    const remainingMs = useMemo(() => {
        if (nextCheckInMs <= 0 || nextCheckInMs <= nowMs) {
            return 0;
        }
        return nextCheckInMs - nowMs;
    }, [nextCheckInMs, nowMs]);

    const canCheckIn = remainingMs <= 0 && !claimed && !isClaimedToday && !!user;

    let nextStreak = currentStreak >= 7 ? 1 : currentStreak + 1;
    const hoursSinceLast = differenceInHours(nowMs, lastCheckInMs);

    // If more than 48 hours have passed since the last check-in, streak resets
    if (hoursSinceLast > 48 && lastCheckInMs !== 0) {
        nextStreak = 1;
    }

    const displayStreak = Math.min(nextStreak, 7);
    const rewardAmount = displayStreak * 10;
    const nextRewardAmount = (nextStreak >= 7 ? 1 : nextStreak + 1) * 10;

    const handleClaim = async () => {
        if (loading || claimed || !canCheckIn) return;

        setLoading(true);
        setClaimed(true);
        setNextCheckInOverrideMs(Date.now() + CHECK_IN_INTERVAL_MS);

        toast.success(`Claimed ${rewardAmount} Gum Drops!`, {
            description: "Your balance will update in a moment.",
            icon: "🎁"
        });

        import("canvas-confetti").then((confettiModule) => {
            const launchConfetti = confettiModule.default;
            const end = Date.now() + 1000;
            const colors = ["#ec4899", "#facc15"];
            (function frame() {
                launchConfetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
                launchConfetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        });

        try {
            const response = await authFetch("/api/checkin", {
                method: "POST",
            });

            const result = await response.json();

            if (!response.ok) {
                setClaimed(false);
                setNextCheckInOverrideMs(null);
                if (result.alreadyClaimed) {
                    toast.info("Already claimed today!");
                    return;
                }
                throw new Error(result.error || "Check-in failed");
            }

            const reward = Number.isFinite(result.reward) ? Number(result.reward) : rewardAmount;

            trackEvent('daily_check_in_claim', {
                streak_count: displayStreak,
                gum_drops_awarded: reward
            });

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to claim reward";
            console.error("Error claiming daily reward:", error);
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
        <div className="glass-panel p-4 sm:p-6 rounded-3xl relative overflow-hidden" data-onboarding-target="daily-reward">
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
                        <div className="text-2xl sm:text-3xl font-bold text-brand-purple">{canCheckIn ? displayStreak : currentStreak}<span className="text-sm sm:text-base text-gray-500">/7</span></div>
                        <div className="text-xs text-brand-purple font-bold uppercase tracking-wider">Day Streak</div>
                    </div>
                </div>

                <div className="flex justify-between gap-1 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const isActive = day <= currentStreak;

                        return (
                            <div key={day} className="flex flex-col items-center gap-2 flex-1">
                                <div className={cn(
                                    "w-full h-1.5 rounded-full transition-all",
                                    isActive ? "bg-brand-purple shadow-[0_0_10px_#ec4899]" : "bg-white/10"
                                )} />
                                <span className={cn(
                                    "text-xs font-bold",
                                    isActive ? "text-white" : "text-gray-600"
                                )}>
                                    {day * 10}
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
