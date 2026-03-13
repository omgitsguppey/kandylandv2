import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getCSTDayBoundaries, isPreviousCSTDay, isSameCSTDay } from "@/lib/timezone";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "checkin", STRICT);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
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
            const now = Date.now();
            const lastCheckIn = userData.lastCheckIn || 0;
            const currentStreak = userData.streakCount || 0;

            // 2. Check if already claimed today (CST day boundaries)
            const { endOfDay } = getCSTDayBoundaries(now);
            const isSameDay = isSameCSTDay(lastCheckIn, now);

            if (isSameDay && lastCheckIn > 0) {
                return {
                    alreadyClaimed: true,
                    reward: 0,
                    nextStreak: currentStreak,
                    lastCheckIn,
                    nextCheckInAt: endOfDay,
                };
            }

            // 3. Calculate streak
            const checkedInYesterday = isPreviousCSTDay(lastCheckIn, now);
            let nextStreak = checkedInYesterday ? currentStreak + 1 : 1;

            if (currentStreak >= 7 && checkedInYesterday) {
                nextStreak = 1;
            }

            const reward = nextStreak * 10;

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

        return NextResponse.json({
            success: true,
            reward: result.reward,
            streak: result.nextStreak,
            lastCheckIn: result.lastCheckIn,
            nextCheckInAt: result.nextCheckInAt,
        });
    } catch (error) {
        return handleApiError(error, "Checkin.POST");
    }
}
