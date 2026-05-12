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
                        },
                        async set(value: Record<string, unknown>, options?: { merge?: boolean }) {
                            const docs = collections.get(name) ?? [];
                            const existingIndex = id ? docs.findIndex((d) => d.id === id) : -1;
                            const existing = existingIndex >= 0 ? docs[existingIndex]?.data() ?? {} : {};
                            const nextData = options?.merge ? { ...existing, ...value } : value;
                            const nextDoc = {
                                id: id ?? "new_id",
                                data: () => nextData,
                            };
                            if (existingIndex >= 0) {
                                docs[existingIndex] = nextDoc;
                            } else {
                                docs.push(nextDoc);
                            }
                            collections.set(name, docs);
                        }
                    };
                },
                where(field: string, operator: string, value: unknown) {
                    clauses.push({ field, operator, value });
                    return this;
                },
                limit() {
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

vi.mock("@/lib/server/ephemeral-route-cache", () => ({
    readThroughEphemeralRouteCache: async (input: { loader: () => Promise<unknown> }) => input.loader(),
}));

vi.mock("@/lib/server/analytics-runtime-warning", () => ({
    recordAnalyticsRuntimeWarning: vi.fn(),
}));

import { GET } from "@/app/api/admin/analytics/realtime/route";

function buildCachedGuestSnapshot(generatedAtMs: number, overrides: Record<string, unknown> = {}) {
    return {
        generatedAtMs,
        refreshedAtMs: generatedAtMs,
        sourceWindowMs: 30 * 60 * 1000,
        sourceWindowLabel: "last_30_minutes",
        guestBatchCount: 2,
        guestEventCount: 7,
        guestSessionCount: 2,
        uniqueAnonymousVisitorCount: 2,
        guestBounceCount: 1,
        guestBounceRate: 0.5,
        guestSamplesAvailable: true,
        guestTruthState: "live",
        sourceCollectionsUsed: ["analytics_guest_batches"],
        sourceSampleCounts: {
            analytics_guest_batches: 2,
        },
        notes: [],
        ...overrides,
    };
}

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

    it("serves fresh realtime hot cache without cold GA or Firestore reads", async () => {
        const generatedAtMs = Date.now() - 1_000;
        mockState.collections.set("analytics_aggregate_stats", [
            {
                id: "realtime_summary",
                data: () => ({
                    success: true,
                    generatedAtMs,
                    totalActive: 12,
                    deepTrackerActive: 8,
                    liveTruthLabel: "live",
                    liveSourceLabel: "analytics_aggregate_stats/realtime_summary",
                    activeUsersTruthLabel: "live",
                    activeUsersSourceLabel: "analytics_active_users",
                    data: [],
                    activeUsers: [],
                    surfaceMix: [],
                    guestAnalyticsSnapshot: buildCachedGuestSnapshot(generatedAtMs),
                    watchCaptureHealth: { sessionCount: 0, warnings: [] },
                    issues: [],
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            generatedAtMs,
            cacheState: "fresh",
            cacheSourceLabel: "analytics_aggregate_stats/realtime_summary",
            totalActive: 12,
            deepTrackerActive: 8,
            liveTruthLabel: "live",
            guestAnalyticsSnapshot: {
                guestTruthState: "live",
                guestSamplesAvailable: true,
                guestBatchCount: 2,
                guestEventCount: 7,
                uniqueAnonymousVisitorCount: 2,
            },
        });
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
    });

    it("serves stale realtime hot cache truthfully instead of blocking on cold reads", async () => {
        const generatedAtMs = Date.now() - 10 * 60_000;
        mockState.collections.set("analytics_aggregate_stats", [
            {
                id: "realtime_summary",
                data: () => ({
                    success: true,
                    generatedAtMs,
                    totalActive: 4,
                    deepTrackerActive: 3,
                    liveTruthLabel: "live",
                    liveSourceLabel: "analytics_aggregate_stats/realtime_summary",
                    activeUsersTruthLabel: "live",
                    activeUsersSourceLabel: "analytics_active_users",
                    data: [],
                    activeUsers: [],
                    surfaceMix: [],
                    guestAnalyticsSnapshot: buildCachedGuestSnapshot(generatedAtMs),
                    watchCaptureHealth: { sessionCount: 0, warnings: [] },
                    issues: [],
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            generatedAtMs,
            cacheState: "stale",
            totalActive: 4,
            deepTrackerActive: 3,
            liveTruthLabel: "stale",
            activeUsersTruthLabel: "stale",
            guestAnalyticsSnapshot: {
                guestTruthState: "stale",
                guestSamplesAvailable: true,
                guestBatchCount: 2,
            },
        });
        expect(payload.issues).toContain("Serving stale admin realtime analytics hot cache while the scheduled materializer catches up.");
        expect(payload.verification.status).toBe("stale");
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
    });

    it("does not normalize missing guest snapshot evidence into live zero counts", async () => {
        const generatedAtMs = Date.now() - 1_000;
        mockState.collections.set("analytics_aggregate_stats", [
            {
                id: "realtime_summary",
                data: () => ({
                    success: true,
                    generatedAtMs,
                    totalActive: 2,
                    deepTrackerActive: 1,
                    liveTruthLabel: "live",
                    liveSourceLabel: "analytics_aggregate_stats/realtime_summary",
                    activeUsersTruthLabel: "live",
                    activeUsersSourceLabel: "analytics_active_users",
                    data: [],
                    activeUsers: [],
                    surfaceMix: [],
                    guestAnalyticsSnapshot: buildCachedGuestSnapshot(generatedAtMs, {
                        guestBatchCount: 0,
                        guestEventCount: 0,
                        guestSessionCount: 0,
                        uniqueAnonymousVisitorCount: 0,
                        guestBounceCount: 0,
                        guestBounceRate: null,
                        guestSamplesAvailable: true,
                        sourceSampleCounts: {
                            analytics_guest_batches: 0,
                        },
                    }),
                    watchCaptureHealth: { sessionCount: 0, warnings: [] },
                    issues: [],
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.guestAnalyticsSnapshot).toMatchObject({
            guestTruthState: "unavailable",
            guestSamplesAvailable: false,
            guestBatchCount: 0,
            uniqueAnonymousVisitorCount: 0,
        });
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
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

    it("treats analytics_active_users as the primary live lane when GA realtime is empty", async () => {
        const nowMs = Date.now();
        mockState.safeRunRealtimeReport.mockReset();
        mockState.safeRunRealtimeReport
            .mockResolvedValueOnce({
                rows: [{ metricValues: [{ value: "0" }] }],
            })
            .mockResolvedValueOnce({
                rows: [],
            });
        mockState.collections.set("analytics_active_users", [
            {
                id: "fan_1",
                data: () => ({
                    username: "fan_1",
                    lastSeenAt: nowMs - 5_000,
                    lastEventName: "home_page_viewed",
                    lastPagePath: "/",
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.liveTruthLabel).toBe("live");
        expect(payload.liveSourceLabel).toBe("analytics_active_users");
        expect(payload.activeUsersTruthLabel).toBe("live");
        expect(payload.activeUsersSourceLabel).toBe("analytics_active_users");
        expect(payload.issues).not.toContain("Live identity lane fell back from analytics_active_users to recent event facts and watch sessions.");
        expect(payload.issues).not.toContain("GA realtime returned no active users; live pulse is using first-party fallback counts.");
        expect(payload.data.find((point: { minute: number; users: number }) => point.minute === 0)?.users).toBe(1);
    });
});
