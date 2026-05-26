import { describe, expect, it } from "vitest";

import { buildClaimTruthAuditReport, validateClaimTruthAuditReport } from "@/lib/release-readiness/claim-truth-auditor";

describe("claim truth audit", () => {
  it("classifies readiness claims with proof status", () => {
    const report = buildClaimTruthAuditReport(process.cwd());
    expect(report.claims.length).toBeGreaterThan(0);
    expect(report.claims.every((claim) => claim.proofStatus)).toBe(true);
    expect(validateClaimTruthAuditReport(report)).toEqual([]);
  }, 120000);
});
