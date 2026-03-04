import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { adminDb, adminAuth } from "@/lib/server/firebase-admin";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

export async function DELETE(request: NextRequest) {
    try {
        checkRateLimit(request, "user/delete", STRICT);
        const authResult = await verifyAuth(request);
        const { uid } = authResult;

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Database or Auth not available" }, { status: 500 });
        }

        const batch = adminDb.batch();
        const userRef = adminDb.collection("users").doc(uid);

        // 1. Delete Unlocked Content subcollection
        const dropsSnapshot = await userRef.collection("unlocked_drops").get();
        dropsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Delete Main Profile Document
        batch.delete(userRef);

        // Execute Firestore Deletions
        await batch.commit();

        // 3. Delete Firebase Auth Identity
        await adminAuth.deleteUser(uid);

        return NextResponse.json({
            success: true,
            message: "Account and associated data deleted permanently."
        });

    } catch (error) {
        return handleApiError(error, "User.Delete.DELETE");
    }
}
