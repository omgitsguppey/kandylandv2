import { describe, expect, it } from "vitest";

import {
  buildFrontendComponentConsolidationReport,
  buildFrontendSurfaceInventoryReport,
  validateFrontendComponentConsolidationReport,
} from "@/lib/frontend-hardening/frontend-surface-inventory";

describe("frontend component consolidation", () => {
  it("inventories major client surfaces without backend route ownership overlap", () => {
    const report = buildFrontendSurfaceInventoryReport({ currentHead: "test-head" });

    expect(report.majorSurfacesAudited).toBeGreaterThanOrEqual(16);
    expect(report.entries.map((entry) => entry.surfaceId)).toContain("chat");
    expect(report.entries.map((entry) => entry.surfaceId)).toContain("admin_debug");
    expect(report.forbiddenOverlapPaths).toEqual([]);
    expect(report.entries.some((entry) => entry.componentPaths.length > 0)).toBe(true);
  });

  it("keeps the consolidation report compact and classifies bloat without unsafe unknowns", () => {
    const report = buildFrontendComponentConsolidationReport({ currentHead: "test-head" });
    const validation = validateFrontendComponentConsolidationReport(report);

    expect(report.componentsAudited).toBeGreaterThan(100);
    expect(report.bloatedComponentsFound.length).toBeGreaterThan(0);
    expect(report.componentsConsolidated).toContain("component bloat now routes through frontend surface inventory");
    expect(validation.failures).toEqual([]);
  });
});
