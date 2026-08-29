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
                "relative isolate overflow-hidden rounded-[1.85rem] border border-pink-100/12 bg-[linear-gradient(145deg,rgba(60,15,75,0.84),rgba(13,5,24,0.96)_58%,rgba(25,8,40,0.94))] shadow-[0_24px_64px_rgba(0,0,0,0.32)] animate-pulse",
                isExperiencesVariant ? "min-h-[12rem] p-3.5 sm:p-5" : "min-h-[19rem] p-5 sm:p-7",
            )}
            data-daily-checkin-variant={variant}
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-fuchsia-300/12 blur-[54px]" />
            <div className="relative z-10 flex h-full flex-col">
                {!isExperiencesVariant ? (
                    <div className="mb-6 sm:mb-7">
                        <div className="mb-3 h-3 w-28 rounded-full bg-pink-100/10" />
                        <div className="mb-2 h-9 w-3/4 rounded-2xl bg-white/10 sm:w-1/2" />
                        <div className="h-4 w-1/2 rounded-full bg-white/5 sm:w-1/3" />
                    </div>
                ) : null}
                <div className={cn("flex flex-wrap items-center gap-2 border-b border-white/8 pb-3", isExperiencesVariant ? "mb-3" : "mb-5 sm:mb-6")}>
                    {[...Array(3)].map((_, i) => <div key={i} className="h-7 w-20 rounded-full bg-white/5 sm:w-24" />)}
                </div>
                <div className={cn("h-5 w-28 rounded-full bg-pink-100/10", isExperiencesVariant ? "mb-3" : "mb-4")} />
                <div className={cn("flex justify-between gap-1.5", isExperiencesVariant ? "mb-3" : "")}>
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={cn("flex-1 rounded-xl bg-white/5", isExperiencesVariant ? "h-10 sm:h-12" : "h-14 sm:h-16")} />
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
                "relative isolate overflow-hidden rounded-[1.85rem] border border-pink-100/14 bg-[linear-gradient(145deg,rgba(73,18,82,0.86),rgba(15,5,27,0.98)_56%,rgba(29,8,48,0.94))] shadow-[0_26px_74px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)]",
                isExperiencesVariant ? "p-3.5 sm:p-5" : "p-5 sm:p-7",
            )}
            data-onboarding-target="daily-reward"
            data-daily-checkin-variant={variant}
        >
            <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-fuchsia-300/15 blur-[64px]" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-brand-purple/18 blur-[64px]" />

            <div className="relative z-10">
                {!isExperiencesVariant ? (
                    <header className="mb-6 sm:mb-7">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-100/70">Daily Kandy</p>
                        <h1 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
                            Welcome back, {firstName}.
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-white/62">Your streak is ready when you are.</p>
                    </header>
                ) : null}

                <div
                    aria-label="Your daily status"
                    className={cn(
                        "flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-white/10 pb-3 text-sm",
                        isExperiencesVariant ? "mb-4" : "mb-6 sm:mb-7",
                    )}
                >
                    <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Reward GD</span>
                        <CompactNumber value={userProfile?.gumDropsBalance || 0} className={cn("font-black text-pink-100", isExperiencesVariant ? "text-base" : "text-lg")} />
                    </span>
                    <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Unwrapped</span>
                        <CompactNumber value={userProfile?.unlockedContent?.length || 0} className={cn("font-black text-white", isExperiencesVariant ? "text-base" : "text-lg")} />
                    </span>
                    <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Streak</span>
                        <span className={cn("font-black text-pink-100", isExperiencesVariant ? "text-base" : "text-lg")}>
                            {displayedStreakCount}<span className="text-xs font-semibold text-white/40">/7</span>
                        </span>
                    </span>
                </div>

                <div className={cn(isExperiencesVariant ? "mb-3" : "mb-5 sm:mb-6")}>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/66">Seven-day reward path</p>
                    <h2 className={cn("mt-1 flex items-center gap-2 font-black tracking-[-0.04em] text-white", isExperiencesVariant ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>
                        <Gift className={cn("text-pink-200", isExperiencesVariant ? "h-5 w-5" : "w-5 h-5 sm:w-6 sm:h-6")} /> Your next Reward GD
                    </h2>
                </div>

                <div className={cn("grid grid-cols-7 gap-1.5", isExperiencesVariant ? "mb-4" : "mb-5")}>
                    {DAILY_CHECK_IN_REWARD_LADDER.map((reward, index) => {
                        const day = index + 1;
                        const isActive = day <= Math.min(checkInProgress.activeStreak, 7);

                        return (
                            <div key={day} className={cn("rounded-xl border px-1 py-2 text-center transition-colors", isActive ? "border-pink-100/30 bg-pink-200/12 text-white shadow-[0_0_18px_rgba(236,72,153,0.12)]" : "border-white/8 bg-black/18 text-white/35")}>
                                <div
                                    className={cn(
                                        "mx-auto h-1.5 w-1.5 rounded-full transition-all",
                                        isActive ? "bg-pink-200 shadow-[0_0_10px_rgba(249,168,212,0.9)]" : "bg-white/15"
                                    )}
                                />
                                <span className="mt-1.5 block text-[9px] font-black uppercase tracking-[0.12em]">D{day}</span>
                                <span className="mt-0.5 block text-xs font-black">{reward}</span>
                            </div>
                        );
                    })}
                </div>

                <p className={cn("rounded-xl border border-white/8 bg-black/16 px-3 py-2.5 text-sm leading-6 text-white/68", isExperiencesVariant ? "mb-4" : "mb-6")}>
                    {canCheckIn
                        ? "You can check in now for Reward GD."
                        : `Locked until the Central-time daily reset. Next check-in available in ${formatCountdown(remainingMs)}.`}
                    <span className="block pt-1 text-xs text-white/42">{resetExplanation}</span>
                </p>

                {!canCheckIn ? (
                    <div className={cn(
                        "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center font-semibold text-white/64",
                        isExperiencesVariant ? "text-sm" : "text-base",
                    )}>
                        <CheckCircle className="h-5 w-5 text-pink-200" />
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
                            "min-h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#f9a8d4,#d946ef_38%,#9333ea)] text-white shadow-[0_14px_34px_rgba(217,70,239,0.34),inset_0_1px_0_rgba(255,255,255,0.36)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(217,70,239,0.44)]",
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
