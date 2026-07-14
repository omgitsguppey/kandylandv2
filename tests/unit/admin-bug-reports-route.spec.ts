import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
  const docs: MockDoc[] = [];
  const query = {
    orderBy: vi.fn(() => query),
    limit: vi.fn(() => query),
    get: vi.fn(async () => ({ docs, size: docs.length, empty: docs.length === 0 })),
  };

  return {
    docs,
    query,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    reset() {
      docs.length = 0;
      query.orderBy.mockClear();
      query.limit.mockClear();
      query.get.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteRuntimeSample.mockReset();
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
  HEAVY_READ: {},
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
  getErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => mockState.query),
  },
}));

import { GET } from "@/app/api/admin/debug/bug-reports/route";

describe("GET /api/admin/debug/bug-reports", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", role: "admin" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
  });

  it("requires admin auth and reads at most 50 reports", async () => {
    mockState.docs.push({
      id: "bug_1",
      data: () => ({
        userId: "user_1",
        errorKey: "internal_server_error",
        surface: "runtime",
        route: "/drops",
        status: "rewarded",
        rewardGd: 10,
        createdAt: 1_800_000_000_000,
        sanitizedContext: { token: "raw" },
      }),
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/debug/bug-reports"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "admin",
      scopeToCaller: true,
    }));
    expect(mockState.query.limit).toHaveBeenCalledWith(50);
    expect(body.summary.totalReports).toBe(1);
    expect(body.summary.latestReports[0].sanitizedContext).toEqual({});
    expect(body.reports[0]).toEqual(expect.objectContaining({
      id: "bug_1",
      status: "rewarded",
      rewardGd: 10,
    }));
    expect(body.reports[0]).not.toHaveProperty("sanitizedContext");
    expect(JSON.stringify(body)).not.toContain('"token"');
  });

  it("does not export mutation handlers", async () => {
    const routeModule = await import("@/app/api/admin/debug/bug-reports/route") as Record<string, unknown>;
    expect(routeModule.POST).toBeUndefined();
    expect(routeModule.PUT).toBeUndefined();
    expect(routeModule.PATCH).toBeUndefined();
    expect(routeModule.DELETE).toBeUndefined();
  });
});
