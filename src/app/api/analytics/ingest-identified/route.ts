import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { z } from "zod";
import { handleApiError, AuthError } from "@/lib/server/auth";
import { ANALYTICS_WRITE, RateLimitError } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS, ANALYTICS_ROUTE_POLICIES } from "@/lib/server/analytics-governance";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";

const MAX_ANALYTICS_BODY_BYTES = 128 * 1024; // 128KB max payload

const IdentifiedEventSchema = z.object({
    eventId: z.string().min(1).max(200),
    eventTimestampMs: z.number().optional(),
    eventName: z.string().min(1).max(200),
    eventParams: z.record(z.string(), z.unknown()).optional(),
});

const PayloadSchema = z.object({
    events: z.array(IdentifiedEventSchema).max(200),
});

function getAnalyticsIngestErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function buildFallbackEventId(userId: string, eventName: string) {
    return `evt_${encodeURIComponent(userId || "anonymous")}_${encodeURIComponent(eventName || "event")}_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function readStringParam(params: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = params[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }

    return "";
}

function readEventModules(params: Record<string, unknown>) {
    const value = params.event_modules ?? params.eventModules;
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).join(", ");
    }

    return typeof value === "string" ? value.trim() : "";
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            ...ANALYTICS_ROUTE_POLICIES.identifiedIngest,
            preAuthRateLimit: ANALYTICS_WRITE,
            rateLimit: ANALYTICS_WRITE,
        });

        if (!caller || !caller.uid) {
            return NextResponse.json({ success: false, reason: "unauthenticated" }, { status: 401 });
        }

        const contentLength = Number(request.headers.get("content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_ANALYTICS_BODY_BYTES) {
            return NextResponse.json({ success: true, ignored: true, reason: "payload_too_large" });
        }

        // The telemetry client might send { events: [...] } or { data: { events: [...] } } depending on sendBeacon vs fetch
        let rawPayload = await request.json();
        if (rawPayload && typeof rawPayload === 'object' && 'data' in rawPayload && typeof rawPayload.data === 'object' && 'events' in rawPayload.data) {
             rawPayload = rawPayload.data;
        }

        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            recordRouteWarning(
                "Analytics.IngestIdentified",
                "Telemetry ingestion validation failed or empty payload",
                !parsed.success ? parsed.error : "empty events array",
                { channel: "analytics" },
            );
            return NextResponse.json({ success: true, ignored: true });
        }

        const uniqueEvents = new Map<string, any>();
        for (const rawEvent of parsed.data.events) {
            const eId = rawEvent.eventId;
            if (eId) {
                if (!uniqueEvents.has(eId)) {
                    uniqueEvents.set(eId, rawEvent);
                }
            } else {
                uniqueEvents.set(crypto.randomUUID(), rawEvent);
            }
        }
        const deduplicatedEvents = Array.from(uniqueEvents.values());

        const batch = adminDb.batch();
        let processed = 0;
        let latestActiveUserPatch: Record<string, unknown> | null = null;

        for (const rawEvent of deduplicatedEvents) {
            const eventId = rawEvent.eventId || buildFallbackEventId(caller.uid, rawEvent.eventName);
            const ref = adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts).doc(eventId);
            
            const timestamp = rawEvent.eventTimestampMs || Date.now();
            const params = rawEvent.eventParams && typeof rawEvent.eventParams === "object" ? rawEvent.eventParams : {};
            
            const finalEvent = {
                eventId,
                eventName: rawEvent.eventName,
                timestamp,
                clientTimestamp: timestamp,
                serverTimestamp: Date.now(),
                userId: caller.uid,
                username: "",
                consentMode: "identified",
                sourceLayer: "observed",
                sourceSurface: String(params.page_path || params.pagePath || "client"),
                idempotencyKey: eventId,
                sessionId: String(params.session_id || params.sessionId || ""),
                pagePath: String(params.page_path || params.pagePath || ""),
                dayKey: String(params.day_key || params.dayKey || ""),
                hourKey: String(params.hour_key || params.hourKey || ""),
                minuteKey: String(params.minute_key || params.minuteKey || ""),
                dropId: String(params.drop_id || params.dropId || ""),
                dropTitle: String(params.drop_title || params.dropTitle || ""),
                dropCategory: String(params.drop_category || params.dropCategory || ""),
                assetKey: String(params.asset_key || params.assetKey || ""),
                assetIndex: Number(params.asset_index || params.assetIndex || 0),
                contentKind: String(params.content_kind || params.contentKind || ""),
                destination: String(params.destination || ""),
                destinationType: String(params.destination_type || params.destinationType || ""),
                sessionWatchSeconds: Number(params.session_watch_seconds || params.sessionWatchSeconds || 0),
                watchSeconds: Number(params.watch_seconds || params.watchSeconds || 0),
                durationMs: Number(params.duration_ms || params.durationMs || 0),
                loadMs: Number(params.load_ms || params.loadMs || 0),
                viewportWidth: Number(params.viewport_width || params.viewportWidth || 0),
                viewportHeight: Number(params.viewport_height || params.viewportHeight || 0),
                isMobileViewport: Boolean(params.is_mobile_viewport || params.isMobileViewport || false),
                authState: "authenticated",
                params,
            };

            // Using batch.set with merge: false to mimic create, but safer. Deduplication is handled by background worker if duplicate
            batch.set(ref, finalEvent, { merge: false });
            processed++;

            if (!latestActiveUserPatch || timestamp >= Number(latestActiveUserPatch.lastSeenAt || 0)) {
                latestActiveUserPatch = {
                    uid: caller.uid,
                    username: readStringParam(params, "username", "user_name", "display_name", "displayName"),
                    lastSeenAt: timestamp,
                    lastEventName: rawEvent.eventName,
                    lastPagePath: finalEvent.pagePath,
                    lastDropTitle: finalEvent.dropTitle,
                    lastSemanticScopeLabel: readStringParam(params, "semantic_scope_label", "semanticScopeLabel"),
                    lastComponentName: readStringParam(params, "component_name", "componentName"),
                    lastEventModules: readEventModules(params),
                    source: "identified_client_ingest",
                    updatedAt: Date.now(),
                };
            }

            if (rawEvent.eventName === "admin_ui_error") {
                const errorMsg = String(params.message || "Unknown client error");
                const stackTrace = typeof params.stack === "string" ? params.stack : "";
                
                await recordServerDiagnostic({
                    channel: "ai",
                    severity: "error",
                    message: `Admin UI Error: ${errorMsg.slice(0, 100)}`,
                    detail: {
                        userId: caller.uid,
                        filename: params.filename,
                        lineno: params.lineno,
                        colno: params.colno,
                        preview: stackTrace || errorMsg,
                    },
                });
            }
        }

        if (processed > 0) {
            if (latestActiveUserPatch) {
                batch.set(
                    adminDb.collection(ANALYTICS_OPERATIONAL_COLLECTIONS.activeUsers).doc(caller.uid),
                    latestActiveUserPatch,
                    { merge: true },
                );
            }
            await batch.commit();
        }

        return NextResponse.json({ success: true, processed });
    } catch (error) {
        if (error instanceof AuthError || error instanceof RateLimitError) {
            return handleApiError(error, "Analytics.IngestIdentified.POST");
        }

        const errorMessage = getAnalyticsIngestErrorMessage(error);
        if (errorMessage === "Missing or invalid token" || errorMessage === "Invalid or expired token") {
            return NextResponse.json({ error: errorMessage }, { status: 401 });
        }

        await recordServerDiagnostic({
            channel: "analytics",
            severity: "error",
            message: "Identified analytics ingestion failed",
            detail: {
                route: "analytics/ingest-identified",
                error: errorMessage,
            },
        });
        return NextResponse.json({ success: false, retryable: true }, { status: 503 });
    }
}

export let POST = withRouteRuntimeHealth("analytics/ingest-identified:POST", POST_handler);
