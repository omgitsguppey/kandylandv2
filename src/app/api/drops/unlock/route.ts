import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError, handleApiError } from "@/lib/server/auth";
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

        // 1 & 3. Parallel fetch user and drop data
        const [userSnap, dropSnap] = await Promise.all([
            userRef.get(),
            dropRef.get()
        ]);


        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const dropData = dropSnap.data()!;
        const unlockCost = dropData.unlockCost || 0;


        // 4. Check balance
        const balance = userData.gumDropsBalance || 0;
        if (balance < unlockCost) {
            return NextResponse.json({ error: "Not enough Gum Drops", required: unlockCost, balance }, { status: 402 });
        }

        // 5. Atomic batch: deduct balance + add unlock + record transaction
        const batch = adminDb.batch();

        batch.update(userRef, {
            gumDropsBalance: FieldValue.increment(-unlockCost),
            unlockedContent: FieldValue.arrayUnion(dropId),
        });

        const transactionRef = adminDb.collection("transactions").doc();
        batch.set(transactionRef, {
            userId,
            type: "unlock_content",
            amount: -unlockCost,
            relatedDropId: dropId,
            description: `Unlocked: ${dropData.title}`,
            timestamp: FieldValue.serverTimestamp(),
            verifiedServerSide: true,
        });

        // Increment totalUnlocks on the drop
        batch.update(dropRef, {
            totalUnlocks: FieldValue.increment(1),
        });

        await batch.commit();

        console.log(`✅ Unlock verified: ${dropData.title} for user ${userId} (-${unlockCost} GD)`);

        return NextResponse.json({
            success: true,
            title: dropData.title,
            cost: unlockCost,
            newBalance: balance - unlockCost,
        });
    } catch (error) {
        return handleApiError(error, "Drops.Unlock");
    }
}
