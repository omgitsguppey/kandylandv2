import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  return {
    documents,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    adminDb: {
      collection(name: string) {
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
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteRuntimeSample.mockReset();
    },
  };
});

vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: mockState.guardApiRequest }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: mockState.handleApiError }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: mockState.adminDb }));
vi.mock("@/lib/server/rate-limit", () => ({ ADMIN: {} }));
vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { GET } from "@/app/api/admin/overview/route";

describe("admin overview hot-cache route", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", role: "admin" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({ error: String(error) }, { status: 500 }));
  });

  it("does not contain broad raw page-load reads", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/admin/overview/route.ts"), "utf-8");

    expect(source).not.toContain("ADMIN_OVERVIEW_USER_LIMIT");
    expect(source).not.toContain("ADMIN_OVERVIEW_DROP_LIMIT");
    expect(source).not.toContain('collection("users")');
    expect(source).not.toContain('collection("drops")');
    expect(source).not.toContain("limit(5_000)");
    expect(source).not.toContain('fetchCache = "force-no-store"');
    expect(source).not.toContain("revalidate = 0");
    expect(source).toContain("snapshot_doc_plus_heartbeat_doc");
  });

  it("returns cached snapshot payload with heartbeat freshness", async () => {
    const generatedAt = Date.now();
    mockState.documents.set("admin_hot_cache_snapshots/admin_overview_snapshot", {
      payload: {
        success: true,
        generatedAt,
        freshness: { lastTransactionAt: generatedAt, lastAdminActivityAt: generatedAt },
        stats: {
          totalUsers: 7,
          liveDrops: 2,
          totalDrops: 3,
          grossRevenueCents: 1234,
          totalUnwraps: 9,
          currentWindowPurchases: 4,
          currentWindowNewUsers: 5,
        },
        deltas: {
          accounts: { current: 5, previous: 2, percentChange: 150, direction: "up", scopeLabel: "vs prior 30d" },
          purchases: { current: 4, previous: 2, percentChange: 100, direction: "up", scopeLabel: "vs prior 30d" },
          revenue: { current: 1234, previous: 500, percentChange: 146.8, direction: "up", scopeLabel: "vs prior 30d" },
          unwraps: { current: 9, previous: 9, percentChange: 0, direction: "flat", scopeLabel: "vs prior 30d" },
        },
        recentTransactions: [],
        adminActivity: [],
        topDrops: [],
        chartData: [],
        trendSummary: null,
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
    mockState.documents.set("admin_surface_heartbeats/admin_overview_snapshot", {
      heartbeatId: "admin_overview_snapshot:2026-05-25T10:00:00.000Z",
      domain: "admin_overview",
      snapshotId: "admin_overview_snapshot",
      startedAtUtc: "2026-05-25T10:00:00.000Z",
      completedAtUtc: new Date(generatedAt).toISOString(),
      durationMs: 50,
      status: "completed",
      sourceCounts: { snapshotDocs: 1 },
      warningCount: 0,
      errorCount: 0,
      costEstimate: { readOperations: 2, writeOperations: 1, providerCalls: 0, notes: [] },
      nextDueAtUtc: new Date(generatedAt + 3600_000).toISOString(),
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.stats.totalUsers).toBe(7);
    expect(payload.hotCache.pageLoadReadModel).toBe("snapshot_doc_plus_heartbeat_doc");
    expect(payload.hotCache.broadFallbackReadsRun).toBe(false);
    expect(payload.verification.countComposition.snapshotDocsRead).toBe(1);
  });

  it("reports source missing instead of falling back to broad reads", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.issues[0]).toContain("snapshot is missing");
    expect(payload.hotCache.broadFallbackReadsRun).toBe(false);
    expect(payload.platformPulse).toHaveLength(6);
  });
});
