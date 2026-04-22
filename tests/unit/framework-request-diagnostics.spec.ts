import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  recordRouteFailure: vi.fn(),
  recordRuntimeWarning: vi.fn(),
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteFailure: mockState.recordRouteFailure,
}));

vi.mock("@/lib/server/runtime-warning-store", () => ({
  recordRuntimeWarning: mockState.recordRuntimeWarning,
}));

describe("framework-request-diagnostics", () => {
  beforeEach(() => {
    mockState.recordRouteFailure.mockReset();
    mockState.recordRuntimeWarning.mockReset();
  });

  it("records both a route failure and runtime warning for framework request errors", async () => {
    const { recordFrameworkRequestError } = await import("@/lib/server/framework-request-diagnostics");

    await recordFrameworkRequestError({
      error: new Error("render exploded"),
      request: {
        method: "GET",
        url: "https://kandydrops.test/api/admin/analytics/realtime",
        headers: new Headers({
          "x-request-id": "req_123",
        }),
      },
      context: {
        routerKind: "App Router",
        routePath: "/api/admin/analytics/realtime",
        routeType: "route_handler",
        renderSource: "route.js",
        renderType: "dynamic",
      },
    });

    expect(mockState.recordRouteFailure).toHaveBeenCalledWith(
      "next/request-error:/api/admin/analytics/realtime",
      expect.any(Error),
      expect.objectContaining({
        channel: "runtime",
        traceId: "req_123",
        moduleKey: "route_handler",
      }),
    );

    expect(mockState.recordRuntimeWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "framework_request_error",
        surface: "/api/admin/analytics/realtime",
        executionLayer: "next_route",
        status: "failed",
      }),
    );
  });
});
