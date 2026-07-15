import { describe, expect, it } from "vitest";

import {
  buildLaunchBlockerEvidenceClosureReport,
  classifyLaunchBlockerDirtyFile,
  validateLaunchBlockerEvidenceClosureReport,
} from "../../scripts/agent/validate-launch-blocker-evidence-closure";

const head = "launch-blocker-closure";

function baseInput() {
  return {
    generatedAtUtc: "2026-05-26T06:00:00.000Z",
    currentHead: head,
    scoreBefore: {
      sourceHealth: 100,
      runtimeHealth: 84.2,
      evidenceCompleteness: 84.6,
      freshness: 83.75,
      costRisk: 80.5,
      regressionRisk: 86,
      overallHealthScore: 87.97,
    },
    publicBetaScore: {
      launchGateStatus: "owner_review",
      launchBlockers: [
        "Runtime/provider smoke: Runtime unverified",
        "Admin truth/sample evidence: Ready with smoke required",
        "Required report freshness: Stale evidence",
      ],
    },
    formalEvidenceBridge: {
      formalGateStatus: {
        providerSmoke: { cleared: false, status: "missing_formal_artifact" },
        deployedRuntimeSmoke: { cleared: false, status: "missing_formal_artifact" },
        adminProductionSample: { cleared: false, status: "missing_formal_artifact" },
      },
      sourceConfidenceStatus: {
        realUsageConfidenceScore: 92,
        adminSourceConfidenceScore: 65,
        runtimeSubstituteEvidenceScore: 75.56,
      },
      operatorSignalStatus: {
        operatorConfirmedRevenue: true,
        formalProviderGateCleared: false,
        status: "operator_signal_only",
      },
    },
    adminTruthSourceSample: {
      status: "source_ready_admin_truth_sample",
      productionSampleAttached: false,
      formalAdminTruthSamplePassed: false,
      passed: true,
    },
    debugRuntimeEvidence: {
      status: "source_ready_debug_runtime_evidence",
      deployedRuntimeSmokeCleared: false,
      formalProviderSmokeCleared: false,
    },
    openPrs: [
      {
        number: 294,
        title: "chore(deps): bump npm-minor-patch group",
        author: { login: "app/dependabot", is_bot: true },
        mergeStateStatus: "CLEAN",
        isDraft: false,
        updatedAt: "2026-05-26T04:31:57Z",
        url: "https://github.com/omgitsguppey/kandylandv2/pull/294",
      },
      {
        number: 293,
        title: "Sentinel: [High] Fix insecure Math.random() usage for ID generation",
        author: { login: "omgitsguppey", is_bot: false },
        mergeStateStatus: "CLEAN",
        isDraft: false,
        updatedAt: "2026-05-25T15:13:59Z",
        url: "https://github.com/omgitsguppey/kandylandv2/pull/293",
      },
    ],
    dirtyFiles: [] as string[],
  };
}

