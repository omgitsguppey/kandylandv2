import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Use the verified UID from the token
        const userId = caller.uid;

        const userRef = adminDb.collection("users").doc(userId);
        const dropRef = adminDb.collection("drops").doc(dropId);

        // 1. Fetch drop data (doesn't need to be strictly in the transaction lock)
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const dropData = dropSnap.data()!;
        const unlockCost = dropData.unlockCost || 0;

        // 2. Run Atomic Transaction to prevent race conditions (e.g. double spending)
        const result = await adminDb.runTransaction(async (transaction) => {
            // A. Read user within the transaction lock
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) {
                throw new Error("User not found");
            }

            const userData = userSnap.data()!;
            const balance = userData.gumDropsBalance || 0;

            // B. Validate balance
            if (balance < unlockCost) {
                // We throw a specific structured error to catch and return a 402
                throw new Error(`INSUFFICIENT_FUNDS:${unlockCost}:${balance}`);
            }

            // C. Perform Writes Atomically
            transaction.update(userRef, {
                gumDropsBalance: FieldValue.increment(-unlockCost),
                unlockedContent: FieldValue.arrayUnion(dropId),
            });

            const transactionRef = adminDb.collection("transactions").doc();
            transaction.set(transactionRef, {
                userId,
                type: "unlock_content",
                amount: -unlockCost,
                relatedDropId: dropId,
                description: `Unlocked: ${dropData.title}`,
                timestamp: FieldValue.serverTimestamp(),
                verifiedServerSide: true,
            });

            // Increment totalUnlocks on the drop
            transaction.update(dropRef, {
                totalUnlocks: FieldValue.increment(1),
            });

            return { newBalance: balance - unlockCost };
        });

        console.log(`✅ Unlock verified: ${dropData.title} for user ${userId} (-${unlockCost} GD)`);

        return NextResponse.json({
            success: true,
            title: dropData.title,
            cost: unlockCost,
            newBalance: result.newBalance,
        });
    } catch (error: any) {
        // Handle specific transaction errors
        if (error.message && error.message.startsWith("INSUFFICIENT_FUNDS:")) {
            const parts = error.message.split(":");
            return NextResponse.json({
                error: "Not enough Gum Drops",
                required: parseInt(parts[1], 10),
                balance: parseInt(parts[2], 10)
            }, { status: 402 });
        }
        if (error.message === "User not found") {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return handleApiError(error, "Drops.Unlock");
    }
}
