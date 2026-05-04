import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    caller: { uid: "user_1", email: "fan@example.com" },
    observationExists: false,
    profileAllowsAnalytics: true,
    writes: [] as Array<{ type: "set" | "create"; collectionName: string; data: Record<string, unknown> }>,
    guardApiRequest: vi.fn(),
    recordRouteRuntimeSample: vi.fn(async () => undefined),
    recordServerDiagnostic: vi.fn(async () => undefined),
    recordAnalyticsPipelineFailure: vi.fn(async () => undefined),
}));

function makeSnapshot(exists: boolean, data: Record<string, unknown> = {}) {
    return {
        exists,
        data: () => data,
    };
}

function makeRef(collectionName: string, id: string) {
    return {
        collectionName,
        id,
        path: `${collectionName}/${id}`,
        async get() {
            if (collectionName === "users") {
                return makeSnapshot(true, {
                    uid: "user_1",
                    email: "fan@example.com",
                    username: "fan",
                    gumDropsBalance: 1000,
                    unlockedContent: ["drop_1"],
                    unlockedContentTimestamps: { drop_1: 1_700_000_000_000 },
                    privacySettings: {
                        anonymousAnalyticsEnabled: mockState.profileAllowsAnalytics,
                        identifiedAnalyticsEnabled: mockState.profileAllowsAnalytics,
                        allowRecommendations: mockState.profileAllowsAnalytics,
                        showInAnonymousStats: mockState.profileAllowsAnalytics,
                        honorGlobalPrivacyControl: false,
                    },
                });
            }
            if (collectionName === "drops") {
                return makeSnapshot(true, {
                    id: "drop_1",
                    title: "Candy Reel",
                    type: "video",
                    contentUrls: ["https://storage.googleapis.com/private/internal-video.mp4"],
                    contentUrl: "https://storage.googleapis.com/private/internal-video.mp4",
                });
            }
            return makeSnapshot(false);
        },
    };
}

vi.mock("firebase-admin", () => ({
    firestore: {
        FieldValue: {
            serverTimestamp: () => "server_timestamp",
        },
    },
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: {
        collection(collectionName: string) {
            return {
                doc(id: string) {
                    return makeRef(collectionName, id);
                },
            };
        },
        async runTransaction(callback: (transaction: {
            get: (ref: ReturnType<typeof makeRef>) => Promise<ReturnType<typeof makeSnapshot>>;
            set: (ref: ReturnType<typeof makeRef>, data: Record<string, unknown>) => void;
            create: (ref: ReturnType<typeof makeRef>, data: Record<string, unknown>) => void;
        }) => Promise<unknown>) {
            return callback({
                async get(ref) {
                    if (ref.collectionName === "analytics_watch_observations") {
                        return makeSnapshot(mockState.observationExists);
                    }
                    return makeSnapshot(false);
                },
                set(ref, data) {
                    mockState.writes.push({ type: "set", collectionName: ref.collectionName, data });
                },
                create(ref, data) {
                    mockState.writes.push({ type: "create", collectionName: ref.collectionName, data });
                },
            });
        },
    },
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ANALYTICS_WRITE: {},
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/analytics-identifiers", () => ({
    createAnalyticsStorageKey: (prefix: string, ...parts: string[]) => `${prefix}_${parts.join("_")}`,
    isValidAnalyticsWatchSessionId: () => true,
}));

vi.mock("@/lib/server/analytics-event-utils", () => ({
    buildAnalyticsTimeKeys: () => ({
        dayKey: "20260504",
        hourKey: "2026050408",
        minuteKey: "202605040812",
    }),
}));

vi.mock("@/lib/server/analytics-pipeline-health", () => ({
    recordAnalyticsPipelineFailure: mockState.recordAnalyticsPipelineFailure,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));

vi.mock("@/lib/server/not-found", () => ({
    buildNotFoundResponse: (kind: string) => new Response(JSON.stringify({ error: `${kind} not found` }), { status: 404 }),
}));

vi.mock("@/lib/server/analytics-governance", () => ({
    ANALYTICS_CANONICAL_COLLECTIONS: {
        watchSessions: "analytics_watch_sessions",
        watchObservations: "analytics_watch_observations",
        watchAssets: "analytics_watch_assets",
    },
    ANALYTICS_ROUTE_POLICIES: {
        viewerWatchSession: {},
    },
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: (error: unknown) => Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 }),
}));

import { POST } from "@/app/api/viewer/watch-session/route";

