import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

export const dynamic = "force-dynamic";
const SESSION_COOKIE_NAME = "kandydrops_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_KEY_PATTERN = /^anon_[A-Za-z0-9-]{8,128}$/u;
const CLIENT_SESSION_PATTERN = /^[A-Za-z0-9-]{8,128}$/u;

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
    sessionId: z.string().min(8).max(100).regex(CLIENT_SESSION_PATTERN).optional(),
    events: z.array(TelemetryEventSchema).max(200), // Cap events to 200 per payload
});

function getOrCreateSessionKey(request: NextRequest) {
    const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
    if (existing && SESSION_KEY_PATTERN.test(existing)) {
        return { sessionKey: existing, shouldSetCookie: false };
    }

    return {
        sessionKey: `anon_${crypto.randomUUID()}`,
        shouldSetCookie: true,
    };
}

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "analytics/ingest", RELAXED);

        if (!hasTrustedSiteOrigin(request)) {
            return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
        }

        const rawPayload = await request.json();
        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            console.warn("Telemetry ingestion validation failed or empty payload", !parsed.success ? parsed.error : "empty events array");
            return NextResponse.json({ success: true, ignored: true });
        }

        const { sessionId, events } = parsed.data;
        const { sessionKey, shouldSetCookie } = getOrCreateSessionKey(request);

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const now = new Date();
        const minuteBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

        const docId = `${sessionKey}_${minuteBucket}`;
        const docRef = adminDb.collection("analytics_sessions").doc(docId);

        // We use set with merge: true to ensure the base document exists
        await docRef.set({
            sessionKey,
            clientSessionId: sessionId || null,
            minuteBucket,
            createdAt: FieldValue.serverTimestamp(), // Use server timestamp to standardize
        }, { merge: true });

        // Update with arrayUnion avoids the massive contention of transactions while guaranteeing all events are appended
        await docRef.update({
            events: FieldValue.arrayUnion(...events),
            updatedAt: FieldValue.serverTimestamp()
        });

        const response = NextResponse.json({ success: true, processed: events.length });
        if (shouldSetCookie) {
            response.cookies.set({
                name: SESSION_COOKIE_NAME,
                value: sessionKey,
                httpOnly: true,
                sameSite: "strict",
                secure: true,
                path: "/",
                maxAge: SESSION_COOKIE_MAX_AGE,
            });
        }

        return response;
    } catch (error) {
        console.error("Telemetry ingestion failed:", error);
        // Fail silently to the client to avoid console spam for analytics
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
