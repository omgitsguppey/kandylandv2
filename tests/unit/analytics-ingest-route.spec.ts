import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canTrackEvent } from "@/lib/privacy/consent-tracking-policy";

const mockState = vi.hoisted(() => {
    const transactionSet = vi.fn();
    const transactionCreate = vi.fn();

    return {
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

vi.mock("@/lib/server/privacy-consent", () => ({
    requestAllowsAnonymousAnalytics: mockState.requestAllowsAnonymousAnalytics,
    requestHasGlobalPrivacyControl: vi.fn(() => false),
    resolveRequestConsentMode: mockState.resolveRequestConsentMode,
}));

vi.mock("@/lib/telemetry-catalog", () => ({
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

        return null;
    }),
}));

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

vi.mock("@/lib/runtime-facts/normalize-runtime-fact", () => ({
    normalizeAnonymousRuntimeFact: vi.fn((input: Record<string, unknown>) => ({
        fact: {
            eventId: input.eventId,
            anonymousVisitorId: input.anonymousVisitorId,
            metricEligible: true,
            metricExclusionReason: "",
            normalizedAction: "page_viewed",
        },
        diagnostic: null,
    })),
}));

vi.mock("@/lib/server/behavioral-timeline-mapper", () => ({
    mapRuntimeFactToBehavioralTimelineFact: vi.fn((input: { runtimeFact: Record<string, unknown> }) => ({
        ...input.runtimeFact,
        factId: input.runtimeFact.eventId,
        actorType: "guest",
        eventName: "semantic_page_viewed",
        timestampMs: 1,
        target: {},
        confidenceInputs: {},
    })),
}));

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
        mockState.guardApiRequest.mockReset();
        mockState.recordServerDiagnostic.mockReset();
        mockState.recordAnalyticsPipelineFailure.mockReset();
        mockState.requestAllowsAnonymousAnalytics.mockReset();
        mockState.resolveRequestConsentMode.mockReset();
        mockState.writeBehavioralTimelineProjection.mockClear();
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
});
