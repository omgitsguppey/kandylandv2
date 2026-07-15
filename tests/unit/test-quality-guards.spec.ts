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

  it("blocks unowned fantasy DTO fixtures", () => {
    const report = buildTestQualityGuardsReport();
    const validation = validateTestQualityGuardsReport({
      ...report,
      findings: [
        ...report.findings,
        {
          kind: "fantasy_dto",
          file: "tests/unit/example.spec.ts",
          classification: "unsafe_unknown",
          canClearReleaseProofGate: false,
          action: "Replace with a canonical test factory or add a fixture-owner comment with the exact deferred owner/reason.",
        },
      ],
      unsafeUnknowns: report.unsafeUnknowns + 1,
    });

    expect(validation.ok).toBe(false);
    expect(validation.failures).toContain("unowned fantasy DTO fixtures found: 1");
  });

  it("accepts a fresh producer timestamp without changing deterministic test defaults", () => {
    const generatedAtUtc = "2026-07-14T12:00:00.000Z";

    expect(buildTestQualityGuardsReport({ generatedAtUtc }).generatedAtUtc).toBe(generatedAtUtc);
  });
});
