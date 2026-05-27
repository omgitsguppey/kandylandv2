import { describe, expect, it } from "vitest";

import { buildBackendRouteInventoryReport } from "@/lib/backend-hardening/backend-route-inventory";
import {
  buildBackendCostConsolidationReport,
  validateBackendCostConsolidationReport,
} from "@/lib/backend-hardening/backend-cost-consolidation";

describe("backend cost consolidation", () => {
  it("marks admin and debug routes as summary-first with explicit drilldown for raw detail", () => {
    const report = buildBackendCostConsolidationReport({
      currentHead: "test-head",
      inventory: buildBackendRouteInventoryReport({ currentHead: "test-head" }),
    });

    expect(report.adminDebugDefaultMode).toBe("summary_first");
    expect(report.rawDrilldownPolicy).toBe("explicit_paged_drilldown_only");
    expect(report.costRisksReduced).toContain("Admin/debug default summary only");
    expect(report.costRisksReduced).toContain("Diagnostics fingerprinted/hourly");
  });

  it("keeps generated cost evidence compact and flags only unowned unsafe risks", () => {
    const report = buildBackendCostConsolidationReport({
      currentHead: "test-head",
      inventory: buildBackendRouteInventoryReport({ currentHead: "test-head" }),
    });
    const result = validateBackendCostConsolidationReport(report);

    expect(result.failures).toEqual([]);
    expect(report.unsafeUnknowns).toEqual([]);
    expect(report.topCostRisks.length).toBeLessThanOrEqual(10);
  });
});
