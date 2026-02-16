import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, AuthError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

// POST — Adjust user balance (admin-only)
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);

        const { userId, amount, reason } = await request.json();

        if (!userId || amount === undefined || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const batch = adminDb.batch();

        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, {
            gumDropsBalance: FieldValue.increment(amount),
        });

        const transactionRef = adminDb.collection("transactions").doc();
        batch.set(transactionRef, {
            userId,
            type: "admin_adjustment",
            amount,
            description: `Admin Adjustment: ${reason}`,
            adjustedBy: admin.email || "admin",
            timestamp: FieldValue.serverTimestamp(),
            verifiedServerSide: true,
        });

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Balance adjustment error:", error);
        return NextResponse.json({ error: error.message || "Adjustment failed" }, { status: 500 });
    }
}
