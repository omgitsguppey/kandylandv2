import { readFileSync } from "node:fs";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildHistoricalTrafficOverview } from "@/lib/server/admin-analytics-historical-traffic";
import type { AnalyticsReportRow } from "@/lib/server/admin-analytics-shared";

const routeMockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn((error: unknown) => new Response(JSON.stringify({ error: String(error) }), { status: 500 })),
  getAdminAnalyticsPropertyId: vi.fn(() => "prop_123"),
  createAdminAnalyticsDataClient: vi.fn(() => ({})),
  fetchAdminHistoricalAnalyticsSources: vi.fn(),
  getLatestVerifiedSnapshot: vi.fn(),
  recordRouteRuntimeSample: vi.fn(),
  recordAnalyticsRuntimeWarning: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.getAdminAnalyticsPropertyId.mockReset();
    this.createAdminAnalyticsDataClient.mockReset();
    this.fetchAdminHistoricalAnalyticsSources.mockReset();
    this.getLatestVerifiedSnapshot.mockReset();
    this.recordRouteRuntimeSample.mockReset();
    this.recordAnalyticsRuntimeWarning.mockReset();
    this.getAdminAnalyticsPropertyId.mockReturnValue("prop_123");
    this.createAdminAnalyticsDataClient.mockReturnValue({});
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: routeMockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: routeMockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
          get: vi.fn(),
          set: vi.fn(),
      })),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN_ANALYTICS: {},
}));

vi.mock("@/lib/server/admin-analytics-data", () => ({
  createAdminAnalyticsDataClient: routeMockState.createAdminAnalyticsDataClient,
  fetchAdminHistoricalAnalyticsSources: routeMockState.fetchAdminHistoricalAnalyticsSources,
  getAdminAnalyticsPropertyId: routeMockState.getAdminAnalyticsPropertyId,
}));

vi.mock("@/lib/server/admin-analytics-snapshots", () => ({
  getLatestVerifiedSnapshot: routeMockState.getLatestVerifiedSnapshot,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: routeMockState.recordRouteRuntimeSample,
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/analytics-runtime-warning", () => ({
  recordAnalyticsRuntimeWarning: routeMockState.recordAnalyticsRuntimeWarning,
}));

vi.mock("@/lib/server/ephemeral-route-cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/ephemeral-route-cache")>();
  return {
    ...actual,
    readThroughStaleWhileRevalidateEphemeralRouteCache: async (input: { loader: () => Promise<unknown> }) => ({
      value: await input.loader(),
      cacheStatus: "miss",
      cachedAtMs: Date.now(),
      cacheAgeMs: 0,
      revalidating: false,
      validationIssues: [],
      staleButVerified: false,
      retainedBeyondStaleTtl: false,
    }),
  };
});

function doc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  } as FirebaseFirestore.QueryDocumentSnapshot;
}

function row(date: string, values: number[]): AnalyticsReportRow {
  return {
    dimensionValues: [{ value: date }],
    metricValues: values.map((value) => ({ value: String(value) })),
  };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  const generatedAt = new Date("2026-05-13T12:00:00.000Z").toISOString();
  return {
    schemaVersion: "admin_metric_snapshot_v1",
    cacheKey: "admin_analytics:audience_snapshot:30d",
    surfaceKey: "admin_analytics",
    moduleKey: "audience_snapshot",
    rangeKey: "30d",
    values: {
      users: {
        value: 12,
        available: true,
        source: "analytics_metric_facts",
        sourceMode: "verified_cache",
        serverConfirmed: true,
        stale: false,
        estimated: false,
        fallback: false,
        fakeZeroPrevented: false,
      },
      views: {
        value: 30,
        available: true,
        source: "analytics_metric_facts",
        sourceMode: "verified_cache",
        serverConfirmed: true,
        stale: false,
        estimated: false,
        fallback: false,
        fakeZeroPrevented: false,
      },
      sessions: {
        value: 16,
        available: true,
        source: "analytics_metric_facts",
        sourceMode: "verified_cache",
        serverConfirmed: true,
        stale: false,
        estimated: false,
        fallback: false,
        fakeZeroPrevented: false,
      },
      newUsers: {
        value: 4,
        available: true,
        source: "analytics_metric_facts",
        sourceMode: "verified_cache",
        serverConfirmed: true,
        stale: false,
        estimated: false,
        fallback: false,
        fakeZeroPrevented: false,
      },
      mobileUsers: {
        value: 7,
        available: true,
        source: "analytics_metric_facts",
        sourceMode: "verified_cache",
        serverConfirmed: true,
        stale: false,
        estimated: false,
        fallback: false,
        fakeZeroPrevented: false,
      },
    },
    sourceBreakdown: {},
    formulas: {},
    confidence: 0.92,
    truthState: "verified",
    sourceMode: "verified_cache",
    generatedAt,
    lastVerifiedAt: generatedAt,
    expiresAt: new Date("2026-05-13T12:05:00.000Z").toISOString(),
    maxAgeMs: 300000,
    warnings: [],
    parity: [],
    legacyIncluded: false,
    legacyConfidence: null,
    debugPath: "/admin/debug?tab=advanced#analytics-snapshots/audience_snapshot/30d",
    refreshStatus: "completed",
    refreshStartedAt: null,
    refreshCompletedAt: generatedAt,
    duplicateRefreshPrevented: false,
    lastRefreshRequestedAt: null,
    lastRefreshStartedAt: null,
    lastRefreshCompletedAt: generatedAt,
    refreshVersion: 1,
    sourceVersion: generatedAt,
    estimatedFlags: {},
    legacyFlags: {},
    ...overrides,
  };
}

