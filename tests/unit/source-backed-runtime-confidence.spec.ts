import { describe, expect, it } from "vitest";

import {
  buildSourceBackedRuntimeConfidenceReport,
  validateSourceBackedRuntimeConfidenceReport,
} from "../../scripts/agent/validate-source-backed-runtime-confidence";
import { buildPublicBetaEvidenceGates } from "../../src/lib/agent-score/core";

const head = "abc123";

describe("source-backed runtime confidence", () => {
  it("passes as source-backed confidence without clearing deployed route evidence", () => {
    const report = buildSourceBackedRuntimeConfidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      runtimeContractsPresent: true,
      deployedSmokePresent: false,
      watchTimeRuntimeSourceReady: true,
      telemetryPipelineSourceReady: true,
      walletLoadingSourceReady: true,
      creatorDropStatusRuntimeSourceReady: true,
      globalUserDedupeSourceReady: true,
      operatorRevenueSmokeSourceSignal: true,
      scoringModelSupportsRuntimePartialCredit: true,
      validatorResults: [
        { command: "npm run check:runtime-watch-time-v2", status: "pass", artifactPath: "agent/state/runtime-watch-time-v2.generated.json" },
      ],
    });

    expect(report.status).toBe("source_ready_runtime_confidence");
    expect(report.passed).toBe(true);
    expect(report.launchGateImpact).toBe("does_not_clear_runtime_smoke");
    expect(report.deployedSmokePresent).toBe(false);
    expect(validateSourceBackedRuntimeConfidenceReport(report)).toEqual([]);
  });

  it("fails if the artifact tries to clear deployed route evidence", () => {
    const report = buildSourceBackedRuntimeConfidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      runtimeContractsPresent: true,
      deployedSmokePresent: false,
      watchTimeRuntimeSourceReady: true,
      telemetryPipelineSourceReady: true,
      walletLoadingSourceReady: true,
      creatorDropStatusRuntimeSourceReady: true,
      globalUserDedupeSourceReady: true,
      operatorRevenueSmokeSourceSignal: true,
      validatorResults: [
        { command: "npm run check:runtime-watch-time-v2", status: "pass", artifactPath: "agent/state/runtime-watch-time-v2.generated.json" },
      ],
    });
    report.launchGateImpact = "clears_runtime_smoke";

    expect(validateSourceBackedRuntimeConfidenceReport(report)).toContain(
      "source-backed runtime confidence must not clear deployed route evidence.",
    );
  });

  it("allows partial source confidence when dependency validators are stale", () => {
    const report = buildSourceBackedRuntimeConfidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      runtimeContractsPresent: true,
      deployedSmokePresent: false,
      watchTimeRuntimeSourceReady: true,
      telemetryPipelineSourceReady: false,
      walletLoadingSourceReady: false,
      creatorDropStatusRuntimeSourceReady: true,
      globalUserDedupeSourceReady: true,
      operatorRevenueSmokeSourceSignal: true,
      scoringModelSupportsRuntimePartialCredit: true,
      validatorResults: [
        { command: "npm run check:final-telemetry-closure-lock", status: "fail", artifactPath: "agent/state/final-telemetry-closure-lock.generated.json" },
      ],
    });

    expect(report.status).toBe("partial_source_runtime_confidence");
    expect(report.passed).toBe(false);
    expect(report.runtimeConfidenceScore).toBeGreaterThan(0);
    expect(validateSourceBackedRuntimeConfidenceReport(report)).toEqual([]);
  });

  it("weights actual user dedupe source evidence above context-only revenue", () => {
    const withDedupe = buildSourceBackedRuntimeConfidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      runtimeContractsPresent: false,
      deployedSmokePresent: false,
      watchTimeRuntimeSourceReady: false,
      telemetryPipelineSourceReady: false,
      walletLoadingSourceReady: false,
      creatorDropStatusRuntimeSourceReady: false,
      globalUserDedupeSourceReady: true,
      operatorRevenueSmokeSourceSignal: false,
      scoringModelSupportsRuntimePartialCredit: true,
      validatorResults: [
        { command: "npm run check:global-user-dedupe-normalization", status: "pass", artifactPath: "agent/state/global-user-dedupe-normalization.generated.json" },
      ],
    });
    const withRevenueContext = buildSourceBackedRuntimeConfidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      runtimeContractsPresent: false,
      deployedSmokePresent: false,
      watchTimeRuntimeSourceReady: false,
      telemetryPipelineSourceReady: false,
      walletLoadingSourceReady: false,
      creatorDropStatusRuntimeSourceReady: false,
      globalUserDedupeSourceReady: false,
      operatorRevenueSmokeSourceSignal: true,
      scoringModelSupportsRuntimePartialCredit: true,
      validatorResults: [
        { command: "npm run check:operator-revenue-smoke", status: "pass", artifactPath: "agent/state/operator-revenue-smoke.generated.json" },
      ],
    });

    expect(withDedupe.runtimeConfidenceScore).toBeGreaterThan(withRevenueContext.runtimeConfidenceScore);
    expect(withDedupe.evidence).toContain("globalUserDedupeSourceReady=true");
    expect(withDedupe.launchGateImpact).toBe("does_not_clear_runtime_smoke");
  });

  it("gives runtime health source credit while route/provider evidence remains unverified", () => {
    const generatedAtUtc = new Date().toISOString();
    const gates = buildPublicBetaEvidenceGates({
      scannerScore: 100,
      scannerStatus: "clean",
      hasCritical: false,
      evidence: {
        sourceBackedRuntimeConfidenceEvidence: {
          path: "agent/state/source-backed-runtime-confidence.generated.json",
          status: "source_ready_runtime_confidence",
          passed: true,
          detail: "Source-backed runtime confidence only.",
          evidence: [
            "runtimeConfidenceScore=80",
            "liveRuntimeEvidence.firstPartySiteActivityConfirmed=1",
            "launchGateImpact=does_not_clear_runtime_smoke",
          ],
          generatedAtUtc,
          sourceCommit: head,
        },
        runtimeSmokeEvidence: {
          path: "agent/state/runtime-smoke-evidence.generated.json",
          status: "runtime_unverified",
          passed: false,
          detail: "Deployed route evidence missing.",
          evidence: ["runtimeDeploymentSmokePassed=false"],
          generatedAtUtc,
          sourceCommit: head,
        },
      },
    });

    const runtimeGate = gates.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
    expect(runtimeGate?.status).toBe("Source evidence required");
    expect(runtimeGate?.runtimeCredit).toBeGreaterThan(0);
    expect(runtimeGate?.runtimeCredit).toBeLessThan(100);
    expect(runtimeGate?.evidence.join("\n")).toContain("sourceBackedRuntimeConfidenceStatus=source_ready_runtime_confidence");
  });
});
