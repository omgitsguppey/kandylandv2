import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";

/**
 * GET /api/drops/content?id=<dropId>
 * 
 * Authenticated content proxy. Verifies the user owns the drop,
 * then redirects to the real content URL. The raw URL never appears
 * in the client-side HTML source.
 */
export async function GET(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        const { searchParams } = new URL(request.url);
        const dropId = searchParams.get("id");

        if (!dropId) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // 1. Verify user owns this drop
        const userRef = adminDb.collection("users").doc(caller.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const unlockedContent: string[] = userData.unlockedContent || [];
        if (!unlockedContent.includes(dropId)) {
            return NextResponse.json({ error: "You do not own this content" }, { status: 403 });
        }

        // 2. Get the raw content URL from Firestore
        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const dropData = dropSnap.data()!;
        const contentUrl = dropData.contentUrl;

        if (!contentUrl) {
            return NextResponse.json({ error: "No content available" }, { status: 404 });
        }

        // 3. Redirect to the content URL (never exposed in client HTML)
        return NextResponse.redirect(contentUrl);
    } catch (error) {
        return handleApiError(error, "Drops.Content");
    }
}
