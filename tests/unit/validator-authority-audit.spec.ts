import { describe, expect, it } from "vitest";

import {
  buildValidatorAuthorityAuditReport,
  compactTruthReconciliationReport,
  validateValidatorAuthorityAuditReport,
} from "@/lib/release-readiness/validator-authority-auditor";

describe("validator authority audit", () => {
  it("proves release-critical reconciliation validators have package, source, test, artifact, and doc wiring", () => {
    const report = buildValidatorAuthorityAuditReport(process.cwd());
    for (const scriptName of ["check:claim-truth-audit", "check:automated-truth-reconciliation"]) {
      expect(report.validators.some((entry) => entry.scriptName === scriptName && entry.validatorFileExists)).toBe(true);
    }
    expect(validateValidatorAuthorityAuditReport(report)).toEqual([]);
  }, 120000);

  it("emits compact generated authority evidence instead of duplicating the full validator inventory", () => {
    const report = buildValidatorAuthorityAuditReport(process.cwd());
    const compact = compactTruthReconciliationReport("validator-authority-audit", report);

    expect("validators" in compact).toBe(false);
    expect(compact.reportKey).toBe("validator-authority-audit");
    expect(compact.validationFailures).toEqual([]);
  }, 120000);
});
