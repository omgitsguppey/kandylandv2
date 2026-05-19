import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const transactionSet = vi.fn();
    const transactionCreate = vi.fn();

    return {
        guardApiRequest: vi.fn(),
        recordServerDiagnostic: vi.fn(async () => undefined),
        recordAnalyticsPipelineFailure: vi.fn(async () => undefined),
        requestAllowsAnonymousAnalytics: vi.fn(() => true),
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
        materializeUserTrackingIndexes: vi.fn(async () => undefined),
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
}));

vi.mock("@/lib/telemetry-catalog", () => ({
    TELEMETRY_EVENT_INDEX_VERSION: 1,
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
    mapRuntimeFactToBehavioralTimelineFact: vi.fn((input: { runtimeFact: unknown }) => input.runtimeFact),
}));

vi.mock("@/lib/server/behavioral-timeline-writer", () => ({
    writeBehavioralTimelineFacts: vi.fn(async () => ({ written: 1, skipped: 0, reason: "written" })),
}));

vi.mock("@/lib/server/user-index-materializer", () => ({
    materializeUserTrackingIndexes: mockState.materializeUserTrackingIndexes,
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

import { POST, resolveCanonicalGuestAnonymousVisitorId } from "@/app/api/analytics/ingest/route";

describe("POST /api/analytics/ingest", () => {
    beforeEach(() => {
        mockState.guardApiRequest.mockReset();
        mockState.recordServerDiagnostic.mockReset();
        mockState.recordAnalyticsPipelineFailure.mockReset();
        mockState.requestAllowsAnonymousAnalytics.mockReset();
        mockState.transactionSet.mockReset();
        mockState.transactionCreate.mockReset();
        mockState.adminDb.collection.mockClear();
        mockState.adminDb.runTransaction.mockClear();
        mockState.materializeUserTrackingIndexes.mockReset();
        mockState.recordServerDiagnostic.mockResolvedValue(undefined);
        mockState.recordAnalyticsPipelineFailure.mockResolvedValue(undefined);
        mockState.requestAllowsAnonymousAnalytics.mockReturnValue(true);
        mockState.adminDb.runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
            get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
            set: mockState.transactionSet,
            create: mockState.transactionCreate,
        }));
        mockState.materializeUserTrackingIndexes.mockResolvedValue(undefined);
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

    it("skips metric ingestion when consent denies anonymous analytics", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: null });
        mockState.requestAllowsAnonymousAnalytics.mockReturnValue(false);

        const request = new NextRequest("http://localhost/api/analytics/ingest", {
            method: "POST",
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
            diagnosticPolicy: "suppressed_high_volume_consent_path",
        });
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
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

    it("uses the client anonymous visitor id for canonical facts while preserving the server session key for storage", async () => {
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
            queueMode: "deferred_non_priority",
            materializer: "analytics_guest_batches_daily",
            anonymousVisitorId: "subject_existing-client",
            batchId: "batch_existing-session_123456",
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
        expect(mockState.materializeUserTrackingIndexes).not.toHaveBeenCalled();
    });
});
