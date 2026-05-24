import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { getCSTDateKey } from "@/lib/timezone";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { getDailyCheckInProgress } from "@/lib/daily-checkin";
import { buildSourceAwareBalancePatch, creditSourceAwareGumdrops, readSourceAwareBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { recordCanonicalTaskEvent, recordTelemetryEventStat } from "@/lib/server/daily-tasks";
import { preventDuplicateRewardClaim, resolveTaskResetPolicy, explainTaskReset } from "@/lib/tasks/daily-task-reset";
import {
    buildDailyTaskRewardLedgerGrant,
    buildDailyTaskRewardSourceOfFundsExplanation,
    buildDailyTaskRewardTransactionExtra,
} from "@/lib/tasks/daily-task-reward-ledger";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import type { UserProfile } from "@/types/db";

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "checkin:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "checkin",
            rateLimit: SENSITIVE_WRITE,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({
                success: false,
                error: "Unauthorized",
                errorCode: "unauthorized",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 401 }));
        }

        if (!adminDb) {
            return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
        }

        // Use the verified UID from the token, not from the request body
        const userId = caller.uid;

        // 1. Fetch user profile and process check-in inside an atomic transaction
        const userRef = adminDb.collection("users").doc(userId);

        const result = await adminDb.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) {
                throw new Error("User not found");
            }

            const userData = userSnap.data()!;
            const username = typeof userData.username === "string" && userData.username.trim().length > 0
                ? userData.username.trim()
                : typeof userData.displayName === "string" && userData.displayName.trim().length > 0
                    ? userData.displayName.trim()
                    : caller?.email || userId;
            const now = Date.now();
            const lastCheckIn = userData.lastCheckIn || 0;
            const resetResolution = resolveTaskResetPolicy({
                taskId: "check_in_today",
                completedAt: lastCheckIn,
                nowMs: now,
            });
            const duplicateGuard = preventDuplicateRewardClaim({
                taskId: "check_in_today",
                completedAt: lastCheckIn,
                nowMs: now,
            });
            const progress = getDailyCheckInProgress(lastCheckIn, userData.streakCount || 0, now);
            const sourceAwareBalance = readSourceAwareBalance(userData);
            const currentBalance = sourceAwareBalance.total;

            if (!duplicateGuard.allowed && progress.lastCheckInMs > 0) {
                return {
                    alreadyClaimed: true,
                    reward: 0,
                    nextStreak: progress.activeStreak,
                    lastCheckIn: progress.lastCheckInMs,
                    nextCheckInAt: duplicateGuard.nextEligibleAt ?? resetResolution.nextEligibleAt,
                    newBalance: currentBalance,
                    resetPolicy: resetResolution.resetPolicy,
                    rewardSource: duplicateGuard.rewardSource,
                    eligibilityExplanation: duplicateGuard.explanation,
                };
            }

            // 3. Calculate streak using normalized continuity rather than trusting stale profile data.
            const nextStreak = progress.claimStreak;
            const reward = progress.claimRewardAmount;
            const dayKey = getCSTDateKey(now);
            const rewardGrant = buildDailyTaskRewardLedgerGrant({
                taskId: "check_in_today",
                userId,
                rewardGdAmount: reward,
                resetWindowId: dayKey,
                grantReason: "daily_check_in_claim",
                grantedAtMs: now,
            });
            const nextBalance = creditSourceAwareGumdrops(sourceAwareBalance, reward, "reward");
            const newBalance = nextBalance.total;

            // 4. Atomic update: balance + streak + reward ledger entry
            transaction.update(userRef, {
                ...buildSourceAwareBalancePatch(nextBalance),
                lastCheckIn: now,
                streakCount: nextStreak,
            });

            const transactionRef = adminDb.collection("transactions").doc(rewardGrant.rewardGrantId);
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId,
                type: "daily_reward",
                rewardSource: "check_in",
                amount: reward,
                description: `Daily Check-in: Day ${nextStreak}`,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                timestampMs: now,
                extra: buildDailyTaskRewardTransactionExtra(rewardGrant),
            }));

                return {
                    alreadyClaimed: false,
                    reward,
                    nextStreak,
                    lastCheckIn: now,
                    nextCheckInAt: resolveTaskResetPolicy({
                        taskId: "check_in_today",
                        completedAt: now,
                        nowMs: now,
                    }).nextEligibleAt,
                    newBalance,
                    username,
                    resetPolicy: resetResolution.resetPolicy,
                    rewardSource: "reward_gd_only" as const,
                    rewardGrant,
                    sourceOfFundsExplanation: buildDailyTaskRewardSourceOfFundsExplanation(rewardGrant),
                    eligibilityExplanation: explainTaskReset(resetResolution),
                };
        });

        if (result.alreadyClaimed) {
            try {
                await recordTelemetryEventStat("daily_task_failed", {
                    task_id: "check_in_today",
                    reward_gd: 0,
                    reward_source: "reward_gd_only",
                    source_of_funds: "reward_gd",
                    reward_grant_source: "task_reward",
                    reset_policy: result.resetPolicy,
                    next_eligible_at: result.nextCheckInAt ?? 0,
                    failure_reason: "duplicate_within_reset_window",
                    source_component: "checkin_api",
                    route: "/api/checkin",
                    sourceTruth: "canonical",
                });
            } catch (taskFailureTelemetryError) {
                recordRouteWarning("checkin", "Check-in duplicate failure telemetry failed", taskFailureTelemetryError, {
                    channel: "analytics",
                    detail: {
                        userId,
                        failureReason: "duplicate_within_reset_window",
                    },
                });
            }
            return finalize(NextResponse.json({
                error: "Already claimed today",
                errorCode: "duplicate_claim",
                routeStatus: "expected_typed_client_error",
                retryable: false,
                alreadyClaimed: true,
                streak: result.nextStreak,
                lastCheckIn: result.lastCheckIn,
                nextCheckInAt: result.nextCheckInAt,
                nextEligibleAt: result.nextCheckInAt,
                resetPolicy: result.resetPolicy,
                rewardSource: result.rewardSource,
                sourceOfFunds: "reward_gd",
                eligibilityExplanation: result.eligibilityExplanation,
                sourceOfFundsExplanation: "Duplicate check-in blocked before reward ledger credit; no Reward GD grant was written.",
                duplicateRewardBlocked: true,
                failureReason: "duplicate_within_reset_window",
                lifecycleTelemetry: {
                    failedEventName: "daily_task_failed",
                    serverTruthSource: "users.lastCheckIn",
                    startedAt: null,
                    failedAt: Date.now(),
                    durationMs: null,
                    durationConfidence: "unavailable",
                    failureReason: "duplicate_within_reset_window",
                },
            }, { status: 409 }));
        }

        const rewardGrant = result.rewardGrant;
        if (!rewardGrant) {
            throw new Error("Daily task reward ledger grant missing");
        }

        try {
            const dayKey = getCSTDateKey(result.lastCheckIn);
            await recordCanonicalTaskEvent(userId, result.username ?? caller?.email ?? userId, "daily_checkin_claimed", {
                task_id: "check_in_today",
                reward_gd: result.reward,
                reward: result.reward,
                streak_count: result.nextStreak,
                day_key: dayKey,
                transaction_id: `${userId}:checkin:${result.lastCheckIn}`,
                sourceTruth: "canonical",
            }, {
                receiptKey: `check_in_today:${dayKey}`,
            });
        } catch (taskEventError) {
            recordRouteWarning("checkin", "Check-in completed but daily task progress sync failed", taskEventError, {
                channel: "analytics",
                detail: {
                    userId,
                    reward: result.reward,
                    streakCount: result.nextStreak,
                },
            });
        }

        try {
            await recordTelemetryEventStat("daily_task_completed", {
                task_id: "check_in_today",
                reward_gd: result.reward,
                reward_source: "reward_gd_only",
                reset_policy: result.resetPolicy,
                next_eligible_at: result.nextCheckInAt ?? 0,
                source_component: "checkin_api",
                route: "/api/checkin",
                sourceTruth: "canonical",
            });
            await recordTelemetryEventStat("daily_task_reward_granted", {
                task_id: "check_in_today",
                reward_gd: result.reward,
                reward_source: "reward_gd_only",
                source_of_funds: rewardGrant.sourceOfFunds,
                reward_grant_source: rewardGrant.rewardSource,
                reward_grant_id: rewardGrant.rewardGrantId,
                reset_window_id: rewardGrant.resetWindowId,
                idempotency_key: rewardGrant.idempotencyKey,
                reset_policy: result.resetPolicy,
                next_eligible_at: result.nextCheckInAt ?? 0,
                source_component: "checkin_api",
                route: "/api/checkin",
                server_truth_source: "transactions.daily_reward.check_in",
                sourceTruth: "canonical",
            });
        } catch (taskLifecycleTelemetryError) {
            recordRouteWarning("checkin", "Check-in completed but lifecycle telemetry stat sync failed", taskLifecycleTelemetryError, {
                channel: "analytics",
                detail: {
                    userId,
                    reward: result.reward,
                    streakCount: result.nextStreak,
                },
            });
        }

        const updatedUserSnapshot = await userRef.get();
        const updatedUserData = (updatedUserSnapshot.data() ?? {}) as Partial<UserProfile>;
        await touchUserRuntime(userId, {
            activity: true,
            tasks: true,
            profile: true,
        }, result.lastCheckIn);

        return finalize(NextResponse.json({
            success: true,
            reward: result.reward,
            streak: result.nextStreak,
            lastCheckIn: result.lastCheckIn,
            nextCheckInAt: result.nextCheckInAt,
            nextEligibleAt: result.nextCheckInAt,
            resetPolicy: result.resetPolicy,
            rewardSource: result.rewardSource,
            sourceOfFunds: rewardGrant.sourceOfFunds,
            sourceOfFundsExplanation: result.sourceOfFundsExplanation,
            rewardLedger: {
                rewardGrantId: rewardGrant.rewardGrantId,
                taskId: rewardGrant.taskId,
                resetWindowId: rewardGrant.resetWindowId,
                idempotencyKey: rewardGrant.idempotencyKey,
                rewardSource: rewardGrant.rewardSource,
                sourceOfFunds: rewardGrant.sourceOfFunds,
                duplicateClaimPolicy: rewardGrant.duplicateClaimPolicy,
                ledgerDestination: rewardGrant.ledgerDestination,
            },
            eligibilityExplanation: result.eligibilityExplanation,
            lifecycleTelemetry: {
                completedEventName: "daily_task_completed",
                rewardEventName: "daily_task_reward_granted",
                serverTruthSource: "transactions.daily_reward.check_in",
                startedAt: null,
                completedAt: result.lastCheckIn,
                durationMs: null,
                durationConfidence: "unavailable",
            },
            gumDropsBalance: Number.isFinite(updatedUserData.gumDropsBalance)
                ? Number(updatedUserData.gumDropsBalance)
                : result.newBalance,
            dailyTasksState: (updatedUserData.dailyTasksState ?? null) as DailyTasksState | null,
        }));
    } catch (error) {
        if (error instanceof Error && /user not found/i.test(error.message)) {
            return finalize(NextResponse.json({
                success: false,
                error: "User profile is not available for check-in.",
                errorCode: "profile_missing",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 404 }), error);
        }
        return finalize(handleApiError(error, "Checkin.POST"), error);
    }
}
