import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canTrackEvent } from "@/lib/privacy/consent-tracking-policy";
import { normalizeAnonymousRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";

const mockState = vi.hoisted(() => {
    const transactionSet = vi.fn();
    const transactionCreate = vi.fn();

    return {
        useActualNormalizer: false,
        useActualRequestConsent: false,
        guardApiRequest: vi.fn(),
        recordServerDiagnostic: vi.fn(async () => undefined),
        recordAnalyticsPipelineFailure: vi.fn(async () => undefined),
        requestAllowsAnonymousAnalytics: vi.fn((_request?: unknown, _eventName?: string) => true),
        resolveRequestConsentMode: vi.fn(() => "full_behavioral"),
        writeBehavioralTimelineProjection: vi.fn(async (input: { facts: unknown[] }) => ({
            written: Math.min(input.facts.length, 120),
            skipped: Math.max(0, input.facts.length - 120),
            reason: input.facts.length > 120 ? "batch_capped" : input.facts.length > 0 ? "ok" : "no_facts",
            materializer: {
                mode: "shadow",
                status: "queued",
                requestsBuilt: 1,
                requestsEnqueued: 1,
                requestsCoalesced: 0,
                usersQueued: 0,
                guestsQueued: 1,
                issueCodes: [],
            },
        })),
        transactionSet,
        transactionCreate,
        adminDb: {
            collection: vi.fn((collectionName: string) => ({
                doc: vi.fn((docId: string) => ({ collectionName, docId })),
            })),
            runTransaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
                get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
                set: transactionSet,
                create: transactionCreate,
            })),
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ANALYTICS_WRITE: {},
}));

vi.mock("@/lib/server/privacy-consent", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/privacy-consent")>();
    return {
        requestAllowsAnonymousAnalytics: (request: NextRequest, eventName: string) => mockState.useActualRequestConsent
            ? actual.requestAllowsAnonymousAnalytics(request, eventName)
            : mockState.requestAllowsAnonymousAnalytics(request, eventName),
        requestHasGlobalPrivacyControl: (request: NextRequest) => mockState.useActualRequestConsent
            ? actual.requestHasGlobalPrivacyControl(request) : false,
        resolveRequestConsentMode: (request: NextRequest) => mockState.useActualRequestConsent
            ? actual.resolveRequestConsentMode(request) : mockState.resolveRequestConsentMode(),
    };
});

vi.mock("@/lib/telemetry-catalog", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/telemetry-catalog")>();
    const { SESSION_METRICS_TELEMETRY_EVENTS } = await import("@/lib/analytics/session-metrics-contract");
    return ({
    TELEMETRY_EVENT_INDEX_VERSION: 1,
    normalizeTelemetryEventName: vi.fn((eventName: string) => eventName),
    buildTelemetryEventExtensionMetadata: vi.fn((eventName: string) => ({
        eventName,
        feature: "analytics_guest_ingest",
        surface: "analytics",
        materializerLane: "behavioral_timeline",
        debugVisibility: "debug_visible",
        scoreEvidenceImpact: "supporting",
        consentRequirement: eventName === "semantic_target_clicked" ? "full_behavioral" : "minimal_analytics",
    })),
    getTelemetryEventExtensionMetadata: vi.fn((eventName: string) => {
        if (["page_view", "semantic_page_viewed", "semantic_target_clicked"].includes(eventName)) {
            return {
                eventName,
                feature: "analytics_guest_ingest",
                surface: "analytics",
                materializerLane: "behavioral_timeline",
                debugVisibility: "debug_visible",
                scoreEvidenceImpact: "supporting",
                consentRequirement: eventName === "semantic_target_clicked" ? "full_behavioral" : "minimal_analytics",
            };
        }

        return SESSION_METRICS_TELEMETRY_EVENTS.some(name => name === eventName)
            ? actual.getTelemetryEventExtensionMetadata(eventName) : null;
    }),
});
});

vi.mock("@/lib/server/analytics-event-utils", () => ({
    buildAnalyticsTimeKeys: vi.fn(() => ({
        dayKey: "20260401",
        hourKey: "2026040112",
        minuteKey: "202604011234",
    })),
}));

vi.mock("@/lib/server/analytics-pipeline-health", () => ({
    recordAnalyticsPipelineFailure: mockState.recordAnalyticsPipelineFailure,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/analytics-identifiers", () => ({
    ANALYTICS_BATCH_ID_PATTERN: /^batch_[A-Za-z0-9:_-]{16,160}$/u,
    createAnalyticsBatchId: vi.fn(() => "batch_test_batch_identifier"),
    createAnalyticsStorageKey: vi.fn(() => "guest_batch_key"),
}));

