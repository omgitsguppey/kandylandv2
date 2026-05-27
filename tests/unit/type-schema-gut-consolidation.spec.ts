import { describe, expect, it } from "vitest";

import {
  buildTypeSchemaGutConsolidationReport,
  validateTypeSchemaGutConsolidationReport,
} from "../../src/lib/type-hardening/type-schema-gut-consolidation";

describe("type schema gut consolidation", () => {
  it("summarizes the type/schema consolidation pass", () => {
    const report = buildTypeSchemaGutConsolidationReport();
    const validation = validateTypeSchemaGutConsolidationReport(report);

    expect(report.typesAudited).toBeGreaterThan(100);
    expect(report.generatedReportSchemasTyped).toBeGreaterThan(0);
    expect(report.memoryEntriesAdded).toBeGreaterThanOrEqual(5);
    expect(validation.ok).toBe(true);
  }, 20000);
});
