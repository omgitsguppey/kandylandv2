import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  getAdminAnalyticsPreferences: vi.fn(),
  saveAdminAnalyticsModuleRange: vi.fn(),
  handleApiError: vi.fn(),
  recordRouteRuntimeSample: vi.fn(),
  getErrorMessage: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.getAdminAnalyticsPreferences.mockReset();
    this.saveAdminAnalyticsModuleRange.mockReset();
    this.handleApiError.mockReset();
    this.recordRouteRuntimeSample.mockReset();
    this.getErrorMessage.mockReset();
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/admin-analytics-preferences", () => ({
  getAdminAnalyticsPreferences: mockState.getAdminAnalyticsPreferences,
  saveAdminAnalyticsModuleRange: mockState.saveAdminAnalyticsModuleRange,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
  HEAVY_READ: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  getErrorMessage: mockState.getErrorMessage,
}));

import { PUT } from "@/app/api/admin/analytics/preferences/route";

describe("/api/admin/analytics/preferences", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", isAdmin: true });
    mockState.getErrorMessage.mockImplementation((error: unknown) => error instanceof Error ? error.message : String(error));
    mockState.handleApiError.mockImplementation((error: unknown) =>
      NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 }),
    );
  });

  it("returns 413 payload_too_large before parsing an oversized PUT body", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/admin/analytics/preferences", {
      method: "PUT",
      body: "x".repeat(64_001),
      headers: {
        "content-type": "application/json",
        "content-length": "64001",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
      error: "Request payload is too large.",
    });
    expect(mockState.saveAdminAnalyticsModuleRange).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_json for malformed JSON", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/admin/analytics/preferences", {
      method: "PUT",
      body: "{bad",
      headers: {
        "content-type": "application/json",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
      error: "Invalid JSON body.",
    });
    expect(mockState.saveAdminAnalyticsModuleRange).not.toHaveBeenCalled();
  });

  it("persists a valid analytics range preference", async () => {
    mockState.saveAdminAnalyticsModuleRange.mockResolvedValue({
      moduleRanges: {
        commerce_snapshot: "30d",
      },
    });

    const request = new NextRequest("http://localhost/api/admin/analytics/preferences", {
      method: "PUT",
      body: JSON.stringify({
        section: "commerce_snapshot",
        range: "30d",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await PUT(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        auth: "admin",
        requireTrustedOrigin: true,
        routeName: "admin/analytics/preferences",
      }),
    );
    expect(mockState.saveAdminAnalyticsModuleRange).toHaveBeenCalledWith({
      uid: "admin_1",
      section: "commerce_snapshot",
      range: "30d",
    });
    expect(payload.preferences.moduleRanges.commerce_snapshot).toBe("30d");
  });
});
