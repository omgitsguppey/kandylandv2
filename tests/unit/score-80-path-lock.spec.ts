import { describe, expect, it } from "vitest";

import {
  buildScore80PathLockReport,
  validateScore80PathLockReport,
} from "../../scripts/agent/validate-score-80-path-lock";

const currentScore = {
  currentHead: "head123",
  healthScore: 59.6,
  sourceHealthScore: 100,
  runtimeHealthScore: 18.33,
  evidenceCompletenessScore: 40,
  freshnessScore: 52.86,
  costRiskScore: 60,
  regressionRiskScore: 90,
  launchGateStatus: "owner_review",
  launchBlockers: [
    "Visual/manual smoke: Visual QA required",
    "Runtime/provider smoke: Runtime unverified",
    "Admin truth/sample evidence: Unknown evidence",
  ],
  evidenceCapsApplied: [
    "Visual QA required: Visual/manual smoke",
    "Runtime unverified: Runtime/provider smoke",
    "Unknown evidence: Admin truth/sample evidence",
  ],
  scoreDeltaDrivers: [
    "sourceHealthScore=100",
    "runtimeHealthScore=18.33",
    "evidenceCompletenessScore=40",
  ],
};

describe("score 80 path lock", () => {
  it("ranks remaining score drag by weighted point impact", () => {
    const report = buildScore80PathLockReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "head123",
      oldScore: 41.92,
      betaScore: currentScore,
      refreshPlan: [],
      staleArtifacts: [],
      dirtyFiles: [],
      openPrs: [],
      evidenceStatus: [
        { lane: "provider_smoke", status: "missing_formal_evidence", formalArtifactAttached: false },
      ],
    });

    expect(report.newScore).toBe(59.6);
    expect(report.remainingScoreDrag.map((entry) => entry.dimension)).toEqual([
      "runtimeHealthScore",
      "evidenceCompletenessScore",
      "freshnessScore",
      "costRiskScore",
      "regressionRiskScore",
      "sourceHealthScore",
    ]);
    expect(report.remainingScoreDrag[0]?.weightedPointImpact).toBeGreaterThan(report.remainingScoreDrag[1]?.weightedPointImpact ?? 0);
    expect(report.artifactsBlocking80[0]?.refreshCommand).toBeTruthy();
    expect(report.nextThreeActions).toHaveLength(3);
    expect(validateScore80PathLockReport(report)).toEqual([]);
  });

  it("fails when stale score-impacting artifacts lack refresh commands", () => {
    const report = buildScore80PathLockReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "head123",
      oldScore: 41.92,
      betaScore: currentScore,
      refreshPlan: [],
      staleArtifacts: [
        { artifactPath: "agent/state/example.generated.json", status: "stale_source_version" },
      ],
      dirtyFiles: [],
      openPrs: [],
      evidenceStatus: [],
    });

    expect(validateScore80PathLockReport(report)).toContain(
      "stale artifacts remain score-impacting without refresh command.",
    );
  });

  it("fails when evidence gates are falsely cleared", () => {
    const report = buildScore80PathLockReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "head123",
      oldScore: 41.92,
      betaScore: {
        ...currentScore,
        launchGateStatus: "launch_ready",
        launchBlockers: [],
      },
      refreshPlan: [],
      staleArtifacts: [],
      dirtyFiles: [],
      openPrs: [],
      evidenceStatus: [
        { lane: "runtime_smoke", status: "passed", formalArtifactAttached: false },
      ],
    });

    expect(validateScore80PathLockReport(report)).toContain("evidence gates are falsely cleared.");
  });
});
