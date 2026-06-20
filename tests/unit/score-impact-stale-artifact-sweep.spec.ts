import { describe, expect, it } from "vitest";

import {
  buildScoreImpactStaleArtifactSweepReport,
  validateScoreImpactStaleArtifactSweepReport,
} from "../../scripts/agent/validate-score-impact-stale-artifact-sweep";

const betaScore = {
  currentHead: "head-new",
  healthScore: 59.74,
  launchGateStatus: "owner_review",
  evidenceCapsApplied: [
    "Runtime unverified: Runtime/provider smoke",
    "Unknown evidence: Admin truth/sample evidence",
  ],
  staleArtifacts: [
    {
      artifactPath: "agent/state/current-beta-exit-status.generated.json",
      reportKey: "current-beta-exit-status",
      status: "stale_source_version",
      refreshCommand: "npm run check:current-beta-exit-status",
      nextAction: "Refresh this report from the latest code version.",
    },
  ],
};

describe("score impact stale artifact sweep", () => {
  it("classifies refreshed, blocked, and remaining stale artifacts with commands", () => {
    const report = buildScoreImpactStaleArtifactSweepReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head-new",
      oldScore: 59.6,
      betaScore,
      refreshResults: [
        { command: "npm run check:mobile-ui-final-lock", exitCode: 0 },
        { command: "npm run check:overnight-final-integration-lock", exitCode: 1 },
      ],
      artifactHeads: {
        "agent/state/mobile-ui-final-lock.generated.json": "head-new",
        "agent/state/overnight-final-integration-lock.generated.json": "head-old",
      },
      dirtyFiles: [
        {
          path: "agent/state/score-impact-stale-artifact-sweep.generated.json",
          status: "M",
          classification: "current_generated_artifact_to_commit",
          action: "Commit scoped sweep artifact.",
        },
      ],
      openPrs: [],
    });

    expect(report.newScore).toBe(59.74);
    expect(report.staleArtifactActions.some((entry) => entry.status === "refreshed_current")).toBe(true);
    expect(report.staleArtifactActions.some((entry) => entry.status === "blocked_failed_refresh")).toBe(true);
    expect(report.staleArtifactActions.some((entry) => entry.artifactPath.includes("current-beta-exit-status"))).toBe(true);
    expect(report.formalEvidenceGatesUnchanged).toBe(true);
    expect(report.nextExactSteps.join(" ")).not.toContain("formal visual/manual");
    expect(validateScoreImpactStaleArtifactSweepReport(report)).toEqual([]);
  });

  it("fails if a score-impacting stale artifact lacks a refresh command", () => {
    const report = buildScoreImpactStaleArtifactSweepReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head-new",
      oldScore: 59.74,
      betaScore: {
        ...betaScore,
        staleArtifacts: [
          { artifactPath: "agent/state/stale.generated.json", status: "stale_source_version" },
        ],
      },
      refreshResults: [],
      artifactHeads: {},
      dirtyFiles: [],
      openPrs: [],
    });

    expect(validateScoreImpactStaleArtifactSweepReport(report)).toContain(
      "score-impacting stale artifacts remain without refresh command.",
    );
  });

  it("fails if a refreshed artifact was generated from an older code version", () => {
    const report = buildScoreImpactStaleArtifactSweepReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head-new",
      oldScore: 59.74,
      betaScore,
      refreshResults: [{ command: "npm run check:mobile-ui-final-lock", exitCode: 0 }],
      artifactHeads: {
        "agent/state/mobile-ui-final-lock.generated.json": "head-old",
      },
      dirtyFiles: [],
      openPrs: [],
    });

    expect(validateScoreImpactStaleArtifactSweepReport(report)).toContain(
      "refreshed artifact was generated from an older code version.",
    );
  });

  it("fails if score drops without explanation or files and PRs are unclassified", () => {
    const report = buildScoreImpactStaleArtifactSweepReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head-new",
      oldScore: 60,
      betaScore: { ...betaScore, healthScore: 59 },
      refreshResults: [],
      artifactHeads: {},
      dirtyFiles: [{ path: "mystery.txt", status: "M", classification: "unsafe_unknown", action: "" }],
      openPrs: [{ number: 1, title: "debug stale", classification: "unsafe_unknown", action: "" }],
    });
    report.scoreDropExplanation = null;

    const failures = validateScoreImpactStaleArtifactSweepReport(report);
    expect(failures).toContain("score drops without explanation.");
    expect(failures).toContain("dirty files are unclassified.");
    expect(failures).toContain("open PRs are unclassified.");
  });
});
