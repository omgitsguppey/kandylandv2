import { describe, expect, it } from "vitest";

import {
  buildAlgorithmicEvidencePolicyReport,
  validateAlgorithmicEvidencePolicyReport,
} from "@/lib/agent-score/algorithmic-evidence-policy";
import {
  buildPublicBetaScoreReport,
  type PublicBetaEvidenceArtifact,
} from "@/lib/agent-score/core";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";

const sourceReadyDebugRuntime = {
  path: "agent/state/debug-runtime-evidence.generated.json",
  status: "source_ready_debug_runtime_evidence",
  passed: true,
  detail: "Debug/runtime evidence is source ready.",
  evidence: [
    "sourceBackedRuntimeConfidence=100",
    "deployedRuntimeSmokeCleared=false",
    "formalProviderSmokeCleared=false",
  ],
} satisfies PublicBetaEvidenceArtifact;

const realUsageConfidence = {
  path: "agent/state/real-usage-confidence.generated.json",
  status: "source_ready_real_usage_confidence",
  passed: true,
  detail: "Real usage confidence is source ready.",
  evidence: ["confidenceScore=92", "observedSignals=0", "does_not_clear_formal_provider"],
} satisfies PublicBetaEvidenceArtifact;

const realUsageCalibration = {
  path: "agent/state/real-usage-confidence-calibration.generated.json",
  status: "source_ready_real_usage_confidence_calibrated",
  passed: true,
  detail: "Real usage confidence calibration is source ready.",
  evidence: ["runtimeHealthCredit=95", "calibratedConfidenceScore=95"],
} satisfies PublicBetaEvidenceArtifact;

const behaviorMath = {
  path: "agent/state/behavior-math-verification.generated.json",
  status: "verified_local_contract",
  passed: true,
  detail: "Behavior math is verified locally.",
  evidence: ["perUserConfidence=user-1:exact", "watch_time=watch_session_rollups_only"],
} satisfies PublicBetaEvidenceArtifact;

const adminSourceSample = {
  path: "agent/state/admin-truth-source-sample.generated.json",
  status: "source_ready_admin_truth_sample",
  passed: false,
  detail: "Source-backed admin truth wiring is present; admin source activity sample remains missing.",
  evidence: [
    "sourceTruthStatus=source_backed",
    "productionSampleAttached=false",
    "formalAdminTruthSamplePassed=false",
  ],
} satisfies PublicBetaEvidenceArtifact;

const operatorRevenueSmoke = {
  path: "agent/state/operator-revenue-smoke.generated.json",
  status: "operator_confirmed_revenue_smoke",
  passed: true,
  detail: "Operator-confirmed revenue smoke is a product signal only.",
  evidence: [
    "confirmationSource=operator_confirmed",
    "formalProviderSmokePassed=false",
    "providerArtifactAttached=false",
  ],
} satisfies PublicBetaEvidenceArtifact;

const runtimeSubstituteMatrixWithoutActivity = {
  path: "agent/state/runtime-smoke-substitute-matrix.generated.json",
  status: "source_ready_runtime_smoke_substitute_matrix",
  passed: true,
  detail: "Runtime smoke substitute matrix is source ready.",
  evidence: [
    "matrixRuntimeHealthCredit=95",
    "matrixRuntimeProviderActivityCredit=0",
    "realUsageObservedSignals=0",
    "realUsageObservedActivityCredit=0",
  ],
} satisfies PublicBetaEvidenceArtifact;

