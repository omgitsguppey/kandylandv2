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
import { writeBehavioralTimelineProjection } from "@/lib/server/behavioral-timeline-writer";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";
import { resolveIdentityTransferTelemetryState } from "@/lib/analytics/identity-transfer";
import { BEHAVIORAL_EVENT_FACT_VERSION, type BehavioralEventSource } from "@/lib/behavioral/event-fact-contract";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import { buildEventIdentityEnvelope } from "@/lib/analytics/identity-handoff-engine";
import {
    buildEventEnvelope,
    validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import type { IdentifiedMetricParityFact } from "@/lib/behavioral/event-fact-normalizer";
import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";
import type { RuntimeFact } from "@/lib/runtime-facts/runtime-fact-contract";

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

function readStoredIdentifiedTimelineFact(input: {
    value: unknown;
    eventId: string;
    callerUid: string;
}): BehavioralTimelineFact | null {
    if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) return null;
    const record = input.value as Record<string, unknown>;
    const sourceIdentity = record.sourceIdentity;
    if (!sourceIdentity || typeof sourceIdentity !== "object" || Array.isArray(sourceIdentity)) return null;
    if ((sourceIdentity as Record<string, unknown>).userId !== input.callerUid) return null;

    const value = record.behavioralTimelineProjectionFact;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const fact = value as Partial<BehavioralTimelineFact>;
    const validTarget = Boolean(fact.target && typeof fact.target === "object" && !Array.isArray(fact.target));
    const confidenceInputs = fact.confidenceInputs;
    const validConfidenceInputs = Boolean(
        confidenceInputs
        && typeof confidenceInputs.schemaComplete === "boolean"
        && typeof confidenceInputs.hasActor === "boolean"
        && typeof confidenceInputs.hasTargetWhenRequired === "boolean"
        && typeof confidenceInputs.hasSession === "boolean"
        && typeof confidenceInputs.hasServerTruth === "boolean",
    );
    const actorMatches = !fact.actorUserId || fact.actorUserId === input.callerUid;
    if (
        fact.factId !== input.eventId
        || fact.idempotencyKey !== input.eventId
        || !actorMatches
        || typeof fact.actorType !== "string"
        || typeof fact.normalizedAction !== "string"
        || typeof fact.eventName !== "string"
        || typeof fact.timestampMs !== "number"
        || !Number.isFinite(fact.timestampMs)
        || typeof fact.route !== "string"
        || typeof fact.sourceComponent !== "string"
        || typeof fact.surface !== "string"
        || typeof fact.sourceTruth !== "string"
        || typeof fact.sourceReliability !== "number"
        || !Number.isFinite(fact.sourceReliability)
        || typeof fact.consentState !== "string"
        || typeof fact.metricEligible !== "boolean"
        || !validTarget
        || !validConfidenceInputs
    ) return null;
    return fact as BehavioralTimelineFact;
}

function resolveBehavioralEventSource(sourceTruth: RuntimeFact["sourceTruth"]): BehavioralEventSource {
    if (sourceTruth === "materialized") return "materialized";
    if (sourceTruth === "legacy") return "legacy";
    if (sourceTruth === "client" || sourceTruth === "local_projection") return "client";
    return "server";
}

