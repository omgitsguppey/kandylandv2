import { describe, expect, it } from "vitest";

import { buildValidatorAuthorityAuditReport, validateValidatorAuthorityAuditReport } from "@/lib/release-readiness/validator-authority-auditor";

describe("validator authority audit", () => {
  it("proves release-critical reconciliation validators have package, source, test, artifact, and doc wiring", () => {
    const report = buildValidatorAuthorityAuditReport(process.cwd());
    for (const scriptName of ["check:claim-truth-audit", "check:automated-truth-reconciliation"]) {
      expect(report.validators.some((entry) => entry.scriptName === scriptName && entry.validatorFileExists)).toBe(true);
    }
    expect(validateValidatorAuthorityAuditReport(report)).toEqual([]);
  }, 120000);
});