vi.mock("@/lib/runtime-facts/normalize-runtime-fact", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/runtime-facts/normalize-runtime-fact")>();
    return { normalizeAnonymousRuntimeFact: vi.fn((input: Parameters<typeof actual.normalizeAnonymousRuntimeFact>[0]) => mockState.useActualNormalizer ? actual.normalizeAnonymousRuntimeFact(input) : ({
        fact: {
            eventId: input.eventId,
            anonymousVisitorId: input.anonymousVisitorId,
            metricEligible: true,
            metricExclusionReason: "",
            normalizedAction: "page_viewed",
        },
        diagnostic: null,
    })) };
});

vi.mock("@/lib/server/behavioral-timeline-mapper", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/behavioral-timeline-mapper")>();
    return { mapRuntimeFactToBehavioralTimelineFact: vi.fn((input: Parameters<typeof actual.mapRuntimeFactToBehavioralTimelineFact>[0]) => mockState.useActualNormalizer ? actual.mapRuntimeFactToBehavioralTimelineFact(input) : ({
        ...input.runtimeFact,
        factId: input.runtimeFact.eventId,
        actorType: "guest",
        eventName: "semantic_page_viewed",
        timestampMs: 1,
        target: {},
        confidenceInputs: {},
    })) };
});

vi.mock("@/lib/server/behavioral-timeline-writer", () => ({
    writeBehavioralTimelineProjection: mockState.writeBehavioralTimelineProjection,
}));

vi.mock("@/lib/server/analytics-governance", () => ({
    ANALYTICS_CANONICAL_COLLECTIONS: {
        guestBatches: "analytics_guest_batches",
    },
    ANALYTICS_OPERATIONAL_COLLECTIONS: {
        guestSessions: "analytics_guest_sessions",
    },
    ANALYTICS_ROUTE_POLICIES: {
        guestIngest: {},
    },
}));

import { POST } from "@/app/api/analytics/ingest/route";
import { resolveCanonicalGuestAnonymousVisitorId } from "@/lib/analytics/ingest-contract";

