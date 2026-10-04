"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Gift } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/creative-tim/ui/card";
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
import { resolveWalletBalanceSplit } from "@/lib/gumdrop-formatting";
import { createStaleRequestGuard } from "@/lib/frontend-hardening/ui/loading-state-contract";
import { readUiJson } from "@/lib/ui-continuity";

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

type DailyClaimResponse = {
    success?: boolean;
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

type DailyClaimState = {
    actorUid: string | null;
    loading: boolean;
    optimisticCheckInMs: number | null;
    optimisticStreak: number | null;
};

export function DailyCheckIn({ variant = "dashboard" }: DailyCheckInProps = {}) {
    const { user, userProfile, setUserProfile, loading: authLoading } = useAuth();
    const profileReady = !authLoading && Boolean(user?.uid && userProfile?.uid === user.uid);
    const claimActorUid = profileReady ? user?.uid ?? null : null;
    const [claimState, setClaimState] = useState<DailyClaimState>({
        actorUid: claimActorUid,
        loading: false,
        optimisticCheckInMs: null,
        optimisticStreak: null,
    });
    const loading = claimState.actorUid === claimActorUid && claimState.loading;
    const optimisticCheckInMs = claimState.actorUid === claimActorUid ? claimState.optimisticCheckInMs : null;
    const optimisticStreak = claimState.actorUid === claimActorUid ? claimState.optimisticStreak : null;
    const claimGuardRef = useRef(createStaleRequestGuard());
    const claimScopeRef = useRef({ actorUid: null as string | null, mounted: false, pendingRequestId: null as number | null });
    const lifecycleSurfaceViewedRef = useRef(false);
    const lifecycleLockedKeyRef = useRef<string | null>(null);
    const nowMs = useNow({ intervalMs: 1_000 });
    const isMounted = nowMs > 0;

    const lastCheckInMs = profileReady ? userProfile?.lastCheckIn : undefined;
    const currentStreak = profileReady ? userProfile?.streakCount : undefined;
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

    useLayoutEffect(() => {
        claimGuardRef.current.next();
        claimScopeRef.current = { actorUid: claimActorUid, mounted: true, pendingRequestId: null };
        lifecycleSurfaceViewedRef.current = false;
        lifecycleLockedKeyRef.current = null;
        setClaimState({ actorUid: claimActorUid, loading: false, optimisticCheckInMs: null, optimisticStreak: null });
        return () => {
            claimGuardRef.current.next();
            claimScopeRef.current.mounted = false;
            claimScopeRef.current.pendingRequestId = null;
        };
    }, [claimActorUid]);

    useEffect(() => {
        setClaimState((current) => current.actorUid === claimActorUid
            ? { ...current, optimisticCheckInMs: null, optimisticStreak: null }
            : current);
    }, [claimActorUid, lastCheckInMs, currentStreak]);

    const remainingMs = useMemo(() => {
        if (nextCheckInMs <= 0 || nextCheckInMs <= nowMs) {
            return 0;
        }

        return nextCheckInMs - nowMs;
    }, [nextCheckInMs, nowMs]);

    const canCheckIn = profileReady && remainingMs <= 0 && !isClaimedToday;
    const rewardAmount = checkInProgress.claimRewardAmount;
    const nextRewardAmount = checkInProgress.nextRewardAmount;
    const displayedStreakCount = checkInProgress.displayedStreakCount;
    const isExperiencesVariant = variant === "experiences";
    const lifecycleRoute = isExperiencesVariant ? "/experiences" : "/dashboard";

    useEffect(() => {
        if (!claimActorUid || lifecycleSurfaceViewedRef.current) {
            return;
        }

        lifecycleSurfaceViewedRef.current = true;
        const common = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: claimActorUid,
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
    }, [claimActorUid, lifecycleRoute, resetResolution.nextEligibleAt, resetResolution.resetPolicy, rewardAmount, user?.uid]);

    useEffect(() => {
        if (!claimActorUid || !isClaimedToday || !resetResolution.nextEligibleAt) {
            return;
        }

        const lockedKey = `${claimActorUid}:${resetResolution.nextEligibleAt}`;
        if (lifecycleLockedKeyRef.current === lockedKey) {
            return;
        }
        lifecycleLockedKeyRef.current = lockedKey;
        const common = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: claimActorUid,
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
    }, [claimActorUid, isClaimedToday, lifecycleRoute, nextRewardAmount, resetResolution.nextEligibleAt, resetResolution.resetPolicy, user?.uid]);

    const handleClaim = async () => {
        const actorUid = claimActorUid;
        const scope = claimScopeRef.current;
        if (!actorUid || !scope.mounted || scope.actorUid !== actorUid || scope.pendingRequestId !== null || loading || !canCheckIn) {
            return;
        }

        const requestId = claimGuardRef.current.next();
        scope.pendingRequestId = requestId;
        const isCurrentClaim = () => claimScopeRef.current.mounted
            && claimScopeRef.current.actorUid === actorUid
            && claimGuardRef.current.isFresh(requestId);
        setClaimState((current) => isCurrentClaim() ? { ...current, actorUid, loading: true } : current);
        const activeStart = startDailyTaskDuration({
            taskId: "check_in_today",
            nowMs: Date.now(),
            visibilityState: readVisibilityState(),
        });
        const lifecycleCommon = {
            taskId: "check_in_today",
            taskKind: "daily_check_in" as const,
            userId: actorUid,
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

        let awaitingAcknowledgement = false;
        try {
            const response = await authFetch("/api/checkin", {
                method: "POST",
            });
            if (!isCurrentClaim()) return;
            awaitingAcknowledgement = response.ok;
            const result: DailyClaimResponse = response.ok
                ? await readUiJson<DailyClaimResponse>(response, { moduleLabel: "Daily check-in", url: "/api/checkin", requireSuccess: true })
                : await response.json().catch(() => ({})) as DailyClaimResponse;
            if (!isCurrentClaim()) return;
            awaitingAcknowledgement = false;

            if (!response.ok) {
                if (result.alreadyClaimed) {
                    const failedDuration = finishDailyTaskDuration({
                        startedAt: activeStart.startedAt,
                        attemptedAt: activeStart.startedAt,
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
                    setClaimState((current) => isCurrentClaim() ? ({
                        ...current,
                        actorUid,
                        optimisticCheckInMs: Number.isFinite(result.lastCheckIn) ? Math.floor(Number(result.lastCheckIn)) : Date.now(),
                        optimisticStreak: Number.isFinite(result.streak) ? Math.max(0, Number(result.streak)) : Number(currentStreak || 0),
                    }) : current);
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
                startedAt: activeStart.startedAt,
                attemptedAt: activeStart.startedAt,
                finishedAt: Date.now(),
                status: "completed",
                visibilityState: readVisibilityState(),
            });
            const serverDurationMs = result.lifecycleTelemetry?.durationMs;
            const lifecycleDurationMs = Number.isFinite(serverDurationMs) ? Number(serverDurationMs) : completedDuration.durationMs;
            const lifecycleDurationConfidence = Number.isFinite(serverDurationMs)
                ? result.lifecycleTelemetry?.durationConfidence ?? completedDuration.confidence
                : completedDuration.confidence;

            setClaimState((current) => isCurrentClaim() ? { ...current, actorUid, optimisticCheckInMs: claimedAt, optimisticStreak: streak } : current);
            setUserProfile((currentProfile) => (
                isCurrentClaim() && currentProfile?.uid === actorUid
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
                if (!isCurrentClaim()) return;
                const launchConfetti = confettiModule.default;
                const end = Date.now() + 1000;
                const colors = ["#a476ff", "#facc15"];

                (function frame() {
                    if (!isCurrentClaim()) return;
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
                transaction_id: `${actorUid}:checkin:${claimedAt}`,
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
            if (!isCurrentClaim()) return;
            const message = awaitingAcknowledgement
                ? "We could not confirm your check-in. Check your reward status before trying again."
                : error instanceof Error ? error.message : "Failed to claim reward";
            const failedDuration = finishDailyTaskDuration({
                startedAt: activeStart.startedAt,
                attemptedAt: activeStart.startedAt,
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
            if (isCurrentClaim() && claimScopeRef.current.pendingRequestId === requestId) {
                claimScopeRef.current.pendingRequestId = null;
                setClaimState((current) => isCurrentClaim() && current.actorUid === actorUid ? { ...current, loading: false } : current);
            }
        }
    };

    if (!isMounted) {
        return (
            <Card className={cn("min-w-0 animate-pulse gap-5 p-4 motion-reduce:animate-none", isExperiencesVariant ? "py-3" : "py-4")} data-daily-checkin-variant={variant} aria-label="Loading daily rewards" aria-busy="true">
                {!isExperiencesVariant ? <div className="space-y-2"><div className="h-6 w-3/4 rounded bg-muted" /><div className="h-4 w-full rounded bg-muted" /></div> : null}
                <div className="flex flex-wrap gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-10 w-16 rounded bg-muted" />)}</div>
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="flex flex-wrap gap-2">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-14 min-w-0 flex-[1_1_4rem] rounded-xl bg-muted" />)}</div>
                <div className="h-16 rounded bg-muted" />
                <div className="h-11 rounded-full bg-muted" />
            </Card>
        );
    }

    const firstName = profileReady ? userProfile?.displayName?.split(" ")[0] || "Collector" : "Collector";
    const rewardBalance = profileReady
        && typeof userProfile?.gumDropsRewardBalance === "number"
        && Number.isFinite(userProfile?.gumDropsRewardBalance)
        ? resolveWalletBalanceSplit(userProfile).freeGd
        : null;

    return (
        <Card id="daily-reward" className={cn("min-w-0 gap-5 p-4", isExperiencesVariant ? "py-3" : "py-4")} data-onboarding-target="daily-reward" data-daily-checkin-variant={variant}>
            {!isExperiencesVariant ? (
                <header className="min-w-0 space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Welcome back, {firstName}.</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">Your streak is ready when you are.</p>
                </header>
            ) : null}

            <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-3" aria-label="Your daily status">
                <div className="min-w-0 space-y-1">
                    <dt className="text-xs leading-relaxed text-muted-foreground">Reward GD</dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">{rewardBalance === null ? <span className="text-sm font-normal text-muted-foreground">Unavailable</span> : <CompactNumber value={rewardBalance} />}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                    <dt className="text-xs leading-relaxed text-muted-foreground">Unwrapped</dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">{profileReady ? <CompactNumber value={userProfile?.unlockedContent?.length || 0} /> : <span className="text-sm font-normal text-muted-foreground">Unavailable</span>}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                    <dt className="text-xs leading-relaxed text-muted-foreground">Streak</dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">{profileReady ? <>{displayedStreakCount}<span className="text-xs font-normal text-muted-foreground">/7</span></> : <span className="text-sm font-normal text-muted-foreground">Unavailable</span>}</dd>
                </div>
            </dl>

            <div className="min-w-0 space-y-3">
                <h3 className="flex min-w-0 items-start gap-2 text-base font-semibold text-foreground"><Gift className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />Your next Reward GD</h3>
                <ol className="flex min-w-0 flex-wrap gap-2" aria-label="Seven-day reward path">
                    {DAILY_CHECK_IN_REWARD_LADDER.map((reward, index) => {
                        const day = index + 1;
                        const isActive = day <= Math.min(checkInProgress.activeStreak, 7);
                        return (
                            <li key={day} className={cn("min-w-0 flex-[1_1_4rem] space-y-1 rounded-xl px-2 py-2 text-center", isActive ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground")}>
                                <span className="block text-xs leading-relaxed">Day {day}</span>
                                <span className="block text-sm font-semibold tabular-nums">{reward}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {profileReady ? <p className="text-sm leading-relaxed text-muted-foreground">
                {canCheckIn ? "You can check in now for Reward GD." : `Locked until the Central-time daily reset. Next check-in available in ${formatCountdown(remainingMs)}.`}
                <span className="mt-1 block text-xs leading-relaxed">{resetExplanation}</span>
            </p> : null}

            {!profileReady ? (
                <p role="status" className="text-sm leading-relaxed text-muted-foreground">Your daily reward status is waiting for your account profile.</p>
            ) : !canCheckIn ? (
                <p className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-muted-foreground"><CheckCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Come back after reset for {nextRewardAmount} Reward GD.</p>
            ) : (
                <Button variant="brand" onClick={handleClaim} disabled={loading} isLoading={loading} data-onboarding-target="daily-reward-claim" data-onboarding-radius="16" className="w-full min-w-0 flex-wrap gap-1 whitespace-normal">
                    Claim <span>{rewardAmount}</span> Reward GD
                </Button>
            )}
        </Card>
    );
}
