import { describe, expect, it } from "vitest";

import { buildFinalOperatorEvidenceNeededReport, validateFinalOperatorEvidenceNeededReport } from "@/lib/release-readiness/final-beta-exit-closure";

describe("final operator evidence needed", () => {
  it("lists exact human evidence without turning source checks into formal proof", () => {
    const report = buildFinalOperatorEvidenceNeededReport(process.cwd());
    expect(report.betaExitReady).toBe(false);
    expect(report.items.map((item) => item.id)).toContain("formal-provider-smoke");
    expect(report.items.map((item) => item.id)).not.toContain("operator-final-visual-qa");
    expect(report.items.every((item) => item.acceptableEvidenceFormat.length > 0 && item.whatItDoesNotProve.length > 0)).toBe(true);
    expect(validateFinalOperatorEvidenceNeededReport(report)).toEqual([]);
  });
});