describe("POST /api/analytics/ingest", () => {
    beforeEach(() => {
        mockState.useActualNormalizer = false;
        mockState.useActualRequestConsent = false;
        mockState.guardApiRequest.mockReset();
        mockState.recordServerDiagnostic.mockReset();
        mockState.recordAnalyticsPipelineFailure.mockReset();
        mockState.requestAllowsAnonymousAnalytics.mockReset();
        mockState.resolveRequestConsentMode.mockReset();
        mockState.writeBehavioralTimelineProjection.mockClear();
        vi.mocked(normalizeAnonymousRuntimeFact).mockClear();
        mockState.transactionSet.mockReset();
        mockState.transactionCreate.mockReset();
        mockState.adminDb.collection.mockClear();
        mockState.adminDb.runTransaction.mockClear();
        mockState.recordServerDiagnostic.mockResolvedValue(undefined);
        mockState.recordAnalyticsPipelineFailure.mockResolvedValue(undefined);
        mockState.requestAllowsAnonymousAnalytics.mockReturnValue(true);
        mockState.resolveRequestConsentMode.mockReturnValue("full_behavioral");
        mockState.adminDb.runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
            get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
            set: mockState.transactionSet,
            create: mockState.transactionCreate,
        }));
    });

    it("reports ingest failures through structured diagnostics and preserves the 503 response", async () => {
        mockState.guardApiRequest.mockRejectedValue(new Error("rate limiter unavailable"));

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            body: JSON.stringify({
                events: [],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(503);
        expect(payload).toEqual({
            success: false,
            status: "temporary_failure",
            reason: "temporary_server_failure",
            retryable: true,
            permanent: false,
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "analytics",
            severity: "error",
            message: "Anonymous analytics ingestion failed",
            detail: {
                route: "analytics/ingest",
                error: "rate limiter unavailable",
            },
        }));
        expect(mockState.recordAnalyticsPipelineFailure).toHaveBeenCalledWith({
            routeName: "analytics/ingest",
            errorMessage: "rate limiter unavailable",
        });
    });

    it("normalizes non-Error failures once for both diagnostics sinks", async () => {
        mockState.guardApiRequest.mockRejectedValue("rate limiter offline");

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            body: JSON.stringify({
                events: [],
            }),
        });

        await POST(request);

        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                error: "rate limiter offline",
            }),
        }));
        expect(mockState.recordAnalyticsPipelineFailure).toHaveBeenCalledWith({
            routeName: "analytics/ingest",
            errorMessage: "rate limiter offline",
        });
    });

    it.each([
        ["absent", undefined],
        ["dishonest", "8"],
    ])("rejects an oversized raw body with %s Content-Length before analytics writes", async (_label, contentLength) => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (contentLength) headers["content-length"] = contentLength;
        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers,
            body: JSON.stringify({ padding: "x".repeat(70 * 1024), events: [] }),
        });
        expect(request.headers.get("content-length")).toBe(contentLength ?? null);

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toEqual({
            success: false,
            status: "rejected",
            ignored: true,
            reason: "payload_too_large",
            retryable: false,
            permanent: true,
        });
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        expect(mockState.writeBehavioralTimelineProjection).not.toHaveBeenCalled();
    });

    it("preserves the invalid JSON response before analytics writes", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        const response = await POST(new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
        }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            status: "rejected",
            ignored: true,
            reason: "invalid_json",
            retryable: false,
            permanent: true,
        });
        expect(mockState.writeBehavioralTimelineProjection).not.toHaveBeenCalled();
    });

    it("skips metric ingestion when consent denies anonymous analytics", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.requestAllowsAnonymousAnalytics.mockReturnValue(false);

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [{ type: "page_view", timestamp: Date.now(), path: "/" }],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload).toEqual({
            success: true,
            status: "dropped",
            ignored: true,
            reason: "analytics_consent_denied",
            retryable: false,
            permanent: true,
            droppedEvents: 1,
            diagnosticPolicy: "suppressed_high_volume_consent_path",
        });
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
        expect(normalizeAnonymousRuntimeFact).not.toHaveBeenCalled();
    });

    it("keeps minimal product liveness events while dropping behavioral guest events", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.requestAllowsAnonymousAnalytics.mockImplementation((_request?: unknown, eventName = "") =>
            canTrackEvent(String(eventName), "minimal_analytics"));
        mockState.resolveRequestConsentMode.mockReturnValue("minimal_analytics");

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: {
                cookie: "kandydrops_sid=anon_server-cookie-id",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sessionId: "sess_existing-session",
                batchId: "batch_minimal-session_123456",
                consentMode: "minimal_analytics",
                events: [
                    { type: "page_view", timestamp: Date.now(), path: "/" },
                    { type: "hover", timestamp: Date.now(), path: "/", targetId: "hero-card" },
                ],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual(expect.objectContaining({
            success: true,
            status: "accepted",
            processed: 2,
            acceptedEvents: 1,
            droppedEvents: 1,
        }));
        expect(mockState.requestAllowsAnonymousAnalytics).toHaveBeenCalledWith(expect.any(NextRequest), "semantic_page_viewed");
        expect(mockState.requestAllowsAnonymousAnalytics).toHaveBeenCalledWith(expect.any(NextRequest), "hover");
        expect(mockState.transactionCreate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                consentMode: "minimal_analytics",
                eventCount: 1,
                events: [expect.objectContaining({ type: "page_view" })],
                interactionTypes: ["page_view"],
            }),
        );
        expect(normalizeAnonymousRuntimeFact).toHaveBeenCalledOnce();
        expect(normalizeAnonymousRuntimeFact).toHaveBeenCalledWith(expect.objectContaining({ sourceOrigin: "accepted_current_guest_ingest", type: "page_view" }));
    });

    it("accepts behavioral guest events only when the request gate has full behavioral consent", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.requestAllowsAnonymousAnalytics.mockImplementation((_request?: unknown, eventName = "") =>
            canTrackEvent(String(eventName), "full_behavioral"));
        mockState.resolveRequestConsentMode.mockReturnValue("full_behavioral");

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: {
                cookie: "kandydrops_sid=anon_server-cookie-id",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sessionId: "sess_existing-session",
                batchId: "batch_full-session_123456",
                consentMode: "full_behavioral",
                events: [{
                    type: "click",
                    timestamp: Date.now(),
                    path: "/",
                    targetId: "hero-card",
                    semanticEventName: "semantic_target_clicked",
                }],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual(expect.objectContaining({
            success: true,
            status: "accepted",
            acceptedEvents: 1,
            droppedEvents: 0,
        }));
        expect(mockState.transactionCreate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                eventCount: 1,
                events: [expect.objectContaining({ type: "click", semanticEventName: "semantic_target_clicked" })],
                interactionTypes: ["click"],
            }),
        );
        expect(normalizeAnonymousRuntimeFact).toHaveBeenCalledWith(expect.objectContaining({ sourceOrigin: "accepted_current_guest_ingest", type: "click" }));
    });

    it("prefers a valid client anonymous visitor id for canonical guest continuity", () => {
        expect(resolveCanonicalGuestAnonymousVisitorId({
            clientAnonymousVisitorId: "subject_secure-client-id_123",
            sessionKey: "anon_server-cookie-id",
        })).toBe("subject_secure-client-id_123");
    });

    it("falls back to the server session key when client anonymous visitor id is invalid", () => {
        expect(resolveCanonicalGuestAnonymousVisitorId({
            clientAnonymousVisitorId: "user_not-a-guest-identity",
            sessionKey: "anon_server-cookie-id",
        })).toBe("anon_server-cookie-id");
    });

    it("uses canonical guest identity while preserving the server session key and queues the canonical user-index materializer", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: {
                cookie: "kandydrops_sid=anon_server-cookie-id",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                anonymousVisitorId: "subject_existing-client",
                sessionId: "sess_existing-session",
                batchId: "batch_existing-session_123456",
                events: [{ type: "page_view", timestamp: Date.now(), path: "/" }],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(mockState.transactionSet).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionKey: "anon_server-cookie-id",
                serverSessionKey: "anon_server-cookie-id",
                anonymousVisitorId: "subject_existing-client",
                clientSessionId: "sess_existing-session",
            }),
            { merge: true },
        );
        expect(mockState.transactionCreate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionKey: "anon_server-cookie-id",
                serverSessionKey: "anon_server-cookie-id",
                anonymousVisitorId: "subject_existing-client",
                clientSessionId: "sess_existing-session",
            }),
        );
        expect(payload.userTrackingMaterialization).toEqual(expect.objectContaining({
            queued: true,
            queueMode: "queued",
            materializer: "user_index_materializer_requests_v3",
            batchId: "batch_existing-session_123456",
            requestsBuilt: 1,
            requestsEnqueued: 1,
            guestsQueued: 1,
        }));
        expect(mockState.writeBehavioralTimelineProjection).toHaveBeenCalledWith(expect.objectContaining({
            anonymousVisitorIds: ["subject_existing-client"],
        }));
    });

    it("retains all accepted projection facts and reports the writer's bounded partial result", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        const events = Array.from({ length: 200 }, (_, index) => ({
            type: "page_view" as const,
            timestamp: index + 1,
            path: `/page-${index}`,
        }));

        const response = await POST(new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: {
                cookie: "kandydrops_sid=anon_server-cookie-id",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                anonymousVisitorId: "subject_projection-retention",
                sessionId: "sess_projection-retention",
                batchId: "batch_projection-retention_123456",
                events,
            }),
        }));
        const payload = await response.json();
        const createdBatch = mockState.transactionCreate.mock.calls[0]?.[1] as Record<string, unknown>;

        expect(response.status).toBe(200);
        expect(createdBatch.behavioralTimelineProjectionFactCount).toBe(200);
        expect(createdBatch.behavioralTimelineProjectionFacts).toHaveLength(200);
        expect(mockState.writeBehavioralTimelineProjection).toHaveBeenCalledWith(expect.objectContaining({
            facts: expect.arrayContaining([
                expect.objectContaining({ factId: "batch_projection-retention_123456:0" }),
                expect.objectContaining({ factId: "batch_projection-retention_123456:199" }),
            ]),
        }));
        expect(payload.behavioralTimelineFacts).toMatchObject({
            status: "partial",
            eligibleFactCount: 200,
            written: 120,
            skipped: 80,
            reason: "batch_capped",
        });
    });

    it("retries a deduped batch from every retained fact with the same partial counts", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        const batchId = "batch_projection-retry_123456";
        const anonymousVisitorId = "subject_projection-retry";
        const storedFacts = Array.from({ length: 200 }, (_, index) => ({
            factId: `${batchId}:${index}`,
            actorType: "guest",
            anonymousVisitorId,
            eventName: "semantic_page_viewed",
            normalizedAction: "page_viewed",
            timestampMs: index + 1,
            target: {},
            confidenceInputs: {},
        }));
        mockState.adminDb.runTransaction.mockImplementationOnce(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
            get: vi.fn(async () => ({
                exists: true,
                data: () => ({ behavioralTimelineProjectionFacts: storedFacts }),
            })),
            set: mockState.transactionSet,
            create: mockState.transactionCreate,
        }));

        const response = await POST(new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: {
                cookie: "kandydrops_sid=anon_server-cookie-id",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                anonymousVisitorId,
                sessionId: "sess_projection-retry",
                batchId,
                events: [{ type: "page_view", timestamp: 1, path: "/" }],
            }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            deduped: true,
            processed: 0,
            behavioralTimelineFacts: {
                status: "partial",
                eligibleFactCount: 200,
                written: 120,
                skipped: 80,
                reason: "batch_capped",
            },
        });
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        expect(mockState.writeBehavioralTimelineProjection).toHaveBeenCalledWith(expect.objectContaining({
            facts: storedFacts,
        }));
    });

    it("ignores malformed guest semantic payloads without writing arbitrary event names", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                anonymousVisitorId: "subject_existing-client",
                sessionId: "sess_existing-session",
                events: [{
                    type: "page_view",
                    timestamp: Date.now(),
                    path: "/",
                    semanticEventName: "wallet_purchase_faked",
                }],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toEqual({
            success: false,
            status: "rejected",
            ignored: true,
            reason: "invalid_analytics_payload",
            retryable: false,
            permanent: true,
        });
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
    });

    it("preserves accepted envelope IDs after a quarantined guest event", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        const batchId = "batch_mixed-quarantine_123456";
        const response = await POST(new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST", headers: { cookie: "kandydrops_sid=anon_server-cookie-id", "content-type": "application/json" },
            body: JSON.stringify({ anonymousVisitorId: "subject_current-guest", sessionId: "sess_current-guest", batchId, events: [
                { type: "hover", timestamp: Date.now(), path: "/", targetId: "quarantined-target" },
                { type: "page_view", timestamp: Date.now(), path: "/drops" },
            ] }),
        }));
        expect(response.status).toBe(200);
        expect(normalizeAnonymousRuntimeFact).toHaveBeenCalledOnce();
        expect(normalizeAnonymousRuntimeFact).toHaveBeenCalledWith(expect.objectContaining({ eventId: `${batchId}:1`, sourceOrigin: "accepted_current_guest_ingest" }));
        const stored = mockState.transactionCreate.mock.calls[0]?.[1] as { eventEnvelopes: Array<{ eventId: string }>; runtimeFacts: Array<{ eventId: string }> };
        expect(stored.eventEnvelopes[0].eventId).toBe(`${batchId}:1`);
        expect(stored.runtimeFacts[0].eventId).toBe(`${batchId}:1`);
        expect(mockState.writeBehavioralTimelineProjection).toHaveBeenCalledWith(expect.objectContaining({ facts: [expect.objectContaining({ factId: `${batchId}:1` })] }));
    });

    it("writes accepted current guest source through the actual runtime normalizer and timeline mapper", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.useActualNormalizer = true;
        const response = await POST(new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST", headers: { cookie: "kandydrops_sid=anon_server-cookie-id", "content-type": "application/json" },
            body: JSON.stringify({ anonymousVisitorId: "subject_actual-guest", sessionId: "sess_actual-guest", batchId: "batch_actual-guest_123456", events: [
                { type: "page_view", semanticEventName: "semantic_page_viewed", timestamp: Date.now(), path: "/drops" },
                { type: "click", semanticEventName: "semantic_target_clicked", timestamp: Date.now(), path: "/drops", targetId: "open-drop" },
            ] }),
        }));
        expect(response.status).toBe(200);
        const stored = mockState.transactionCreate.mock.calls[0]?.[1] as { runtimeFacts: Array<Record<string, unknown>>; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        expect(stored.runtimeFacts).toHaveLength(2);
        expect(stored.runtimeFacts).toEqual(expect.arrayContaining([
            expect.objectContaining({ normalizedAction: "page_viewed", sourceTruth: "client", actorLane: "guest", includeInUserBehavior: false, metricEligible: true }),
            expect.objectContaining({ normalizedAction: "target_clicked", sourceTruth: "client", actorLane: "guest", includeInUserBehavior: false, metricEligible: true }),
        ]));
        expect(stored.behavioralTimelineProjectionFacts).toHaveLength(2);
        expect(stored.behavioralTimelineProjectionFacts.every((fact) => fact.sourceTruth === "client" && fact.includeInPersonMetrics === false)).toBe(true);
        const accepted = mockState.transactionCreate.mock.calls[0]?.[1] as { eventEnvelopes: Array<{ eventName: string }>; behavioralEventFacts: Array<{ eventName: string }> };
        expect(accepted.behavioralEventFacts.map(fact => fact.eventName)).toEqual(accepted.eventEnvelopes.map(envelope => envelope.eventName));
    });
});

