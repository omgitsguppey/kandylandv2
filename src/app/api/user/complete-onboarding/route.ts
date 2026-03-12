import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
    try {
        const decodedToken = await verifyAuth(req);
        const { uid } = decodedToken;

        const profileRef = adminDb.collection("users").doc(uid).collection("profile").doc("default");
        const balanceRef = adminDb.collection("users").doc(uid).collection("economy").doc("balance");

        return await adminDb.runTransaction(async (transaction) => {
            const profileDoc = await transaction.get(profileRef);
            
            if (!profileDoc.exists) {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }

            const profileData = profileDoc.data();
            
            // Check if already completed to prevent double-dipping the reward
            if (profileData?.onboardingCompleted) {
                return NextResponse.json({ success: true, alreadyCompleted: true, message: "Onboarding already finished." });
            }

            // Award 50 Gumdrops
            const rewardAmount = 50;

            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.exists ? (balanceDoc.data()?.gumDrops || 0) : 0;
            const newBalance = currentBalance + rewardAmount;

            // Mark onboarding as complete
            transaction.set(profileRef, { 
                onboardingCompleted: true 
            }, { merge: true });

            // Update balance
            transaction.set(balanceRef, { 
                gumDrops: newBalance,
                updatedAt: Date.now()
            }, { merge: true });

            // Log the reward transaction
            const txRef = adminDb.collection("transactions").doc();
            transaction.set(txRef, {
                userId: uid,
                type: "onboarding_reward",
                status: "completed",
                amount: rewardAmount,
                currency: "USD",
                balanceAfter: newBalance,
                description: "Completed Guided Onboarding Flow",
                timestamp: Date.now()
            });

            return NextResponse.json({ 
                success: true, 
                rewardAmount, 
                newBalance 
            });
        });

    } catch (error) {
        return handleApiError(error, "User.CompleteOnboarding");
    }
}
