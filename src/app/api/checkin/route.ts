import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getCSTDayBoundaries } from "@/lib/timezone";

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Use the verified UID from the token, not from the request body
        const userId = caller.uid;

        // 1. Fetch user profile
        const userRef = adminDb.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const userData = userSnap.data()!;

        const now = Date.now();
        const lastCheckIn = userData.lastCheckIn || 0;
        const currentStreak = userData.streakCount || 0;

        // 2. Check if already claimed today (CST day boundaries)
        const { startOfDay, endOfDay } = getCSTDayBoundaries(now);
        const isSameDay = lastCheckIn >= startOfDay && lastCheckIn < endOfDay;

        if (isSameDay && lastCheckIn > 0) {
            return NextResponse.json({ error: "Already claimed today", alreadyClaimed: true }, { status: 409 });
        }

        // 3. Calculate streak
        const hoursSinceLast = lastCheckIn > 0 ? (now - lastCheckIn) / (1000 * 60 * 60) : Infinity;
        let nextStreak: number;

        if (hoursSinceLast > 48) {
            nextStreak = 1;
        } else {
            nextStreak = currentStreak + 1;
        }

        if (currentStreak >= 7) {
            nextStreak = 1;
        }

        const reward = nextStreak * 10;

        // 4. Atomic batch: update balance + streak + transaction
        const batch = adminDb.batch();

        batch.update(userRef, {
            gumDropsBalance: FieldValue.increment(reward),
            lastCheckIn: now,
            streakCount: nextStreak,
        });

        const transactionRef = adminDb.collection("transactions").doc();
        batch.set(transactionRef, {
            userId,
            type: "purchase_currency",
            amount: reward,
            description: `Daily Check-in: Day ${nextStreak}`,
            timestamp: FieldValue.serverTimestamp(),
            verifiedServerSide: true,
        });

        await batch.commit();

        console.log(`✅ Check-in verified: Day ${nextStreak} (+${reward} GD) for user ${userId}`);

        return NextResponse.json({
            success: true,
            reward,
            streak: nextStreak,
        });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Check-in error:", error);
        return NextResponse.json({ error: error.message || "Check-in failed" }, { status: 500 });
    }
}
