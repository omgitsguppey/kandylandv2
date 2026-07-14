import { describe, expect, it } from "vitest";

import { buildBackendRouteInventoryReport } from "@/lib/backend-hardening/backend-route-inventory";
import {
  buildBackendServiceOwnershipReport,
  validateBackendServiceOwnershipReport,
} from "@/lib/backend-hardening/backend-service-ownership";

describe("backend service ownership", () => {
  it("declares canonical backend service owners for routed domains", () => {
    const report = buildBackendServiceOwnershipReport({
      currentHead: "test-head",
      inventory: buildBackendRouteInventoryReport({ currentHead: "test-head" }),
    });

    expect(report.servicesCreatedOrReused).toContain("debug/control tower service");
    expect(report.servicesCreatedOrReused).toContain("wallet/payment/GumDrop ledger service");
    expect(report.servicesCreatedOrReused).toContain("analytics ingest/event fact service");
    expect(report.servicesCreatedOrReused.length).toBeGreaterThanOrEqual(13);
    expect(report.routesMissingOwner).toEqual([]);
  });

  it("keeps routes thin by mapping them to a service owner and validator lane", () => {
    const report = buildBackendServiceOwnershipReport({
      currentHead: "test-head",
      inventory: buildBackendRouteInventoryReport({ currentHead: "test-head" }),
    });
    const result = validateBackendServiceOwnershipReport(report);

    expect(result.failures).toEqual([]);
    expect(report.routeServiceMap["/api/admin/debug"]).toBe("debug/control tower service");
    expect(report.routeServiceMap["/api/checkin"]).toBe("task/checkin/reward service");
    expect(report.routeServiceMap["/api/paypal/capture"]).toBe("wallet/payment/GumDrop ledger service");
    expect(report.routeServiceMap["functions:user-index-materializer-schedule"]).toBe("analytics ingest/event fact service");
    expect(report.routeServiceMap["functions:scheduled-http-client"]).toBe("analytics ingest/event fact service");
  });
});
