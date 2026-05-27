import { describe, expect, it } from "vitest";

import {
  buildTypeSchemaMemoryWritebackReport,
  validateTypeSchemaMemoryWritebackReport,
} from "../../src/lib/type-hardening/type-schema-memory-writeback";

describe("type schema memory writeback", () => {
  it("records durable lessons about canonical type ownership", () => {
    const report = buildTypeSchemaMemoryWritebackReport();
    const validation = validateTypeSchemaMemoryWritebackReport(report);

    expect(report.memoryEntriesAdded).toBeGreaterThanOrEqual(5);
    expect(report.mistakePatternsCaptured).toContain("duplicate_type_schema_contract");
    expect(validation.ok).toBe(true);
  });
});
