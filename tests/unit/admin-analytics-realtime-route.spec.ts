import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
    id: string;
    data: () => Record<string, unknown>;
};

type QueryClause = {
    field: string;
    operator: string;
    value: unknown;
};

type MockQuerySnapshot = {
    docs: MockDoc[];
    size: number;
    empty: boolean;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, MockDoc[]>();

    const createSnapshot = (docs: MockDoc[]): MockQuerySnapshot => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const adminDb = {
        collection(name: string) {
            const clauses: QueryClause[] = [];

            return {
                doc(id?: string) {
                    return {
                        async get() {
                            const docs = collections.get(name) ?? [];
                            const doc = id ? docs.find((d) => d.id === id) : undefined;
                            return {
                                exists: !!doc,
                                id: doc?.id ?? id ?? "new_id",
                                data: () => doc?.data() ?? undefined,
                            };
                        }
                    };
                },
                where(field: string, operator: string, value: unknown) {
                    clauses.push({ field, operator, value });
                    return this;
                },
                async get() {
                    if (name === "analytics_event_facts" && clauses.some((clause) => clause.field === "eventName")) {
                        throw new Error("composite index required");
                    }

                    const docs = (collections.get(name) ?? []).filter((doc) => {
                        const raw = doc.data();

                        return clauses.every((clause) => {
                            if (clause.operator === ">=") {
                                const actual = raw[clause.field];
                                return typeof actual === "number"
                                    && typeof clause.value === "number"
                                    && actual >= clause.value;
                            }

                            return true;
                        });
                    });

                    return createSnapshot(docs) as FirebaseFirestore.QuerySnapshot;
                },
            };
        },
    };

    return {
        collections,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        safeRunRealtimeReport: vi.fn(),
        buildRealtimeSurfaceMix: vi.fn(),
        propertyId: "prop_123",
        analyticsClient: {},
        getAdminAnalyticsPropertyId: vi.fn(() => "prop_123"),
        createAdminAnalyticsDataClient: vi.fn(() => ({})),
        reset() {
            collections.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.safeRunRealtimeReport.mockReset();
            this.buildRealtimeSurfaceMix.mockReset();
            this.propertyId = "prop_123";
            this.analyticsClient = {};
            this.getAdminAnalyticsPropertyId.mockImplementation(() => this.propertyId);
            this.createAdminAnalyticsDataClient.mockImplementation(() => this.analyticsClient);
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN_ANALYTICS_REALTIME_ADAPTIVE: {},
}));

vi.mock("@/lib/server/admin-analytics-shared", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/admin-analytics-shared")>();
    return {
        ...actual,
        safeRunRealtimeReport: mockState.safeRunRealtimeReport,
    };
});

vi.mock("@/lib/server/admin-analytics-context", () => ({
    buildRealtimeSurfaceMix: mockState.buildRealtimeSurfaceMix,
}));

vi.mock("@/lib/server/admin-analytics-data", () => ({
    createAdminAnalyticsDataClient: mockState.createAdminAnalyticsDataClient,
    getAdminAnalyticsPropertyId: mockState.getAdminAnalyticsPropertyId,
}));

import { GET } from "@/app/api/admin/analytics/realtime/route";

describe("GET /api/admin/analytics/realtime", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.buildRealtimeSurfaceMix.mockReturnValue([]);
        mockState.safeRunRealtimeReport
            .mockResolvedValueOnce({
                rows: [{ metricValues: [{ value: "7" }] }],
            })
            .mockResolvedValueOnce({
                rows: [],
            });
    });

    it("loads realtime onboarding stats without the index-sensitive event-name filter", async () => {
        const nowMs = Date.now();
        mockState.collections.set("analytics_active_users", [
            {
                id: "fan_1",
                data: () => ({
                    username: "fan_1",
                    lastSeenAt: nowMs - 5_000,
                    lastEventName: "viewer_opened",
                    lastPagePath: "/drops/test",
                }),
            },
        ]);
        mockState.collections.set("analytics_event_facts", [
            {
                id: "start_1",
                data: () => ({
                    eventName: "guided_onboarding_started",
                    timestamp: nowMs - 60_000,
                    userId: "fan_1",
                    params: {
                        overall_started_at_ms: nowMs - 60_000,
                        source: "onboarding_progress_route",
                    },
                }),
            },
            {
                id: "complete_1",
                data: () => ({
                    eventName: "guided_onboarding_completed",
                    timestamp: nowMs - 30_000,
                    userId: "fan_1",
                    durationMs: 30_000,
                    params: {
                        started_at_ms: nowMs - 60_000,
                        duration_ms: 30_000,
                        source: "complete_onboarding_route",
                    },
                }),
            },
        ]);
        mockState.collections.set("analytics_watch_sessions", [
            {
                id: "watch_1",
                data: () => ({
                    lastSeenAtMs: nowMs - 2_000,
                    captureTransport: "fetch",
                    replayRecovered: false,
                    replayRecoveredCount: 0,
                    flushFailureCount: 0,
                    gapCount: 0,
                    hiddenDurationSeconds: 2,
                    isClosed: true,
                    closeReason: "manual_close",
                }),
            },
        ]);
        mockState.collections.set("analytics_watch_assets", [
            {
                id: "asset_1",
                data: () => ({
                    watchSessionId: "watch_1",
                    lastSeenAtMs: nowMs - 2_000,
                    waitingDurationSeconds: 3,
                    seekCount: 1,
                    playbackRateAverage: 1,
                    mutedSampleCount: 0,
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();
        console.log("PAYLOAD ERROR:", payload);

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            issues: [],
            totalActive: 7,
            deepTrackerActive: 1,
            onboardingStats: {
                starts: 1,
                completions: 1,
                startSource: "tracked",
            },
            watchCaptureHealth: {
                sessionCount: 1,
                fullCaptureCount: 1,
                degradedSessionCount: 0,
                closeMissingCount: 0,
            },
        });
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });
});