function buildIdentifiedIngestClientErrorResponse(input: {
    status: 400 | 413;
    errorCode: "invalid_analytics_payload" | "payload_too_large";
    reason: string;
}) {
    return NextResponse.json({
        success: false,
        ignored: true,
        errorCode: input.errorCode,
        reason: input.reason,
        retryable: false,
        routeStatus: "active_supported_route",
        compatibilityMode: "identified_ingest_current",
    }, { status: input.status });
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

        // The telemetry client might send { events: [...] } or { data: { events: [...] } } depending on sendBeacon vs fetch
        let rawPayload: unknown;
        try {
            rawPayload = await readBoundedJsonBody<unknown>(request, {
                routeName: "analytics/ingest-identified",
                maxBytes: MAX_ANALYTICS_BODY_BYTES,
                allowedContentTypes: ["application/json"],
            });
        } catch (error) {
            if (isBoundedJsonBodyError(error)) {
                return buildIdentifiedIngestClientErrorResponse({
                    status: error.status,
                    errorCode: error.code === "payload_too_large" ? "payload_too_large" : "invalid_analytics_payload",
                    reason: error.code,
                });
            }
            throw error;
        }
        if (rawPayload && typeof rawPayload === "object" && "data" in rawPayload) {
            const dataPayload = (rawPayload as { data?: unknown }).data;
            if (dataPayload && typeof dataPayload === "object" && "events" in dataPayload) {
                rawPayload = dataPayload;
            }
        }

        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            recordRouteWarning(
                "Analytics.IngestIdentified",
                "Telemetry ingestion validation failed or empty payload",
                !parsed.success ? parsed.error : "empty events array",
                { channel: "analytics" },
            );
            return buildIdentifiedIngestClientErrorResponse({
                status: 400,
                errorCode: "invalid_analytics_payload",
                reason: parsed.success ? "empty_events" : "schema_validation_failed",
            });
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
        let dedupedExisting = 0;
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
            // cost-bound: single Firestore document read for idempotency, not a collection scan.
            const existingFact = await ref.get();
            if (existingFact.exists) {
                dedupedExisting += 1;
                const recoveredTimelineFact = readStoredIdentifiedTimelineFact({
                    value: existingFact.data(),
                    eventId,
                    callerUid: caller.uid,
                });
                if (recoveredTimelineFact) timelineFacts.push(recoveredTimelineFact);
                continue;
            }

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

            const ingestRuntimeFact = runtimeFactResult.fact;
            // Metric truth is owned by normalizeIdentifiedRuntimeFact -> normalizeIdentifiedMetricEventFact;
            // this route only persists the canonical behavioral fact snapshot/version for downstream readers.
            const behavioralEventFactResult = normalizeBehavioralEventFactWithDiagnostics({
                eventId,
                eventName: rawEvent.eventName,
                params: enrichedParams,
                timestamp,
                userId: ingestRuntimeFact.actor.actorUserId || caller.uid,
                sessionId: ingestRuntimeFact.actor.sessionId,
                anonymousVisitorId: ingestRuntimeFact.actor.anonymousVisitorId,
                pagePath: ingestRuntimeFact.route,
                route: ingestRuntimeFact.route,
                dropId: ingestRuntimeFact.target.targetDropId,
                creatorId: ingestRuntimeFact.target.targetCreatorId || ingestRuntimeFact.actor.actorCreatorId,
                assetKey: ingestRuntimeFact.target.targetFileId,
                source: resolveBehavioralEventSource(ingestRuntimeFact.sourceTruth),
                confidence: ingestRuntimeFact.confidence,
            });
            const parityFact: IdentifiedMetricParityFact = {
                normalizedAction: ingestRuntimeFact.normalizedAction as IdentifiedMetricParityFact["normalizedAction"],
                metricFamily: ingestRuntimeFact.metricFamily as IdentifiedMetricParityFact["metricFamily"],
                actorUserId: ingestRuntimeFact.actor.actorUserId,
                actorAdminId: ingestRuntimeFact.actor.actorAdminId,
                actorCreatorId: ingestRuntimeFact.actor.actorCreatorId,
                targetUserId: ingestRuntimeFact.target.targetUserId,
                targetCreatorId: ingestRuntimeFact.target.targetCreatorId,
                targetDropId: ingestRuntimeFact.target.targetDropId,
                targetFileId: ingestRuntimeFact.target.targetFileId,
                targetThreadId: ingestRuntimeFact.target.targetThreadId,
                transactionId: ingestRuntimeFact.target.transactionId,
                sourceTruth: ingestRuntimeFact.sourceTruth as IdentifiedMetricParityFact["sourceTruth"],
                sourceConfidence: ingestRuntimeFact.confidence,
                metricEligible: ingestRuntimeFact.metricEligible,
                metricExclusionReason: ingestRuntimeFact.metricExclusionReason as IdentifiedMetricParityFact["metricExclusionReason"],
                reasonCode: ingestRuntimeFact.metricExclusionReason,
                behavioralFact: null,
            };
            const finalEvent = createRuntimeFactFirestoreDocument({
                runtimeFact: ingestRuntimeFact,
                params: enrichedParams,
                telemetryEventCategory: telemetryEvent.option?.category || "system",
                telemetryEventModules: telemetryEvent.option?.modules || [],
                telemetryTrackingSources: telemetryEvent.option?.sources || [],
                trackingOrigin: "identified_api_ingest",
            });
            const identityLinkId = readStringParam(enrichedParams, "identity_link_id", "identityLinkId");
            const anonymousVisitorId = readStringParam(enrichedParams, "anonymous_visitor_id", "anonymousVisitorId");
            const sessionId = readStringParam(enrichedParams, "session_id", "sessionId");
            const canonicalIdentityEnvelope = buildEventIdentityEnvelope({
                eventName: canonicalEventName,
                actorKind: readStringParam(enrichedParams, "actor_kind", "actorKind") || undefined,
                identityState: readStringParam(enrichedParams, "identity_state", "identityState") || undefined,
                guestId: anonymousVisitorId,
                userId: caller.uid,
                sessionId,
                linkId: identityLinkId,
                consentMode: readStringParam(enrichedParams, "consent_mode", "consentMode") || undefined,
                projectionMode: readStringParam(enrichedParams, "projection_mode", "projectionMode") || undefined,
                performedAs: readStringParam(enrichedParams, "performed_as", "performedAs") || undefined,
            });
            const eventEnvelope = buildEventEnvelope({
                eventId,
                eventName: canonicalEventName,
                timestamp,
                actorKind: canonicalIdentityEnvelope.actorKind,
                identityState: canonicalIdentityEnvelope.identityState,
                guestId: anonymousVisitorId,
                userId: caller.uid,
                sessionId,
                linkId: identityLinkId,
                consentMode: canonicalIdentityEnvelope.consentMode,
                projectionMode: readStringParam(enrichedParams, "projection_mode", "projectionMode") || undefined,
                performedAs: readStringParam(enrichedParams, "performed_as", "performedAs") || undefined,
                source: "identified_api_ingest",
                metadata: enrichedParams,
            });
            const eventEnvelopeValidation = validateEventEnvelope(eventEnvelope);
            if (eventEnvelope.pipelineStatus !== "normal" || !eventEnvelopeValidation.ok) {
                skippedUnsupported += 1;
                skippedUnsupportedEventNames.add(rawEvent.eventName);
                continue;
            }
            const identityState = resolveIdentityTransferTelemetryState({
                userId: caller.uid,
                anonymousVisitorId,
                sessionId,
                identityLinkId,
            });
            const consentState = readStringParam(enrichedParams, "consent_state", "consentState") === "granted"
                ? "granted"
                : readStringParam(enrichedParams, "consent_state", "consentState") === "denied"
                    ? "denied"
                    : "unknown";
            const behavioralTimelineProjectionFact = mapRuntimeFactToBehavioralTimelineFact({
                runtimeFact: ingestRuntimeFact,
                consentState,
            });
            const eventFactDocument = {
                ...finalEvent,
                identityLinkId: identityLinkId || null,
                identityState,
                identityEnvelope: canonicalIdentityEnvelope,
                actorKind: canonicalIdentityEnvelope.actorKind,
                identityConfidence: canonicalIdentityEnvelope.identityConfidence,
                canonicalIdentityState: canonicalIdentityEnvelope.identityState,
                consentMode: canonicalIdentityEnvelope.consentMode,
                eventEnvelope,
                eventEnvelopeDedupeKey: `${eventEnvelope.eventName}|${eventEnvelope.sessionId}|${eventEnvelope.eventId}`,
                normalizedAction: parityFact.normalizedAction,
                normalizedActionName: parityFact.normalizedAction,
                behavioralEventFactVersion: behavioralEventFactResult.fact ? BEHAVIORAL_EVENT_FACT_VERSION : "",
                behavioralFact: behavioralEventFactResult.fact,
                behavioralFactDiagnostic: behavioralEventFactResult.diagnostic,
                behavioralTimelineProjectionFact,
                metricFamily: parityFact.metricFamily,
                sourceTruth: parityFact.sourceTruth,
                sourceConfidence: parityFact.sourceConfidence,
                metricEligible: parityFact.metricEligible,
                metricExclusionReason: parityFact.metricExclusionReason,
                analyticsExclusionReason: parityFact.metricExclusionReason,
                targetUserId: parityFact.targetUserId,
                sourceIdentity: {
                    anonymousVisitorId: anonymousVisitorId || null,
                    sessionId: sessionId || null,
                    userId: caller.uid,
                    identityLinkId: identityLinkId || null,
                    identityState,
                    canonicalIdentityState: canonicalIdentityEnvelope.identityState,
                    actorKind: canonicalIdentityEnvelope.actorKind,
                    identityConfidence: canonicalIdentityEnvelope.identityConfidence,
                    consentMode: canonicalIdentityEnvelope.consentMode,
                },
            };

            // Existing event ids are skipped before enqueueing writes; create prevents retry/race overwrites.
            batch.create(ref, eventFactDocument);
            processed++;
            timelineFacts.push(behavioralTimelineProjectionFact);

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

            if (ingestRuntimeFact.includeInUserBehavior && (!latestActiveUserPatch || timestamp >= Number(latestActiveUserPatch.lastSeenAt || 0))) {
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

        let projection: Awaited<ReturnType<typeof writeBehavioralTimelineProjection>>;
        try {
            projection = await writeBehavioralTimelineProjection({
                facts: timelineFacts,
                userIds: timelineFacts.length > 0 ? [caller.uid] : [],
                requestedAtMs: Date.now(),
                sourceWindowStartMs: Date.now() - (1000 * 60 * 60 * 24 * 14),
                maxFacts: 500,
            });
        } catch (error) {
            await recordServerDiagnostic({
                channel: "analytics",
                severity: "warn",
                message: "Identified analytics timeline/outbox projection failed",
                detail: {
                    route: "analytics/ingest-identified",
                    error: getAnalyticsIngestErrorMessage(error),
                    retryable: true,
                    compatibilityMode: "identified_ingest_current",
                },
            });
            return NextResponse.json({ success: false, retryable: true }, { status: 503 });
        }

        const materializerReceipt = {
            status: projection.materializer.status,
            requestsBuilt: projection.materializer.requestsBuilt,
            requestsEnqueued: projection.materializer.requestsEnqueued,
            requestsCoalesced: projection.materializer.requestsCoalesced,
            issueCodes: projection.materializer.issueCodes,
        };

        return NextResponse.json({
            success: true,
            processed,
            dedupedExisting,
            skippedUnsupported,
            timelineFactsWritten: projection.written,
            timelineFactsSkipped: projection.skipped,
            identityLinksCreated,
            routeStatus: "active_supported_route",
            compatibilityMode: "identified_ingest_current",
            retryable: false,
            timelineStatus: projection.reason === "no_facts" ? "source_missing" : "written_with_outbox",
            materializerStatus: materializerReceipt.status,
            materializerReceipt,
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
