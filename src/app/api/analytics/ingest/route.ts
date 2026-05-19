import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { requestAllowsAnonymousAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";
import { recordAnalyticsPipelineFailure } from "@/lib/server/analytics-pipeline-health";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { ANALYTICS_BATCH_ID_PATTERN, createAnalyticsBatchId, createAnalyticsStorageKey } from "@/lib/analytics-identifiers";
import {
    ANALYTICS_CANONICAL_COLLECTIONS,
    ANALYTICS_OPERATIONAL_COLLECTIONS,
    ANALYTICS_ROUTE_POLICIES,
} from "@/lib/server/analytics-governance";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { normalizeAnonymousRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";
import { mapRuntimeFactToBehavioralTimelineFact } from "@/lib/server/behavioral-timeline-mapper";
import { writeBehavioralTimelineFacts } from "@/lib/server/behavioral-timeline-writer";
import {
    RUNTIME_FACT_CONTRACT_VERSION,
    type RuntimeFact,
    type RuntimeFactDiagnostic,
} from "@/lib/runtime-facts/runtime-fact-contract";

export const dynamic = "force-dynamic";
const SESSION_COOKIE_NAME = "kandydrops_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_ANALYTICS_BODY_BYTES = 64 * 1024;
const ANALYTICS_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90;
const ANALYTICS_GUEST_BATCH_TTL_MS = 1000 * 60 * 60 * 24 * 180;
const SESSION_KEY_PATTERN = /^anon_[A-Za-z0-9-]{8,128}$/u;
const CLIENT_ANALYTICS_ID_PATTERN = /^(?:sess|subject)_[A-Za-z0-9_-]{4,150}$/u;
const ANALYTICS_INGEST_WARNING_CAP_PER_HOUR = 12;
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
    sessionId: z.string().min(8).max(160).regex(CLIENT_ANALYTICS_ID_PATTERN).optional(),
    batchId: z.string().regex(ANALYTICS_BATCH_ID_PATTERN).optional(),
    events: z.array(TelemetryEventSchema).max(200), // Cap events to 200 per payload
});

export function resolveCanonicalGuestAnonymousVisitorId(input: {
    clientAnonymousVisitorId?: string | null;
    sessionKey: string;
}) {
    const candidate = input.clientAnonymousVisitorId?.trim();
    if (candidate && CLIENT_ANALYTICS_ID_PATTERN.test(candidate)) {
        return candidate;
    }

    return input.sessionKey;
}

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

function queueUserTrackingMaterialization(input: {
    anonymousVisitorId: string;
    batchId: string;
    nowMs: number;
}) {
    // materializeUserTrackingIndexes stays out of the priority-live request path.
    return {
        queued: true,
        queueMode: "deferred_non_priority" as const,
        materializer: "analytics_guest_batches_daily",
        anonymousVisitorId: input.anonymousVisitorId,
        batchId: input.batchId,
        requestedAtMs: input.nowMs,
    };
}

