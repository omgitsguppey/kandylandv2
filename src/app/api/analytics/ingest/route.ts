import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TelemetryEventSchema = z.object({
    type: z.enum(["click", "hover", "scroll", "visibility"]),
    timestamp: z.number(),
    path: z.string().max(250),
    targetId: z.string().max(100).optional(),
    targetTag: z.string().max(50).optional(),
    targetText: z.string().max(100).optional(), // 100 char limit prevents DB bloat
    x: z.number().optional(),
    y: z.number().optional(),
    scrollDepthPercent: z.number().min(0).max(100).optional(),
    durationMs: z.number().max(86400000).optional(),
});

const PayloadSchema = z.object({
    sessionId: z.string().min(1).max(100),
    uid: z.string().max(100).optional().default("anonymous"),
    events: z.array(TelemetryEventSchema).max(200), // Cap events to 200 per payload
});

export async function POST(request: NextRequest) {
    try {
        const rawPayload = await request.json();
        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            console.warn("Telemetry ingestion validation failed or empty payload", !parsed.success ? parsed.error : "empty events array");
            return NextResponse.json({ success: true, ignored: true });
        }

        const { sessionId, uid, events } = parsed.data;

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const now = new Date();
        const minuteBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

        const docId = `${sessionId}_${minuteBucket}`;
        const docRef = adminDb.collection("analytics_sessions").doc(docId);

        // We use set with merge: true to ensure the base document exists
        await docRef.set({
            sessionId,
            uid,
            minuteBucket,
            createdAt: FieldValue.serverTimestamp(), // Use server timestamp to standardize
        }, { merge: true });

        // Update with arrayUnion avoids the massive contention of transactions while guaranteeing all events are appended
        await docRef.update({
            events: FieldValue.arrayUnion(...events),
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, processed: events.length });
    } catch (error) {
        console.error("Telemetry ingestion failed:", error);
        // Fail silently to the client to avoid console spam for analytics
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
