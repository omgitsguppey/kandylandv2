import { describe, expect, it } from "vitest";

import {
  buildFinalBetaExitGateReadinessReport,
  classifyFinalGateDirtyFile,
  validateFinalBetaExitGateReadinessReport,
} from "../../scripts/agent/validate-final-beta-exit-gate-readiness";

const head = "final-gate-head";

function baseInput() {
  return {
    generatedAtUtc: "2026-05-26T06:30:00.000Z",
    currentHead: head,
    publicBetaScore: {
      currentHead: head,
      healthScore: 89.19,
      launchGateStatus: "owner_review",
      launchBlockers: [
        "Runtime/provider smoke: Runtime unverified",
        "Admin truth/sample evidence: Ready with smoke required",
      ],
      sourceHealthScore: 100,
      runtimeHealthScore: 84.2,
      evidenceCompletenessScore: 84.6,
      freshnessScore: 91.88,
      costRiskScore: 80.5,
      regressionRiskScore: 86,
      scoreDimensionExplanations: {
        sourceHealth: { after: 100, target: 80, nextExactAction: "No score action needed." },
        runtimeHealth: { after: 84.2, target: 80, nextExactAction: "No score action needed." },
        evidenceCompleteness: { after: 84.6, target: 80, nextExactAction: "No score action needed." },
        freshness: { after: 91.88, target: 80, nextExactAction: "No score action needed." },
        costRisk: { after: 80.5, target: 80, nextExactAction: "No score action needed." },
        regressionRisk: { after: 86, target: 80, nextExactAction: "No score action needed." },
        overallHealthScore: { after: 89.19, target: 80, nextExactAction: "No score action needed." },
      },
      staleArtifacts: [
        {
          artifactPath: "agent/state/evidence-capture-status.generated.json",
          status: "stale_source_version",
          nextAction: "Run npm run check:evidence-capture-status",
          refreshCommand: "npm run check:evidence-capture-status",
        },
      ],
    },
    launchBlockerClosure: {
      blockers: {
        runtimeProviderSmoke: {
          classification: "cannot_close_without_manual_or_runtime_artifact",
          nextAction: "Attach formal provider smoke and deployed runtime smoke artifacts.",
          canCloseNow: false,
          missingArtifact: "agent/state/provider-smoke-evidence.generated.json + agent/state/runtime-smoke-evidence.generated.json",
        },
        adminTruthSample: {
          classification: "cannot_close_without_manual_or_runtime_artifact",
          nextAction: "Attach a redacted production admin truth sample.",
          canCloseNow: false,
          missingArtifact: "agent/state/admin-truth-sample-evidence.generated.json",
        },
        reportFreshnessPrIntegrity: {
          classification: "external_review_required",
          nextAction: "Review, merge, port, or close classified open PRs.",
          canCloseNow: false,
          missingArtifact: "current open PR owner disposition",
        },
      },
      openPrIntegrity: {
        openPrCount: 2,
        unclassifiedOpenPrCount: 0,
        openPrs: [
          {
            number: 294,
            title: "chore(deps): bump npm-minor-patch group",
            classification: "dependency_update_external_review_required",
            nextAction: "Review dependency PR #294.",
          },
          {
            number: 293,
            title: "Sentinel: [High] Fix insecure Math.random() usage for ID generation",
            classification: "security_patch_external_review_required",
            nextAction: "Review security PR #293.",
          },
        ],
      },
      remainingLaunchBlockers: [
        "formal_provider_smoke",
        "deployed_runtime_smoke",
        "production_admin_truth_sample",
        "open_pr_owner_review",
      ],
    },
    freshnessWindowRepair: {
      staleReports: [
        {
          artifactPath: "agent/state/evidence-capture-status.generated.json",
          classification: "refreshed",
          nextAction: "No action needed after refresh.",
        },
      ],
    },
    costRiskExitPass: {
      externalBillingRemaining: ["cloudRun", "cloudSqlDataConnect", "geminiCloudAssistVertex"],
      nextExactSteps: [
        "cloudRun: Review Cloud Run/App Hosting billing externally.",
        "cloudSqlDataConnect: Map Cloud SQL/Data Connect instance state externally.",
        "geminiCloudAssistVertex: Review Gemini/Vertex billing externally.",
      ],
    },
    openPrs: [
      { number: 294, title: "chore(deps): bump npm-minor-patch group", mergeStateStatus: "CLEAN" },
      { number: 293, title: "Sentinel: [High] Fix insecure Math.random() usage for ID generation", mergeStateStatus: "UNKNOWN" },
    ],
    dirtyFiles: [] as string[],
  };
}

