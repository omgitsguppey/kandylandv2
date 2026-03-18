import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { requestAllowsAnonymousAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";
import { claimAnalyticsReceipt } from "@/lib/server/analytics-receipts";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ANALYTICS_BATCH_ID_PATTERN, createAnalyticsBatchId } from "@/lib/analytics-identifiers";

export const dynamic = "force-dynamic";
const SESSION_COOKIE_NAME = "kandydrops_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_ANALYTICS_BODY_BYTES = 64 * 1024;
const SESSION_KEY_PATTERN = /^anon_[A-Za-z0-9-]{8,128}$/u;
const CLIENT_SESSION_PATTERN = /^[A-Za-z0-9-]{8,128}$/u;

const TelemetryEventSchema = z.object({
    type: z.enum(["click", "hover", "scroll", "visibility", "page_view", "page_leave"]),
    timestamp: z.number(),
    path: z.string().max(250),
    targetId: z.string().max(100).optional(),
    targetTag: z.string().max(50).optional(),
    targetText: z.string().max(100).optional(), // 100 char limit prevents DB bloat
    dropId: z.string().max(120).optional(),
    dropCategory: z.string().max(80).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    scrollDepthPercent: z.number().min(0).max(100).optional(),
    durationMs: z.number().max(86400000).optional(),
    interactionState: z.enum(["engaged", "passive"]).optional(),
    exitIntent: z.enum(["bounce", "exit"]).optional(),
    clickCount: z.number().optional(),
    hoverCount: z.number().optional(),
    scrollCount: z.number().optional(),
    semanticCategory: z.string().max(40).optional(),
    semanticCategoryLabel: z.string().max(60).optional(),
    semanticScopeKey: z.string().max(80).optional(),
    semanticScopeLabel: z.string().max(100).optional(),
    semanticSurfaceKey: z.string().max(120).optional(),
    semanticSurfaceLabel: z.string().max(120).optional(),
    referrerHost: z.string().max(120).optional(),
    viewportWidth: z.number().optional(),
    viewportHeight: z.number().optional(),
    devicePixelRatio: z.number().optional(),
    networkType: z.string().max(40).optional(),
});

const PayloadSchema = z.object({
    sessionId: z.string().min(8).max(100).regex(CLIENT_SESSION_PATTERN).optional(),
    batchId: z.string().regex(ANALYTICS_BATCH_ID_PATTERN).optional(),
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

function sanitizeTargetLabel(value: string | undefined) {
    if (!value) {
        return undefined;
    }

    return value
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);
}

export async function POST(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "analytics/ingest",
            rateLimit: ANALYTICS_WRITE,
            requireTrustedOrigin: true,
            requireAppCheck: true,
        });

        const contentLength = Number(request.headers.get("content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_ANALYTICS_BODY_BYTES) {
            return NextResponse.json({ success: true, ignored: true, reason: "payload_too_large" });
        }

        if (!requestAllowsAnonymousAnalytics(request)) {
            return NextResponse.json({ success: true, ignored: true, reason: "analytics_consent_denied" });
        }

        const rawPayload = await request.json();
        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            console.warn("Telemetry ingestion validation failed or empty payload", !parsed.success ? parsed.error : "empty events array");
            return NextResponse.json({ success: true, ignored: true });
        }

        const { sessionId, events } = parsed.data;
        const { sessionKey, shouldSetCookie } = getOrCreateSessionKey(request);
        const nowMs = Date.now();
        const timeKeys = buildAnalyticsTimeKeys(nowMs);
        const globalPrivacyControl = requestHasGlobalPrivacyControl(request);
        const batchId = parsed.data.batchId || createAnalyticsBatchId(sessionId || sessionKey);
        const sanitizedEvents = events.map((event) => ({
            ...event,
            targetText: sanitizeTargetLabel(event.targetText),
            x: typeof event.x === "number" ? Math.floor(event.x / 24) * 24 : undefined,
            y: typeof event.y === "number" ? Math.floor(event.y / 24) * 24 : undefined,
        }));

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const minuteBucket = timeKeys.minuteKey;
        const claimedReceipt = await claimAnalyticsReceipt({
            collectionName: "analytics_guest_receipts",
            receiptKey: `${sessionKey}:${batchId}`,
            data: {
                batchId,
                sessionKey,
                clientSessionId: sessionId || null,
                minuteBucket,
                receivedAtMs: nowMs,
                route: "analytics_ingest",
            },
        });

        if (!claimedReceipt) {
            return NextResponse.json({ success: true, deduped: true, processed: 0 });
        }

        const docId = `${sessionKey}_${minuteBucket}`;
        const docRef = adminDb.collection("analytics_sessions").doc(docId);
        const guestBatchRef = adminDb.collection("analytics_guest_batches").doc(batchId);
        const uniquePagePaths = Array.from(new Set(sanitizedEvents.map((event) => event.path)));
        const uniqueInteractionTypes = Array.from(new Set(sanitizedEvents.map((event) => event.type)));

        await docRef.set({
            sessionKey,
            clientSessionId: sessionId || null,
            minuteBucket,
            consentMode: "anonymous",
            globalPrivacyControl,
            eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
            trackingOrigin: "guest_client",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastReceivedAtMs: nowMs,
            batchCount: FieldValue.increment(1),
            eventCount: FieldValue.increment(sanitizedEvents.length),
            maxScrollDepth: sanitizedEvents.reduce((maxDepth, event) => Math.max(maxDepth, event.scrollDepthPercent || 0), 0),
            pagePaths: uniquePagePaths.slice(0, 25),
            interactionTypes: uniqueInteractionTypes.slice(0, 12),
        }, { merge: true });

        await guestBatchRef.set({
            batchId,
            sessionDocId: docId,
            source: "guest",
            sessionKey,
            clientSessionId: sessionId || null,
            minuteBucket,
            consentMode: "anonymous",
            globalPrivacyControl,
            eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
            trackingOrigin: "guest_client",
            receivedAtMs: nowMs,
            dayKey: timeKeys.dayKey,
            hourKey: timeKeys.hourKey,
            minuteKey: timeKeys.minuteKey,
            eventCount: sanitizedEvents.length,
            pagePaths: uniquePagePaths,
            interactionTypes: uniqueInteractionTypes,
            maxScrollDepth: sanitizedEvents.reduce((maxDepth, event) => Math.max(maxDepth, event.scrollDepthPercent || 0), 0),
            hasPixelData: sanitizedEvents.some((event) => Number.isFinite(event.x) && Number.isFinite(event.y)),
            events: sanitizedEvents,
            createdAt: FieldValue.serverTimestamp(),
        });

        const response = NextResponse.json({ success: true, processed: events.length });
        if (shouldSetCookie) {
            response.cookies.set({
                name: SESSION_COOKIE_NAME,
                value: sessionKey,
                httpOnly: true,
                sameSite: "strict",
                secure: request.nextUrl.protocol === "https:",
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
