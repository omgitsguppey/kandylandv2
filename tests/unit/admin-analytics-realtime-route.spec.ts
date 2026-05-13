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

function buildCanonicalMetricSnapshot(generatedAtMs: number, overrides: Record<string, unknown> = {}) {
    const generatedAt = new Date(generatedAtMs).toISOString();
    return {
        schemaVersion: "admin_metric_snapshot_v1",
        cacheKey: "admin_analytics:live_pulse:24h",
        surfaceKey: "admin_analytics",
        moduleKey: "live_pulse",
        rangeKey: "24h",
        values: {
            totalActive: {
                value: 9,
                available: true,
                source: "verified_snapshot",
                sourceMode: "verified_cache",
                serverConfirmed: true,
                stale: false,
                estimated: false,
                fallback: false,
                fakeZeroPrevented: false,
            },
            deepTrackerActive: {
                value: 6,
                available: true,
                source: "verified_snapshot",
                sourceMode: "verified_cache",
                serverConfirmed: true,
                stale: false,
                estimated: false,
                fallback: false,
                fakeZeroPrevented: false,
            },
            uniqueAnonymousVisitorCount: {
                value: 3,
                available: true,
                source: "verified_snapshot",
                sourceMode: "verified_cache",
                serverConfirmed: true,
                stale: false,
                estimated: false,
                fallback: false,
                fakeZeroPrevented: false,
            },
        },
        sourceBreakdown: {
            sourceSampleCounts: {
                analytics_guest_batches: 2,
            },
        },
        formulas: {},
        confidence: 0.94,
        truthState: "verified",
        sourceMode: "verified_cache",
        generatedAt,
        lastVerifiedAt: generatedAt,
        expiresAt: new Date(generatedAtMs + 5 * 60_000).toISOString(),
        maxAgeMs: 5 * 60_000,
        warnings: [],
        parity: [],
        legacyIncluded: false,
        legacyConfidence: null,
        debugPath: "/admin/debug?tab=advanced#analytics-snapshots/live_pulse/24h",
        refreshStatus: "completed",
        refreshStartedAt: null,
        refreshCompletedAt: generatedAt,
        duplicateRefreshPrevented: false,
        lastRefreshRequestedAt: generatedAt,
        lastRefreshStartedAt: generatedAt,
        lastRefreshCompletedAt: generatedAt,
        refreshVersion: 1,
        sourceVersion: generatedAt,
        estimatedFlags: {},
        legacyFlags: {},
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

    it("serves canonical admin metric snapshot before legacy realtime summary", async () => {
        const generatedAtMs = Date.now() - 1_000;
        mockState.collections.set("analytics_admin_metric_snapshots", [
            {
                id: "live_pulse:24h",
                data: () => buildCanonicalMetricSnapshot(generatedAtMs),
            },
        ]);
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
            cacheSourceLabel: "analytics_admin_metric_snapshots/live_pulse:24h",
            totalActive: 9,
            deepTrackerActive: 6,
            liveTruthLabel: "cached",
            verification: {
                canonicalSource: "analytics_admin_metric_snapshots",
                fallbackSource: null,
                status: "cached",
            },
            guestAnalyticsSnapshot: {
                guestTruthState: "live",
                guestSamplesAvailable: true,
                guestBatchCount: 2,
                uniqueAnonymousVisitorCount: 3,
            },
        });
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
    });

    it("serves fresh realtime_summary only as fallback evidence when canonical snapshot is missing", async () => {
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
            cacheSourceLabel: "analytics_aggregate_stats/realtime_summary:fallback_live_pulse_evidence",
            totalActive: 12,
            deepTrackerActive: 8,
            liveTruthLabel: "cached",
            activeUsersTruthLabel: "cached",
            verification: {
                canonicalSource: "analytics_admin_metric_snapshots",
                fallbackSource: "analytics_aggregate_stats/realtime_summary",
                status: "cached",
            },
        });
        expect(payload.issues).toContain("Using legacy realtime_summary fallback evidence because canonical admin metric snapshot is unavailable.");
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
            cacheSourceLabel: "analytics_aggregate_stats/realtime_summary:fallback_live_pulse_evidence",
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
        expect(payload.issues).toContain("Using legacy realtime_summary fallback evidence because canonical admin metric snapshot is unavailable.");
        expect(payload.issues).toContain("Serving stale admin realtime analytics hot cache while the scheduled materializer catches up.");
        expect(payload.verification.status).toBe("stale");
        expect(payload.verification.fallbackSource).toBe("analytics_aggregate_stats/realtime_summary");
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

    it("does not use raw collection or provider fallback when no snapshot authority exists", async () => {
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

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            cacheState: "miss",
            cacheSourceLabel: "analytics_admin_metric_snapshots/unavailable",
            liveTruthLabel: "failed",
            activeUsersTruthLabel: "failed",
            verification: {
                canonicalSource: "analytics_admin_metric_snapshots",
                fallbackSource: null,
                status: "failed",
            },
        });
        expect(payload.totalActive).toBeUndefined();
        expect(payload.issues).toContain("No verified admin metric snapshot is available; raw analytics collections are debug-only and were not used as compact display fallback.");
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("labels stale canonical snapshots as stale cache instead of live", async () => {
        const generatedAtMs = Date.now() - 40 * 60_000;
        mockState.collections.set("analytics_admin_metric_snapshots", [
            {
                id: "live_pulse:24h",
                data: () => buildCanonicalMetricSnapshot(generatedAtMs, {
                    sourceMode: "stale_cache",
                    truthState: "stale",
                    expiresAt: new Date(generatedAtMs - 1_000).toISOString(),
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/analytics/realtime");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.cacheSourceLabel).toBe("analytics_admin_metric_snapshots/live_pulse:24h");
        expect(payload.liveTruthLabel).toBe("stale");
        expect(payload.activeUsersTruthLabel).toBe("stale");
        expect(payload.staleButVerified).toBe(true);
        expect(payload.verification.status).toBe("stale");
        expect(payload.issues).toContain("Serving stale canonical admin metric snapshot; realtime_summary remains fallback evidence only.");
        expect(mockState.safeRunRealtimeReport).not.toHaveBeenCalled();
    });
});
