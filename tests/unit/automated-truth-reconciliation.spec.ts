import { describe, expect, it } from "vitest";

import { buildAutomatedTruthReconciliationReport, validateAutomatedTruthReconciliationReport } from "@/lib/release-readiness/automated-truth-reconciliation";

describe("automated truth reconciliation", () => {
  it("summarizes honest blockers without clearing formal gates", () => {
    const report = buildAutomatedTruthReconciliationReport(process.cwd());
    expect(report.manualQaRecommended).toBe(false);
    expect(report.securityPrs.length).toBeGreaterThanOrEqual(1);
    expect(report.formalEvidenceStillMissing).toContain("runtime/provider smoke");
    expect(validateAutomatedTruthReconciliationReport(report)).toEqual([]);
  }, 120000);
});
