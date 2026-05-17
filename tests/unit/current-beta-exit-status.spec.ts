import { describe, expect, it } from "vitest";

import {
  validateCurrentBetaExitStatusReport,
  type CurrentBetaExitStatusReport,
} from "../../scripts/agent/validate-current-beta-exit-status";

function reportFixture(overrides: Partial<CurrentBetaExitStatusReport> = {}): CurrentBetaExitStatusReport {
  const report: CurrentBetaExitStatusReport = {
    generatedAtUtc: "2026-05-17T04:22:16.775Z",
    reportKey: "current-beta-exit-status",
    currentHead: "head",
    summary: {
      betaVersion: "1.2.59",
      betaScore: 45,
      betaStatus: "Stale evidence",
      sourceCleanupP0: 0,
      sourceCleanupP1: 0,
      userCreatorP0: 0,
      userCreatorP1: 0,
      economyP0: 0,
      economyP1: 0,
      visualEvidenceStatus: "source_only_screenshotEvidenceAttached_false",
      providerSmokeStatus: "missing_formal_evidence",
      runtimeSmokeStatus: "runtime_unverified",
      adminTruthSampleStatus: "missing_or_unknown",
      speedSecurityStatus: "51/beta-risk; findings=91; critical=0",
      releaseNotesStatus: "passed_same_commit_validator",
      canStartManualScreenshotQa: true,
      canStartProviderSmoke: false,
      canStartRuntimeSmoke: false,
      canStartBetaExitReview: false,
    },
    checksRun: [
      { command: "npm run check:gumdrop-economy-accuracy", status: "passed", evidence: "passed" },
      { command: "npm run check:creator-experience-simplification", status: "passed", evidence: "passed" },
      { command: "npm run check:post-economy-creator-flow-qa", status: "passed", evidence: "passed" },
      { command: "npm run check:release-notes", status: "passed", evidence: "passed" },
    ],
    failedChecks: [],
    refreshedArtifacts: [],
    remainingBlockers: [
      {
        id: "visual_manual_smoke_missing",
        severity: "P1",
        status: "visual_qa_required",
        evidence: ["screenshotEvidenceAttached=false"],
        nextAction: "Attach targeted screenshot evidence.",
      },
    ],
    deferredOwnerReview: [],
    nextExactSteps: [
      "Use docs/agent-truth/manual-screenshot-qa-checklist.md.",
      "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
    ],
  };

  return {
    ...report,
    ...overrides,
    summary: {
      ...report.summary,
      ...overrides.summary,
    },
  };
}

describe("current beta exit status validator", () => {
  it("blocks beta exit when visual evidence is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        canStartBetaExitReview: true,
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "canStartBetaExitReview must be false while visual/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when provider smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "formal_screenshot_evidence_attached",
        runtimeSmokeStatus: "formal_runtime_smoke_passed",
        canStartBetaExitReview: true,
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "canStartBetaExitReview must be false while visual/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when runtime smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "formal_screenshot_evidence_attached",
        providerSmokeStatus: "formal_provider_smoke_passed",
        canStartBetaExitReview: true,
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "canStartBetaExitReview must be false while visual/provider/runtime evidence is missing.",
    );
  });

  it("allows screenshot QA to start when source, economy, and user creator P0/P1 counts are zero", () => {
    const report = reportFixture();

    expect(report.summary.canStartManualScreenshotQa).toBe(true);
    expect(validateCurrentBetaExitStatusReport(report, "head")).toEqual([]);
  });

  it("requires release-note status to be represented", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        releaseNotesStatus: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "release notes status must be represented.",
    );
  });

  it("requires next steps to point at the evidence readiness checklists", () => {
    const report = reportFixture({
      nextExactSteps: ["Run targeted manual screenshot QA."],
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "nextExactSteps must reference docs/agent-truth/manual-screenshot-qa-checklist.md.",
    );
  });

  it("fails when currentHead does not match git HEAD", () => {
    const report = reportFixture({ currentHead: "old-head" });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "report currentHead must match git HEAD (head).",
    );
  });
});
