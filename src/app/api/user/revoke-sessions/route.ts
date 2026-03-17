import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { STRICT } from "@/lib/server/rate-limit";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/revoke-sessions",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Auth or database not available" }, { status: 500 });
        }

        await adminAuth.revokeRefreshTokens(caller.uid);
        await adminDb.collection("users").doc(caller.uid).set({
            tokensRevokedAt: Date.now(),
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "User.RevokeSessions");
    }
}
