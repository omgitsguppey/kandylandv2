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
          evidence: ["runtimeConfidenceScore=100", "deployedSmokePresent=false"],
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
          evidence: ["matrixRuntimeHealthCredit=75.56", "matrixEvidenceCompletenessCredit=62.67", "deployedRuntimeSmokeStillRequired=true"],
        }),
        adminSourceSample: artifact({
          path: "agent/state/admin-truth-source-sample.generated.json",
          status: "source_ready_admin_truth_sample",
          passed: true,
          evidence: ["formalAdminTruthSamplePassed=false", "productionSampleAttached=false"],
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
    expect(report.gates.adminTruthSamples.evidenceCredit).toBeGreaterThan(50);
    expect(report.scoreAfter.evidenceCompleteness).toBeGreaterThan(report.scoreBefore.evidenceCompleteness);
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
});
