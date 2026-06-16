import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const collectionCalls: string[] = [];

  return {
    documents,
    collectionCalls,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    adminDb: {
      collection(name: string) {
        collectionCalls.push(name);
        return {
          doc(id: string) {
            return {
              get: async () => {
                const data = documents.get(`${name}/${id}`);
                return {
                  exists: Boolean(data),
                  data: () => data,
                };
              },
            };
          },
        };
      },
    },
    reset() {
      documents.clear();
      collectionCalls.length = 0;
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteRuntimeSample.mockReset();
    },
  };
});

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

import { GET } from "@/app/api/admin/overview/route";

function seedHeartbeat(generatedAt: number) {
  mockState.documents.set("admin_surface_heartbeats/admin_overview_snapshot", {
    heartbeatId: "admin_overview_snapshot:test",
    domain: "admin_overview",
    snapshotId: "admin_overview_snapshot",
    startedAtUtc: new Date(generatedAt - 50).toISOString(),
    completedAtUtc: new Date(generatedAt).toISOString(),
    durationMs: 50,
    status: "completed",
    sourceCounts: { snapshotDocs: 1 },
    warningCount: 0,
    errorCount: 0,
    costEstimate: { readOperations: 2, writeOperations: 1, providerCalls: 0, notes: [] },
    nextDueAtUtc: new Date(generatedAt + 3_600_000).toISOString(),
  });
}

function seedOverviewSnapshot(generatedAt: number) {
  mockState.documents.set("admin_hot_cache_snapshots/admin_overview_snapshot", {
    payload: {
      success: true,
      generatedAt,
      freshness: {
        lastTransactionAt: generatedAt,
        lastAdminActivityAt: generatedAt,
      },
      stats: {
        totalUsers: 2,
        liveDrops: 1,
        totalDrops: 3,
        grossRevenueCents: 12_050,
        totalUnwraps: 44,
        currentWindowPurchases: 5,
        currentWindowNewUsers: 2,
      },
      deltas: {
        accounts: { current: 2, previous: 1, percentChange: 100, direction: "up", scopeLabel: "vs prior 30d" },
        purchases: { current: 5, previous: 2, percentChange: 150, direction: "up", scopeLabel: "vs prior 30d" },
        revenue: { current: 12_050, previous: 5_000, percentChange: 141, direction: "up", scopeLabel: "vs prior 30d" },
        unwraps: { current: 44, previous: 20, percentChange: 120, direction: "up", scopeLabel: "vs prior 30d" },
      },
      recentTransactions: [
        {
          id: "tx_purchase",
          transactionId: "tx_purchase",
          userId: "fan_1",
          username: "fanone",
          amount: 120.5,
          timestamp: generatedAt,
          sourceScope: "overview_snapshot",
        },
      ],
      adminActivity: [
        {
          id: "admin_event_1",
          domain: "admin",
          source: "analytics_event_facts",
          type: "admin_dashboard_viewed",
          label: "Admin dashboard viewed",
          detail: "Admin opened overview",
          actorLabel: "owner@example.com",
          timestamp: generatedAt,
        },
      ],
      topDrops: [],
      chartData: [],
      trendSummary: {
        windowDays: 30,
        currentStartDayKey: "2026-05-17",
        currentEndDayKey: "2026-06-16",
        previousStartDayKey: "2026-04-17",
        previousEndDayKey: "2026-05-17",
        currentRevenueCents: 12_050,
        previousRevenueCents: 5_000,
        currentUnwraps: 44,
        previousUnwraps: 20,
        currentPurchases: 5,
        previousPurchases: 2,
        currentNewUsers: 2,
        previousNewUsers: 1,
        revenueActiveDays: 1,
        unwrapActiveDays: 1,
        bestRevenueDay: null,
        bestUnwrapDay: null,
        topUnlockDrop: {
          dropId: "drop_1",
          title: "Sour Burst",
          unwraps: 7,
        },
      },
      platformPulse: [
        {
          id: "gumdropsCirculation30d",
          label: "GumDrops",
          primaryValue: 575,
          primaryScope: "rolling_30d",
          current30dValue: 575,
          prior30dValue: 300,
          deltaPct: 91.7,
          deltaLabel: "Current 30d vs previous 30d: +91.7%",
          sourceTruth: "materialized_summary",
          freshnessState: "live",
          issueState: "ok",
          warnings: [],
          metadata: {
            rewardGd30d: 25,
            paidGd30d: 500,
            paidBonusGd30d: 50,
            totalCirculationGd30d: 575,
            displayCombinesPaidAndRewardOnly: true,
          },
        },
        {
          id: "supportBugs30d",
          label: "Support/Bugs",
          primaryValue: 2,
          primaryScope: "rolling_30d",
          current30dValue: 2,
          prior30dValue: 1,
          deltaPct: 100,
          deltaLabel: "Current 30d vs previous 30d: +100%",
          sourceTruth: "bounded_aggregate",
          freshnessState: "live",
          issueState: "ok",
          warnings: [],
          metadata: {
            userBugReports30d: 1,
            userSupportRequests30d: 1,
            excludesAiDebugCodeInternalDiagnostics: true,
          },
        },
      ],
      truthNotes: {
        overview: "cached",
        platformPulse: "cached",
        drops: "cached",
        revenue: "cached",
        topDrops: "cached",
        transactions: "cached",
        adminActivity: "cached",
      },
    },
  });
}