const validPayload = {
    watchSessionId: "watch_session_test_1",
    sessionSequence: 1,
    clientSessionId: "client-session-1",
    dropId: "drop_1",
    dropTitle: "Candy Reel",
    dropCategory: "video",
    pagePath: "/dashboard/viewer",
    sessionStartedAtMs: 1_700_000_000_000,
    firstSeenAtMs: 1_700_000_000_000,
    lastSeenAtMs: 1_700_000_015_000,
    closedAtMs: 1_700_000_015_000,
    isClosed: true,
    closeReason: "completed",
    contentCount: 1,
    activeAssetKey: null,
    activeAssetIndex: null,
    totalWatchSeconds: 12,
    totalVisibleSeconds: 15,
    totalActiveSeconds: 12,
    totalPlayingSeconds: 12,
    maxAssetWatchSeconds: 12,
    maxProgressPercent: 90,
    viewedAssetCount: 1,
    completedAssetCount: 1,
    consumedAssetCount: 1,
    assetSwitchCount: 0,
    downloadCount: 0,
    relatedClickCount: 0,
    loadMsTotal: 50,
    loadSampleCount: 1,
    averageLoadMs: 50,
    visibilityHiddenCount: 0,
    hiddenDurationSeconds: 0,
    idleDurationSeconds: 0,
    viewportVisiblePercent: 100,
    documentVisibilityState: "visible",
    hasFocus: true,
    reducedMotion: false,
    displayMode: "browser",
    assets: [{
        assetKey: "drop_1:0",
        assetIndex: 1,
        contentKind: "video",
        firstSeenAtMs: 1_700_000_000_000,
        lastSeenAtMs: 1_700_000_015_000,
        startedAtMs: 1_700_000_000_000,
        totalWatchSeconds: 12,
        totalVisibleSeconds: 15,
        totalActiveSeconds: 12,
        totalPlayingSeconds: 12,
        maxProgressSeconds: 90,
        maxProgressPercent: 90,
        checkpointMaxSeconds: 90,
        durationSeconds: 100,
        consumedAtMs: 1_700_000_015_000,
        completedAtMs: 1_700_000_015_000,
        isConsumed: true,
        isCompleted: true,
        heartbeatCount: 3,
        loadMsTotal: 50,
        loadSampleCount: 1,
        seekCount: 0,
        seekForwardSeconds: 0,
        seekBackwardSeconds: 0,
        waitingCount: 0,
        waitingDurationSeconds: 0,
        playbackRateAverage: 1,
        mutedSampleCount: 0,
        viewportVisiblePercent: 100,
        documentVisibilityState: "visible",
        hasFocus: true,
    }],
};

function makeRequest(payload: unknown, headers?: HeadersInit) {
    return new NextRequest("http://localhost/api/viewer/watch-session", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
    });
}

describe("POST /api/viewer/watch-session", () => {
    beforeEach(() => {
        mockState.guardApiRequest.mockReset();
        mockState.guardApiRequest.mockResolvedValue(mockState.caller);
        mockState.recordRouteRuntimeSample.mockClear();
        mockState.recordServerDiagnostic.mockClear();
        mockState.recordAnalyticsPipelineFailure.mockClear();
        mockState.observationExists = false;
        mockState.profileAllowsAnalytics = true;
        mockState.writes = [];
    });

    it("accepts a valid watch session", async () => {
        const response = await POST(makeRequest(validPayload));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            accepted: true,
            watchScoreSource: "watch_session_rollup",
        });
        expect(mockState.writes.some((write) => write.collectionName === "analytics_watch_sessions")).toBe(true);
        expect(mockState.writes.some((write) => write.data.watchScore === 100 && write.data.watchTier === "completed")).toBe(true);
    });

    it("rejects oversized watch payloads", async () => {
        const response = await POST(makeRequest(validPayload, { "content-length": String(97 * 1024) }));

        expect(response.status).toBe(413);
        expect(mockState.writes).toHaveLength(0);
    });

    it("does not store internal content URLs", async () => {
        await POST(makeRequest({
            ...validPayload,
            contentUrl: "https://storage.googleapis.com/private/leak.mp4",
            contentUrls: ["https://storage.googleapis.com/private/leak.mp4"],
        }));

        expect(JSON.stringify(mockState.writes)).not.toContain("storage.googleapis.com/private");
    });

    it("dedupes repeated watch observations", async () => {
        mockState.observationExists = true;

        const response = await POST(makeRequest(validPayload));
        const body = await response.json();

        expect(body).toMatchObject({
            success: true,
            accepted: false,
            deduped: true,
        });
    });

    it("respects identified analytics consent denial", async () => {
        mockState.profileAllowsAnalytics = false;

        const response = await POST(makeRequest(validPayload));
        const body = await response.json();

        expect(body).toMatchObject({
            success: true,
            ignored: true,
            reason: "identified_analytics_consent_denied",
        });
        expect(mockState.writes).toHaveLength(0);
    });
});
