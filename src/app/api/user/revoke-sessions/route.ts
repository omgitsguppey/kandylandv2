import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/revoke-sessions", STRICT);
        const { uid } = await verifyAuth(request);
        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Auth or database not available" }, { status: 500 });
        }

        await adminAuth.revokeRefreshTokens(uid);
        await adminDb.collection("users").doc(uid).set({
            tokensRevokedAt: Date.now(),
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "User.RevokeSessions");
    }
}
