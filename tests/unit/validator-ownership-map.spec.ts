import { describe, expect, it } from "vitest";

import {
  buildValidatorOwnershipMapReport,
  validateValidatorOwnershipMapReport,
} from "../../src/lib/test-hardening/validator-ownership-map";

describe("validator ownership map", () => {
  it("maps validators to owner lanes, scripts, artifacts, tests, and retirement actions", () => {
    const report = buildValidatorOwnershipMapReport();
    const validation = validateValidatorOwnershipMapReport(report);

    expect(report.validatorsAudited).toBeGreaterThan(100);
    expect(report.entries.some((entry) => entry.validatorName === "validate-test-fixture-inventory.ts")).toBe(true);
    expect(report.entries.every((entry) => entry.ownerLane.length > 0)).toBe(true);
    expect(report.unclassifiedValidators).toBe(0);
    expect(validation.ok).toBe(true);
  });
});
