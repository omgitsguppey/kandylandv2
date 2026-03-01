import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ dropId: string }> }
) {
    try {
        const params = await context.params;
        const { dropId } = params;

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);

        // Use a transaction/update to safely increment the click count
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
