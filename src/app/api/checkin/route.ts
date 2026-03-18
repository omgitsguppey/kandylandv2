import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getCSTDateKey, getCSTDayBoundaries } from "@/lib/timezone";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { getDailyCheckInProgress } from "@/lib/daily-checkin";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";
import { guardApiRequest } from "@/lib/server/request-guard";
import type { UserProfile } from "@/types/db";

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "checkin",
            rateLimit: SENSITIVE_WRITE,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Use the verified UID from the token, not from the request body
        const userId = caller?.uid ?? "";

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
            const currentStreak = userData.streakCount || 0;

            // 2. Check if already claimed today (CST day boundaries)
            const { endOfDay } = getCSTDayBoundaries(now);
            const progress = getDailyCheckInProgress(lastCheckIn, currentStreak, now);

            if (progress.isClaimedToday && progress.lastCheckInMs > 0) {
                return {
                    alreadyClaimed: true,
                    reward: 0,
                    nextStreak: progress.activeStreak,
                    lastCheckIn: progress.lastCheckInMs,
                    nextCheckInAt: endOfDay,
                    newBalance: Number.isFinite(userData.gumDropsBalance) ? Number(userData.gumDropsBalance) : 0,
                };
            }

            // 3. Calculate streak using normalized continuity rather than trusting stale profile data.
            const nextStreak = progress.claimStreak;
            const reward = progress.claimRewardAmount;

            // 4. Atomic update: balance + streak + reward ledger entry
            transaction.update(userRef, {
                gumDropsBalance: FieldValue.increment(reward),
                lastCheckIn: now,
                streakCount: nextStreak,
            });

            const transactionRef = adminDb.collection("transactions").doc();
            transaction.set(transactionRef, {
                userId,
                type: "daily_reward",
                rewardSource: "check_in",
                amount: reward,
                description: `Daily Check-in: Day ${nextStreak}`,
                timestamp: FieldValue.serverTimestamp(),
                verifiedServerSide: true,
            });

                return {
                    alreadyClaimed: false,
                    reward,
                    nextStreak,
                    lastCheckIn: now,
                    nextCheckInAt: endOfDay,
                    newBalance: (Number.isFinite(userData.gumDropsBalance) ? Number(userData.gumDropsBalance) : 0) + reward,
                    username,
                };
        });

        if (result.alreadyClaimed) {
            return NextResponse.json({
                error: "Already claimed today",
                alreadyClaimed: true,
                streak: result.nextStreak,
                lastCheckIn: result.lastCheckIn,
                nextCheckInAt: result.nextCheckInAt,
            }, { status: 409 });
        }

        try {
            await recordCanonicalTaskEvent(userId, result.username ?? caller?.email ?? userId, "daily_check_in_claim", {
                reward: result.reward,
                streak_count: result.nextStreak,
                day_key: getCSTDateKey(result.lastCheckIn),
                transaction_id: `${userId}:checkin:${result.lastCheckIn}`,
            });
        } catch (taskEventError) {
            console.error("Check-in completed but daily task progress sync failed", taskEventError);
        }

        const updatedUserSnapshot = await userRef.get();
        const updatedUserData = (updatedUserSnapshot.data() ?? {}) as Partial<UserProfile>;

        return NextResponse.json({
            success: true,
            reward: result.reward,
            streak: result.nextStreak,
            lastCheckIn: result.lastCheckIn,
            nextCheckInAt: result.nextCheckInAt,
            gumDropsBalance: Number.isFinite(updatedUserData.gumDropsBalance)
                ? Number(updatedUserData.gumDropsBalance)
                : result.newBalance,
            dailyTasksState: (updatedUserData.dailyTasksState ?? null) as DailyTasksState | null,
        });
    } catch (error) {
        return handleApiError(error, "Checkin.POST");
    }
}
