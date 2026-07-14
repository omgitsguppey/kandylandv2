import { describe, expect, it } from "vitest";

import { buildAutomatedTruthReconciliationReport, validateAutomatedTruthReconciliationReport } from "@/lib/release-readiness/automated-truth-reconciliation";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("automated truth reconciliation", () => {
  it("summarizes honest blockers without clearing formal gates", () => {
    const report = buildAutomatedTruthReconciliationReport(process.cwd());
    expect(report.manualQaRecommended).toBe(false);
    expect(report.securityPrs.length).toBeGreaterThanOrEqual(1);
    expect(report.formalEvidenceStillMissing).toEqual(expect.arrayContaining([
      "provider-backed site activity evidence",
      "deployed route evidence",
      "redacted admin source sample",
    ]));
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateAutomatedTruthReconciliationReport(report),
      expectedIsolationFailures: ["dirty files unclassified."],
    });
  }, 120000);
});
