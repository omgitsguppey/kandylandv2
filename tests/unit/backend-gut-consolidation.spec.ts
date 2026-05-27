import { describe, expect, it } from "vitest";

import {
  buildBackendGutConsolidationReport,
  validateBackendGutConsolidationReport,
} from "@/lib/backend-hardening/backend-service-consolidator";

describe("backend gut consolidation", () => {
  it("summarizes route, service, cost, duplicate, and memory consolidation in one compact report", () => {
    const report = buildBackendGutConsolidationReport({ currentHead: "test-head" });

    expect(report.backendRoutesAudited).toBeGreaterThan(100);
    expect(report.servicesCreatedOrReused.length).toBeGreaterThanOrEqual(13);
    expect(report.duplicateDebugLanesRetired).toContain("admin/debug raw detail default classified as drilldown_only");
    expect(report.generatedArtifactsShrunk).toContain("backend route inventory compact summary");
    expect(report.memoryWriteback.entriesAdded).toBeGreaterThanOrEqual(1);
  });

  it("does not allow unsafe unknown backend ownership or oversized generated artifacts", () => {
    const report = buildBackendGutConsolidationReport({ currentHead: "test-head" });
    const result = validateBackendGutConsolidationReport(report);

    expect(result.failures).toEqual([]);
    expect(report.unsafeUnknowns).toEqual([]);
    expect(report.remainingGaps.some((gap) => /provider proof/u.test(gap))).toBe(true);
  });
});
