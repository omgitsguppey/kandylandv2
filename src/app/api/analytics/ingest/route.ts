import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import {
    requestAllowsAnonymousAnalytics,
    requestHasGlobalPrivacyControl,
    resolveRequestConsentMode,
} from "@/lib/server/privacy-consent";
import { TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";
import { recordAnalyticsPipelineFailure } from "@/lib/server/analytics-pipeline-health";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { ANALYTICS_BATCH_ID_PATTERN, createAnalyticsBatchId } from "@/lib/analytics-identifiers";
import {
    ANALYTICS_ROUTE_POLICIES,
} from "@/lib/server/analytics-governance";
import {
    ANALYTICS_INGEST_COST_POLICY,
    ANALYTICS_INGEST_EVENT_TYPES,
    ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
    ANALYTICS_CLIENT_ID_PATTERN,
    buildAnalyticsIngestDedupeKey,
    classifyAnalyticsIngestFailure,
    getAnalyticsIngestContract,
    resolveCanonicalGuestAnonymousVisitorId,
    type AnalyticsIngestFailureReason,
} from "@/lib/analytics/ingest-contract";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { CONSENT_MODE_VALUES } from "@/lib/privacy/consent-tracking-contract";
import {
    ACTOR_KINDS,
    IDENTITY_CONFIDENCE_VALUES,
    IDENTITY_STATES,
} from "@/lib/analytics/identity-handoff-contract";
import {
    buildEventEnvelope,
    validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import { normalizeAnonymousRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";
import { mapRuntimeFactToBehavioralTimelineFact } from "@/lib/server/behavioral-timeline-mapper";
import { writeBehavioralTimelineProjection } from "@/lib/server/behavioral-timeline-writer";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import { buildBehavioralEventFactRollup } from "@/lib/server/event-fact-rollup";
import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";
import {
    RUNTIME_FACT_CONTRACT_VERSION,
    type RuntimeFact,
    type RuntimeFactDiagnostic,
} from "@/lib/runtime-facts/runtime-fact-contract";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

export const dynamic = "force-dynamic";
const SESSION_COOKIE_NAME = "kandydrops_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_ANALYTICS_BODY_BYTES = ANALYTICS_INGEST_COST_POLICY.maxBodyBytes;
const MAX_ANALYTICS_EVENTS_PER_PAYLOAD = 200;
const ANALYTICS_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90;
const ANALYTICS_GUEST_BATCH_TTL_MS = 1000 * 60 * 60 * 24 * 180;
const SESSION_KEY_PATTERN = /^anon_[A-Za-z0-9-]{8,128}$/u;
const ANALYTICS_INGEST_WARNING_CAP_PER_HOUR = ANALYTICS_INGEST_COST_POLICY.diagnosticsCapPerHour;
const ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR = 1;
const analyticsIngestWarningCounts = new Map<string, { hourKey: string; count: number }>();
const analyticsIngestFailureCounts = new Map<string, { hourKey: string; count: number }>();
const GuestSemanticEventNameSchema = z.enum([
    "semantic_page_viewed",
    "semantic_target_clicked",
    "semantic_page_engaged",
    "semantic_page_passive",
    "semantic_page_bounced",
    "semantic_page_exited",
]);

const TelemetryEventSchema = z.object({
    type: z.enum(ANALYTICS_INGEST_EVENT_TYPES),
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
    semanticEventName: GuestSemanticEventNameSchema.optional(),
    semanticExitEventName: GuestSemanticEventNameSchema.optional(),
    referrerHost: z.string().max(120).optional(),
    viewportWidth: z.number().optional(),
    viewportHeight: z.number().optional(),
    devicePixelRatio: z.number().optional(),
    networkType: z.string().max(40).optional(),
});

const PayloadSchema = z.object({
    anonymousVisitorId: z.string().max(160).optional(),
    sessionId: z.string().min(8).max(160).regex(ANALYTICS_CLIENT_ID_PATTERN).optional(),
    batchId: z.string().regex(ANALYTICS_BATCH_ID_PATTERN).optional(),
    consentMode: z.enum(CONSENT_MODE_VALUES).default("full_behavioral"),
    actorKind: z.enum(ACTOR_KINDS).default("guest"),
    identityState: z.enum(IDENTITY_STATES).default("guest_full_behavioral"),
    identityConfidence: z.enum(IDENTITY_CONFIDENCE_VALUES).default("weak"),
    unavailableGuestReason: z.string().max(120).nullable().optional(),
    events: z.array(TelemetryEventSchema).max(MAX_ANALYTICS_EVENTS_PER_PAYLOAD),
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

function getAnalyticsIngestErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function resolveGuestEnvelopeEventName(event: z.infer<typeof TelemetryEventSchema>) {
    return event.semanticEventName || event.semanticExitEventName || event.type;
}

function resolveGuestConsentEventName(event: z.infer<typeof TelemetryEventSchema>) {
    return event.semanticEventName
        || event.semanticExitEventName
        || (event.type === "page_view" ? "semantic_page_viewed" : event.type);
}

function currentHourKey(nowMs = Date.now()) {
    return new Date(nowMs).toISOString().slice(0, 13);
}

function shouldRecordAnalyticsIngestDiagnostic(input: {
    map: Map<string, { hourKey: string; count: number }>;
    fingerprint: string;
    cap: number;
    nowMs?: number;
}) {
    const hourKey = currentHourKey(input.nowMs);
    const current = input.map.get(input.fingerprint);
    if (!current || current.hourKey !== hourKey) {
        input.map.set(input.fingerprint, { hourKey, count: 1 });
        return true;
    }

    current.count += 1;
    return current.count <= input.cap;
}

function buildAnalyticsIngestFailureResponse(reason: AnalyticsIngestFailureReason) {
    const classification = classifyAnalyticsIngestFailure(reason);
    return NextResponse.json(
        {
            success: false,
            status: classification.status,
            ignored: classification.status !== "temporary_failure",
            reason: classification.reason,
            retryable: classification.retryable,
            permanent: classification.permanent,
        },
        { status: classification.httpStatus },
    );
}

async function reportAnalyticsIngestFailure(error: unknown) {
    const errorMessage = getAnalyticsIngestErrorMessage(error);
    const fingerprint = error instanceof Error
        ? `${error.name}:${error.message.slice(0, 160)}`
        : String(error).slice(0, 160);
    if (!shouldRecordAnalyticsIngestDiagnostic({
        map: analyticsIngestFailureCounts,
        fingerprint,
        cap: ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR,
    })) {
        return;
    }

    await Promise.all([
        recordServerDiagnostic({
            channel: "analytics",
            severity: "error",
            message: "Anonymous analytics ingestion failed",
            detail: {
                route: "analytics/ingest",
                error: errorMessage,
            },
        }),
        recordAnalyticsPipelineFailure({
            routeName: "analytics/ingest",
            errorMessage,
        }),
    ]);
}

function buildGuestBehavioralTimelineFacts(input: {
    runtimeFacts: readonly RuntimeFact[];
    globalPrivacyControl: boolean;
}) {
    return input.runtimeFacts
        .filter((fact) => fact.metricEligible || fact.metricExclusionReason.includes("privacy"))
        .map((runtimeFact) => mapRuntimeFactToBehavioralTimelineFact({
            runtimeFact,
            consentState: input.globalPrivacyControl ? "partial" : "granted",
        }));
}

function readStoredGuestTimelineFacts(input: {
    value: unknown;
    batchId: string;
    anonymousVisitorId: string;
}) {
    if (!Array.isArray(input.value)) return [];
    return input.value.filter((candidate): candidate is BehavioralTimelineFact => {
        if (!candidate || typeof candidate !== "object") return false;
        const fact = candidate as Partial<BehavioralTimelineFact>;
        return typeof fact.factId === "string"
            && fact.factId.startsWith(`${input.batchId}:`)
            && fact.actorType === "guest"
            && fact.anonymousVisitorId === input.anonymousVisitorId
            && typeof fact.eventName === "string"
            && typeof fact.normalizedAction === "string"
            && typeof fact.timestampMs === "number"
            && Number.isFinite(fact.timestampMs)
            && Boolean(fact.target && typeof fact.target === "object")
            && Boolean(fact.confidenceInputs && typeof fact.confidenceInputs === "object");
    }).slice(0, MAX_ANALYTICS_EVENTS_PER_PAYLOAD);
}

async function writeGuestBehavioralTimelineProjection(input: {
    facts: BehavioralTimelineFact[];
    runtimeFactCount: number;
    batchId: string;
    anonymousVisitorId: string;
    nowMs: number;
}) {
    const projection = await writeBehavioralTimelineProjection({
        facts: input.facts,
        anonymousVisitorIds: [input.anonymousVisitorId],
        requestedAtMs: input.nowMs,
        sourceWindowEndMs: input.nowMs,
        sourceWindowStartMs: input.nowMs - (1000 * 60 * 60 * 24 * 14),
        maxFacts: 500,
    });

    return {
        behavioralTimelineFacts: {
            status: projection.reason === "no_facts"
                ? "empty" as const
                : projection.skipped > 0
                    ? "partial" as const
                    : "complete" as const,
            queued: false,
            queueMode: "written_with_outbox" as const,
            materializer: "behavioral_timeline_facts",
            batchId: input.batchId,
            anonymousVisitorId: input.anonymousVisitorId,
            runtimeFactCount: input.runtimeFactCount,
            eligibleFactCount: input.facts.length,
            written: projection.written,
            skipped: projection.skipped,
            reason: projection.reason,
            requestedAtMs: input.nowMs,
        },
        userTrackingMaterialization: {
            queued: projection.materializer.status === "queued",
            queueMode: projection.materializer.status,
            materializer: "user_index_materializer_requests_v3",
            batchId: input.batchId,
            requestedAtMs: input.nowMs,
            requestsBuilt: projection.materializer.requestsBuilt,
            requestsEnqueued: projection.materializer.requestsEnqueued,
            requestsCoalesced: projection.materializer.requestsCoalesced,
            guestsQueued: projection.materializer.guestsQueued,
            issueCodes: projection.materializer.issueCodes,
        },
    };
}

async function POST_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            ...ANALYTICS_ROUTE_POLICIES.guestIngest,
            allowedMethods: ["POST"],
            maxBodyBytes: MAX_ANALYTICS_BODY_BYTES,
            requiredContentTypePrefix: "application/json",
            preAuthRateLimit: ANALYTICS_WRITE,
            rateLimit: ANALYTICS_WRITE,
            requireTrustedOrigin: true,
        });

        let rawPayload: unknown;
        try {
            rawPayload = await readBoundedJsonBody<unknown>(request, {
                maxBytes: MAX_ANALYTICS_BODY_BYTES,
                routeName: "analytics/ingest",
                allowedContentTypes: ["application/json"],
            });
        } catch (parseError) {
            const reason = isBoundedJsonBodyError(parseError) && parseError.code === "payload_too_large"
                ? "payload_too_large"
                : "invalid_json";
            const classification = classifyAnalyticsIngestFailure(reason);
            if (classification.diagnosticsAllowed && shouldRecordAnalyticsIngestDiagnostic({
                map: analyticsIngestWarningCounts,
                fingerprint: reason,
                cap: ANALYTICS_INGEST_WARNING_CAP_PER_HOUR,
            })) {
                recordRouteWarning(
                    "Analytics.Ingest",
                    "Telemetry ingestion JSON parse failed",
                    parseError,
                    { channel: "analytics", detail: { reason } },
                );
            }
            return buildAnalyticsIngestFailureResponse(reason);
        }
        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            const reason = !parsed.success ? "invalid_analytics_payload" : "empty_analytics_payload";
            const classification = classifyAnalyticsIngestFailure(reason);
            if (classification.diagnosticsAllowed && shouldRecordAnalyticsIngestDiagnostic({
                map: analyticsIngestWarningCounts,
                fingerprint: reason,
                cap: ANALYTICS_INGEST_WARNING_CAP_PER_HOUR,
            })) {
                recordRouteWarning(
                    "Analytics.Ingest",
                    "Telemetry ingestion validation failed or empty payload",
                    !parsed.success ? parsed.error : "empty events array",
                    { channel: "analytics", detail: { reason } },
                );
            }
            return buildAnalyticsIngestFailureResponse(reason);
        }

        const consentFilteredEvents = parsed.data.events.map((event) => ({
            event,
            allowed: requestAllowsAnonymousAnalytics(request, resolveGuestConsentEventName(event)),
        }));
        const consentAcceptedEvents = consentFilteredEvents
            .filter((result) => result.allowed)
            .map((result) => result.event);
        const consentDroppedEventCount = consentFilteredEvents.length - consentAcceptedEvents.length;

        if (consentAcceptedEvents.length === 0) {
            const classification = classifyAnalyticsIngestFailure("analytics_consent_denied");
            return NextResponse.json({
                success: true,
                status: classification.status,
                ignored: true,
                reason: classification.reason,
                retryable: classification.retryable,
                permanent: classification.permanent,
                droppedEvents: consentDroppedEventCount,
                diagnosticPolicy: "suppressed_high_volume_consent_path",
            });
        }

        const { sessionId, actorKind, identityState, identityConfidence } = parsed.data;
        const consentMode = resolveRequestConsentMode(request);
        const events = consentAcceptedEvents;
        const { sessionKey, shouldSetCookie } = getOrCreateSessionKey(request);
        const canonicalAnonymousVisitorId = resolveCanonicalGuestAnonymousVisitorId({
            clientAnonymousVisitorId: parsed.data.anonymousVisitorId,
            sessionKey,
        });
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
        const eventEnvelopeResults = sanitizedEvents.map((event, index) => {
            const eventEnvelope = buildEventEnvelope({
                eventId: `${batchId}:${index}`,
                eventName: resolveGuestEnvelopeEventName(event),
                timestamp: event.timestamp,
                guestId: canonicalAnonymousVisitorId,
                sessionId: sessionId || sessionKey,
                consentMode,
                actorKind,
                identityState,
                source: "guest_client",
                metadata: {
                    type: event.type,
                    path: event.path,
                    targetId: event.targetId,
                    targetTag: event.targetTag,
                    targetText: event.targetText,
                    dropId: event.dropId,
                    dropCategory: event.dropCategory,
                    semanticSurfaceKey: event.semanticSurfaceKey,
                    semanticScopeKey: event.semanticScopeKey,
                },
            });
            return {
                event,
                eventEnvelope,
                validation: validateEventEnvelope(eventEnvelope),
            };
        });
        const acceptedEventEnvelopeResults = eventEnvelopeResults.filter((result) =>
            result.eventEnvelope.pipelineStatus === "normal" && result.validation.ok);
        const quarantinedEventEnvelopes = eventEnvelopeResults
            .filter((result) => result.eventEnvelope.pipelineStatus !== "normal" || !result.validation.ok)
            .map((result) => ({
                eventId: result.eventEnvelope.eventId,
                eventName: result.eventEnvelope.eventName,
                pipelineStatus: result.eventEnvelope.pipelineStatus,
                quarantineReason: result.eventEnvelope.quarantineReason ?? "invalid_envelope",
                validationFindings: result.validation.findings,
            }));
        const acceptedSanitizedEvents = acceptedEventEnvelopeResults.map((result) => result.event);
        const runtimeFactResults = acceptedSanitizedEvents.map((event, index) => normalizeAnonymousRuntimeFact({
            eventId: `${batchId}:${index}`,
            timestampMs: event.timestamp,
            sessionId: sessionId || sessionKey,
            anonymousVisitorId: canonicalAnonymousVisitorId,
            path: event.path,
            dropId: event.dropId,
            type: event.type,
            targetId: event.targetId,
            targetTag: event.targetTag,
            interactionState: event.interactionState,
            exitIntent: event.exitIntent,
        }));
        const runtimeFacts = runtimeFactResults
            .map((result) => result.fact)
            .filter((fact): fact is RuntimeFact => Boolean(fact));
        const runtimeDiagnostics = runtimeFactResults
            .map((result) => result.diagnostic)
            .filter((diagnostic): diagnostic is RuntimeFactDiagnostic => Boolean(diagnostic));
        const proposedTimelineFacts = buildGuestBehavioralTimelineFacts({
            runtimeFacts,
            globalPrivacyControl,
        });
        const behavioralEventResults = acceptedSanitizedEvents.map((event, index) => normalizeBehavioralEventFactWithDiagnostics({
            eventId: `${batchId}:${index}`,
            eventName: resolveGuestEnvelopeEventName(event),
            params: {
                route: event.path,
                page_path: event.path,
                drop_id: event.dropId,
                drop_category: event.dropCategory,
                source_component: event.targetId || event.targetTag || event.semanticSurfaceKey || "guest_runtime_ingest",
                semantic_surface_key: event.semanticSurfaceKey,
                semantic_scope_key: event.semanticScopeKey,
                semantic_category: event.semanticCategory,
                target_id: event.targetId,
                target_tag: event.targetTag,
                duration_ms: event.durationMs,
            },
            timestamp: event.timestamp,
            sessionId: sessionId || sessionKey,
            anonymousVisitorId: canonicalAnonymousVisitorId,
            pagePath: event.path,
            route: event.path,
            dropId: event.dropId,
            source: "client",
            confidence: 0.75,
        }));
        const behavioralEventFactRollup = buildBehavioralEventFactRollup({
            facts: behavioralEventResults.map((result) => result.fact),
            diagnostics: behavioralEventResults.map((result) => result.diagnostic),
        });
        const eventContracts = acceptedSanitizedEvents.map((event) => getAnalyticsIngestContract(event.type));
        const ingestDestinations = Array.from(new Set(eventContracts.flatMap((contract) => contract.destinationLanes)));

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const minuteBucket = timeKeys.minuteKey;
        const docId = `${sessionKey}_${minuteBucket}`;
        const dedupeKey = buildAnalyticsIngestDedupeKey({ sessionKey, batchId });
        const docRef = adminDb.collection(ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestSessions).doc(docId);
        const guestBatchRef = adminDb.collection(ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestBatches).doc(dedupeKey);
        const uniquePagePaths = Array.from(new Set(acceptedSanitizedEvents.map((event) => event.path)));
        const uniqueInteractionTypes = Array.from(new Set(acceptedSanitizedEvents.map((event) => event.type)));
        const batchScrollDepth = acceptedSanitizedEvents.reduce((maxDepth, event) => Math.max(maxDepth, event.scrollDepthPercent || 0), 0);
        const hasPixelData = acceptedSanitizedEvents.some((event) => Number.isFinite(event.x) && Number.isFinite(event.y));
        const transactionResult = await adminDb.runTransaction(async (transaction) => {
            const existingBatchSnapshot = await transaction.get(guestBatchRef);

            if (existingBatchSnapshot.exists) {
                return {
                    deduped: true,
                    timelineFacts: readStoredGuestTimelineFacts({
                        value: existingBatchSnapshot.data()?.behavioralTimelineProjectionFacts,
                        batchId,
                        anonymousVisitorId: canonicalAnonymousVisitorId,
                    }),
                };
            }

            const sessionArrayUpdates = {
                ...(uniquePagePaths.length > 0 ? { pagePaths: FieldValue.arrayUnion(...uniquePagePaths.slice(0, 25)) } : {}),
                ...(uniqueInteractionTypes.length > 0
                    ? { interactionTypes: FieldValue.arrayUnion(...uniqueInteractionTypes.slice(0, 12)) }
                    : {}),
            };

            transaction.set(docRef, {
                sessionKey,
                serverSessionKey: sessionKey,
                anonymousVisitorId: canonicalAnonymousVisitorId,
                clientSessionId: sessionId || null,
                minuteBucket,
                consentMode,
                actorKind,
                identityState,
                identityConfidence,
                unavailableGuestReason: parsed.data.unavailableGuestReason ?? null,
                globalPrivacyControl,
                eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
                trackingOrigin: "guest_client",
                updatedAt: FieldValue.serverTimestamp(),
                lastReceivedAtMs: nowMs,
                expiresAt: Timestamp.fromMillis(nowMs + ANALYTICS_SESSION_TTL_MS),
                batchCount: FieldValue.increment(1),
                eventCount: FieldValue.increment(acceptedSanitizedEvents.length),
                quarantinedEventCount: FieldValue.increment(quarantinedEventEnvelopes.length),
                latestBatchMaxScrollDepth: batchScrollDepth,
                latestBatchMaxScrollDepthSource: "guest_batch",
                ...sessionArrayUpdates,
            }, { merge: true });

            transaction.create(guestBatchRef, {
                batchId,
                sessionDocId: docId,
                source: "guest",
                sessionKey,
                serverSessionKey: sessionKey,
                anonymousVisitorId: canonicalAnonymousVisitorId,
                clientSessionId: sessionId || null,
                minuteBucket,
                consentMode,
                actorKind,
                identityState,
                identityConfidence,
                unavailableGuestReason: parsed.data.unavailableGuestReason ?? null,
                globalPrivacyControl,
                eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
                trackingOrigin: "guest_client",
                receivedAtMs: nowMs,
                dayKey: timeKeys.dayKey,
                hourKey: timeKeys.hourKey,
                minuteKey: timeKeys.minuteKey,
                expiresAt: Timestamp.fromMillis(nowMs + ANALYTICS_GUEST_BATCH_TTL_MS),
                eventCount: acceptedSanitizedEvents.length,
                originalEventCount: sanitizedEvents.length,
                quarantinedEventCount: quarantinedEventEnvelopes.length,
                pagePaths: uniquePagePaths,
                interactionTypes: uniqueInteractionTypes,
                maxScrollDepth: batchScrollDepth,
                hasPixelData,
                events: acceptedSanitizedEvents,
                eventEnvelopes: acceptedEventEnvelopeResults.map((result) => result.eventEnvelope).slice(0, 50),
                quarantinedEventEnvelopes: quarantinedEventEnvelopes.slice(0, 50),
                runtimeFactVersion: runtimeFacts.length > 0 ? RUNTIME_FACT_CONTRACT_VERSION : "",
                runtimeFacts: runtimeFacts.slice(0, 50),
                behavioralTimelineProjectionFacts: proposedTimelineFacts,
                behavioralTimelineProjectionFactCount: proposedTimelineFacts.length,
                normalizedActions: runtimeFacts.map((fact) => fact.normalizedAction).filter(Boolean).slice(0, 50),
                normalizedActionCount: runtimeFacts.length,
                unknownRuntimeEvents: runtimeDiagnostics.slice(0, 20),
                unknownRuntimeEventCount: runtimeDiagnostics.length,
                behavioralEventFactVersion: behavioralEventFactRollup.version,
                behavioralEventFacts: behavioralEventFactRollup.facts.slice(0, 50),
                behavioralEventCounts: behavioralEventFactRollup.counts,
                unknownBehavioralEvents: behavioralEventFactRollup.unknownEvents.slice(0, 20),
                unknownBehavioralEventCount: behavioralEventFactRollup.diagnostics.length,
                createdAt: FieldValue.serverTimestamp(),
            });

            return { deduped: false, timelineFacts: proposedTimelineFacts };
        });

        const projection = await writeGuestBehavioralTimelineProjection({
            facts: transactionResult.timelineFacts,
            runtimeFactCount: runtimeFacts.length,
            batchId,
            anonymousVisitorId: canonicalAnonymousVisitorId,
            nowMs,
        });

        if (transactionResult.deduped) {
            return NextResponse.json({
                success: true,
                status: "accepted",
                deduped: true,
                processed: 0,
                acceptedEvents: 0,
                droppedEvents: 0,
                rejectedEvents: 0,
                reason: "duplicate_guest_batch",
                retryable: false,
                dedupeKey,
                destinations: ingestDestinations,
                behavioralTimelineFacts: projection.behavioralTimelineFacts,
                userTrackingMaterialization: projection.userTrackingMaterialization,
            });
        }

        const response = NextResponse.json({
            success: true,
            status: "accepted",
            processed: parsed.data.events.length,
            acceptedEvents: acceptedSanitizedEvents.length,
            droppedEvents: consentDroppedEventCount,
            rejectedEvents: quarantinedEventEnvelopes.length,
            retryable: false,
            dedupeKey,
            destinations: ingestDestinations,
            firestoreCollections: ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
            behavioralTimelineFacts: projection.behavioralTimelineFacts,
            userTrackingMaterialization: projection.userTrackingMaterialization,
            eventEnvelope: {
                pipeline: "canonical_event_envelope",
                quarantinedEvents: quarantinedEventEnvelopes.length,
            },
        });
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
        await reportAnalyticsIngestFailure(error);
        const classification = classifyAnalyticsIngestFailure("temporary_server_failure");
        return NextResponse.json({
            success: false,
            status: classification.status,
            reason: classification.reason,
            retryable: classification.retryable,
            permanent: classification.permanent,
        }, { status: classification.httpStatus });
    }
}

export let POST = withRouteRuntimeHealth("analytics/ingest:POST", POST_handler);