describe("GET /api/admin/overview", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", role: "admin" });
    mockState.handleApiError.mockImplementation((error: unknown) =>
      NextResponse.json({ error: String(error) }, { status: 500 }),
    );
  });

  it("returns the cached overview snapshot without broad page-load reads", async () => {
    const generatedAt = Date.now();
    seedOverviewSnapshot(generatedAt);
    seedHeartbeat(generatedAt);

    const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.verification.module).toBe("admin_overview");
    expect(payload.verification.status).toBe("cached");
    expect(payload.verification.countComposition).toMatchObject({
      snapshotDocsRead: 1,
      heartbeatDocsRead: 1,
    });
    expect(payload.stats.totalUsers).toBe(2);
    expect(payload.stats.liveDrops).toBe(1);
    expect(payload.stats.grossRevenueCents).toBe(12_050);
    expect(payload.stats.totalUnwraps).toBe(44);
    expect(payload.stats.currentWindowPurchases).toBe(5);
    expect(payload.deltas.purchases.current).toBe(5);
    expect(payload.deltas.purchases.previous).toBe(2);
    expect(payload.platformPulse.map((metric: { id: string }) => metric.id)).toEqual([
      "gumdropsCirculation30d",
      "supportBugs30d",
    ]);
    expect(payload.platformPulse.find((metric: { id: string }) => metric.id === "gumdropsCirculation30d")).toMatchObject({
      primaryValue: 575,
      primaryScope: "rolling_30d",
      metadata: {
        rewardGd30d: 25,
        paidGd30d: 500,
        paidBonusGd30d: 50,
        totalCirculationGd30d: 575,
        displayCombinesPaidAndRewardOnly: true,
      },
    });
    expect(payload.platformPulse.find((metric: { id: string }) => metric.id === "supportBugs30d")).toMatchObject({
      primaryValue: 2,
      primaryScope: "rolling_30d",
      metadata: {
        userBugReports30d: 1,
        userSupportRequests30d: 1,
        excludesAiDebugCodeInternalDiagnostics: true,
      },
    });
    expect(payload.recentTransactions).toEqual([
      expect.objectContaining({
        id: "tx_purchase",
        username: "fanone",
        sourceScope: "overview_snapshot",
      }),
    ]);
    expect(payload.adminActivity).toEqual([
      expect.objectContaining({
        source: "analytics_event_facts",
        domain: "admin",
        label: "Admin dashboard viewed",
      }),
    ]);
    expect(payload.trendSummary.topUnlockDrop).toEqual({
      dropId: "drop_1",
      title: "Sour Burst",
      unwraps: 7,
    });
    expect(payload.hotCache.pageLoadReadModel).toBe("snapshot_doc_plus_heartbeat_doc");
    expect(payload.hotCache.broadFallbackReadsRun).toBe(false);
    expect(payload.hotCache.platformPulseMaterializerSources).toContain("analytics_commerce_daily");
    expect(payload.hotCache.platformPulseMaterializerSources).toContain("analytics_task_daily");
    expect(payload.hotCache.supportBugUserChannels).toEqual(["support_request", "bug_report"]);
    expect(mockState.collectionCalls).toEqual([
      "admin_hot_cache_snapshots",
      "admin_surface_heartbeats",
    ]);
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("reports source missing when the hot-cache snapshot is unavailable", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.verification.status).toBe("unavailable");
    expect(payload.issues[0]).toContain("snapshot is missing");
    expect(payload.stats.grossRevenueCents).toBe(0);
    expect(payload.stats.totalUnwraps).toBe(0);
    expect(payload.platformPulse).toHaveLength(6);
    expect(payload.hotCache.broadFallbackReadsRun).toBe(false);
    expect(payload.hotCache.platformPulseMaterializerSources).toEqual([
      "analytics_commerce_daily",
      "analytics_task_daily",
    ]);
    expect(mockState.collectionCalls).toEqual([
      "admin_hot_cache_snapshots",
      "admin_surface_heartbeats",
    ]);
  });
});
