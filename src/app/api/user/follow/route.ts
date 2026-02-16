import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        const { targetUserId, action } = await request.json();

        // Use verified UID from token
        const userId = caller.uid;

        if (!targetUserId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (userId === targetUserId) {
            return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
        }
        if (action !== "follow" && action !== "unfollow") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(userId);

        if (action === "follow") {
            await userRef.update({ following: FieldValue.arrayUnion(targetUserId) });
        } else {
            await userRef.update({ following: FieldValue.arrayRemove(targetUserId) });
        }

        return NextResponse.json({ success: true, action });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Follow error:", error);
        return NextResponse.json({ error: error.message || "Follow action failed" }, { status: 500 });
    }
}
