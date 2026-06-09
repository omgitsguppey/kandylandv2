import { describe, expect, it } from "vitest";

import {
  buildReleaseReadinessContext,
  buildReleaseRollbackIncidentReadinessReport,
  validateReleaseRollbackIncidentReadinessReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("release rollback incident readiness", () => {
  it("discloses missing kill switches and separates external evidence blockers from source failures", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      releaseNotes: { currentVersion: "1.5.9" },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
      releaseEvidenceArtifacts: {
        currentHeadReleaseReconciliation: {
          reportKey: "current-head-release-reconciliation",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          staleArtifactsRemaining: [],
        },
        releaseNotesIntegrity: {
          reportKey: "release-notes-integrity",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          claimsBetaExit: false,
          claimsProviderRuntimeProof: false,
          validationFailures: [],
        },
        configEnvContract: {
          reportKey: "config-env-contract",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          validation: { ok: true },
        },
        providerSmokeEvidence: {
          reportKey: "provider-smoke-evidence",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          status: "operator_reported_not_formal_provider_smoke",
          passed: false,
        },
        runtimeSmokeEvidence: {
          reportKey: "runtime-smoke-evidence",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          status: "formal_runtime_smoke_passed",
          passed: true,
        },
        adminTruthSampleEvidence: {
          reportKey: "admin-truth-sample-evidence",
          currentHead: "head",
          generatedAtUtc: "2026-06-08T00:00:00.000Z",
          status: "formal_admin_truth_sample_passed",
          passed: true,
        },
        rollbackIncidentResponse: {
          auditKey: "rollback-incident-response-launch-plan",
          runtimeBehaviorChanged: false,
          productionDataWritten: false,
          incidents: [{ category: "payments broken" }],
        },
      },
    });
    const report = buildReleaseRollbackIncidentReadinessReport(context);

    expect(report.featureFlagsAndKillSwitches.some((entry) => entry.status === "missing_kill_switch")).toBe(true);
    expect(report.readinessStatus).toBe("source_ready_external_evidence_blocked");
    expect(report.providerEvidence.status).toBe("operator_reported_only");
    expect(report.providerEvidence.blocking).toBe(true);
    expect(report.runtimeEvidence.status).toBe("passed");
    expect(report.adminTruthEvidence.status).toBe("passed");
    expect(report.blockingExternalEvidence.map((gate) => gate.gateId)).toContain("provider-smoke-evidence");
    expect(report.evidenceGates.map((gate) => gate.gateId)).toEqual([
      "current-head-evidence",
      "release-notes-integrity",
      "env-contract",
      "provider-smoke-evidence",
      "runtime-smoke-evidence",
      "admin-truth-sample-evidence",
      "incident-recovery-state",
    ]);
    expect(report.safetyNotes.paymentWallet).toBeTruthy();
    expect(report.safetyNotes.gumdropLedger).toBeTruthy();
    expect(report.safetyNotes.analyticsIngest).toBeTruthy();
    expect(validateReleaseRollbackIncidentReadinessReport(report)).toEqual([]);
  });
});
