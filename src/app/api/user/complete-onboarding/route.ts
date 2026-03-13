import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
    try {
        await checkRateLimit(req, "user/complete-onboarding", STRICT);
        const decodedToken = await verifyAuth(req);
        const { uid } = decodedToken;

        const userRef = adminDb.collection("users").doc(uid);
        const legacyProfileRef = userRef.collection("profile").doc("default");
        const balanceRef = adminDb.collection("users").doc(uid).collection("economy").doc("balance");

        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const userData = userDoc.data() || {};
            const legacyProfileDoc = await transaction.get(legacyProfileRef);
            const legacyProfileData = legacyProfileDoc.exists ? legacyProfileDoc.data() : null;

            // Check if already completed to prevent double-dipping the reward
            if (userData?.onboardingCompleted || legacyProfileData?.onboardingCompleted) {
                return NextResponse.json({ success: true, alreadyCompleted: true, message: "Onboarding already finished." });
            }

            // Award 50 Gumdrops
            const rewardAmount = 50;

            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = Number(userData?.gumDropsBalance)
                || (balanceDoc.exists ? Number(balanceDoc.data()?.gumDrops || 0) : 0);
            const newBalance = currentBalance + rewardAmount;

            transaction.set(userRef, {
                onboardingCompleted: true,
                gumDropsBalance: newBalance,
                updatedAt: Date.now(),
            }, { merge: true });

            // Keep legacy docs in sync for older clients/tools.
            transaction.set(legacyProfileRef, {
                onboardingCompleted: true,
            }, { merge: true });

            transaction.set(balanceRef, {
                gumDrops: newBalance,
                updatedAt: Date.now(),
            }, { merge: true });

            const txRef = adminDb.collection("transactions").doc();
            transaction.set(txRef, {
                userId: uid,
                type: "onboarding_reward",
                status: "completed",
                amount: rewardAmount,
                currency: "USD",
                balanceAfter: newBalance,
                description: "Completed Guided Onboarding Flow",
                timestamp: Date.now(),
            });

            return NextResponse.json({
                success: true,
                rewardAmount,
                newBalance,
            });
        });

    } catch (error) {
        return handleApiError(error, "User.CompleteOnboarding");
    }
}
