import { describe, expect, it } from "vitest";

import {
  buildScoreDimension80LockReport,
  validateScoreDimension80LockReport,
  type ScoreDimension80LockInput,
} from "../../src/lib/agent-score/score-dimension-80-lock";

const baseInput: ScoreDimension80LockInput = {
  generatedAtUtc: "2026-05-24T06:30:00.000Z",
  currentHead: "head123",
  scoreBefore: {
    sourceHealth: 92.5,
    runtimeHealth: 84.2,
    evidenceCompleteness: 69.6,
    freshness: 83.75,
    costRisk: 80.5,
    regressionRisk: 86,
    overallHealthScore: 83.1,
  },
  scoreAfter: {
    sourceHealth: 92.5,
    runtimeHealth: 84.2,
    evidenceCompleteness: 69.6,
    freshness: 83.75,
    costRisk: 80.5,
    regressionRisk: 86,
    overallHealthScore: 83.1,
  },
  formalGatesRemaining: [
    "formal_provider_smoke",
    "deployed_runtime_smoke",
    "production_admin_truth_sample",
  ],
  staleArtifacts: [
    {
      artifactPath: "agent/state/current-beta-exit-status.generated.json",
      status: "stale_source_version",
      refreshCommand: "npm run check:current-beta-exit-status",
      nextAction: "Refresh current beta exit status.",
    },
  ],
  costOwnerReviewRemaining: [
    {
      laneId: "cloudRun",
      status: "source_guarded_external_review_remaining",
      nextAction: "Review Cloud Run billing externally.",
    },
  ],
  regressionEvidenceRemaining: [],
  inFlightLanes: [
    {
      laneId: "event-liveness-audit",
      status: "in_flight",
      nextAction: "Rerun event liveness audit after its implementation lands.",
    },
  ],
  nonEventScorePenaltyCount: 0,
  futureActivityPenaltyCount: 0,
  dirtyFilesClassified: [
    {
      path: "src/lib/analytics/event-liveness-engine.ts",
      classification: "in_flight",
    },
  ],
  openPrClassifications: [
    {
      number: 1,
      title: "Example PR",
      url: "https://example.test/pr/1",
      classification: "external_open_pr_not_touched_score_lock",
    },
  ],
};

describe("score dimension 80 lock", () => {
  it("locks all score dimensions and gives below-80 dimensions exact next actions", () => {
    const report = buildScoreDimension80LockReport(baseInput);

    expect(report.dimensionsBelow80).toEqual(["evidenceCompleteness"]);
    expect(report.below80RootCauses.evidenceCompleteness?.rootCause).toBe("formal_evidence_gate_required");
    expect(report.below80RootCauses.evidenceCompleteness?.nextAction).toContain("provider-backed site activity");
    expect(report.below80RootCauses.evidenceCompleteness?.nextAction).not.toMatch(/attach formal provider|production admin truth/iu);
    expect(validateScoreDimension80LockReport(report)).toEqual([]);
  });

  it("treats missing GitHub PR lookup as external evidence instead of source failure", () => {
    const report = buildScoreDimension80LockReport({
      ...baseInput,
      openPrClassifications: [
        {
          number: 0,
          title: "GitHub open PR evidence not queried",
          url: "",
          classification: "external_evidence_required",
        },
      ],
    });

    expect(validateScoreDimension80LockReport(report)).toEqual([]);
    expect(report.openPrClassifications[0]?.classification).toBe("external_evidence_required");
    expect(report.formalGatesRemaining).toEqual(
      expect.arrayContaining(["formal_provider_smoke", "deployed_runtime_smoke"]),
    );
  });

  it("fails validation when a below-80 dimension lacks root cause detail", () => {
    const report = buildScoreDimension80LockReport(baseInput);
    delete report.below80RootCauses.evidenceCompleteness;

    expect(validateScoreDimension80LockReport(report)).toContain(
      "evidenceCompleteness is below 80 without root cause and next action.",
    );
  });

  it("fails validation if non-event or future activity penalties return", () => {
    const report = buildScoreDimension80LockReport({
      ...baseInput,
      nonEventScorePenaltyCount: 1,
    });

    expect(validateScoreDimension80LockReport(report)).toContain(
      "future activity or non-event penalties returned.",
    );
  });
});