async function callHistoricalRoute(path: string) {
  const { GET } = await import("@/app/api/admin/analytics/historical/route");
  const response = await GET(new NextRequest(`https://kandydrops.test${path}`));
  return {
    response,
    payload: await response.json(),
  };
}

describe("buildHistoricalTrafficOverview", () => {
  it("uses first-party guest rollups and sessions before GA-minus-identified estimation", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [
        row("20260401", [3, 8, 4, 2, 0, 0]),
      ],
      eventRows: [],
      geoRows: [],
      geoPathRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2026-04-01__home", {
          dayKey: "2026-04-01",
          pagePath: "/",
          pageViews: 5,
          clickCount: 1,
          dwellMsTotal: 1000,
          dwellSampleCount: 1,
          lastEventAt: Date.UTC(2026, 3, 1, 12, 0, 0),
        }),
      ],
      analyticsEventFacts: [
        doc("fact_1", {
          eventName: "home_page_viewed",
          timestamp: Date.UTC(2026, 3, 1, 12, 30, 0),
          pagePath: "/",
          dayKey: "2026-04-01",
          hourKey: "2026-04-01T12",
        }),
      ],
      guestBatchDocs: [],
      guestSessionDocs: [
        doc("anon_1_202604011200", {
          sessionKey: "anon_1",
          dayKey: "2026-04-01",
          hourKey: "2026-04-01T12",
          lastReceivedAtMs: Date.UTC(2026, 3, 1, 12, 1, 0),
        }),
      ],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 1, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-01",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.guestTraffic.truthLabel).toBe("exact");
    expect(overview.guestTraffic.sourceLabel).toBe("analytics_page_daily + analytics_sessions");
    expect(overview.guestTraffic.exactGuestViews).toBe(5);
    expect(overview.guestTraffic.exactGuestSessions).toBe(1);
    expect(overview.guestTraffic.qualityAvailable).toBe(true);
    expect(overview.chartData[0]).toMatchObject({
      sourceTruth: "first_party_event_fact",
      evidenceKind: "observed",
      freshnessState: "source_current",
      lateArrivalWindowDays: 12,
      productTruthEligible: false,
    });
    expect(overview.chartData[0]?.dedupeKey).toContain("launch_recovery|page_view");
  });

  it("labels GA-only traffic chart rows as modeled evidence instead of product truth", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [
        row("20260401", [3, 8, 4, 2, 0, 0]),
      ],
      eventRows: [],
      geoRows: [],
      geoPathRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [],
      analyticsEventFacts: [],
      guestBatchDocs: [],
      guestSessionDocs: [],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 1, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-01",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.chartData[0]).toMatchObject({
      users: 3,
      views: 8,
      sessions: 4,
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
      freshnessState: "external_evidence_required",
      lateArrivalWindowDays: 12,
      productTruthEligible: false,
    });
  });

  it("labels region demand rows as modeled GA evidence instead of verified geography truth", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [
        row("20260401", [3, 8, 4, 2, 0, 0]),
      ],
      eventRows: [],
      geoRows: [],
      geoPathRows: [
        {
          dimensionValues: [
            { value: "United States" },
            { value: "Austin" },
            { value: "/" },
          ],
          metricValues: [{ value: "12" }],
        },
        {
          dimensionValues: [
            { value: "United States" },
            { value: "Austin" },
            { value: "/admin/debug" },
          ],
          metricValues: [{ value: "4" }],
        },
      ],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [],
      analyticsEventFacts: [],
      guestBatchDocs: [],
      guestSessionDocs: [],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 1, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-01",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.regionDemandRows[0]).toMatchObject({
      city: "Austin",
      country: "United States",
      rawCount: 16,
      adjustedCount: 12,
      adminInternalCount: 4,
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
      freshnessState: "external_evidence_required",
      confidenceScore: 58,
      lateArrivalWindowDays: 12,
      productTruthEligible: false,
      missingVsZeroState: "source_present",
    });
    expect(overview.regionDemandRows[0]?.dedupeKey).toContain("launch_recovery|page_view");
  });

  it("recovers legacy page rollup dates and view counts from document ids and old fields", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [],
      eventRows: [],
      geoRows: [],
      geoPathRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2026-04-01__home", {
          pagePath: "/",
          viewCount: 4,
        }),
        doc("2026-04-02__home", {
          pagePath: "/",
          views: 6,
        }),
      ],
      analyticsEventFacts: [],
      guestBatchDocs: [],
      guestSessionDocs: [],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 2, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-02",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.chartData.map((point) => point.views)).toEqual([4, 6]);
    expect(overview.guestTraffic.exactGuestViews).toBe(10);
    expect(overview.guestTraffic.truthLabel).toBe("exact");
  });

  it("recovers all-time users and device samples from first-party source facts when GA rows are absent", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [],
      eventRows: [],
      geoRows: [],
      geoPathRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2024-02-10__home", {
          pagePath: "/",
          viewCount: 6,
        }),
      ],
      analyticsEventFacts: [
        doc("fact_mobile_user", {
          eventName: "home_page_viewed",
          timestamp: Date.UTC(2024, 1, 10, 12, 0, 0),
          userId: "user_1",
          sessionId: "session_user_1",
          deviceCategory: "mobile",
          pagePath: "/",
        }),
      ],
      guestBatchDocs: [
        doc("guest_batch_1", {
          anonymousVisitorId: "guest_1",
          sessionId: "session_guest_1",
          deviceCategory: "desktop",
          receivedAtMs: Date.UTC(2024, 1, 10, 12, 5, 0),
          events: [
            {
              type: "page_view",
              path: "/",
              timestamp: Date.UTC(2024, 1, 10, 12, 5, 0),
            },
          ],
        }),
      ],
      guestSessionDocs: [],
      sessionFacts: [
        doc("session_fact_tablet", {
          sessionId: "session_tablet_1",
          userId: "user_2",
          deviceCategory: "tablet",
          dayKey: "2024-02-10",
          firstEventAtMs: Date.UTC(2024, 1, 10, 12, 15, 0),
          startedCount: 1,
          completedCount: 1,
        }),
      ],
      startMs: Date.UTC(2020, 0, 1, 0, 0, 0),
      endMs: Date.UTC(2024, 1, 10, 23, 59, 59),
      startDayKey: "2024-02-10",
      endDayKey: "2024-02-10",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.totals.users).toBe(3);
    expect(overview.totals.views).toBe(7);
    expect(overview.totals.sessions).toBe(3);
    expect(overview.devices).toEqual([
      {
        device: "mobile",
        users: 1,
        sessions: 1,
        engagementRate: 0,
      },
      {
        device: "desktop",
        users: 1,
        sessions: 1,
        engagementRate: 0,
      },
      {
        device: "tablet",
        users: 1,
        sessions: 1,
        engagementRate: 1,
      },
    ]);
  });

  it("trims leading pre-launch empty all-time buckets while preserving post-launch gaps", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [],
      eventRows: [],
      geoRows: [],
      geoPathRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2024-02-10__home", {
          pagePath: "/",
          viewCount: 6,
        }),
      ],
      analyticsEventFacts: [],
      guestBatchDocs: [],
      guestSessionDocs: [],
      sessionFacts: [],
      startMs: Date.UTC(2020, 0, 1, 0, 0, 0),
      endMs: Date.UTC(2024, 1, 11, 23, 59, 59),
      startDayKey: "2020-01-01",
      endDayKey: "2024-02-11",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.chartData[0]?.rawDate).toBe("20240210");
    expect(overview.chartData.map((point) => point.rawDate)).not.toContain("20200101");
    expect(overview.chartData.at(-1)?.rawDate).toBe("20240211");
    expect(overview.chartData.at(-1)?.views).toBe(0);
    expect(overview.chartData.at(-1)).toMatchObject({
      sourceTruth: "source_missing",
      evidenceKind: "missing",
      freshnessState: "source_missing",
      confidenceScore: 0,
      productTruthEligible: false,
    });
    expect(overview.totals.views).toBe(6);
  });
});

