import { describe, expect, it } from "vitest";

import {
  buildTestQualityGuardsReport,
  validateTestQualityGuardsReport,
} from "../../src/lib/test-hardening/test-quality-guards";

describe("test quality guards", () => {
  it("blocks focused tests, unclassified provider proof, and deterministic-test drift", () => {
    const report = buildTestQualityGuardsReport();
    const validation = validateTestQualityGuardsReport(report);

    expect(report.onlyTestsFound).toBe(0);
    expect(report.providerCallsForbidden).toBe(true);
    expect(report.productionReadsForbidden).toBe(true);
    expect(report.findings.some((finding) => finding.kind === "as_any" || finding.kind === "date_now")).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
