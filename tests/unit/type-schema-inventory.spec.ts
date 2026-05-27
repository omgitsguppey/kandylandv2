import { describe, expect, it } from "vitest";

import {
  buildTypeSchemaInventoryReport,
  validateTypeSchemaInventoryReport,
} from "../../src/lib/type-hardening/type-schema-inventory";

describe("type schema inventory", () => {
  it("classifies exported shared types without unsafe drift", () => {
    const report = buildTypeSchemaInventoryReport();
    const validation = validateTypeSchemaInventoryReport(report);

    expect(report.typesAudited).toBeGreaterThan(100);
    expect(report.entries.some((entry) => entry.name === "UserProfile" && entry.owner === "canonical")).toBe(true);
    expect(report.entries.some((entry) => entry.name === "CanonicalEventEnvelope" && entry.owner === "canonical")).toBe(true);
    expect(report.unsafeUnknowns).toBe(0);
    expect(validation.ok).toBe(true);
  });
});
