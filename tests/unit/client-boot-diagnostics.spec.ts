import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  installClientDiagnosticsBridge: vi.fn(),
  recordClientBreadcrumb: vi.fn(),
  recordClientDiagnostic: vi.fn(),
}));

vi.mock("@/lib/client-diagnostics", () => ({
  installClientDiagnosticsBridge: mockState.installClientDiagnosticsBridge,
  recordClientBreadcrumb: mockState.recordClientBreadcrumb,
  recordClientDiagnostic: mockState.recordClientDiagnostic,
}));

describe("client-boot-diagnostics", () => {
  beforeEach(() => {
    vi.resetModules();
    mockState.installClientDiagnosticsBridge.mockReset();
    mockState.recordClientBreadcrumb.mockReset();
    mockState.recordClientDiagnostic.mockReset();

    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
    });
  });

  it("installs the early diagnostics bridge once and records boot readiness", async () => {
    const { installEarlyClientBootDiagnostics } = await import("@/lib/client-boot-diagnostics");

    installEarlyClientBootDiagnostics();
    installEarlyClientBootDiagnostics();

    expect(mockState.installClientDiagnosticsBridge).toHaveBeenCalledTimes(1);
    expect(mockState.recordClientDiagnostic).toHaveBeenCalledWith(
      "runtime",
      "Client boot diagnostics ready",
      expect.objectContaining({
        source: "instrumentation-client",
      }),
    );
  });

  it("records router transition breadcrumbs", async () => {
    const { recordRouterTransitionBreadcrumb } = await import("@/lib/client-boot-diagnostics");

    recordRouterTransitionBreadcrumb("/admin/analytics");

    expect(mockState.recordClientBreadcrumb).toHaveBeenCalledWith(
      "route",
      "/admin/analytics",
      expect.objectContaining({
        source: "router_transition_start",
      }),
    );
  });
});
