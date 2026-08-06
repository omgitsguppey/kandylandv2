"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { useNow } from "@/hooks/useNow";
import { authFetch } from "@/lib/authFetch";
import { DAILY_CHECK_IN_REWARD_LADDER, getDailyCheckInProgress } from "@/lib/daily-checkin";
import { trackEvent } from "@/lib/telemetry";
import { getCSTDateKey } from "@/lib/timezone";
import { resolveTaskResetPolicy, explainTaskReset } from "@/lib/tasks/daily-task-reset";
import { startDailyTaskDuration, finishDailyTaskDuration } from "@/lib/tasks/daily-task-duration";
import { buildDailyTaskLifecycleEventPayload } from "@/lib/tasks/daily-task-telemetry";
import { cn } from "@/lib/utils";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { CompactNumber } from "@/components/ui/CompactNumber";

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

function readVisibilityState() {
    if (typeof document === "undefined") {
        return "unknown" as const;
    }

    return document.visibilityState === "hidden" ? "hidden" as const : "visible" as const;
}

type DailyCheckInVariant = "dashboard" | "experiences";

interface DailyCheckInProps {
    variant?: DailyCheckInVariant;
}

export function DailyCheckIn({ variant = "dashboard" }: DailyCheckInProps = {}) {
    const { user, userProfile, setUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [optimisticCheckInMs, setOptimisticCheckInMs] = useState<number | null>(null);
    const [optimisticStreak, setOptimisticStreak] = useState<number | null>(null);
    const lifecycleSurfaceViewedRef = useRef(false);
    const lifecycleLockedKeyRef = useRef<string | null>(null);
    const lifecycleStartedAtRef = useRef<number | null>(null);
    const nowMs = useNow({ intervalMs: 1_000 });
    const isMounted = nowMs > 0;

    const lastCheckInMs = userProfile?.lastCheckIn;
    const currentStreak = userProfile?.streakCount;
    const effectiveLastCheckInMs = optimisticCheckInMs ?? lastCheckInMs;
    const effectiveCurrentStreak = optimisticStreak ?? currentStreak;

    const checkInProgress = useMemo(
        () => getDailyCheckInProgress(effectiveLastCheckInMs, effectiveCurrentStreak, nowMs),
        [effectiveCurrentStreak, effectiveLastCheckInMs, nowMs],
    );
    const isClaimedToday = checkInProgress.isClaimedToday;
    const resetResolution = useMemo(
        () => resolveTaskResetPolicy({
            taskId: "check_in_today",
            completedAt: effectiveLastCheckInMs,
            nowMs,
        }),
        [effectiveLastCheckInMs, nowMs],
    );
    const resetExplanation = useMemo(() => explainTaskReset(resetResolution), [resetResolution]);
    const nextCheckInMs = isClaimedToday ? resetResolution.nextEligibleAt ?? 0 : 0;

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
    const isExperiencesVariant = variant === "experiences";
    const lifecycleRoute = isExperiencesVariant ? "/experiences" : "/dashboard";

    useEffect(() => {
        if (!user?.uid || lifecycleSurfaceViewedRef.current) {
            return;
        }

        lifecycleSurfaceViewedRef.current = true;
        const common = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: user.uid,
            rewardGdAmount: rewardAmount,
            resetPolicy: resetResolution.resetPolicy,
            nextEligibleAt: resetResolution.nextEligibleAt,
            sourceComponent: "DailyCheckIn",
            route: lifecycleRoute,
        };
        trackEvent("daily_task_surface_viewed", buildDailyTaskLifecycleEventPayload({
            ...common,
            eventName: "daily_task_surface_viewed",
        }));
        trackEvent("daily_task_card_viewed", buildDailyTaskLifecycleEventPayload({
            ...common,
            eventName: "daily_task_card_viewed",
        }));
    }, [lifecycleRoute, resetResolution.nextEligibleAt, resetResolution.resetPolicy, rewardAmount, user?.uid]);

    useEffect(() => {
        if (!user?.uid || !isClaimedToday || !resetResolution.nextEligibleAt) {
            return;
        }

        const lockedKey = `${user.uid}:${resetResolution.nextEligibleAt}`;
        if (lifecycleLockedKeyRef.current === lockedKey) {
            return;
        }
        lifecycleLockedKeyRef.current = lockedKey;
        const common = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: user.uid,
            rewardGdAmount: nextRewardAmount,
            resetPolicy: resetResolution.resetPolicy,
            nextEligibleAt: resetResolution.nextEligibleAt,
            sourceComponent: "DailyCheckIn",
            route: lifecycleRoute,
        };
        trackEvent("daily_task_reset_locked", buildDailyTaskLifecycleEventPayload({
            ...common,
            eventName: "daily_task_reset_locked",
        }));
        trackEvent("daily_task_next_eligible_viewed", buildDailyTaskLifecycleEventPayload({
            ...common,
            eventName: "daily_task_next_eligible_viewed",
        }));
    }, [isClaimedToday, lifecycleRoute, nextRewardAmount, resetResolution.nextEligibleAt, resetResolution.resetPolicy, user?.uid]);

    const handleClaim = async () => {
        if (loading || !canCheckIn) {
            return;
        }

        setLoading(true);
        const activeStart = startDailyTaskDuration({
            taskId: "check_in_today",
            nowMs: Date.now(),
            visibilityState: readVisibilityState(),
        });
        lifecycleStartedAtRef.current = activeStart.startedAt;
        const lifecycleCommon = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: user?.uid ?? null,
            rewardGdAmount: rewardAmount,
            resetPolicy: resetResolution.resetPolicy,
            nextEligibleAt: resetResolution.nextEligibleAt,
            startedAt: activeStart.startedAt,
            sourceComponent: "DailyCheckIn",
            route: lifecycleRoute,
        };
        trackEvent("daily_task_started", buildDailyTaskLifecycleEventPayload({
            ...lifecycleCommon,
            eventName: "daily_task_started",
        }));
        trackEvent("daily_task_action_attempted", buildDailyTaskLifecycleEventPayload({
            ...lifecycleCommon,
            eventName: "daily_task_action_attempted",
        }));

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
                nextEligibleAt?: number | null;
                resetPolicy?: string;
                rewardSource?: "reward_gd_only";
                eligibilityExplanation?: string;
                failureReason?: string;
                lifecycleTelemetry?: {
                    completedEventName?: "daily_task_completed";
                    rewardEventName?: "daily_task_reward_granted";
                    serverTruthSource?: string;
                    startedAt?: number | null;
                    completedAt?: number | null;
                    durationMs?: number | null;
                    durationConfidence?: "exact" | "active_session_estimated" | "unavailable";
                };
            };

            if (!response.ok) {
                if (result.alreadyClaimed) {
                    const failedDuration = finishDailyTaskDuration({
                        startedAt: lifecycleStartedAtRef.current,
                        attemptedAt: lifecycleStartedAtRef.current,
                        finishedAt: Date.now(),
                        status: "failed",
                        failureReason: result.failureReason ?? "duplicate_within_reset_window",
                        visibilityState: readVisibilityState(),
                    });
                    trackEvent("daily_task_failed", buildDailyTaskLifecycleEventPayload({
                        ...lifecycleCommon,
                        eventName: "daily_task_failed",
                        durationMs: failedDuration.durationMs,
                        durationConfidence: failedDuration.confidence,
                        failureReason: failedDuration.failureReason,
                    }));
                    setOptimisticCheckInMs(Number.isFinite(result.lastCheckIn) ? Math.floor(Number(result.lastCheckIn)) : Date.now());
                    setOptimisticStreak(Number.isFinite(result.streak) ? Math.max(0, Number(result.streak)) : Number(currentStreak || 0));
                    emitGuidedCheckIn("already-claimed");
                    toast.info("Already claimed today", {
                        description: result.eligibilityExplanation || "Your next Reward GD claim unlocks at the daily reset.",
                    });
                    return;
                }

                throw new Error(typeof result.error === "string" ? result.error : "Check-in failed");
            }

            const reward = Number.isFinite(result.reward) ? Number(result.reward) : rewardAmount;
            const streak = Number.isFinite(result.streak) ? Math.max(0, Number(result.streak)) : checkInProgress.claimStreak;
            const claimedAt = Number.isFinite(result.lastCheckIn) ? Math.floor(Number(result.lastCheckIn)) : Date.now();
            const completedDuration = finishDailyTaskDuration({
                startedAt: lifecycleStartedAtRef.current,
                attemptedAt: lifecycleStartedAtRef.current,
                finishedAt: Date.now(),
                status: "completed",
                visibilityState: readVisibilityState(),
            });
            const serverDurationMs = result.lifecycleTelemetry?.durationMs;
            const lifecycleDurationMs = Number.isFinite(serverDurationMs) ? Number(serverDurationMs) : completedDuration.durationMs;
            const lifecycleDurationConfidence = Number.isFinite(serverDurationMs)
                ? result.lifecycleTelemetry?.durationConfidence ?? completedDuration.confidence
                : completedDuration.confidence;

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

            toast.success(`Claimed ${reward} Reward GD!`, {
                description: "Your balance will update in a moment.",
            });

            import("canvas-confetti").then((confettiModule) => {
                const launchConfetti = confettiModule.default;
                const end = Date.now() + 1000;
                const colors = ["#a476ff", "#facc15"];

                (function frame() {
                    launchConfetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
                    launchConfetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }).catch(() => { });

            trackEvent("daily_checkin_claimed", {
                source_component: "daily_check_in",
                task_id: "check_in_today",
                streak_count: streak,
                reward_gd: reward,
                gum_drops_awarded: reward,
                reward_source: "reward_gd_only",
                reset_policy: result.resetPolicy ?? resetResolution.resetPolicy,
                day_key: getCSTDateKey(claimedAt),
                transaction_id: `${user?.uid ?? "user"}:checkin:${claimedAt}`,
                sourceTruth: "client_supporting",
            });
            trackEvent("daily_task_completed", buildDailyTaskLifecycleEventPayload({
                ...lifecycleCommon,
                eventName: "daily_task_completed",
                rewardGdAmount: reward,
                nextEligibleAt: result.nextEligibleAt,
                durationMs: lifecycleDurationMs,
                durationConfidence: lifecycleDurationConfidence,
                serverTruthSource: result.lifecycleTelemetry?.serverTruthSource,
            }));
            trackEvent("daily_task_reward_granted", buildDailyTaskLifecycleEventPayload({
                ...lifecycleCommon,
                eventName: "daily_task_reward_granted",
                rewardGdAmount: reward,
                nextEligibleAt: result.nextEligibleAt,
                durationMs: lifecycleDurationMs,
                durationConfidence: lifecycleDurationConfidence,
                serverTruthSource: result.lifecycleTelemetry?.serverTruthSource ?? "transactions.daily_reward.check_in",
            }));
            emitGuidedCheckIn("success");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to claim reward";
            const failedDuration = finishDailyTaskDuration({
                startedAt: lifecycleStartedAtRef.current,
                attemptedAt: lifecycleStartedAtRef.current,
                finishedAt: Date.now(),
                status: "failed",
                failureReason: message,
                visibilityState: readVisibilityState(),
            });
            trackEvent("daily_task_failed", buildDailyTaskLifecycleEventPayload({
                ...lifecycleCommon,
                eventName: "daily_task_failed",
                durationMs: failedDuration.durationMs,
                durationConfidence: failedDuration.confidence,
                failureReason: failedDuration.failureReason,
            }));
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
            lifecycleStartedAtRef.current = null;
        }
    };

    if (!isMounted) {
        return (
        <div
            className={cn(
                "glass-panel relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(25,25,31,0.96),rgba(8,8,10,0.92))] shadow-[0_20px_44px_rgba(0,0,0,0.28)] animate-pulse",
                isExperiencesVariant ? "min-h-[14rem] p-3.5 sm:p-5" : "min-h-[20rem] p-4 sm:p-6",
            )}
            data-daily-checkin-variant={variant}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="relative z-10 h-full flex flex-col">
                {!isExperiencesVariant ? (
                <div className="mb-5 sm:mb-6">
                    <div className="h-8 w-3/4 sm:w-1/2 bg-white/10 rounded-lg mb-2" />
                    <div className="h-4 w-1/2 sm:w-1/3 bg-white/5 rounded-md" />
                </div>
                ) : null}
                <div className={cn("h-16 sm:h-20 w-full bg-white/5 rounded-2xl", isExperiencesVariant ? "mb-3" : "mb-5 sm:mb-6")} />
                <div className={cn("h-6 w-1/3 bg-white/5 rounded-lg", isExperiencesVariant ? "mb-3" : "mb-4")} />
                <div className={cn("flex justify-between gap-1", isExperiencesVariant ? "mb-3" : "")}>
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={cn("flex-1 bg-white/5 rounded-2xl", isExperiencesVariant ? "h-11 sm:h-14" : "h-16 sm:h-20")} />
                    ))}
                </div>
            </div>
        </div>
        );
    }

    const firstName = userProfile?.displayName?.split(" ")[0] || "Collector";

    return (
        <div
            id="daily-reward"
            className={cn(
                "glass-panel relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(25,25,31,0.96),rgba(8,8,10,0.92))] shadow-[0_20px_44px_rgba(0,0,0,0.28)]",
                isExperiencesVariant ? "p-3.5 sm:p-5" : "p-4 sm:p-6",
            )}
            data-onboarding-target="daily-reward"
            data-daily-checkin-variant={variant}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-[50px] pointer-events-none" />

            <div className="relative z-10">
                {!isExperiencesVariant ? (
                <header className="mb-5 sm:mb-6">
                    <h1 className="text-xl md:text-2xl font-bold leading-tight tracking-tight text-white/90">
                        Welcome back to the Kandy Shop, {firstName}
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">Claim your streak and stay ready to unwrap</p>
                </header>
                ) : null}

                <div className={cn(
                    "relative overflow-hidden flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-black/30 shadow-inner shadow-black/20 backdrop-blur-sm",
                    isExperiencesVariant ? "mb-3 p-2.5 sm:px-4 sm:py-2.5" : "mb-5 p-3 sm:mb-6 sm:px-5 sm:py-3",
                )}>
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/55 to-transparent" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Reward GD</span>
                        <CompactNumber value={userProfile?.gumDropsBalance || 0} className={cn("font-black text-brand-purple", isExperiencesVariant ? "text-base sm:text-lg" : "text-lg sm:text-xl")} />
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Unwrapped</span>
                        <CompactNumber value={userProfile?.unlockedContent?.length || 0} className={cn("font-black text-white", isExperiencesVariant ? "text-base sm:text-lg" : "text-lg sm:text-xl")} />
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Day Streak</span>
                        <div className={cn("font-black text-brand-purple", isExperiencesVariant ? "text-base sm:text-lg" : "text-lg sm:text-xl")}>
                            {displayedStreakCount}<span className="text-xs sm:text-sm font-semibold text-gray-500">/7</span>
                        </div>
                    </div>
                </div>

                <div className={cn(isExperiencesVariant ? "mb-3" : "mb-5 sm:mb-6")}>
                    <h2 className={cn("flex items-center gap-2 font-black tracking-tight text-white", isExperiencesVariant ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>
                        <Gift className={cn("text-brand-purple", isExperiencesVariant ? "h-5 w-5" : "w-5 h-5 sm:w-6 sm:h-6")} /> Daily Reward GD
                    </h2>
                </div>

                <div className={cn("flex justify-between gap-1", isExperiencesVariant ? "mb-3" : "mb-4")}>
                    {DAILY_CHECK_IN_REWARD_LADDER.map((reward, index) => {
                        const day = index + 1;
                        const isActive = day <= Math.min(checkInProgress.activeStreak, 7);

                        return (
                            <div key={day} className={cn("flex flex-col items-center flex-1", isExperiencesVariant ? "gap-1.5" : "gap-2")}>
                                <div
                                    className={cn(
                                        "h-2 w-full rounded-full transition-all",
                                        isActive ? "bg-brand-purple shadow-[0_0_10px_rgba(164,118,255,0.8)]" : "bg-white/10"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "text-xs font-black",
                                        isActive ? "text-white" : "text-gray-600"
                                    )}
                                >
                                    {reward}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <p className={cn("text-sm font-medium text-gray-300", isExperiencesVariant ? "mb-3" : "mb-6")}>
                    {canCheckIn
                        ? "You can check in now for Reward GD."
                        : `Locked until the Central-time daily reset. Next check-in available in ${formatCountdown(remainingMs)}.`}
                    <span className="block pt-1 text-xs text-gray-500">{resetExplanation}</span>
                </p>

                {!canCheckIn ? (
                    <div className={cn(
                        "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center font-semibold text-gray-400",
                        isExperiencesVariant ? "text-sm" : "text-base",
                    )}>
                        <CheckCircle className="w-5 h-5 text-brand-purple" />
                        Come back after reset for {nextRewardAmount} Reward GD.
                    </div>
                ) : (
                    <Button
                        variant="brand"
                        onClick={handleClaim}
                        disabled={loading}
                        data-onboarding-target="daily-reward-claim"
                        data-onboarding-radius="16"
                        className={cn(
                            "min-h-12 w-full rounded-2xl text-white shadow-[0_0_20px_rgba(164,118,255,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(164,118,255,0.5)]",
                            isExperiencesVariant ? "py-3 text-base" : "py-6 text-lg",
                        )}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        ) : (
                            <>Claim <span className="text-white mx-1">{rewardAmount}</span> Reward GD</>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
