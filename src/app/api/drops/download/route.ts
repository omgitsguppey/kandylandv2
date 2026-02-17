import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

const DOWNLOAD_COST = 100;

/**
 * POST /api/drops/download
 * 
 * Authenticated endpoint that gates content downloads behind a Gum Drops charge.
 * Verifies ownership, deducts 100 GD, records a transaction, and returns the URL.
 */
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

        const userId = caller.uid;

        // 1. Fetch user profile
        const userRef = adminDb.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const userData = userSnap.data()!;

        // 2. Verify ownership
        const unlockedContent: string[] = userData.unlockedContent || [];
        if (!unlockedContent.includes(dropId)) {
            return NextResponse.json({ error: "You do not own this content" }, { status: 403 });
        }

        // 3. Check balance
        const balance = userData.gumDropsBalance || 0;
        if (balance < DOWNLOAD_COST) {
            return NextResponse.json(
                { error: "Not enough Gum Drops", required: DOWNLOAD_COST, balance },
                { status: 402 }
            );
        }

        // 4. Fetch drop to get content URL and title
        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }
        const dropData = dropSnap.data()!;

        if (!dropData.contentUrl) {
            return NextResponse.json({ error: "No content available" }, { status: 404 });
        }

        // 5. Atomic batch: deduct balance + record transaction
        const batch = adminDb.batch();

        batch.update(userRef, {
            gumDropsBalance: FieldValue.increment(-DOWNLOAD_COST),
        });

        const transactionRef = adminDb.collection("transactions").doc();
        batch.set(transactionRef, {
            userId,
            type: "download_content",
            amount: -DOWNLOAD_COST,
            relatedDropId: dropId,
            description: `Downloaded: ${dropData.title}`,
            timestamp: FieldValue.serverTimestamp(),
            verifiedServerSide: true,
        });

        await batch.commit();

        console.log(`✅ Download verified: ${dropData.title} for user ${userId} (-${DOWNLOAD_COST} GD)`);

        return NextResponse.json({
            success: true,
            downloadUrl: dropData.contentUrl,
            cost: DOWNLOAD_COST,
            newBalance: balance - DOWNLOAD_COST,
        });
    } catch (error) {
        return handleApiError(error, "Drops.Download");
    }
}
