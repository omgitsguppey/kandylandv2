import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN_ANALYTICS: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { GET } from "@/app/api/admin/analytics/route";

describe("GET /api/admin/analytics redirect route", () => {
  beforeEach(() => {
    mockState.guardApiRequest.mockReset();
    mockState.handleApiError.mockReset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", isAdmin: true });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 403 }));
  });

  it("requires an explicit admin guard before redirecting to analytics lanes", async () => {
    const request = new NextRequest("http://localhost/api/admin/analytics?type=realtime");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/api/admin/analytics/realtime");
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(request, expect.objectContaining({
      auth: "admin",
      routeName: "admin/analytics",
    }));
  });

  it("rejects non-admin callers through the shared API error handler", async () => {
    mockState.guardApiRequest.mockRejectedValue(new Error("Admin access required"));

    const response = await GET(new NextRequest("http://localhost/api/admin/analytics?type=historical"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: "Admin access required" });
    expect(mockState.handleApiError).toHaveBeenCalledWith(expect.any(Error), "Admin.Analytics.Redirect.GET");
  });
});
