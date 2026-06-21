import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch26DependencyInventoryReport,
  validateDebugCockpitBatch26DependencyInventoryReport,
} from "@/lib/debug/debug-cockpit-batch26-dependency-inventory";

describe("debug cockpit batch 26 dependency inventory", () => {
  it("locks complete dependency inventory scoring and runtime separation", () => {
    const report = buildDebugCockpitBatch26DependencyInventoryReport({
      rootRuntimeDeps: 34,
      rootDevDeps: 53,
      functionsRuntimeDeps: 4,
      functionsDevDeps: 7,
      rootOverrides: 27,
      functionsOverrides: 11,
      externalServices: 17,
      expectedAbsentDependencies: 4,
      unknownDirectDeps: 4,
    });

    expect(validateDebugCockpitBatch26DependencyInventoryReport(report)).toEqual([]);
    expect(report.omittedDependenciesAfter).toBe(0);
    expect(report.fakeTimestampDetected).toBe(true);
    expect(report.fakeTimestampFixed).toBe(true);
    expect(report.runtimeChecksSeparated).toBe(true);
    expect(report.providerCallsRun).toBe(false);
    expect(report.nextExactSteps.join(" ")).toContain("provider-backed site activity");
    expect(report.nextExactSteps.join(" ")).toContain("deployed route evidence");
    expect(report.nextExactSteps.join(" ")).not.toMatch(/provider\/runtime smoke|runtime smoke|provider smoke/iu);
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
  });
});