describe("admin analytics historical route snapshot authority", () => {
  beforeEach(() => {
    routeMockState.reset();
  });

  it("serves audience historical display from analytics_admin_metric_snapshots before raw or vendor fallback", async () => {
    routeMockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot());

    const { response, payload } = await callHistoricalRoute("/api/admin/analytics/historical?period=30d&section=audienceSnapshot");

    expect(response.status).toBe(200);
    expect(routeMockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot", "30d");
    expect(routeMockState.fetchAdminHistoricalAnalyticsSources).not.toHaveBeenCalled();
    expect(payload.cacheSourceLabel).toBe("analytics_admin_metric_snapshots/audience_snapshot:30d");
    expect(payload.verification.canonicalSource).toBe("analytics_admin_metric_snapshots");
    expect(payload.verification.fallbackSource).toBeNull();
    expect(payload.totals.users).toBe(12);
    expect(payload.devices).toEqual([
      {
        device: "mobile",
        users: 7,
        sessions: 0,
        engagementRate: 0,
      },
    ]);
  }, 15_000);

  it("does not rebuild compact historical display truth from raw collections when a verified snapshot is missing", async () => {
    routeMockState.getLatestVerifiedSnapshot.mockResolvedValue(null);

    const { response, payload } = await callHistoricalRoute("/api/admin/analytics/historical?period=30d&section=audienceSnapshot");

    expect(response.status).toBe(503);
    expect(routeMockState.fetchAdminHistoricalAnalyticsSources).not.toHaveBeenCalled();
    expect(payload.success).toBe(false);
    expect(payload.cacheSourceLabel).toBe("analytics_admin_metric_snapshots/unavailable");
    expect(payload.verification.canonicalSource).toBe("analytics_admin_metric_snapshots");
    expect(payload.verification.fallbackSource).toBe("admin_debug_raw_evidence_only");
    expect(payload.verification.countComposition.rawDisplayFallbackUsed).toBe(0);
    expect(payload.issues).toContain("Raw analytics collections are debug-only and were not used as compact historical display fallback.");
    expect(payload.totals).toBeUndefined();
  }, 15_000);

  it("labels refresh-due canonical historical snapshots as cached truth instead of stale failure", async () => {
    routeMockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot({
      expiresAt: new Date("2026-05-13T11:00:00.000Z").toISOString(),
    }));

    const { response, payload } = await callHistoricalRoute("/api/admin/analytics/historical?period=30d&section=audienceSnapshot");

    expect(response.status).toBe(200);
    expect(payload.cacheState).toBe("refresh_due");
    expect(payload.staleButVerified).toBe(false);
    expect(payload.verification.status).toBe("cached");
    expect(payload.issues).toContain("Serving refresh-due canonical admin metric snapshot; raw analytics collections remain debug-only.");
  }, 15_000);

  it("accepts range as a documented alias for period when resolving historical snapshot authority", async () => {
    routeMockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot({ rangeKey: "all" }));

    const { response, payload } = await callHistoricalRoute("/api/admin/analytics/historical?range=all&section=audienceSnapshot");

    expect(response.status).toBe(200);
    expect(routeMockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot", "all");
    expect(routeMockState.fetchAdminHistoricalAnalyticsSources).not.toHaveBeenCalled();
    expect(payload.cacheSourceLabel).toBe("analytics_admin_metric_snapshots/audience_snapshot:all");
  }, 15_000);

  it("uses canonical guest estimate source truth labels in route diagnostics", () => {
    const source = readFileSync("src/app/api/admin/analytics/historical/route.ts", "utf8");

    expect(source).toContain('? "ga4_evidence_only"');
    expect(source).not.toContain('? "ga4"\n');
  });

  it("routes top drop conversion rows through launch recovery metadata", () => {
    const source = readFileSync("src/app/api/admin/analytics/historical/route.ts", "utf8");

    expect(source).toContain("buildTopDropConversionRecoveryMetricState");
    expect(source).toContain("sourceTruth: recoveryMetadata.sourceTruth");
    expect(source).toContain("resolveAdminAnalyticsRecoveryPanelSourceTruth");
    expect(source).not.toContain('sourceTruth: period === "all" ? "drop_metadata_plus_counters" : "drop_metadata_plus_rollups"');
  });
});