async function writeGuestBehavioralTimelineFacts(input: {
    runtimeFacts: RuntimeFact[];
    batchId: string;
    anonymousVisitorId: string;
    nowMs: number;
    globalPrivacyControl: boolean;
}) {
    const eligibleFacts = input.runtimeFacts
        .filter((fact) => fact.metricEligible || fact.metricExclusionReason.includes("privacy"))
        .map((runtimeFact) => mapRuntimeFactToBehavioralTimelineFact({
            runtimeFact,
            consentState: input.globalPrivacyControl ? "partial" : "granted",
        }));
    let writeResult: { written: number; skipped: number; reason: string };
    try {
        writeResult = await writeBehavioralTimelineFacts(eligibleFacts);
    } catch (error) {
        await reportAnalyticsIngestFailure(error);
        writeResult = {
            written: 0,
            skipped: eligibleFacts.length,
            reason: "timeline_write_failed",
        };
    }

    return {
        queued: false,
        queueMode: "written_bounded" as const,
        materializer: "behavioral_timeline_facts",
        batchId: input.batchId,
        anonymousVisitorId: input.anonymousVisitorId,
        runtimeFactCount: input.runtimeFacts.length,
        eligibleFactCount: eligibleFacts.length,
        written: writeResult.written,
        skipped: writeResult.skipped,
        reason: writeResult.reason,
        requestedAtMs: input.nowMs,
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

        const contentLength = Number(request.headers.get("content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_ANALYTICS_BODY_BYTES) {
            return NextResponse.json(
                { success: false, ignored: true, reason: "payload_too_large", retryable: false },
                { status: 413 },
            );
        }

        if (!requestAllowsAnonymousAnalytics(request)) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: "analytics_consent_denied",
                diagnosticPolicy: "suppressed_high_volume_consent_path",
            });
        }

        let rawPayload: unknown;
        try {
            rawPayload = await request.json();
        } catch (parseError) {
            if (shouldRecordAnalyticsIngestDiagnostic({
                map: analyticsIngestWarningCounts,
                fingerprint: "invalid_json",
                cap: ANALYTICS_INGEST_WARNING_CAP_PER_HOUR,
            })) {
                recordRouteWarning(
                    "Analytics.Ingest",
                    "Telemetry ingestion JSON parse failed",
                    parseError,
                    { channel: "analytics", detail: { reason: "invalid_json" } },
                );
            }
            return NextResponse.json(
                { success: false, ignored: true, reason: "invalid_json", retryable: false },
                { status: 400 },
            );
        }
        const parsed = PayloadSchema.safeParse(rawPayload);

        if (!parsed.success || parsed.data.events.length === 0) {
            const reason = !parsed.success ? "invalid_analytics_payload" : "empty_analytics_payload";
            if (shouldRecordAnalyticsIngestDiagnostic({
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
            return NextResponse.json(
                { success: false, ignored: true, reason, retryable: false },
                { status: 422 },
            );
        }

        const { sessionId, events } = parsed.data;
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
        const runtimeFactResults = sanitizedEvents.map((event, index) => normalizeAnonymousRuntimeFact({
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

        // Group events by a unique minute-bucket to prevent writing thousands of tiny docs.
        const minuteBucket = timeKeys.minuteKey;
        const docId = `${sessionKey}_${minuteBucket}`;
        const docRef = adminDb.collection(ANALYTICS_OPERATIONAL_COLLECTIONS.guestSessions).doc(docId);
        const guestBatchRef = adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.guestBatches).doc(
            createAnalyticsStorageKey("guest_batch", sessionKey, batchId),
        );
        const uniquePagePaths = Array.from(new Set(sanitizedEvents.map((event) => event.path)));
        const uniqueInteractionTypes = Array.from(new Set(sanitizedEvents.map((event) => event.type)));
        const batchScrollDepth = sanitizedEvents.reduce((maxDepth, event) => Math.max(maxDepth, event.scrollDepthPercent || 0), 0);
        const hasPixelData = sanitizedEvents.some((event) => Number.isFinite(event.x) && Number.isFinite(event.y));
        const transactionResult = await adminDb.runTransaction(async (transaction) => {
            const existingBatchSnapshot = await transaction.get(guestBatchRef);

            if (existingBatchSnapshot.exists) {
                return { deduped: true };
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
                consentMode: "anonymous",
                globalPrivacyControl,
                eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
                trackingOrigin: "guest_client",
                updatedAt: FieldValue.serverTimestamp(),
                lastReceivedAtMs: nowMs,
                expiresAt: Timestamp.fromMillis(nowMs + ANALYTICS_SESSION_TTL_MS),
                batchCount: FieldValue.increment(1),
                eventCount: FieldValue.increment(sanitizedEvents.length),
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
                consentMode: "anonymous",
                globalPrivacyControl,
                eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
                trackingOrigin: "guest_client",
                receivedAtMs: nowMs,
                dayKey: timeKeys.dayKey,
                hourKey: timeKeys.hourKey,
                minuteKey: timeKeys.minuteKey,
                expiresAt: Timestamp.fromMillis(nowMs + ANALYTICS_GUEST_BATCH_TTL_MS),
                eventCount: sanitizedEvents.length,
                pagePaths: uniquePagePaths,
                interactionTypes: uniqueInteractionTypes,
                maxScrollDepth: batchScrollDepth,
                hasPixelData,
                events: sanitizedEvents,
                runtimeFactVersion: runtimeFacts.length > 0 ? RUNTIME_FACT_CONTRACT_VERSION : "",
                runtimeFacts: runtimeFacts.slice(0, 50),
                normalizedActions: runtimeFacts.map((fact) => fact.normalizedAction).filter(Boolean).slice(0, 50),
                normalizedActionCount: runtimeFacts.length,
                unknownRuntimeEvents: runtimeDiagnostics.slice(0, 20),
                unknownRuntimeEventCount: runtimeDiagnostics.length,
                createdAt: FieldValue.serverTimestamp(),
            });

            return { deduped: false };
        });

        if (transactionResult.deduped) {
            return NextResponse.json({ success: true, deduped: true, processed: 0 });
        }

        const behavioralTimelineFacts = await writeGuestBehavioralTimelineFacts({
            runtimeFacts,
            batchId,
            anonymousVisitorId: canonicalAnonymousVisitorId,
            nowMs,
            globalPrivacyControl,
        });
        const userTrackingMaterialization = queueUserTrackingMaterialization({
            anonymousVisitorId: canonicalAnonymousVisitorId,
            batchId,
            nowMs,
        });

        const response = NextResponse.json({
            success: true,
            processed: events.length,
            behavioralTimelineFacts,
            userTrackingMaterialization,
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
        return NextResponse.json({ success: false, retryable: true }, { status: 503 });
    }
}

export let POST = withRouteRuntimeHealth("analytics/ingest:POST", POST_handler);
