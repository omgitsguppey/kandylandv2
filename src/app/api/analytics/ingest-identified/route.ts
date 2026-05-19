import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { z } from "zod";
import { handleApiError, AuthError } from "@/lib/server/auth";
import { ANALYTICS_WRITE, RateLimitError } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordDebugEvidence } from "@/lib/server/debug-evidence-store";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS, ANALYTICS_ROUTE_POLICIES } from "@/lib/server/analytics-governance";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildIdentifiedActiveUserPatch } from "@/lib/behavioral/identified-metric-parity";
import { isSearchIntentEventName, sanitizeSearchIntentParams } from "@/lib/behavioral/search-intent-profile";
import { normalizeIdentifiedRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";
import { createRuntimeFactFirestoreDocument } from "@/lib/server/write-runtime-fact";
import { mapRuntimeFactToBehavioralTimelineFact } from "@/lib/server/behavioral-timeline-mapper";
import { writeBehavioralTimelineFacts } from "@/lib/server/behavioral-timeline-writer";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";
import { materializeUserTrackingIndexes } from "@/lib/server/user-index-materializer";
import { resolveIdentityTransferTelemetryState } from "@/lib/analytics/identity-transfer";
import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";

export const dynamic = "force-dynamic";

const MAX_ANALYTICS_BODY_BYTES = 128 * 1024; // 128KB max payload
const CROSS_ORIGIN_FRAME_PATTERNS = [
    /blocked a frame with origin/i,
    /cross-origin frame/i,
    /failed to read a named property/i,
    /permission denied to access property/i,
    /protocols?, domains?, and ports must match/i,
];

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

function normalizeIdentityLinkMethod(value: string): "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown" {
    if (value === "login" || value === "signup" || value === "session_restore" || value === "admin_link" || value === "import") {
        return value;
    }

    return "unknown";
}

function stableHash(input: string) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function classifyBrowserSecurityBoundaryFromAdminUiError(params: Record<string, unknown>) {
    const message = String(params.message || "").trim();
    const stack = typeof params.stack === "string" ? params.stack : "";
    const filename = typeof params.filename === "string" ? params.filename : "";
    const route = typeof params.route === "string" && params.route.trim().length > 0 ? params.route.trim() : "/admin";
    const signature = `${message} ${stack} ${filename}`.trim();
    const matched = CROSS_ORIGIN_FRAME_PATTERNS.some((pattern) => pattern.test(signature));
    if (!matched) {
        return null;
    }

    const browserFrameOwner = /paypal|postrobot|xcomponent|zoid/i.test(signature)
        ? (/paypal/i.test(signature) ? "paypal" : "paypal_sdk")
        : undefined;
    const nonActionableThirdParty = Boolean(browserFrameOwner);
    const stackFingerprint = `stack_${stableHash(stack.slice(0, 600) || message.toLowerCase())}`;
    const fingerprint = `browser_boundary_${stableHash([route, message.toLowerCase(), stackFingerprint].join("|"))}`;

    return {
        route,
        fingerprint,
        stackFingerprint,
        browserFrameOwner,
        nonActionableThirdParty,
        actionable: !nonActionableThirdParty,
        humanMessage: nonActionableThirdParty
            ? "Browser blocked cross-origin frame access. This is expected when third-party iframes are protected. App code should not inspect cross-origin frames."
            : "Browser blocked cross-origin frame access. Review app frame logic and avoid reading cross-origin frame internals.",
    };
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
    const browserSecurityBoundary = classifyBrowserSecurityBoundaryFromAdminUiError(params);

    if (browserSecurityBoundary) {
        await recordDebugEvidence({
            source: "client",
            severity: params.userFlowFailed === true && browserSecurityBoundary.actionable ? "error" : "warn",
            category: "browser_security_boundary",
            route: browserSecurityBoundary.route,
            component: typeof params.component === "string" ? params.component : "AdminErrorCatcher",
            userId,
            message: errorMsg.slice(0, 240),
            humanMessage: browserSecurityBoundary.humanMessage,
            fingerprint: typeof params.fingerprint === "string" && params.fingerprint.trim().length > 0
                ? params.fingerprint.trim()
                : browserSecurityBoundary.fingerprint,
            technicalDetail: {
                filename: params.filename,
                lineno: params.lineno,
                colno: params.colno,
                stack: stackTrace,
                route: browserSecurityBoundary.route,
                sourceSurface: "admin",
                category: "browser_security_boundary",
                browserSecurityBlocked: true,
                actionable: browserSecurityBoundary.actionable,
                nonActionableThirdParty: browserSecurityBoundary.nonActionableThirdParty,
                stackFingerprint: browserSecurityBoundary.stackFingerprint,
                ...(browserSecurityBoundary.browserFrameOwner ? { browserFrameOwner: browserSecurityBoundary.browserFrameOwner } : {}),
            },
        });
        return;
    }

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
            allowedMethods: ["POST"],
            maxBodyBytes: MAX_ANALYTICS_BODY_BYTES,
            requiredContentTypePrefix: "application/json",
            requireAuthHeaderPresence: true,
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
        const timelineFacts: BehavioralTimelineFact[] = [];
        let identityLinksCreated = 0;

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
            const ref = adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.runtimeFacts).doc(eventId);

            const timestamp = rawEvent.eventTimestampMs || Date.now();
            const enrichedParamsBase = {
                ...params,
                ...telemetryEvent.metadataParams,
                tracking_origin: "identified_api_ingest",
            };
            const enrichedParams = isSearchIntentEventName(canonicalEventName)
                ? sanitizeSearchIntentParams(enrichedParamsBase, canonicalEventName)
                : enrichedParamsBase;
            const runtimeFactResult = normalizeIdentifiedRuntimeFact({
                eventId,
                rawEventName: rawEvent.eventName,
                params: enrichedParams,
                timestampMs: timestamp,
                callerUid: caller.uid,
            });
            if (!runtimeFactResult.fact) {
                skippedUnsupported += 1;
                skippedUnsupportedEventNames.add(rawEvent.eventName);
                await recordLegacyClientDiagnostic(caller.uid, rawEvent.eventName, params);
                continue;
            }

            const finalEvent = createRuntimeFactFirestoreDocument({
                runtimeFact: runtimeFactResult.fact,
                params: enrichedParams,
                telemetryEventCategory: telemetryEvent.option?.category || "system",
                telemetryEventModules: telemetryEvent.option?.modules || [],
                telemetryTrackingSources: telemetryEvent.option?.sources || [],
                trackingOrigin: "identified_api_ingest",
            });
            const identityLinkId = readStringParam(enrichedParams, "identity_link_id", "identityLinkId");
            const anonymousVisitorId = readStringParam(enrichedParams, "anonymous_visitor_id", "anonymousVisitorId");
            const sessionId = readStringParam(enrichedParams, "session_id", "sessionId");
            const identityState = resolveIdentityTransferTelemetryState({
                userId: caller.uid,
                anonymousVisitorId,
                sessionId,
                identityLinkId,
            });
            const eventFactDocument = {
                ...finalEvent,
                identityLinkId: identityLinkId || null,
                identityState,
                sourceIdentity: {
                    anonymousVisitorId: anonymousVisitorId || null,
                    sessionId: sessionId || null,
                    userId: caller.uid,
                    identityLinkId: identityLinkId || null,
                    identityState,
                },
            };

            // Using batch.set with merge: false to mimic create, but safer. Deduplication is handled by background worker if duplicate
            batch.set(ref, eventFactDocument, { merge: false });
            processed++;
            const consentState = readStringParam(enrichedParams, "consent_state", "consentState") === "granted"
                ? "granted"
                : readStringParam(enrichedParams, "consent_state", "consentState") === "denied"
                    ? "denied"
                    : "unknown";
            timelineFacts.push(mapRuntimeFactToBehavioralTimelineFact({
                runtimeFact: runtimeFactResult.fact,
                consentState,
            }));

            if (canonicalEventName === "identity_linked") {
                const anonymousVisitorId = readStringParam(enrichedParams, "anonymous_visitor_id", "anonymousVisitorId");
                const sessionId = readStringParam(enrichedParams, "session_id", "sessionId");
                const userId = readStringParam(enrichedParams, "user_id", "userId") || caller.uid;
                if (anonymousVisitorId && sessionId && userId) {
                    const linkResult = await upsertAnalyticsIdentityLink({
                        anonymousVisitorId,
                        sessionId,
                        userId,
                        linkedAt: readStringParam(enrichedParams, "linked_at", "linkedAt") || new Date(timestamp).toISOString(),
                        method: normalizeIdentityLinkMethod(readStringParam(enrichedParams, "method")),
                        eligiblePastSessionIds: Array.isArray(enrichedParams.eligible_past_session_ids)
                            ? (enrichedParams.eligible_past_session_ids as unknown[]).filter((value): value is string => typeof value === "string")
                            : [sessionId],
                        consentState,
                        mergeAllowed: consentState === "granted",
                        confidence: 0.9,
                    });
                    if (linkResult.created) {
                        identityLinksCreated += 1;
                    }
                }
            }

            if (runtimeFactResult.fact.includeInUserBehavior && (!latestActiveUserPatch || timestamp >= Number(latestActiveUserPatch.lastSeenAt || 0))) {
                latestActiveUserPatch = buildIdentifiedActiveUserPatch({
                    uid: caller.uid,
                    timestampMs: timestamp,
                    eventName: canonicalEventName,
                    pagePath: runtimeFactResult.fact.route,
                    username: readStringParam(enrichedParams, "username", "user_name", "display_name", "displayName"),
                    semanticScopeLabel: readStringParam(enrichedParams, "semantic_scope_label", "semanticScopeLabel"),
                    componentName: readStringParam(enrichedParams, "component_name", "componentName"),
                    eventModules: readEventModules(enrichedParams),
                    source: "identified_client_ingest",
                    parityFact: {
                        normalizedAction: runtimeFactResult.fact.normalizedAction,
                        metricFamily: runtimeFactResult.fact.metricFamily as any,
                        actorUserId: runtimeFactResult.fact.actor.actorUserId,
                        actorAdminId: runtimeFactResult.fact.actor.actorAdminId,
                        actorCreatorId: runtimeFactResult.fact.actor.actorCreatorId,
                        targetUserId: runtimeFactResult.fact.target.targetUserId,
                        targetCreatorId: runtimeFactResult.fact.target.targetCreatorId,
                        targetDropId: runtimeFactResult.fact.target.targetDropId,
                        targetFileId: runtimeFactResult.fact.target.targetFileId,
                        targetThreadId: runtimeFactResult.fact.target.targetThreadId,
                        transactionId: runtimeFactResult.fact.target.transactionId,
                        sourceTruth: runtimeFactResult.fact.sourceTruth,
                        sourceConfidence: runtimeFactResult.fact.confidence,
                        metricEligible: runtimeFactResult.fact.metricEligible,
                        metricExclusionReason: finalEvent.metricExclusionReason,
                        reasonCode: finalEvent.metricExclusionReason,
                        behavioralFact: null,
                    } as any,
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

        const timelineWrite = await writeBehavioralTimelineFacts(timelineFacts);
        await materializeUserTrackingIndexes({
            userIds: [caller.uid],
            maxUsers: 1,
            maxFacts: 1000,
            runtimeCapMs: 1500,
            sourceWindowStartMs: Date.now() - (1000 * 60 * 60 * 24 * 14),
        });

        return NextResponse.json({
            success: true,
            processed,
            skippedUnsupported,
            timelineFactsWritten: timelineWrite.written,
            timelineFactsSkipped: timelineWrite.skipped,
            identityLinksCreated,
        });
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
