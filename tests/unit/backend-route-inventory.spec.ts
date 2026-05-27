import { describe, expect, it } from "vitest";

import {
  buildBackendRouteInventoryReport,
  validateBackendRouteInventoryReport,
} from "@/lib/backend-hardening/backend-route-inventory";

describe("backend route inventory", () => {
  it("derives API route ownership from source files instead of a static registry", () => {
    const report = buildBackendRouteInventoryReport({ currentHead: "test-head" });

    expect(report.backendRoutesAudited).toBeGreaterThan(100);
    expect(report.entries.some((entry) => entry.routePath === "/api/admin/debug" && entry.ownerSystem === "debug")).toBe(true);
    expect(report.entries.some((entry) => entry.routePath === "/api/viewer/watch-session" && entry.ownerSystem === "watch")).toBe(true);
    expect(report.entries.some((entry) => entry.routePath === "/api/paypal/capture" && entry.ownerSystem === "payments")).toBe(true);
    expect(report.entries.some((entry) => entry.routeClass === "unsupported_unknown")).toBe(false);
  });

  it("requires owner, class, cost, telemetry, and debug mapping for every route", () => {
    const report = buildBackendRouteInventoryReport({ currentHead: "test-head" });
    const result = validateBackendRouteInventoryReport(report);

    expect(result.failures).toEqual([]);
    expect(report.routesMissingOwner).toBe(0);
    expect(report.routesMissingCostClass).toBe(0);
    expect(report.unsafeUnknowns).toEqual([]);
  });
});
