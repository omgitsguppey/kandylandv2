import { describe, expect, it } from "vitest";

import {
  buildSecurityRulesInventoryReport,
  validateSecurityRulesInventoryReport,
} from "../../src/lib/config-hardening/security-rules-contract";

describe("security rules inventory", () => {
  it("classifies Firebase rules and protected data policy owners", () => {
    const report = buildSecurityRulesInventoryReport();
    const validation = validateSecurityRulesInventoryReport(report);

    expect(report.rulesFiles.some((entry) => entry.path === "firestore.rules" && entry.exists)).toBe(true);
    expect(report.rulesFiles.some((entry) => entry.path === "storage.rules" && entry.exists)).toBe(true);
    expect(report.protectedDataClasses.every((entry) => entry.policyStatus !== "config_unknown")).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
