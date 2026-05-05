import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { z } from "zod";
import { handleApiError, AuthError } from "@/lib/server/auth";
import { ANALYTICS_WRITE, RateLimitError } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS, ANALYTICS_ROUTE_POLICIES } from "@/lib/server/analytics-governance";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { explainEventInclusion } from "@/lib/analytics/analytics-event-contract";
import { BEHAVIORAL_EVENT_FACT_VERSION } from "@/lib/behavioral/event-fact-contract";
import { buildIdentifiedActiveUserPatch } from "@/lib/behavioral/identified-metric-parity";
import { normalizeIdentifiedMetricEventFact } from "@/lib/behavioral/event-fact-normalizer";

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

function resolveIdentifiedSourceTruth(
    canonicalEventName: string,
    params: Record<string, unknown>,
) {
    const explicitSourceTruth = readStringParam(params, "source_truth", "sourceTruth");

    if (
        explicitSourceTruth === "client"
        || explicitSourceTruth === "client_funnel"
        || explicitSourceTruth === "client_supporting"
    ) {
        return "client" as const;
    }

    if (explicitSourceTruth === "local_projection") {
        return "local_projection" as const;
    }

    if (explicitSourceTruth === "legacy") {
        return "legacy" as const;
    }

    if (explicitSourceTruth === "materialized") {
        return "materialized" as const;
    }

    if (explicitSourceTruth === "server") {
        return "server" as const;
    }

    if (explicitSourceTruth === "canonical") {
        return "canonical" as const;
    }

    if (
        canonicalEventName === "identity_linked"
        || canonicalEventName === "purchase_verified"
        || canonicalEventName === "daily_checkin_claimed"
        || canonicalEventName === "task_completed"
    ) {
        return "canonical" as const;
    }

    if (canonicalEventName === "drop_unwrapped" || canonicalEventName === "entitlement_granted") {
        return "server" as const;
    }

    if (canonicalEventName === "unlock_drop_success") {
        return "client" as const;
    }

    if (
        canonicalEventName === "drop_not_interested"
        || canonicalEventName === "creator_not_interested"
        || canonicalEventName === "category_not_interested"
        || canonicalEventName === "creator_muted"
        || canonicalEventName === "recommendation_dismissed"
    ) {
        return "client" as const;
    }

    if (canonicalEventName === "gumdrops_purchase_completed" || canonicalEventName === "purchase") {
        return "client" as const;
    }

    if (
        canonicalEventName.startsWith("watch_session_")
        || canonicalEventName === "viewer_session_completed"
        || canonicalEventName === "watch_score_computed"
    ) {
        return "canonical" as const;
    }

    return "server" as const;
}

