import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { trackServerEvent } from "@/lib/server/analytics";
import { checkRateLimit, STANDARD } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
    try {
        checkRateLimit(request, "drops/track", STANDARD);
        const caller = await verifyAuth(request);

        const { dropId } = await request.json();

        if (!dropId || !adminDb) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);

        // Send Exact Timestamped View Event to GA4
        await trackServerEvent("drop_clicked", {
            dropId: dropId,
            action: "track",
            source: "backend_api_authenticated"
        }, caller.uid);

        await dropRef.update({ totalClicks: FieldValue.increment(1) });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Drops.Track");
    }
}
