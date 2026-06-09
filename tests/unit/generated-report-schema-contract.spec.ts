import { describe, expect, it } from "vitest";

import {
  GENERATED_REPORT_BASE_FIELDS,
  buildGeneratedReportSchemaContractReport,
  validateGeneratedReportSchemaContractReport,
} from "../../src/lib/type-hardening/generated-report-schema-contract";

describe("generated report schema contract", () => {
  it("requires compact typed generated report summaries", () => {
    const report = buildGeneratedReportSchemaContractReport();
    const validation = validateGeneratedReportSchemaContractReport(report);

    expect(GENERATED_REPORT_BASE_FIELDS).toContain("generatedAtUtc");
    expect(GENERATED_REPORT_BASE_FIELDS).toContain("validationFailures");
    expect(GENERATED_REPORT_BASE_FIELDS).toContain("reportCompleteness");
    expect(GENERATED_REPORT_BASE_FIELDS).toContain("cleanupPolicy");
    expect(report.generatedReportsAudited).toBeGreaterThan(20);
    expect(report.reportCompleteness).toBe("complete");
    expect(report.cleanupPolicy).toBe("regenerate");
    expect(report.sourceTruthRole).toBe("generated_snapshot");
    expect(report.oversizedGeneratedArtifacts.length).toBe(0);
    expect(validation.ok).toBe(true);
  });
});
