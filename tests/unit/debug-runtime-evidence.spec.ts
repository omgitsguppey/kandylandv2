import { describe, expect, it } from "vitest";

import {
  buildDebugRuntimeEvidenceReport,
  validateDebugRuntimeEvidenceReport,
} from "../../scripts/agent/validate-debug-runtime-evidence";
import { buildPublicBetaEvidenceGates } from "../../src/lib/agent-score/core";

const currentHead = "abc123";

describe("debug runtime evidence", () => {
  it("passes as checked-clean source-backed debug evidence without clearing typed evidence gates", () => {
    const report = buildDebugRuntimeEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      debugPanelSourceSnapshotStatus: "checked_clean",
      routeDiagnosticsStatus: "source_ready",
      runtimeWarningStoreStatus: "checked_clean",
      telemetryAdminDebugTruthStatus: "source_ready",
      adminDebugControlTowerStatus: "source_ready",
      precatchRuntimeIssueScanStatus: "checked_clean",
      errorDictionaryMappingStatus: "source_ready",
      criticalRuntimeIssueCount: 0,
      unresolvedWarningCount: 2,
      unknownEvidenceCount: 2,
      sourceBackedRuntimeConfidence: 65,
      validatorResults: [
        { command: "npm run check:debug-panel-output-triage", status: "pass", artifactPath: "agent/state/debug-panel-output-triage.generated.json" },
      ],
    });

    expect(report.status).toBe("source_ready_debug_runtime_evidence");
    expect(report.passed).toBe(true);
    expect(report.launchGateImpact).toBe("does_not_clear_deployed_runtime_smoke");
    expect(report.formalProviderSmokeCleared).toBe(false);
    expect(report.nextAction).toContain("deployed route evidence");
    expect(report.nextAction).not.toMatch(/deployed runtime smoke|provider smoke|admin truth sample/iu);
    expect(validateDebugRuntimeEvidenceReport(report)).toEqual([]);
  });

  it("fails when evidence is empty without checked sources", () => {
    const report = buildDebugRuntimeEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      debugPanelSourceSnapshotStatus: "missing",
      routeDiagnosticsStatus: "missing",
      runtimeWarningStoreStatus: "empty_without_source",
      telemetryAdminDebugTruthStatus: "missing",
      adminDebugControlTowerStatus: "missing",
      precatchRuntimeIssueScanStatus: "missing",
      errorDictionaryMappingStatus: "missing",
      criticalRuntimeIssueCount: 0,
      unresolvedWarningCount: 0,
      unknownEvidenceCount: 3,
      sourceBackedRuntimeConfidence: 0,
      validatorResults: [],
    });

    expect(validateDebugRuntimeEvidenceReport(report)).toEqual(expect.arrayContaining([
      "debug/runtime evidence is empty without checked source backing.",
      "debug runtime evidence has no validator results.",
    ]));
  });

  it("keeps stale consumed snapshots partial without treating them as proof", () => {
    const report = buildDebugRuntimeEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      debugPanelSourceSnapshotStatus: "stale",
      routeDiagnosticsStatus: "source_ready",
      runtimeWarningStoreStatus: "checked_clean",
      telemetryAdminDebugTruthStatus: "stale",
      adminDebugControlTowerStatus: "source_ready",
      precatchRuntimeIssueScanStatus: "source_ready",
      errorDictionaryMappingStatus: "source_ready",
      criticalRuntimeIssueCount: 0,
      unresolvedWarningCount: 0,
      unknownEvidenceCount: 0,
      sourceBackedRuntimeConfidence: 45,
      validatorResults: [
        {
          command: "npm run check:debug-panel-output-triage",
          status: "stale_snapshot",
          artifactPath: "agent/state/debug-panel-output-triage.generated.json",
        },
      ],
    });

    expect(report.status).toBe("partial_debug_runtime_evidence");
    expect(report.passed).toBe(false);
    expect(report.formalProviderSmokeCleared).toBe(false);
    expect(report.deployedRuntimeSmokeCleared).toBe(false);
    expect(validateDebugRuntimeEvidenceReport(report)).toEqual([]);
  });

  it("is recognized by the beta score as source-backed debug evidence only", () => {
    const gates = buildPublicBetaEvidenceGates({
      scannerScore: 100,
      scannerStatus: "clean",
      hasCritical: false,
      evidence: {
        debugRuntimeEvidenceArtifact: {
          path: "agent/state/debug-runtime-evidence.generated.json",
          status: "source_ready_debug_runtime_evidence",
          passed: true,
          detail: "Debug sources were checked clean.",
          evidence: ["launchGateImpact=does_not_clear_deployed_runtime_smoke"],
          generatedAtUtc: "2026-05-20T00:00:00.000Z",
          sourceCommit: currentHead,
        },
      },
    });

    const gate = gates.evidenceGates.find((entry) => entry.id === "debugRuntimeEvidence");
    expect(gate?.status).toBe("Ready");
    expect(gate?.detail).toContain("source-backed");
    expect(gate?.runtimeCredit).toBeGreaterThan(0);
  });
});
