import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch7ControlTowerCleanupReport,
  validateDebugCockpitBatch7ControlTowerCleanupReport,
} from "../../scripts/agent/control-tower-cleanup-shared";

describe("debug cockpit batch7 control tower cleanup", () => {
  it("locks canonical score, report freshness, formal gates, and operator queue display", () => {
    const report = buildDebugCockpitBatch7ControlTowerCleanupReport({
      currentHead: "head-current",
    });
    const failures = validateDebugCockpitBatch7ControlTowerCleanupReport(report);

    expect(failures).toEqual([]);
    expect(report.canonicalScoreAfter.score).toBeGreaterThan(report.canonicalScoreBefore.score);
    expect(report.requiredReportsBefore).toBeGreaterThanOrEqual(6);
    expect(report.staleReportsAfter).toBeLessThan(report.staleReportsBefore);
    expect(report.retiredReports).toContain("agent/state/score-80-path-lock.generated.json");
    expect(report.formalGatesRemaining).toEqual([
      "runtime_provider_smoke",
      "deployed_runtime_smoke",
      "admin_truth_sample_artifact",
    ]);
    expect(report.remainingGaps.join(" ")).toContain("admin source activity sample");
    expect(report.nextExactSteps.join(" ")).toContain("typed admin evidence gate");
    expect(`${report.remainingGaps.join(" ")} ${report.nextExactSteps.join(" ")}`).not.toMatch(/first-party admin truth|admin truth gate|manual proof|screenshot proof/iu);
    expect(report.aiCriticStatusAfter).toBe("no_source_changes_requested");
    expect(report.scoreImpactQueueAfter).not.toContain("runtime_provider_smoke");
  });
});
