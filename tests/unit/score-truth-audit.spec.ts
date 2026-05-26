import { describe, expect, it } from "vitest";

import { buildScoreTruthAuditReport, validateScoreTruthAuditReport } from "@/lib/release-readiness/score-truth-auditor";

describe("score truth audit", () => {
  it("keeps beta exit false and verifies the weighted score formula", () => {
    const report = buildScoreTruthAuditReport(process.cwd());
    expect(report.betaExitReady).toBe(false);
    expect(report.formulaMatches).toBe(true);
    expect(report.costRiskHonestlyClassified).toBe(true);
    expect(validateScoreTruthAuditReport(report)).toEqual([]);
  }, 120000);
});
