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
      nextFixOrder: ["Run UI source coverage."],
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

function buildFixtureReport(reports: Partial<FinalPhaseCleanupSourceReports>) {
  return buildFinalPhaseCleanupLockReport({
    currentHead: "test-head",
    commitsReviewed: [],
    reports,
  });
}

describe("final phase cleanup lock", () => {
  it("blocks UI source coverage when product-surface evidence is missing", () => {
    const reports = baseReports();
    reports.productSurfaceIntegrity = null;

    const report = buildFixtureReport(reports);

    expect(report.summary.canStartUiSourceCoverage).toBe(false);
    expect(report.remainingBlockers.some((blocker) => blocker.key === "product_surface_integrity_missing")).toBe(true);
  });

  it("blocks UI source coverage when P0/P1 source findings remain", () => {
    const reports = baseReports();
    reports.productSurfaceIntegrity = {
      ...reports.productSurfaceIntegrity,
      summary: {
        ...(reports.productSurfaceIntegrity?.summary as Record<string, unknown>),
        p1Count: 1,
      },
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.canStartUiSourceCoverage).toBe(false);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "code_blocker")).toBe(true);
  });

  it("keeps missing UI source coverage visible", () => {
    const reports = baseReports();
    reports.publicBetaScore = {
      ...reports.publicBetaScore,
      readinessStatus: "Stale evidence",
      evidenceCaps: [{ key: "visual_qa_required", label: "Visual QA required" }],
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.missingHumanEvidence).toBeGreaterThan(0);
    expect(report.humanEvidenceNeeded.some((item) => item.key === "ui_source_coverage_required")).toBe(true);
  });

  it("derives missing UI source coverage from structured score state without screenshot caps", () => {
    const reports = baseReports();
    reports.publicBetaScore = {
      ...reports.publicBetaScore,
      evidenceCaps: [],
      operatorFinalChecks: {
        uiVisualSurfaces: {
          sourceChecksPassed: false,
          passedInCodex: false,
          needsOperatorReview: false,
        },
      },
      launchClearance: {
        formalGates: {
          uiSurfaceCoverage: {
            cleared: false,
            status: "source_surface_checks_failed",
            source: "agent/state/ui-visual-smoke-minimal.generated.json",
          },
        },
      },
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.missingHumanEvidence).toBeGreaterThan(0);
    expect(report.remainingBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "ui_source_coverage_required",
        status: "source_validation_required",
        exactNextAction: "Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps.",
      }),
    ]));
  });

  it("does not require optional visual reproduction when UI source coverage is structured and clear", () => {
    const reports = baseReports();
    reports.publicBetaScore = {
      ...reports.publicBetaScore,
      evidenceCaps: [{ key: "legacy_note", label: "Browser reproduction optional after source issue" }],
      operatorFinalChecks: {
        uiVisualSurfaces: {
          sourceChecksPassed: true,
          passedInCodex: true,
          needsOperatorReview: false,
        },
      },
      launchClearance: {
        formalGates: {
          uiSurfaceCoverage: {
            cleared: true,
            status: "source_surface_checks_current",
            source: "agent/state/ui-visual-smoke-minimal.generated.json",
          },
        },
      },
    };

    const report = buildFixtureReport(reports);

    expect(report.humanEvidenceNeeded.some((item) => item.key === "ui_source_coverage_required")).toBe(false);
    expect(report.nextExactSteps.join("\n")).not.toMatch(/screenshot|visual qa/iu);
  });

  it("does not treat operator-reported provider evidence as passed", () => {
    const reports = baseReports();
    reports.providerSmokeEvidence = {
      currentHead: "test-head",
      status: "operator_reported_not_formal_provider_smoke",
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.missingProviderEvidence).toBe(1);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "provider_smoke_required")).toBe(true);
  });

  it("does not treat runtime_unverified as passed", () => {
    const reports = baseReports();
    reports.runtimeSmokeEvidence = {
      currentHead: "test-head",
      status: "runtime_unverified",
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.missingRuntimeEvidence).toBe(1);
    expect(report.remainingBlockers.some((blocker) => blocker.status === "runtime_smoke_required")).toBe(true);
  });

  it("classifies stale authority risks instead of hiding them", () => {
    const reports = baseReports();
    reports.launchPrTriage = {
      currentHead: "old-head",
      generatedAtUtc: "2026-05-14T00:00:00.000Z",
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.staleAuthorityRisks).toBeGreaterThan(0);
    expect(report.staleReports.some((entry) => entry.reportKey === "launch-pr-triage")).toBe(true);
  });

  it("keeps beta exit review false while required evidence is missing", () => {
    const reports = baseReports();
    reports.providerSmokeEvidence = {
      currentHead: "test-head",
      status: "missing_formal_evidence",
    };

    const report = buildFixtureReport(reports);

    expect(report.summary.canStartBetaExitReview).toBe(false);
  });

  it("allows beta exit review only when no cleanup or evidence blockers remain", () => {
    const report = buildFixtureReport(baseReports());

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

    const report = buildFixtureReport(reports);

    expect(report.nextExactSteps).toContain("Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps.");
    expect(report.nextExactSteps).toContain("Run formal provider smoke checks and refresh provider-smoke-evidence.generated.json.");
    expect(report.nextExactSteps).toContain("Run runtime smoke checks and refresh runtime-smoke-evidence.generated.json.");
  });
});