describe("launch blocker evidence closure", () => {
  it("classifies source confidence without clearing formal runtime/provider/admin gates", () => {
    const report = buildLaunchBlockerEvidenceClosureReport(baseInput());

    expect(report.status).toBe("pass");
    expect(report.formalGatesCleared).toBe(false);
    expect(report.blockers.runtimeProviderSmoke.label).toBe("Provider-backed site activity + deployed route evidence");
    expect(report.blockers.runtimeProviderSmoke.currentStatus).toBe("Provider-backed site activity + deployed route evidence: Source evidence required");
    expect(report.blockers.runtimeProviderSmoke.nextAction).toBe("Produce provider-backed site activity and deployed runtime route evidence; source confidence and operator revenue do not clear this gate.");
    expect(report.blockers.runtimeProviderSmoke.classification).toBe("external_or_runtime_artifact_required");
    expect(report.blockers.runtimeProviderSmoke.sourceConfidenceStatus).toBe("source_confidence_ready");
    expect(report.blockers.runtimeProviderSmoke.operatorConfirmedReady).toBe(true);
    expect(report.blockers.adminTruthSample.classification).toBe("external_or_runtime_artifact_required");
    expect(report.blockers.adminTruthSample.sourceConfidenceStatus).toBe("source_confidence_ready");
    expect(report.blockers.reportFreshnessPrIntegrity.classification).toBe("external_review_required");
    expect(report.openPrIntegrity.unclassifiedOpenPrCount).toBe(0);
    expect(report.openPrIntegrity.openPrCount).toBe(2);
    expect(report.remainingLaunchBlockers).toEqual(
      expect.arrayContaining(["formal_provider_smoke", "deployed_runtime_smoke", "production_admin_truth_sample"]),
    );
    expect(JSON.stringify({
      blocker: report.blockers.runtimeProviderSmoke,
      reference: report.blockerReferenceClassification[0],
    })).not.toMatch(/Runtime\/provider smoke|formal provider smoke|deployed runtime smoke/iu);
    expect(validateLaunchBlockerEvidenceClosureReport(report)).toEqual([]);
  });

  it("closes stale PR integrity when the current repository has zero open PRs", () => {
    const input = baseInput();
    input.openPrs = [];

    const report = buildLaunchBlockerEvidenceClosureReport(input);

    expect(report.blockers.reportFreshnessPrIntegrity.classification).toBe("can_close_now");
    expect(report.openPrIntegrity.stalePrIntegrityBlockerClosed).toBe(true);
    expect(validateLaunchBlockerEvidenceClosureReport(report)).toEqual([]);
  });

  it("does not treat unavailable GitHub PR evidence as zero open PRs", () => {
    const inputWithoutPrEvidence = { ...baseInput(), openPrs: undefined };

    const report = buildLaunchBlockerEvidenceClosureReport(inputWithoutPrEvidence);

    expect(report.openPrIntegrity.evidenceSource).toBe("not_requested");
    expect(report.openPrIntegrity.evidenceUnavailable).toBe(true);
    expect(report.blockers.reportFreshnessPrIntegrity.classification).toBe("external_review_required");
    expect(report.blockers.reportFreshnessPrIntegrity.canCloseNow).toBe(false);
    expect(report.remainingLaunchBlockers).toContain("open_pr_owner_review");
    expect(validateLaunchBlockerEvidenceClosureReport(report)).toEqual([]);
  });

  it("fails if a blocker is closed by source evidence while formal artifacts are missing", () => {
    const report = buildLaunchBlockerEvidenceClosureReport(baseInput());
    report.blockers.runtimeProviderSmoke.classification = "can_close_now";
    report.blockers.runtimeProviderSmoke.formalGateCleared = true;

    expect(validateLaunchBlockerEvidenceClosureReport(report)).toEqual(
      expect.arrayContaining(["formal gate falsely cleared."]),
    );
  });

  it("fails on unclassified PRs, missing next actions, and unsafe dirty files", () => {
    const input = baseInput();
    input.openPrs = [
      {
        number: 300,
        title: "unknown change",
        author: { login: "external", is_bot: false },
        mergeStateStatus: "UNKNOWN",
        isDraft: false,
        updatedAt: "2026-05-26T05:00:00Z",
        url: "https://github.com/omgitsguppey/kandylandv2/pull/300",
      },
    ];
    input.dirtyFiles = ["src/lib/gumdrop-ledger.ts"];
    const report = buildLaunchBlockerEvidenceClosureReport(input);
    report.nextExactSteps = [];

    expect(validateLaunchBlockerEvidenceClosureReport(report)).toEqual(
      expect.arrayContaining([
        "open PRs unclassified.",
        "launch blocker remains with no exact next action.",
        "unsafe dirty files present.",
      ]),
    );
  });

  it("classifies scoped files without allowing product runtime edits", () => {
    expect(classifyLaunchBlockerDirtyFile("scripts/agent/validate-launch-blocker-evidence-closure.ts")).toBe("launch_blocker_validator");
    expect(classifyLaunchBlockerDirtyFile("tests/unit/launch-blocker-evidence-closure.spec.ts")).toBe("launch_blocker_test");
    expect(classifyLaunchBlockerDirtyFile("agent/state/launch-blocker-evidence-closure.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyLaunchBlockerDirtyFile("docs/agent-truth/launch-blocker-evidence-closure.md")).toBe("release_artifact_expected");
    expect(classifyLaunchBlockerDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
  });
});
