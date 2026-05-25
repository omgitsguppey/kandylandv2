import { describe, expect, it } from "vitest";

import {
  buildModuleSourceMap,
  calculateModuleCoverage,
  getModuleCoveragePolicy,
  reconcileModuleCoverageCounts,
} from "@/lib/analytics/module-source-mapping-engine";

describe("module source mapping engine", () => {
  it("maps accepted substitutes without counting GA4 as universally required", () => {
    const dailyTasks = calculateModuleCoverage(getModuleCoveragePolicy("daily_tasks"), {
      task_lifecycle: { count: 500, lastSeenAtUtc: "2026-05-24T15:57:48.000Z" },
    });
    const admin = calculateModuleCoverage(getModuleCoveragePolicy("admin"), {
      debug_evidence: { count: 3, lastSeenAtUtc: "2026-05-24T15:57:48.000Z" },
      admin_truth_snapshot: { count: 1, lastSeenAtUtc: "2026-05-24T15:57:48.000Z" },
    });

    expect(dailyTasks.status).toBe("partial");
    expect(dailyTasks.presentAcceptedSources).toContain("Task lifecycle");
    expect(dailyTasks.missingExternalOnlySources).toContain("GA4");
    expect(dailyTasks.missingRequiredSources).not.toContain("GA4");
    expect(admin.status).toBe("verified");
    expect(admin.missingRequiredSources).not.toContain("GA4");
  });

  it("keeps optional gaps out of required parity and explains the formula", () => {
    const results = buildModuleSourceMap({
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
      range: "30d",
      evidenceByModule: {
        daily_tasks: { task_lifecycle: { count: 500 } },
        admin: { debug_evidence: { count: 1 }, admin_truth_snapshot: { count: 1 } },
        runtime: { route_runtime: { count: 1 }, debug_evidence: { count: 1 } },
      },
    });
    const summary = reconcileModuleCoverageCounts(results.modules);

    expect(summary.requiredModules).toBeGreaterThan(0);
    expect(summary.optionalModules).toBeGreaterThan(0);
    expect(summary.optionalGaps).toBeGreaterThan(0);
    expect(summary.requiredGaps).toBeGreaterThan(0);
    expect(summary.passAllowed).toBe(false);
    expect(summary.blockedReason).toMatch(/^module_empty:/);
    expect(summary.parityScoreFormula).toContain("Required verified=1.0");
  });
});
