import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    recordServerDiagnostic: vi.fn(async () => undefined),
    recordAnalyticsPipelineFailure: vi.fn(async () => undefined),
    requestAllowsAnonymousAnalytics: vi.fn(() => true),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: {
        collection() {
            throw new Error("adminDb should not be used when guardApiRequest rejects early");
        },
    },
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

describe("POST /api/analytics/ingest", () => {
    beforeEach(() => {
        mockState.guardApiRequest.mockReset();
        mockState.recordServerDiagnostic.mockReset();
        mockState.recordAnalyticsPipelineFailure.mockReset();
        mockState.requestAllowsAnonymousAnalytics.mockReset();
        mockState.recordServerDiagnostic.mockResolvedValue(undefined);
        mockState.recordAnalyticsPipelineFailure.mockResolvedValue(undefined);
        mockState.requestAllowsAnonymousAnalytics.mockReturnValue(true);
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
            retryable: true,
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
            ignored: true,
            reason: "analytics_consent_denied",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            message: "Guest analytics timeline skipped by consent",
        }));
    });
});