describe("algorithmic evidence policy", () => {
  it("keeps UI source coverage separate while freeing non-UI algorithmic evidence from visual artifact blocking", () => {
    const report = buildAlgorithmicEvidencePolicyReport({
      uiChanged: true,
      uiSurfaceCoverageEvidence: {
        path: "agent/state/ui-visual-smoke-minimal.generated.json",
        status: "source_surface_checks_failed",
        passed: false,
        detail: "No UI source coverage evidence.",
        evidence: ["uiSurfaceCoverageArtifactStatus=source_surface_checks_failed"],
      },
      debugRuntimeEvidence: sourceReadyDebugRuntime,
      realUsageConfidenceEvidence: realUsageConfidence,
      behaviorMathEvidence: behaviorMath,
      adminTruthSampleEvidence: adminSourceSample,
      operatorRevenueSmokeEvidence: operatorRevenueSmoke,
      costReadinessSourcePath: "agent/state/score-80-cost-readiness.generated.json",
      refreshQueueSourcePath: "agent/state/self-healing-refresh-queue.generated.json",
    });

    expect(report.uiSurfaceCoverageScope.uiSurfaceCoverageGate.requiresSourceSurfaceCoverage).toBe(true);
    expect(report.uiSurfaceCoverageScope.uiSurfaceCoverageGate.canClearFromAlgorithmicEvidence).toBe(false);
    expect(report.uiSurfaceCoverageScope.nonUiAlgorithmicEvidence.blockedByUiSourceCoverage).toBe(false);
    expect(report.nonUiAlgorithmicCoverageScore).toBeGreaterThan(45);
    expect(report.formalGateImpact.uiVisualGateCleared).toBe(false);
    expect(validateAlgorithmicEvidencePolicyReport(report)).toEqual([]);
  });

  it("keeps operator revenue partial while source runtime waits for activity and admin wiring stays partial", () => {
    const report = buildAlgorithmicEvidencePolicyReport({
      debugRuntimeEvidence: sourceReadyDebugRuntime,
      realUsageConfidenceEvidence: realUsageConfidence,
      behaviorMathEvidence: behaviorMath,
      adminTruthSampleEvidence: adminSourceSample,
      operatorRevenueSmokeEvidence: operatorRevenueSmoke,
    });

    expect(report.providerConfidence.confidence).toBe("partial");
    expect(report.runtimeSourceConfidence.confidence).toBe("missing");
    expect(report.adminTruthConfidence.confidence).toBe("partial");
    expect(report.runtimeSourceConfidence.score).toBe(0);
    expect(report.adminTruthConfidence.score).toBeGreaterThan(0);
    expect(report.formalGateImpact.formalProviderGateCleared).toBe(false);
    expect(report.formalGateImpact.deployedRuntimeSmokeCleared).toBe(false);
    expect(report.formalGateImpact.formalAdminRuntimeSampleCleared).toBe(false);
    expect(report.coverage.every((item) => item.sourcePath.length > 0)).toBe(true);
    expect(report.coverage.every((item) => item.distinction.length > 0)).toBe(true);
  });

  it("uses runtime substitute source health without treating missing activity as observed", () => {
    const report = buildAlgorithmicEvidencePolicyReport({
      realUsageConfidenceEvidence: realUsageConfidence,
      realUsageConfidenceCalibrationEvidence: realUsageCalibration,
      runtimeSmokeSubstituteMatrixEvidence: runtimeSubstituteMatrixWithoutActivity,
      adminTruthSampleEvidence: adminSourceSample,
      operatorRevenueSmokeEvidence: operatorRevenueSmoke,
    });

    expect(report.telemetryConfidence.score).toBe(95);
    expect(report.runtimeSourceConfidence.score).toBe(95);
    expect(report.runtimeSourceConfidence.confidence).toBe("partial");
    expect(report.runtimeSourceConfidence.distinction).toContain("does not clear deployed route evidence");
    expect(validateAlgorithmicEvidencePolicyReport(report)).toEqual([]);
  });

  it("does not count calibration observedSignals as observed runtime activity", () => {
    const report = buildAlgorithmicEvidencePolicyReport({
      realUsageConfidenceEvidence: realUsageConfidence,
      realUsageConfidenceCalibrationEvidence: {
        ...realUsageCalibration,
        evidence: ["runtimeHealthCredit=95", "calibratedConfidenceScore=95", "observedSignals=4"],
      },
      adminTruthSampleEvidence: adminSourceSample,
      operatorRevenueSmokeEvidence: operatorRevenueSmoke,
    });

    expect(report.telemetryConfidence.score).toBe(95);
    expect(report.runtimeSourceConfidence.score).toBe(0);
    expect(report.runtimeSourceConfidence.confidence).toBe("missing");
    expect(validateAlgorithmicEvidencePolicyReport(report)).toEqual([]);
  });

  it("does not let UI source coverage gaps block non-UI beta health dimensions", () => {
    const report = buildPublicBetaScoreReport([], {
      commandBudget: buildPublicBetaCommandBudget(),
      evidence: {
        requiredReports: [{
          path: "agent/state/final-launch-readiness-report.generated.json",
          generatedAt: new Date().toISOString(),
          freshness: "fresh" as const,
        }],
        uiSurfaceCoverageEvidence: {
          path: "agent/state/ui-visual-smoke-minimal.generated.json",
          status: "source_surface_checks_failed",
          passed: false,
          detail: "No UI source coverage evidence.",
          evidence: ["uiSurfaceCoverageArtifactStatus=source_surface_checks_failed"],
        },
        providerSmokeEvidence: {
          path: "agent/state/provider-smoke-evidence.generated.json",
          status: "missing_formal_evidence",
          passed: false,
          detail: "No provider-backed source artifact.",
          evidence: ["providerArtifactStatus=missing_formal_evidence"],
        },
        runtimeSmokeEvidence: {
          path: "agent/state/runtime-smoke-evidence.generated.json",
          status: "runtime_unverified",
          passed: false,
          detail: "No deployed runtime artifact.",
          evidence: ["runtimeArtifactStatus=runtime_unverified"],
        },
        debugRuntimeEvidenceArtifact: sourceReadyDebugRuntime,
        targetedBehaviorEvidence: {
          path: "agent/state/targeted-behavior-evidence.generated.json",
          status: "passed",
          passed: true,
          detail: "Targeted behavior evidence passed.",
          evidence: ["targetedBehavior.status=passed"],
        },
        realUsageConfidenceEvidence: realUsageConfidence,
        adminTruthSampleEvidence: adminSourceSample,
      },
    });

    expect(report.readinessStatus).toBe("Source evidence required");
    expect(report.launchBlockers.join("\n")).not.toContain("Visual QA required");
    expect(report.runtimeHealthScore).toBeGreaterThan(55);
    expect(report.evidenceCompletenessScore).toBeGreaterThan(50);
    expect(report.nuancedScoreExplanation.join("\n")).toContain("Deterministic UI surface coverage is the default UI readiness lane");
  });
});
