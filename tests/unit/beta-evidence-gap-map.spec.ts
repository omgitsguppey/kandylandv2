import { describe, expect, it } from "vitest";

import {
  buildBetaEvidenceGapMapReport,
  validateBetaEvidenceGapMapReport,
  type BetaEvidenceGapMapReport,
} from "../../scripts/agent/validate-beta-evidence-gap-map";

function reportFixture(overrides: Partial<BetaEvidenceGapMapReport> = {}): BetaEvidenceGapMapReport {
  const report = buildBetaEvidenceGapMapReport({
    currentHead: "head",
    generatedAtUtc: "2026-05-19T18:30:00.000Z",
    betaScore: 38.32,
    betaStatus: "Stale evidence",
    launchGateStatus: "owner_review",
    canStartBetaExitReview: false,
    evidenceCapture: {
      manualScreenshotEvidence: "missing",
      providerSmokeEvidence: "missing",
      runtimeSmokeEvidence: "missing",
      adminTruthSampleEvidence: "missing",
    },
    runtimeWatchStatus: "source_ready_runtime_watch_v2_runtime_proof_required",
    revenueProviderStatus: "operator_reported_unattached",
    finalCostStatus: "owner_review_required",
    speedSecurityStatus: "owner_review_required",
    staleArtifacts: [
      {
        artifact: "agent/state/evidence-capture-status.generated.json",
        reason: "Report was generated before the latest code changes.",
      },
    ],
  });

  return {
    ...report,
    ...overrides,
    evidenceLanes: overrides.evidenceLanes ?? report.evidenceLanes,
    nextExactSteps: overrides.nextExactSteps ?? report.nextExactSteps,
    staleArtifacts: overrides.staleArtifacts ?? report.staleArtifacts,
  };
}

describe("beta evidence gap map", () => {
  it("builds every required beta evidence lane", () => {
    const report = reportFixture();
    const laneIds = report.evidenceLanes.map((lane) => lane.id);

    expect(laneIds).toEqual([
      "manual_screenshot_qa",
      "provider_smoke",
      "runtime_smoke",
      "admin_truth_sample",
      "runtime_watch_time_v2_deployed_proof",
      "revenue_provider_smoke",
      "final_cost_owner_review",
      "speed_security_owner_review",
    ]);
  });

  it("requires currentHead to match the latest source version", () => {
    const report = reportFixture({ currentHead: "old" });

    expect(validateBetaEvidenceGapMapReport(report, "head")).toContain(
      "currentHead must match git HEAD.",
    );
  });

  it("requires each lane to include folder, template, check command, and next action", () => {
    const report = reportFixture({
      evidenceLanes: [
        {
          ...reportFixture().evidenceLanes[0],
          exactFolder: "",
          exactTemplate: "",
          exactCheckCommand: "",
          nextAction: "",
        },
        ...reportFixture().evidenceLanes.slice(1),
      ],
    });

    const failures = validateBetaEvidenceGapMapReport(report, "head");
    expect(failures).toContain("manual_screenshot_qa must include exactFolder.");
    expect(failures).toContain("manual_screenshot_qa must include exactTemplate.");
    expect(failures).toContain("manual_screenshot_qa must include exactCheckCommand.");
    expect(failures).toContain("manual_screenshot_qa must include nextAction.");
  });

  it("keeps operator-reported revenue separate from formal provider evidence", () => {
    const report = reportFixture();
    const revenueLane = report.evidenceLanes.find((lane) => lane.id === "revenue_provider_smoke");

    expect(revenueLane?.status).toBe("operator_reported_unattached");
    expect(revenueLane?.launchImpact).toContain("not formal evidence");
    expect(validateBetaEvidenceGapMapReport(report, "head")).toEqual([]);
  });

  it("fails if beta exit review is enabled while required evidence is missing", () => {
    const report = reportFixture({ canStartBetaExitReview: true });

    expect(validateBetaEvidenceGapMapReport(report, "head")).toContain(
      "canStartBetaExitReview must remain false while required evidence lanes are missing.",
    );
  });

  it("does not treat runtime watch source-ready status as deployed proof", () => {
    const report = reportFixture();
    const watchLane = report.evidenceLanes.find((lane) => lane.id === "runtime_watch_time_v2_deployed_proof");

    expect(watchLane?.status).toBe("source_ready_runtime_proof_required");
    expect(report.runtimeProofMissingLanes).toContain("runtime_watch_time_v2_deployed_proof");
    expect(validateBetaEvidenceGapMapReport(report, "head")).toEqual([]);
  });

  it("requires stale artifact inventory and ordered next exact steps", () => {
    const report = reportFixture({ staleArtifacts: [], nextExactSteps: [] });
    const failures = validateBetaEvidenceGapMapReport(report, "head");

    expect(failures).toContain("staleArtifacts must list reports that need refresh or prove none are stale.");
    expect(failures).toContain("nextExactSteps must not be empty.");
  });
});
