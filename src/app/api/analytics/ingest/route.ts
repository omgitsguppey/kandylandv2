import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";
import { requestAllowsAnonymousAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { recordSemanticRollupFromGuestEvents } from "@/lib/server/analytics-semantics";

export const dynamic = "force-dynamic";
const SESSION_COOKIE_NAME = "kandydrops_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_KEY_PATTERN = /^anon_[A-Za-z0-9-]{8,128}$/u;
const CLIENT_SESSION_PATTERN = /^[A-Za-z0-9-]{8,128}$/u;

function buildTimeKeys(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    return {
        dayKey: `${year}-${month}-${day}`,
        hourKey: `${year}-${month}-${day}T${hour}`,
        minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
    };
}

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

function encodeDocKey(value: string) {
    return Buffer.from(value).toString("base64url").slice(0, 180) || "root";
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
        await checkRateLimit(request, "analytics/ingest", RELAXED);

        if (!hasTrustedSiteOrigin(request)) {
            return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
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
        const timeKeys = buildTimeKeys(nowMs);
        const globalPrivacyControl = requestHasGlobalPrivacyControl(request);
        const sanitizedEvents = events.map((event) => ({
            ...event,
            targetText: sanitizeTargetLabel(event.targetText),
            x: typeof event.x === "number" ? Math.floor(event.x / 24) * 24 : undefined,
            y: typeof event.y === "number" ? Math.floor(event.y / 24) * 24 : undefined,
        }));

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const minuteBucket = timeKeys.minuteKey;

        const docId = `${sessionKey}_${minuteBucket}`;
        const docRef = adminDb.collection("analytics_sessions").doc(docId);

        // We use set with merge: true to ensure the base document exists
        await docRef.set({
            sessionKey,
            clientSessionId: sessionId || null,
            minuteBucket,
            consentMode: "anonymous",
            globalPrivacyControl,
            eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
            trackingOrigin: "guest_client",
            createdAt: FieldValue.serverTimestamp(), // Use server timestamp to standardize
        }, { merge: true });

        // Update with arrayUnion avoids the massive contention of transactions while guaranteeing all events are appended
        await docRef.update({
            events: FieldValue.arrayUnion(...sanitizedEvents),
            updatedAt: FieldValue.serverTimestamp()
        });
        await adminDb.collection("analytics_guest_batches").add({
            source: "guest",
            sessionKey,
            clientSessionId: sessionId || null,
            consentMode: "anonymous",
            globalPrivacyControl,
            eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
            trackingOrigin: "guest_client",
            receivedAtMs: nowMs,
            dayKey: timeKeys.dayKey,
            hourKey: timeKeys.hourKey,
            minuteKey: timeKeys.minuteKey,
            eventCount: sanitizedEvents.length,
            pagePaths: Array.from(new Set(sanitizedEvents.map((event) => event.path))),
            interactionTypes: Array.from(new Set(sanitizedEvents.map((event) => event.type))),
            maxScrollDepth: sanitizedEvents.reduce((maxDepth, event) => Math.max(maxDepth, event.scrollDepthPercent || 0), 0),
            hasPixelData: sanitizedEvents.some((event) => Number.isFinite(event.x) && Number.isFinite(event.y)),
            events: sanitizedEvents,
            createdAt: FieldValue.serverTimestamp(),
        });

        const rollupBatch = adminDb.batch();
        const pageRollups = new Map<string, {
            pagePath: string;
            pageViews: number;
            clickCount: number;
            hoverCount: number;
            scrollCount: number;
            visibilityCount: number;
            dwellMsTotal: number;
            dwellSampleCount: number;
            maxScrollDepth: number;
        }>();
        const targetRollups = new Map<string, {
            pagePath: string;
            targetKey: string;
            targetText: string;
            targetTag: string;
            clickCount: number;
            hoverCount: number;
            lastEventAt: number;
        }>();

        sanitizedEvents.forEach((event) => {
            const pagePath = event.path || "/";
            const pageKey = `${timeKeys.dayKey}__${encodeDocKey(pagePath)}`;
            const currentPage = pageRollups.get(pageKey) || {
                pagePath,
                pageViews: 0,
                clickCount: 0,
                hoverCount: 0,
                scrollCount: 0,
                visibilityCount: 0,
                dwellMsTotal: 0,
                dwellSampleCount: 0,
                maxScrollDepth: 0,
            };

            if (event.type === "page_view") currentPage.pageViews += 1;
            if (event.type === "click") currentPage.clickCount += 1;
            if (event.type === "hover") currentPage.hoverCount += 1;
            if (event.type === "scroll") currentPage.scrollCount += 1;
            if (event.type === "visibility") currentPage.visibilityCount += 1;
            if (event.type === "page_leave" && typeof event.durationMs === "number" && event.durationMs > 0) {
                currentPage.dwellMsTotal += event.durationMs;
                currentPage.dwellSampleCount += 1;
            }
            currentPage.maxScrollDepth = Math.max(currentPage.maxScrollDepth, event.scrollDepthPercent || 0);
            pageRollups.set(pageKey, currentPage);

            if (event.type === "click" || event.type === "hover") {
                const targetLabel = (event.targetText || event.targetId || event.targetTag || "unknown").slice(0, 80);
                const targetKey = `${timeKeys.dayKey}__${encodeDocKey(pagePath)}__${encodeDocKey(targetLabel)}`;
                const currentTarget = targetRollups.get(targetKey) || {
                    pagePath,
                    targetKey: targetLabel,
                    targetText: event.targetText || event.targetId || "",
                    targetTag: event.targetTag || "",
                    clickCount: 0,
                    hoverCount: 0,
                    lastEventAt: 0,
                };
                if (event.type === "click") currentTarget.clickCount += 1;
                if (event.type === "hover") currentTarget.hoverCount += 1;
                currentTarget.lastEventAt = Math.max(currentTarget.lastEventAt, event.timestamp);
                targetRollups.set(targetKey, currentTarget);
            }
        });

        pageRollups.forEach((entry, docId) => {
            rollupBatch.set(adminDb.collection("analytics_page_daily").doc(docId), {
                dayKey: timeKeys.dayKey,
                pagePath: entry.pagePath,
                pageViews: FieldValue.increment(entry.pageViews),
                clickCount: FieldValue.increment(entry.clickCount),
                hoverCount: FieldValue.increment(entry.hoverCount),
                scrollCount: FieldValue.increment(entry.scrollCount),
                visibilityCount: FieldValue.increment(entry.visibilityCount),
                dwellMsTotal: FieldValue.increment(entry.dwellMsTotal),
                dwellSampleCount: FieldValue.increment(entry.dwellSampleCount),
                maxScrollDepth: entry.maxScrollDepth,
                updatedAt: FieldValue.serverTimestamp(),
                lastEventAt: nowMs,
            }, { merge: true });
        });

        targetRollups.forEach((entry, docId) => {
            rollupBatch.set(adminDb.collection("analytics_target_daily").doc(docId), {
                dayKey: timeKeys.dayKey,
                pagePath: entry.pagePath,
                targetKey: entry.targetKey,
                targetText: entry.targetText,
                targetTag: entry.targetTag,
                clickCount: FieldValue.increment(entry.clickCount),
                hoverCount: FieldValue.increment(entry.hoverCount),
                updatedAt: FieldValue.serverTimestamp(),
                lastEventAt: entry.lastEventAt || nowMs,
            }, { merge: true });
        });

        await rollupBatch.commit();
        await recordSemanticRollupFromGuestEvents({
            timestamp: nowMs,
            events: sanitizedEvents as Array<Record<string, unknown>>,
            sourceKey: "analytics_guest_batches",
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
