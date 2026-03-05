import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        if (!payload.sessionId || !Array.isArray(payload.events) || payload.events.length === 0) {
            return NextResponse.json({ success: true, ignored: true });
        }

        const sessionId = payload.sessionId;
        const uid = payload.uid || "anonymous";

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        // E.g. sessionId_2024-03-05T12:05
        const now = new Date();
        const minuteBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

        const docId = `${sessionId}_${minuteBucket}`;
        const docRef = adminDb.collection("analytics_sessions").doc(docId);

        // We use set with merge: true to append/update the bucket without overwriting other events in the same minute
        await adminDb.runTransaction(async (transaction) => {
            const docSnapshot = await transaction.get(docRef);

            if (!docSnapshot.exists) {
                transaction.set(docRef, {
                    sessionId,
                    uid,
                    minuteBucket,
                    createdAt: Date.now(),
                    events: payload.events,
                    eventCount: payload.events.length
                });
            } else {
                const existingData = docSnapshot.data();
                const combinedEvents = [...(existingData?.events || []), ...payload.events];

                // Optional cap per minute-bucket to prevent absolute explosion (e.g. infinite loop scroll bug)
                if (combinedEvents.length > 2000) {
                    combinedEvents.splice(0, combinedEvents.length - 2000);
                }

                transaction.update(docRef, {
                    events: combinedEvents,
                    eventCount: combinedEvents.length,
                    updatedAt: Date.now()
                });
            }
        });

        return NextResponse.json({ success: true, processed: payload.events.length });
    } catch (error) {
        console.error("Telemetry ingestion failed:", error);
        // Fail silently to the client to avoid console spam for analytics
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
