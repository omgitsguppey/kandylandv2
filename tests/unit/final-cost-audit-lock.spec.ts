import { describe, expect, it } from "vitest";

import { validateFinalCostAuditLock } from "../../scripts/agent/validate-final-cost-audit-lock";

describe("final cost audit lock", () => {
  it("represents exactly all 50 audit items", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });

    expect(report.summary.totalAuditItems).toBe(50);
    expect(report.auditItemCoverage).toHaveLength(50);
    expect(report.auditItemCoverage.map((item) => item.item)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
  });

  it("requires fixed rows to carry artifact and check evidence", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });
    const fixedRows = report.auditItemCoverage.filter((item) => item.status === "fixed");

    expect(fixedRows.length).toBeGreaterThan(0);
    expect(fixedRows.every((item) => item.artifact.length > 0 && item.validator.length > 0 && item.sourceFiles.length > 0)).toBe(true);
  });

  it("requires deferred rows to carry a reason", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });
    const deferredRows = report.auditItemCoverage.filter((item) => item.status !== "fixed");

    expect(deferredRows.length).toBeGreaterThan(0);
    expect(deferredRows.every((item) => item.reason.length > 0)).toBe(true);
  });

  it("keeps beta exit false without manual/provider/runtime evidence", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });

    expect(report.summary.betaScore).toBeGreaterThan(0);
    expect(report.summary.betaScore).toBeLessThan(100);
    expect(report.summary.betaStatus).toMatch(/evidence|required|stale|blocked/iu);
    expect(report.summary.canStartBetaExitReview).toBe(false);
  });

  it("only preserves tracking accuracy when runtime watch and priority ingest checks are represented", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });

    expect(report.summary.trackingAccuracyPreserved).toBe(true);
    expect(JSON.stringify(report.trackingAccuracyGuards)).toContain("npm run check:runtime-watch-time-v2");
    expect(JSON.stringify(report.trackingAccuracyGuards)).toContain("npm run check:analytics-hot-path-cost-reduction");
  });

  it("represents open PR count and dirty working tree actions", () => {
    const report = validateFinalCostAuditLock({ writeReport: false });

    expect(typeof report.summary.openPrCount).toBe("number");
    expect(report.dirtyFileActions.length).toBeGreaterThan(0);
  });
});