describe("guest server request admission provenance", () => {
    const batchId = "batch_consent-proof_123456";
    const guestId = "subject_consent-proof";
    const markerVersion = "runtime_fact_request_consent_v1";
    const page = { type: "page_view", semanticEventName: "semantic_page_viewed", timestamp: 1_791_000_000_000, path: "/drops" };
    const click = { type: "click", semanticEventName: "semantic_target_clicked", timestamp: 1_791_000_000_010, path: "/drops", targetId: "open-drop" };
    const marker = (consentMode: string) => ({ version: markerVersion, consentMode });
    const request = (mode: string | null, bodyMode?: string, gpc = false, events: unknown[] = [page, click]) => new NextRequest("http://localhost/api/analytics/ingest", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kandydrops_sid=anon_server-cookie-id${mode === null ? "" : `; kandydrops_analytics_consent=${mode}`}`, ...(gpc ? { "sec-gpc": "1" } : {}) },
        body: JSON.stringify({ anonymousVisitorId: guestId, sessionId: "sess_consent-proof", batchId, ...(bodyMode ? { consentMode: bodyMode } : {}), requestConsentAdmission: marker("full_behavioral"), events }),
    });

    beforeEach(() => {
        mockState.useActualNormalizer = true;
        mockState.useActualRequestConsent = true;
        mockState.guardApiRequest.mockReset();
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.transactionSet.mockReset();
        mockState.transactionCreate.mockReset();
        mockState.adminDb.collection.mockClear();
        mockState.adminDb.runTransaction.mockClear();
        mockState.writeBehavioralTimelineProjection.mockClear();
        vi.mocked(normalizeAnonymousRuntimeFact).mockClear();
        mockState.adminDb.runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: vi.fn(async () => ({ exists: false, data: () => ({}) })), set: mockState.transactionSet, create: mockState.transactionCreate }));
    });

    it.each(["minimal_analytics", "full_analytics"])("saves only admitted page observations with the restrictive %s mode and partial label", async mode => {
        const response = await POST(request(mode, "full_behavioral"));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ acceptedEvents: 1, droppedEvents: 1 });
        const stored = mockState.transactionCreate.mock.calls[0]?.[1] as { consentMode: string; runtimeFacts: Array<Record<string, unknown>>; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        expect(stored.consentMode).toBe(mode);
        expect(stored.runtimeFacts).toEqual([expect.objectContaining({ canonicalEventName: "semantic_page_viewed", requestConsentAdmission: marker(mode), sourceTruth: "client" })]);
        expect(stored.behavioralTimelineProjectionFacts).toEqual([expect.objectContaining({ eventName: "semantic_page_viewed", requestConsentAdmission: marker(mode), consentState: "partial", includeInPersonMetrics: false })]);
        expect(mockState.writeBehavioralTimelineProjection).toHaveBeenCalledWith(expect.objectContaining({ facts: stored.behavioralTimelineProjectionFacts }));
    });

    it("admits full behavioral page and click facts without promoting them to server-confirmed actions", async () => {
        const response = await POST(request("full_behavioral", "full_behavioral"));
        expect(await response.json()).toMatchObject({ acceptedEvents: 2, droppedEvents: 0 });
        const stored = mockState.transactionCreate.mock.calls[0]?.[1] as { runtimeFacts: Array<Record<string, unknown>>; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        expect(stored.runtimeFacts).toHaveLength(2);
        expect(stored.runtimeFacts.every(fact => JSON.stringify(fact.requestConsentAdmission) === JSON.stringify(marker("full_behavioral")))).toBe(true);
        expect(stored.behavioralTimelineProjectionFacts).toEqual(expect.arrayContaining([expect.objectContaining({ eventName: "semantic_target_clicked", requestConsentAdmission: marker("full_behavioral"), consentState: "granted", sourceTruth: "client", confidenceInputs: { schemaComplete: true, hasActor: true, hasTargetWhenRequired: true, hasSession: true, hasServerTruth: false } })]));
    });

    it("honors a narrower batch declaration beneath a full request and excludes the click", async () => {
        const response = await POST(request("full_behavioral", "minimal_analytics"));
        expect(await response.json()).toMatchObject({ acceptedEvents: 1, droppedEvents: 1 });
        const stored = mockState.transactionCreate.mock.calls[0]?.[1] as { consentMode: string; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        expect(stored).toMatchObject({ consentMode: "minimal_analytics", behavioralTimelineProjectionFacts: [expect.objectContaining({ requestConsentAdmission: marker("minimal_analytics"), consentState: "partial" })] });
    });

    it.each([
        ["necessary_only", "full_behavioral", false],
        ["full_behavioral", "full_behavioral", true],
        ["full_behavioral", "necessary_only", false],
        [null, "full_behavioral", false],
        ["invalid_mode", "full_behavioral", false],
    ] as const)("makes denied request/batch/GPC admission %s %s %s free of analytics reads and writes", async (mode, bodyMode, gpc) => {
        const response = await POST(request(mode, bodyMode, gpc));
        expect(await response.json()).toMatchObject({ ignored: true, reason: "analytics_consent_denied" });
        expect(mockState.adminDb.collection.mock.calls.map(([name]) => name).filter(name => name.startsWith("analytics_"))).toEqual([]);
        expect(mockState.transactionSet.mock.calls.filter(([ref]) => ref.collectionName.startsWith("analytics_"))).toEqual([]);
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        expect(normalizeAnonymousRuntimeFact).not.toHaveBeenCalled();
        expect(mockState.writeBehavioralTimelineProjection).not.toHaveBeenCalled();
    });

    it.each([undefined, { version: "legacy_import", consentMode: "full_behavioral" }, { version: markerVersion, consentMode: "granted" }])("does not promote an old or malformed stored projection during admitted replay (%j)", async savedAdmission => {
        await POST(request("full_behavioral", "full_behavioral", false, [page]));
        const stored = structuredClone(mockState.transactionCreate.mock.calls[0]?.[1]) as { behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        const originalFact = stored.behavioralTimelineProjectionFacts[0];
        delete originalFact.requestConsentAdmission;
        if (savedAdmission) originalFact.requestConsentAdmission = savedAdmission;
        const originalSaved = structuredClone(stored);
        mockState.transactionSet.mockClear();
        mockState.transactionCreate.mockClear();
        mockState.writeBehavioralTimelineProjection.mockClear();
        mockState.adminDb.runTransaction.mockImplementationOnce(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: vi.fn(async () => ({ exists: true, data: () => stored })), set: mockState.transactionSet, create: mockState.transactionCreate }));
        const response = await POST(request("full_behavioral", "full_behavioral", false, [page]));
        expect(await response.json()).toMatchObject({ deduped: true, processed: 0 });
        expect(mockState.transactionSet.mock.calls.filter(([ref]) => ref.collectionName.startsWith("analytics_"))).toEqual([]);
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        const projected = mockState.writeBehavioralTimelineProjection.mock.calls[0]?.[0] as { facts: Array<Record<string, unknown>> };
        expect(projected.facts).toHaveLength(1);
        expect(projected.facts[0]).not.toHaveProperty("requestConsentAdmission");
        expect(stored).toEqual(originalSaved);
    });

    it.each(["missing_source", "mismatched_source"] as const)("leaves a replay projection unverified when original batch admission is %s", async sourceState => {
        await POST(request("minimal_analytics", "minimal_analytics", false, [page]));
        const stored = structuredClone(mockState.transactionCreate.mock.calls[0]?.[1]) as { requestConsentAdmission?: unknown; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        if (sourceState === "missing_source") delete stored.requestConsentAdmission;
        else {
            stored.requestConsentAdmission = marker("minimal_analytics");
            stored.behavioralTimelineProjectionFacts[0].requestConsentAdmission = marker("full_behavioral");
        }
        const originalSaved = structuredClone(stored);
        mockState.transactionCreate.mockClear();
        mockState.writeBehavioralTimelineProjection.mockClear();
        mockState.adminDb.runTransaction.mockImplementationOnce(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: vi.fn(async () => ({ exists: true, data: () => stored })), set: mockState.transactionSet, create: mockState.transactionCreate }));
        const response = await POST(request("full_behavioral", "full_behavioral", false, [page]));
        expect(await response.json()).toMatchObject({ deduped: true, processed: 0 });
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        const projected = mockState.writeBehavioralTimelineProjection.mock.calls[0]?.[0] as { facts: Array<Record<string, unknown>> };
        expect(projected.facts).toHaveLength(1);
        expect(projected.facts[0]).not.toHaveProperty("requestConsentAdmission");
        expect(stored).toEqual(originalSaved);
    });

    it("retains every admitted projection during batch replay beyond the bounded runtime-fact diagnostic sample", async () => {
        const events = Array.from({ length: 200 }, (_, index) => ({ ...page, timestamp: page.timestamp + index }));
        await POST(request("minimal_analytics", "minimal_analytics", false, events));
        const stored = structuredClone(mockState.transactionCreate.mock.calls[0]?.[1]) as { requestConsentAdmission?: unknown; runtimeFacts: unknown[]; behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        expect(stored.runtimeFacts).toHaveLength(50);
        expect(stored.behavioralTimelineProjectionFacts).toHaveLength(200);
        expect(stored.requestConsentAdmission).toEqual(marker("minimal_analytics"));
        mockState.transactionCreate.mockClear();
        mockState.writeBehavioralTimelineProjection.mockClear();
        mockState.adminDb.runTransaction.mockImplementationOnce(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: vi.fn(async () => ({ exists: true, data: () => stored })), set: mockState.transactionSet, create: mockState.transactionCreate }));
        const response = await POST(request("full_behavioral", "full_behavioral", false, [page]));
        expect(await response.json()).toMatchObject({ deduped: true, processed: 0 });
        const projected = mockState.writeBehavioralTimelineProjection.mock.calls[0]?.[0] as { facts: Array<Record<string, unknown>> };
        expect(projected.facts).toHaveLength(200);
        expect(projected.facts.every(fact => JSON.stringify(fact.requestConsentAdmission) === JSON.stringify(marker("minimal_analytics")))).toBe(true);
    });

    it("retains the original server-admitted minimal mode during a later full-request replay", async () => {
        await POST(request("minimal_analytics", "minimal_analytics", false, [page]));
        const stored = structuredClone(mockState.transactionCreate.mock.calls[0]?.[1]) as { behavioralTimelineProjectionFacts: Array<Record<string, unknown>> };
        mockState.transactionCreate.mockClear();
        mockState.writeBehavioralTimelineProjection.mockClear();
        mockState.adminDb.runTransaction.mockImplementationOnce(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: vi.fn(async () => ({ exists: true, data: () => stored })), set: mockState.transactionSet, create: mockState.transactionCreate }));
        const response = await POST(request("full_behavioral", "full_behavioral", false, [page]));
        expect(await response.json()).toMatchObject({ deduped: true, processed: 0 });
        expect(mockState.transactionCreate).not.toHaveBeenCalled();
        const projected = mockState.writeBehavioralTimelineProjection.mock.calls[0]?.[0] as { facts: Array<Record<string, unknown>> };
        expect(projected.facts).toEqual([expect.objectContaining({ requestConsentAdmission: marker("minimal_analytics"), consentState: "partial" })]);
    });
});


describe("observed guest session measurement admission", () => {
 const checkpoint={version:"session_measurement_v1",segmentId:"segment_admission_fixture",sequence:1,startedAtMs:1_000,endedAtMs:31_000,activeMs:0,idleMs:30_000,hiddenMs:0,status:"final"};
 function request(mode:string,event:Record<string,unknown>) { return new NextRequest("http://localhost/api/analytics/ingest",{method:"POST",headers:{"content-type":"application/json",cookie:"kandydrops_sid=anon_admission_cookie; kandydrops_analytics_consent="+mode},body:JSON.stringify({anonymousVisitorId:"subject_session-admission",sessionId:"sess_session-admission",batchId:"batch_session-admission_123456",consentMode:"full_behavioral",events:[{type:"session",semanticEventName:"session_closed",timestamp:31_000,path:"/drops",sessionMeasurement:checkpoint,...event}]})}); }
 beforeEach(()=>{mockState.useActualNormalizer=true;mockState.useActualRequestConsent=true;mockState.guardApiRequest.mockReset();mockState.guardApiRequest.mockResolvedValue({uid:null});mockState.transactionCreate.mockClear();mockState.transactionSet.mockClear();mockState.adminDb.collection.mockClear();mockState.writeBehavioralTimelineProjection.mockClear();mockState.adminDb.runTransaction.mockImplementation(async (callback:(transaction:unknown)=>Promise<unknown>)=>callback({get:vi.fn(async()=>({exists:false,data:()=>({})})),set:mockState.transactionSet,create:mockState.transactionCreate}));});
 it("persists an accepted zero checkpoint in the existing batch and timeline",async()=>{
  const response=await POST(request("full_behavioral",{}));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({acceptedEvents:1});
  const saved=mockState.transactionCreate.mock.calls[0]?.[1];expect(saved.runtimeFacts[0].sessionMeasurement).toEqual(checkpoint);expect(saved.behavioralTimelineProjectionFacts[0].sessionMeasurement).toEqual(checkpoint);expect(saved.runtimeFacts[0].sourceTruth).toBe("client");
 });
 it.each(["minimal_analytics","full_analytics"])("denies optional session facts before reads under %s",async mode=>{
  const response=await POST(request(mode,{}));expect(await response.json()).toMatchObject({ignored:true,reason:"analytics_consent_denied"});expect(mockState.transactionCreate).not.toHaveBeenCalled();expect(mockState.adminDb.collection.mock.calls.filter(([name]) => name.startsWith("analytics_"))).toHaveLength(0);
 });
 it.each(["minimal_analytics","full_analytics"])("strips a forged measurement from admitted minimal page storage under %s",async mode=>{
  const response=await POST(request(mode,{type:"page_view",semanticEventName:"semantic_page_viewed"}));expect(await response.json()).toMatchObject({acceptedEvents:1});
  const saved=mockState.transactionCreate.mock.calls[0]?.[1];expect(saved.events[0]).not.toHaveProperty("sessionMeasurement");expect(saved.runtimeFacts[0]).not.toHaveProperty("sessionMeasurement");expect(saved.behavioralTimelineProjectionFacts[0]).not.toHaveProperty("sessionMeasurement");expect(saved.behavioralEventFacts[0]).not.toHaveProperty("sessionMeasurement");
 });
 it("rejects malformed measurement before reading or persisting",async()=>{const response=await POST(request("full_behavioral",{sessionMeasurement:{...checkpoint,activeMs:1}}));expect(response.status).toBe(422);expect(mockState.transactionCreate).not.toHaveBeenCalled();expect(mockState.adminDb.collection.mock.calls.filter(([name]) => name.startsWith("analytics_"))).toHaveLength(0);});
});