async function recordLegacyClientDiagnostic(
    userId: string,
    eventName: string,
    params: Record<string, unknown>,
) {
    if (eventName !== "admin_ui_error") {
        return;
    }

    const errorMsg = String(params.message || "Unknown client error");
    const stackTrace = typeof params.stack === "string" ? params.stack : "";

    await recordServerDiagnostic({
        channel: "ai",
        severity: "error",
        message: `Admin UI Error: ${errorMsg.slice(0, 100)}`,
        detail: {
            userId,
            filename: params.filename,
            lineno: params.lineno,
            colno: params.colno,
            preview: stackTrace || errorMsg,
            telemetryCleanup: "skipped_uncataloged_diagnostic_event",
        },
    });
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            ...ANALYTICS_ROUTE_POLICIES.identifiedIngest,
            preAuthRateLimit: ANALYTICS_WRITE,
            rateLimit: ANALYTICS_WRITE,
            requireTrustedOrigin: true,
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
        let skippedUnsupported = 0;
        const skippedUnsupportedEventNames = new Set<string>();
        let latestActiveUserPatch: Record<string, unknown> | null = null;

        for (const rawEvent of deduplicatedEvents) {
            const telemetryEvent = resolveTrackedTelemetryEvent(rawEvent.eventName);
            const params = rawEvent.eventParams && typeof rawEvent.eventParams === "object" ? rawEvent.eventParams : {};

            if (!telemetryEvent.isKnownEvent) {
                skippedUnsupported += 1;
                skippedUnsupportedEventNames.add(rawEvent.eventName);
                await recordLegacyClientDiagnostic(caller.uid, rawEvent.eventName, params);
                continue;
            }

            const canonicalEventName = telemetryEvent.canonicalEventName;
            const eventId = rawEvent.eventId || buildFallbackEventId(caller.uid, canonicalEventName);
            const ref = adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts).doc(eventId);

            const timestamp = rawEvent.eventTimestampMs || Date.now();
            const enrichedParams = {
                ...params,
                ...telemetryEvent.metadataParams,
                tracking_origin: "identified_api_ingest",
            };
            const sourceSurface = String(params.page_path || params.pagePath || "client");
            const pagePath = String(enrichedParams.page_path || enrichedParams.pagePath || "");
            const performedAs = readStringParam(enrichedParams, "performed_as", "performedAs");
            const projectionMode = readStringParam(enrichedParams, "projection_mode", "projectionMode", "view_as_mode", "viewAsMode");
            const sourceTruth = resolveIdentifiedSourceTruth(canonicalEventName, enrichedParams);
            const explicitActorAdminId = readStringParam(
                enrichedParams,
                "actor_admin_id",
                "actorAdminId",
                "admin_id",
                "adminId",
                "actor_uid",
                "actorUid",
            );
            const adminRouteOrEvent = telemetryEvent.option?.category === "admin"
                || canonicalEventName.startsWith("admin_")
                || performedAs === "admin_view_as_creator"
                || projectionMode.includes("projection")
                || sourceTruth === "local_projection"
                || pagePath === "/admin"
                || pagePath.startsWith("/admin/");
            const inclusion = explainEventInclusion({
                eventName: canonicalEventName,
                userId: caller.uid,
                actorAdminId: explicitActorAdminId,
                adminId: adminRouteOrEvent ? (explicitActorAdminId || caller.uid) : readStringParam(enrichedParams, "admin_id", "adminId"),
                actorType: readStringParam(enrichedParams, "actor_type", "actorType") || (adminRouteOrEvent ? "admin" : "user"),
                route: pagePath,
                surface: sourceSurface,
                source: "identified_ingest",
                performedAs,
                projectionMode,
                sourceTruth,
            });
            const actorClassification = inclusion.actorClassification;
            const adminId = actorClassification.isAdmin ? (explicitActorAdminId || caller.uid) : "";
            const parityFact = normalizeIdentifiedMetricEventFact({
                eventId,
                eventName: canonicalEventName,
                params: enrichedParams,
                timestamp,
                callerUid: caller.uid,
                pagePath,
                includeInUserBehavior: inclusion.includeInUserBehavior,
                actorType: actorClassification.actorType,
                actorLane: actorClassification.actorLane,
                sourceTruth,
            });
            const normalizedEventFact = parityFact.behavioralFact;
            
            const finalEvent = {
                eventId,
                eventName: canonicalEventName,
                timestamp,
                clientTimestamp: timestamp,
                serverTimestamp: Date.now(),
                userId: caller.uid,
                analyticsUserId: inclusion.includeInUserBehavior ? caller.uid : "",
                adminId,
                actorType: actorClassification.actorType,
                actorLane: actorClassification.actorLane,
                performedAs,
                projectionMode,
                includeInUserBehavior: inclusion.includeInUserBehavior,
                includeInAdminAnalytics: inclusion.includeInAdminAnalytics,
                analyticsExclusionReason: inclusion.exclusionReason ?? "",
                username: "",
                consentMode: "identified",
                sourceLayer: "observed",
                sourceSurface,
                idempotencyKey: eventId,
                sessionId: String(enrichedParams.session_id || enrichedParams.sessionId || ""),
                pagePath,
                dayKey: String(enrichedParams.day_key || enrichedParams.dayKey || ""),
                hourKey: String(enrichedParams.hour_key || enrichedParams.hourKey || ""),
                minuteKey: String(enrichedParams.minute_key || enrichedParams.minuteKey || ""),
                dropId: String(enrichedParams.drop_id || enrichedParams.dropId || ""),
                dropTitle: String(enrichedParams.drop_title || enrichedParams.dropTitle || ""),
                dropCategory: String(enrichedParams.drop_category || enrichedParams.dropCategory || ""),
                assetKey: String(enrichedParams.asset_key || enrichedParams.assetKey || ""),
                assetIndex: Number(enrichedParams.asset_index || enrichedParams.assetIndex || 0),
                contentKind: String(enrichedParams.content_kind || enrichedParams.contentKind || ""),
                destination: String(enrichedParams.destination || ""),
                destinationType: String(enrichedParams.destination_type || enrichedParams.destinationType || ""),
                sessionWatchSeconds: Number(enrichedParams.session_watch_seconds || enrichedParams.sessionWatchSeconds || 0),
                watchSeconds: Number(enrichedParams.watch_seconds || enrichedParams.watchSeconds || 0),
                durationMs: Number(enrichedParams.duration_ms || enrichedParams.durationMs || 0),
                loadMs: Number(enrichedParams.load_ms || enrichedParams.loadMs || 0),
                viewportWidth: Number(enrichedParams.viewport_width || enrichedParams.viewportWidth || 0),
                viewportHeight: Number(enrichedParams.viewport_height || enrichedParams.viewportHeight || 0),
                isMobileViewport: Boolean(enrichedParams.is_mobile_viewport || enrichedParams.isMobileViewport || false),
                authState: "authenticated",
                eventCategory: telemetryEvent.option?.category || "system",
                eventModules: telemetryEvent.option?.modules || [],
                trackingSources: telemetryEvent.option?.sources || [],
                eventIndexVersion: String(enrichedParams.event_index_version || ""),
                trackingOrigin: "identified_api_ingest",
                guestUserAdminSeparation: {
                    guestOrAnonymous: actorClassification.isGuestLike,
                    authenticatedUser: actorClassification.isAuthenticatedUser,
                    creator: actorClassification.isCreator,
                    admin: actorClassification.isAdmin,
                    system: actorClassification.isSystem,
                    unknown: actorClassification.isUnknown,
                },
                params: enrichedParams,
                behavioralEventFactVersion: normalizedEventFact ? BEHAVIORAL_EVENT_FACT_VERSION : "",
                normalizedActionName: normalizedEventFact?.normalizedAction ?? "",
                normalizedActionId: normalizedEventFact?.dedupeKey ?? "",
                normalizedActionConfidence: normalizedEventFact?.confidence ?? 0,
                normalizedActionSourceTruth: normalizedEventFact?.sourceTruth ?? "",
                normalizedActionReasonCode: normalizedEventFact?.reasonCode ?? "",
                metricFamily: parityFact.metricFamily,
                actorUserId: parityFact.actorUserId,
                actorAdminId: parityFact.actorAdminId,
                actorCreatorId: parityFact.actorCreatorId,
                targetUserId: parityFact.targetUserId,
                targetCreatorId: parityFact.targetCreatorId,
                targetDropId: parityFact.targetDropId,
                targetFileId: parityFact.targetFileId,
                targetThreadId: parityFact.targetThreadId,
                transactionId: parityFact.transactionId,
                sourceTruth: parityFact.sourceTruth,
                sourceConfidence: parityFact.sourceConfidence,
                metricEligible: parityFact.metricEligible,
                metricExclusionReason: parityFact.metricExclusionReason,
                actionEntityId: normalizedEventFact?.entityId ?? "",
                actionEntityType: normalizedEventFact?.entityType ?? "",
                actionSourceComponent: normalizedEventFact?.sourceComponent ?? "",
                actionRoute: normalizedEventFact?.route ?? "",
                actionDropId: normalizedEventFact?.dropId ?? "",
                actionFileId: normalizedEventFact?.fileId ?? "",
                actionCreatorId: normalizedEventFact?.creatorId ?? "",
                actionTransactionId: normalizedEventFact?.transactionId ?? "",
                actionThreadId: normalizedEventFact?.threadId ?? "",
                actionNotificationId: normalizedEventFact?.notificationId ?? "",
                actionTaskId: normalizedEventFact?.taskId ?? "",
            };

            // Using batch.set with merge: false to mimic create, but safer. Deduplication is handled by background worker if duplicate
            batch.set(ref, finalEvent, { merge: false });
            processed++;

            if (inclusion.includeInUserBehavior && (!latestActiveUserPatch || timestamp >= Number(latestActiveUserPatch.lastSeenAt || 0))) {
                latestActiveUserPatch = buildIdentifiedActiveUserPatch({
                    uid: caller.uid,
                    timestampMs: timestamp,
                    eventName: canonicalEventName,
                    pagePath: finalEvent.pagePath,
                    username: readStringParam(enrichedParams, "username", "user_name", "display_name", "displayName"),
                    semanticScopeLabel: readStringParam(enrichedParams, "semantic_scope_label", "semanticScopeLabel"),
                    componentName: readStringParam(enrichedParams, "component_name", "componentName"),
                    eventModules: readEventModules(enrichedParams),
                    source: "identified_client_ingest",
                    parityFact,
                });
            }
        }

        if (skippedUnsupported > 0) {
            recordRouteWarning(
                "Analytics.IngestIdentified",
                "Unsupported identified telemetry events skipped before analytics fact write",
                undefined,
                {
                    channel: "analytics",
                    detail: {
                        skippedUnsupported,
                        eventNames: Array.from(skippedUnsupportedEventNames).slice(0, 12),
                    },
                },
            );
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

        return NextResponse.json({ success: true, processed, skippedUnsupported });
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
