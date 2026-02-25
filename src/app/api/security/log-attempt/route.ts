import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const body = await req.json();
        const { dropId, reason } = body;

        const userRef = adminDb.collection("users").doc(uid);

        await adminDb.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return; // Should exist

            const data = userDoc.data() || {};
            const flags = data.securityFlags || { ripAttempts: 0 };

            transaction.update(userRef, {
                securityFlags: {
                    ...flags,
                    ripAttempts: (flags.ripAttempts || 0) + 1,
                    lastViolation: new Date().toISOString(),
                    lastViolationReason: reason,
                    lastViolationDropId: dropId
                }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Security log error:", error);
        return NextResponse.json({ error: "Failed to log attempt" }, { status: 500 });
    }
}
