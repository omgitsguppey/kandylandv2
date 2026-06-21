import { describe, expect, it } from "vitest";

import {
  buildPackageScriptConsolidationReport,
  validatePackageScriptConsolidationReport,
} from "../../src/lib/config-hardening/package-script-inventory";

describe("package script consolidation", () => {
  it("classifies scripts by owner lane and marks duplicate aliases", () => {
    const report = buildPackageScriptConsolidationReport();
    const validation = validatePackageScriptConsolidationReport(report);

    expect(report.totalScripts).toBeGreaterThan(500);
    expect(report.scripts.every((entry) => entry.ownerLane !== "unknown")).toBe(true);
    expect(report.duplicateAliases).toEqual([]);
    expect(validation.ok).toBe(true);
  });
});