describe("final beta exit gate readiness", () => {
  it("locks current score, blocker, PR, stale artifact, cost, and formal evidence state without marking beta exit ready", () => {
    const report = buildFinalBetaExitGateReadinessReport(baseInput());

    expect(report.status).toBe("pass");
    expect(report.currentHead).toBe(head);
    expect(report.betaExitReady).toBe(false);
    expect(report.launchGateStatus).toBe("owner_review");
    expect(report.dimensionsBelow80).toEqual([]);
    expect(report.dimensionsAbove80).toEqual(
      expect.arrayContaining(["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"]),
    );
    expect(report.openPrsRemaining).toHaveLength(2);
    expect(report.openPrsRemaining.every((pr) => pr.classification !== "unknown_unclassified")).toBe(true);
    expect(report.staleArtifactsRemaining[0].classification).toBe("refreshed");
    expect(report.formalEvidenceRemaining).toEqual(
      expect.arrayContaining(["formal_provider_smoke", "deployed_runtime_smoke", "production_admin_truth_sample"]),
    );
    expect(report.operatorFinalChecklist).toContain("operator_final_visual_review");
    expect(validateFinalBetaExitGateReadinessReport(report)).toEqual([]);
  });

  it("fails when score artifact head is stale", () => {
    const input = baseInput();
    input.publicBetaScore.currentHead = "older-head";
    const report = buildFinalBetaExitGateReadinessReport(input);

    expect(validateFinalBetaExitGateReadinessReport(report)).toContain("score artifact is not current head.");
  });

  it("requires below-80 dimensions to include exact next actions", () => {
    const input = baseInput();
    input.publicBetaScore.costRiskScore = 79;
    input.publicBetaScore.scoreDimensionExplanations.costRisk.nextExactAction = "";
    const report = buildFinalBetaExitGateReadinessReport(input);

    expect(validateFinalBetaExitGateReadinessReport(report)).toContain("below80 dimension lacks exact next action.");
  });

  it("fails on unclassified PRs, unclassified stale artifacts, unsafe dirty files, and false beta ready state", () => {
    const input = baseInput();
    input.openPrs = [{ number: 300, title: "unknown PR", mergeStateStatus: "UNKNOWN" }];
    input.publicBetaScore.staleArtifacts = [
      {
        artifactPath: "agent/state/unknown.generated.json",
        status: "stale",
        nextAction: "",
        refreshCommand: "",
      },
    ];
    input.dirtyFiles = ["src/lib/gumdrop-ledger.ts"];
    const report = buildFinalBetaExitGateReadinessReport(input);
    report.betaExitReady = true;

    expect(validateFinalBetaExitGateReadinessReport(report)).toEqual(
      expect.arrayContaining([
        "open PRs unclassified.",
        "stale required reports unclassified.",
        "betaExitReady true while formal blockers remain.",
        "dirty files unclassified.",
      ]),
    );
  });

  it("classifies scoped final gate files and rejects product runtime edits", () => {
    expect(classifyFinalGateDirtyFile("scripts/agent/validate-final-beta-exit-gate-readiness.ts")).toBe("final_gate_validator");
    expect(classifyFinalGateDirtyFile("tests/unit/final-beta-exit-gate-readiness.spec.ts")).toBe("final_gate_test");
    expect(classifyFinalGateDirtyFile("agent/state/final-beta-exit-gate-readiness.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyFinalGateDirtyFile("docs/agent-truth/final-beta-exit-gate-readiness.md")).toBe("current_generated_artifact_to_commit");
    expect(classifyFinalGateDirtyFile("CHANGELOG.md")).toBe("release_artifact_expected");
    expect(classifyFinalGateDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
  });
});
