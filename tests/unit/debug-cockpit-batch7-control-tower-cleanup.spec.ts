import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch7ControlTowerCleanupReport,
  validateDebugCockpitBatch7ControlTowerCleanupReport,
} from "../../scripts/agent/control-tower-cleanup-shared";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("debug cockpit batch7 control tower cleanup", () => {
  it("locks canonical score, report freshness, formal gates, and operator queue display", () => {
    const scoreArtifact = JSON.parse(readFileSync("agent/state/public-beta-score.generated.json", "utf8")) as {
      currentHead?: string | null;
      overallScore?: number | null;
      readinessStatus?: string | null;
    };
    const report = buildDebugCockpitBatch7ControlTowerCleanupReport({
      currentHead: "head-current",
    });
    const failures = validateDebugCockpitBatch7ControlTowerCleanupReport(report);

    expectNoFailuresOrOnlyNamedIsolation({
      failures,
      expectedIsolationFailures: ["dirty files unclassified."],
    });
    expect(report.canonicalScoreAfter.artifactPresent).toBe(true);
    expect(report.canonicalScoreAfter.source).toBe("agent/state/public-beta-score.generated.json");
    expect(report.canonicalScoreAfter.score).toBe(scoreArtifact.overallScore);
    expect(Number.isFinite(report.canonicalScoreAfter.score)).toBe(true);
    expect(report.canonicalScoreAfter.status).toBe(scoreArtifact.readinessStatus);
    expect(report.canonicalScoreAfter.artifactHead).toBe(scoreArtifact.currentHead ?? null);
    expect(report.canonicalScoreAfter.headMatchesCurrent).toBe(scoreArtifact.currentHead === "head-current");
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

  it("fails closed when the canonical public beta artifact or score is invalid", () => {
    const report = buildDebugCockpitBatch7ControlTowerCleanupReport({ currentHead: "head-current" });

    expect(validateDebugCockpitBatch7ControlTowerCleanupReport({
      ...report,
      canonicalScoreAfter: {
        ...report.canonicalScoreAfter,
        artifactPresent: false,
        source: "missing",
      },
    })).toEqual(expect.arrayContaining([
      "canonical public beta score artifact is missing.",
      "Control Tower canonical score does not read the public beta score artifact.",
    ]));

    expect(validateDebugCockpitBatch7ControlTowerCleanupReport({
      ...report,
      canonicalScoreAfter: {
        ...report.canonicalScoreAfter,
        score: Number.NaN,
      },
    })).toContain("canonical public beta score is missing or invalid.");
  });
});
