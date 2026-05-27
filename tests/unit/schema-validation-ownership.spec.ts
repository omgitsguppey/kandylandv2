import { describe, expect, it } from "vitest";

import {
  buildSchemaValidationOwnershipReport,
  validateSchemaValidationOwnershipReport,
} from "../../src/lib/type-hardening/schema-validation-ownership";

describe("schema validation ownership", () => {
  it("keeps validation shape ownership mapped to canonical contracts", () => {
    const report = buildSchemaValidationOwnershipReport();
    const validation = validateSchemaValidationOwnershipReport(report);

    expect(report.validatorsAudited).toBeGreaterThan(100);
    expect(report.rules).toContain("Test validators should import schema or canonical type, not duplicate shape.");
    expect(report.duplicateSchemaRisks.length).toBe(0);
    expect(validation.ok).toBe(true);
  });
});
