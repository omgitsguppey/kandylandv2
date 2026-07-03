import { describe, expect, it } from "vitest";

import {
  buildFormalEvidenceBridgeReport,
  validateFormalEvidenceBridgeReport,
  type FormalEvidenceBridgeArtifact,
} from "../../src/lib/agent-score/formal-evidence-bridge";

function artifact(input: Partial<FormalEvidenceBridgeArtifact>): FormalEvidenceBridgeArtifact {
  return {
    path: input.path ?? "agent/state/example.generated.json",
    status: input.status ?? "source_ready",
    passed: input.passed ?? true,
    generatedAtUtc: input.generatedAtUtc ?? "2026-05-21T00:00:00.000Z",
    currentHead: input.currentHead ?? "old-head",
    detail: input.detail ?? "",
    evidence: input.evidence ?? [],
  };
}

describe("source evidence bridge", () => {
  it("credits source-backed and operator evidence without clearing source gates", () => {
    const report = buildFormalEvidenceBridgeReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "head",
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 66,
        evidenceCompleteness: 37.5,
        freshness: 62.86,
        costRisk: 80.5,
        regressionRisk: 18,
        overallHealthScore: 62.9,
      },
      artifacts: {
        providerSmoke: artifact({
          path: "agent/state/provider-smoke-evidence.generated.json",
          status: "missing_formal_evidence",
          passed: false,
        }),
        runtimeSmoke: artifact({
          path: "agent/state/runtime-smoke-evidence.generated.json",
          status: "runtime_unverified",
          passed: false,
        }),
        operatorRevenueSmoke: artifact({
          path: "agent/state/operator-revenue-smoke.generated.json",
          status: "operator_confirmed_revenue_smoke",
          passed: true,
          evidence: ["amountUsdConfirmed=37.5", "formalProviderSmokePassed=false"],
        }),
        sourceBackedRuntimeConfidence: artifact({
          path: "agent/state/source-backed-runtime-confidence.generated.json",
          status: "source_ready_runtime_confidence",
          passed: true,
          evidence: [
            "runtimeConfidenceScore=100",
            "liveRuntimeEvidence.firstPartySiteActivityConfirmed=3",
            "deployedSmokePresent=false",
          ],
        }),
        realUsageConfidence: artifact({
          path: "agent/state/real-usage-confidence.generated.json",
          status: "source_ready_real_usage_confidence",
          passed: true,
          evidence: ["confidenceScore=92", "formalGatesCleared=false"],
        }),
        runtimeSubstituteMatrix: artifact({
          path: "agent/state/runtime-smoke-substitute-matrix.generated.json",
          status: "source_ready_runtime_smoke_substitute_matrix",
          passed: true,
          evidence: [
            "matrixRuntimeHealthCredit=75.56",
            "matrixRuntimeProviderActivityCredit=75.56",
            "matrixEvidenceCompletenessCredit=62.67",
            "deployedRuntimeSmokeStillRequired=true",
          ],
        }),
        adminSourceSample: artifact({
          path: "agent/state/admin-truth-source-sample.generated.json",
          status: "source_ready_admin_truth_sample",
          passed: true,
          evidence: [
            "adminDebugControlTowerModelPresent=true",
            "adminDebugRoutePresent=true",
            "sourceTruthLabelsPresent=true",
            "sourceTruthStatus=source_backed",
            "criticalAdminTruthIssueCount=0",
            "fakeHealthyStateDetected=false",
            "degradedOrUnavailableLaneCount=4",
            "formalAdminTruthSamplePassed=false",
            "productionSampleAttached=false",
          ],
        }),
        debugRuntimeEvidence: artifact({
          path: "agent/state/debug-runtime-evidence.generated.json",
          status: "partial_debug_runtime_evidence",
          passed: false,
          evidence: ["sourceBackedRuntimeConfidence=100", "deployedRuntimeSmokeCleared=false"],
        }),
      },
    });

    expect(report.formalGateStatus.providerSmoke.cleared).toBe(false);
    expect(report.formalGateStatus.deployedRuntimeSmoke.cleared).toBe(false);
    expect(report.formalGateStatus.adminProductionSample.cleared).toBe(false);
    expect(report.gates.runtimeProviderSmoke.evidenceCredit).toBeGreaterThan(60);
    expect(report.gates.adminTruthSamples.evidenceCredit).toBeGreaterThan(0);
    expect(report.gates.adminTruthSamples.formalGateCleared).toBe(false);
    expect(report.sourceConfidenceStatus.adminSourceConfidenceScore).toBeGreaterThan(0);
    expect(report.sourceGapsRemaining).toEqual([
      "provider_backed_site_activity",
      "deployed_route_activity",
      "admin_source_activity_sample",
    ]);
    expect(report.scoreDimensionImpact.runtimeHealth).toContain("deployed runtime route evidence");
    expect(report.scoreDimensionImpact.runtimeHealth).not.toContain("deployed runtime smoke");
    expect(report.nextExactSteps.join("\n")).not.toContain("formal_provider_smoke");
    expect(report.scoreAfter.evidenceCompleteness).toBeGreaterThan(report.scoreBefore.evidenceCompleteness);
    expect(validateFormalEvidenceBridgeReport(report)).toEqual([]);
  });

  it("uses runtime substitute source health without treating real-usage confidence as observed activity", () => {
    const report = buildFormalEvidenceBridgeReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "head",
      artifacts: {
        realUsageConfidence: artifact({
          path: "agent/state/real-usage-confidence.generated.json",
          status: "source_ready_real_usage_confidence",
          passed: true,
          evidence: ["confidenceScore=92", "observedSignals=0", "formalGatesCleared=false"],
        }),
        realUsageConfidenceCalibration: artifact({
          path: "agent/state/real-usage-confidence-calibration.generated.json",
          status: "source_ready_real_usage_confidence_calibrated",
          passed: true,
          evidence: ["runtimeHealthCredit=95", "calibratedConfidenceScore=95", "observedSignals=4"],
        }),
        runtimeSubstituteMatrix: artifact({
          path: "agent/state/runtime-smoke-substitute-matrix.generated.json",
          status: "source_ready_runtime_smoke_substitute_matrix",
          passed: true,
          evidence: [
            "matrixRuntimeHealthCredit=95",
            "matrixRuntimeProviderActivityCredit=0",
            "realUsageObservedSignals=0",
            "realUsageObservedActivityCredit=0",
          ],
        }),
      },
    });

    expect(report.sourceConfidenceStatus.realUsageConfidenceScore).toBe(95);
    expect(report.sourceConfidenceStatus.realUsageObservedActivityScore).toBe(0);
    expect(report.sourceConfidenceStatus.runtimeSubstituteEvidenceScore).toBe(95);
    expect(report.gates.runtimeProviderSmoke.evidenceCredit).toBe(78);
    expect(report.gates.runtimeProviderSmoke.runtimeCredit).toBe(95);
    expect(report.gates.runtimeProviderSmoke.formalGateCleared).toBe(false);
    expect(validateFormalEvidenceBridgeReport(report)).toEqual([]);
  });

  it("fails validation if operator revenue clears the provider-backed source gate", () => {
    const report = buildFormalEvidenceBridgeReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "head",
      artifacts: {
        operatorRevenueSmoke: artifact({
          status: "operator_confirmed_revenue_smoke",
          evidence: ["formalProviderSmokePassed=false"],
        }),
      },
    });
    report.formalGateStatus.providerSmoke.cleared = true;

    expect(validateFormalEvidenceBridgeReport(report)).toContain("operator revenue must not clear the provider-backed source gate.");
  });

  it("keeps attached admin sample actions in redacted source-activity wording while preserving compatibility status keys", () => {
    const report = buildFormalEvidenceBridgeReport({
      generatedAtUtc: new Date().toISOString(),
      currentHead: "head",
      artifacts: {
        adminSourceSample: artifact({
          path: "agent/state/admin-truth-sample-evidence.generated.json",
          status: "formal_admin_truth_sample_passed",
          passed: true,
          generatedAtUtc: new Date().toISOString(),
          currentHead: "head",
          evidence: ["formalAdminTruthSamplePassed=true", "productionSampleAttached=true"],
        }),
        sourceBackedRuntimeConfidence: artifact({
          path: "agent/state/source-backed-runtime-confidence.generated.json",
          status: "source_ready_runtime_confidence",
          passed: true,
          generatedAtUtc: new Date().toISOString(),
          currentHead: "head",
          evidence: ["runtimeConfidenceScore=80", "deployedSmokePresent=false"],
        }),
      },
    });

    expect(report.formalGateStatus.adminProductionSample.status).toBe("production_admin_truth_artifact");
    expect(report.formalGateStatus.adminProductionSample.nextAction).toBe("Keep redacted admin source activity sample fresh.");
    expect(report.gates.adminTruthSamples.nextAction).toBe("Keep redacted admin source activity sample fresh.");
    expect(`${report.formalGateStatus.adminProductionSample.nextAction} ${report.gates.adminTruthSamples.nextAction}`)
      .not.toMatch(/production admin truth|first-party admin sample|manual proof/iu);
    expect(validateFormalEvidenceBridgeReport(report)).toEqual([]);
  });
});
