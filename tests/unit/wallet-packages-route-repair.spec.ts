import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(async () => ({ uid: "anonymous" })),
  recordRouteWarning: vi.fn(),
  reset() {
    this.guardApiRequest.mockClear();
    this.recordRouteWarning.mockClear();
    this.guardApiRequest.mockResolvedValue({ uid: "anonymous" });
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

import { GET } from "@/app/api/wallet/packages/route";

function buildRequest() {
  return new NextRequest("http://localhost/api/wallet/packages", {
    method: "GET",
  });
}

describe("wallet packages route repair", () => {
  beforeEach(() => mockState.reset());

  it("keeps an unauthenticated success path with explicit route classification", async () => {
    const response = await GET(buildRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      routeStatus: "active_supported_route",
      failureClass: "expected_public_wallet_catalog",
      retryable: false,
      packageSource: "fixed_gumdrop_packages",
    });
    expect(payload.packages.length).toBeGreaterThan(0);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=900");
  });

  it("does not force a dynamic route for the static public package catalog", async () => {
    const route = await import("@/app/api/wallet/packages/route");

    expect("dynamic" in route).toBe(false);
  });

  it("maps expected guard failures to typed non-retryable client errors", async () => {
    mockState.guardApiRequest.mockResolvedValueOnce(null as never);

    const response = await GET(buildRequest());
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      success: false,
      errorCode: "rate_limited",
      routeStatus: "expected_typed_client_error",
      retryable: false,
    });
  });
});
