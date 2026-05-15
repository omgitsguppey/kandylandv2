import { describe, expect, it } from "vitest";

import {
  buildFinalPhaseCleanupLockReport,
  validateFinalPhaseCleanupLockReport,
  type FinalPhaseCleanupSourceReports,
} from "../../scripts/agent/validate-final-phase-cleanup-lock";

function baseReports(head = "test-head"): FinalPhaseCleanupSourceReports {
  return {
    userFacingFeatureConnectionAudit: {
      currentHead: head,
      summary: {
        p0Count: 0,
        p1Count: 0,
        p2Count: 0,
        fakeLiveRisks: 0,
        selfLoopLinks: 0,
        costBleedRisks: 0,
      },
    },
    productSurfaceIntegrity: {
      currentHead: head,
      summary: {
        sourceReportsRead: 5,
        staleAuthorityRisks: 0,
        fakeActionRisks: 0,
        mobileUiContractRisks: 0,
        debugCopyLeaks: 0,
        costGuardrailRisks: 0,
        connectionRisks: 0,
        fixedThisPass: 0,
        deferredWithOwner: 0,
        p0Count: 0,
        p1Count: 0,
        p2Count: 0,
      },
      staleAuthorityFindings: [],
      deferredFindings: [],
      nextFixOrder: ["Run screenshot QA."],
    },
    speedSecurityHardening: {
      currentHead: head,
      generatedAtUtc: "2026-05-15T00:00:00.000Z",
      summary: {
        score: 80,
        status: "source-clean",
        totalFindings: 0,
        criticalFindings: 0,
      },
      criticalFindings: [],
      costRisks: [],
      exploitRisks: [],
    },
    repoSpringCleaningRewire: {
      currentHead: head,
      summary: {
        p0Count: 0,
        p1Count: 0,
        p2Count: 0,
        staleGeneratedReports: 0,
      },
    },
    publicBetaScore: {
      currentHead: head,
      score: 92,
      readinessStatus: "Evidence ready",
      summary: "Evidence ready.",
      capsApplied: [],
      evidenceCaps: [],
    },
    targetedBehaviorEvidence: {
      currentHead: head,
      status: "passed",
    },
    providerSmokeEvidence: {
      currentHead: head,
      status: "formal_provider_smoke_passed",
    },
    runtimeSmokeEvidence: {
      currentHead: head,
      status: "formal_runtime_smoke_passed",
    },
    adminTruthSampleEvidence: {
      currentHead: head,
      status: "formal_admin_truth_sample_passed",
      freshAdminTruthSampleAttached: true,
      sampleCount: 1,
    },
    launchPrTriage: {
      currentHead: head,
      summary: {
        stale: false,
      },
    },
    launchReadinessReport: {
      currentHead: head,
      summary: {
        stale: false,
      },
    },
    finalLaunchReadinessReport: {
      currentHead: head,
      readinessStatus: "Evidence ready",
    },
  };
}

describe("final phase cleanup lock", () => {
  it("blocks screenshot QA when product-surface evidence is missing", () => {
    const reports = baseReports();
    reports.productSurfaceIntegrity = null;

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.canStartScreenshotQa).toBe(false);
    expect(report.remainingBlockers.some((blocker) => blocker.key === "product_surface_integrity_missing")).toBe(true);
  });

  it("blocks screenshot QA when P0/P1 source findings remain", () => {
    const reports = baseReports();
    reports.productSurfaceIntegrity = {
      ...reports.productSurfaceIntegrity,
      summary: {
        ...(reports.productSurfaceIntegrity?.summary as Record<string, unknown>),
        p1Count: 1,
      },
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.canStartScreenshotQa).toBe(false);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "code_blocker")).toBe(true);
  });

  it("keeps missing visual QA visible", () => {
    const reports = baseReports();
    reports.publicBetaScore = {
      ...reports.publicBetaScore,
      readinessStatus: "Stale evidence",
      evidenceCaps: [{ key: "visual_qa_required", label: "Visual QA required" }],
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.missingHumanEvidence).toBeGreaterThan(0);
    expect(report.humanEvidenceNeeded.some((item) => item.key === "visual_qa_required")).toBe(true);
  });

  it("does not treat operator-reported provider evidence as passed", () => {
    const reports = baseReports();
    reports.providerSmokeEvidence = {
      currentHead: "test-head",
      status: "operator_reported_not_formal_provider_smoke",
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.missingProviderEvidence).toBe(1);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "provider_smoke_required")).toBe(true);
  });

  it("does not treat runtime_unverified as passed", () => {
    const reports = baseReports();
    reports.runtimeSmokeEvidence = {
      currentHead: "test-head",
      status: "runtime_unverified",
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.missingRuntimeEvidence).toBe(1);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "runtime_smoke_required")).toBe(true);
  });

  it("classifies stale authority risks instead of hiding them", () => {
    const reports = baseReports();
    reports.launchPrTriage = {
      currentHead: "old-head",
      generatedAtUtc: "2026-05-14T00:00:00.000Z",
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.staleAuthorityRisks).toBeGreaterThan(0);
    expect(report.staleReports.some((entry) => entry.reportKey === "launch-pr-triage")).toBe(true);
  });

  it("keeps beta exit review false while required evidence is missing", () => {
    const reports = baseReports();
    reports.providerSmokeEvidence = {
      currentHead: "test-head",
      status: "missing_formal_evidence",
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.summary.canStartBetaExitReview).toBe(false);
  });

  it("allows beta exit review only when no cleanup or evidence blockers remain", () => {
    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports: baseReports(),
    });

    expect(report.summary.canStartBetaExitReview).toBe(true);
    expect(validateFinalPhaseCleanupLockReport(report)).toEqual([]);
  });

  it("adds exact next evidence steps when visual, provider, or runtime checks are missing", () => {
    const reports = baseReports();
    reports.publicBetaScore = {
      ...reports.publicBetaScore,
      evidenceCaps: [{ key: "visual_qa_required", label: "Visual QA required" }],
    };
    reports.providerSmokeEvidence = {
      currentHead: "test-head",
      status: "missing_formal_evidence",
    };
    reports.runtimeSmokeEvidence = {
      currentHead: "test-head",
      status: "runtime_unverified",
    };

    const report = buildFinalPhaseCleanupLockReport({
      currentHead: "test-head",
      reports,
    });

    expect(report.nextExactSteps).toContain("Run screenshot QA on the locked source surfaces and attach real visual evidence.");
    expect(report.nextExactSteps).toContain("Run formal provider smoke checks and refresh provider-smoke-evidence.generated.json.");
    expect(report.nextExactSteps).toContain("Run runtime smoke checks and refresh runtime-smoke-evidence.generated.json.");
  });
});
