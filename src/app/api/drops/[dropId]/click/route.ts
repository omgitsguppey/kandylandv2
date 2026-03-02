import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { trackServerEvent } from "@/lib/server/analytics";
import { verifyAuth } from "@/lib/server/auth";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ dropId: string }> }
) {
    try {
        const params = await context.params;
        const { dropId } = params;

        let userId: string | undefined = undefined;
        try {
            // Attempt to resolve the caller for stitched GA4 sessions
            const caller = await verifyAuth(request);
            if (caller) userId = caller.uid;
        } catch (authErr) {
            // Fails gracefully for anonymous clicks
        }

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);

        // 1. Send Explicit Timestamp to GA4 Server-to-Server Protocol
        await trackServerEvent("drop_clicked", {
            dropId: dropId,
            action: "click",
            source: "backend_api"
        }, userId);

        // 2. Safely increment the public UI count
        await dropRef.update({
            totalClicks: FieldValue.increment(1)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to increment drop clicks:", error);
        // We return 200 even on expected failures so we don't block the client UI just for analytics.
        return NextResponse.json({ success: false, error: "Failed to track click" });
    }
}
