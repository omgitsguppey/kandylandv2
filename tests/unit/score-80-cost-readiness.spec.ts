import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildScore80CostReadinessReport,
  buildScore80CostReadinessFromRepo,
  validateScore80CostReadinessReport,
} from "../../scripts/agent/validate-score-80-cost-readiness";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";
import { buildCostRiskEvidenceReport } from "../../src/lib/cost/cost-risk-evidence-classifier";
import { readValidatorMutationScope, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";
import { withGeneratedReportEnvelope } from "../../scripts/agent/generated-report-envelope";

const head = "score80cost";

const roots: string[] = [];
function repositoryFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "kd-cost-reader-"));
  roots.push(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  git("init", "--quiet");
  git("config", "user.name", "Cost reader fixture");
  git("config", "user.email", "fixture@example.invalid");
  writeFileSync(path.join(root, ".gitignore"), "output/\nagent/state/\n");
  writeFileSync(path.join(root, "AGENTS.md"), "Fixture source authority.\n");
  writeFileSync(path.join(root, "owner.ts"), "export const value = 1;\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture baseline");
  // Existing owner work predates this task and must not invalidate current input-bound proof.
  writeFileSync(path.join(root, "owner.ts"), "export const value = 2;\n");
  const input: TakeoverTaskInput = {
    taskKey: "cost-reader-test", activePromptLane: "cost-source-reader", goal: "Verify actual consumer and recovery.",
    authority: "Isolated source fixture.", allowedFiles: ["owner.ts"], forbiddenFiles: ["protected.ts"],
    inFlightLanes: ["sole fixture"], unknowns: ["No formal target proof."],
    memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "Fixture only." },
    releaseNoteImpact: "No release.", justificationForNetAdditions: "Distinct stale consumer coverage.", authorityFiles: ["AGENTS.md"],
  };
  const inputPath = "output/cost-reader-test/input.json";
  mkdirSync(path.dirname(path.join(root, inputPath)), { recursive: true });
  writeFileSync(path.join(root, inputPath), JSON.stringify(input));
  startTakeoverEvidence(inputPath, root);
  const currentHead = git("rev-parse", "HEAD");
  const source = buildCostRiskEvidenceReport({
    generatedAtUtc: new Date().toISOString(), currentHead,
    costInput: {
      currentHead,
      finalCostAudit: { currentHead, cloudRunGuarded: true, route4xxSourceReady: true, scheduledRuntimeGuarded: true, adminDefaultLoadGuarded: true },
      cloudSqlGemini: { currentHead, cloudSqlRuntimeDetected: false, dataConnectRuntimeDetected: false, sqlMirrorScriptsGuarded: true, sqlMirrorRequiresExplicitApproval: true, geminiRuntimeDetected: true, aiCallsRequireExplicitAction: true, aiCallsHaveRateOrCacheGuard: true },
      bigQuery: { currentHead, scheduledWindowExportEnabled: true, eventTriggeredExportDisabled: true, watermarkDefined: true, queryCostGuardDefined: true },
      analyticsRuntime: { currentHead, ingestGuarded: true, retry4xxClassified: true }, globalCost: { sourceClean: true },
    },
  });
  const report = { ...withGeneratedReportEnvelope(source, { evidenceClass: "source_snapshot", canClearSourceGate: true, nextExactSteps: source.nextExactSteps, doesNotProve: ["External billing and runtime proof"] }), mutationScope: readValidatorMutationScope(root, ["--task-input", inputPath])! };
  const destination = path.join(root, "agent/state/cost-risk-owner-review-closure.generated.json");
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(report));
  for (const [key, artifact] of Object.entries(sourceArtifacts)) {
    const name = key.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());
    writeFileSync(path.join(root, `agent/state/${name}.generated.json`), JSON.stringify({ ...artifact, currentHead }));
  }
  return { root, report, destination };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "kd-cost-reader-"))) throw new Error("Unexpected fixture cleanup target.");
    rmSync(root, { recursive: true, force: true });
  }
});

const sourceArtifacts = {
  finalCostAuditLock: {
    currentHead: head,
    summary: {
      fixedCount: 44,
      partiallyFixedCount: 5,
      cloudRunCostReadiness: "cost_review_required; 2 inventory findings",
      cloudSqlCostReadiness: "cloud_sql_runtime_not_detected; cloud_sql_external_billing_observed_owner_review_required",
      geminiCostReadiness: "gemini_vertex_admin_ai_runtime_detected; gemini_cloud_assist_external_billing_observed_owner_review_required",
      route4xxReadiness: "source_inventory_complete",
      p0Count: 0,
      p1Count: 6,
    },
  },
  cloudSqlGeminiCostGuards: {
    currentHead: head,
    summary: {
      cloudSqlRuntimeDetected: false,
      cloudSqlExternalBillingObserved: true,
      sqlMirrorScriptsGuarded: true,
      sqlMirrorRequiresExplicitApproval: true,
      geminiRuntimeDetected: true,
      geminiExternalBillingObserved: true,
      aiCallsRequireExplicitAction: true,
      aiCallsHaveRateOrCacheGuard: true,
    },
  },
  globalCostSurfaces: {
    overallScore: 100,
    status: "clean",
    criticalFindings: [],
  },
  finalTelemetryClosureLock: {
    currentHead: head,
    summary: {
      ingestClosed: true,
      firestoreWritePathClosed: true,
      adminTelemetryTruthClosed: true,
    },
  },
  analyticsCostRuntimeInventory: {
    currentHead: head,
    summary: {
      cloudRunCostFindings: 2,
      retry4xxFindings: 2,
    },
  },
  analyticsHotPathCostReduction: {
    currentHead: head,
    summary: {
      ingestMaterializationDeferred: true,
      invalidPayloadWarningsCapped: true,
      catchPathFailuresRolledUp: true,
      retryable503Reduced: true,
    },
  },
  creatorDashboardErrorCostInventory: {
    currentHead: "old",
    summary: {
      cloudRunCostFindings: 2,
      expected4xxCount: 2,
      unexpected4xxCount: 1,
      unexpected4xxFixed: 1,
    },
  },
};

describe("score 80 cost readiness", () => {
  it("projects current canonical evidence with inherited work and retains external review", () => {
    const { root } = repositoryFixture();
    const report = buildScore80CostReadinessFromRepo(root);
    expect(validateScore80CostReadinessReport(report)).toEqual([]);
    expect(report.summary.cloudRunSourceReady).toBe(true);
    expect(report.summary.route4xxSourceReady).toBe(true);
    expect(report.ownerReviewLanes).toHaveLength(3);
    expect(report.externalOwnerReviewStillRequired).toBe(true);
    expect(report.validatorResults).toHaveLength(1);
    expect(report.validatorResults[0].artifactPath).toContain("cost-risk-owner-review-closure");
  });

  it("rejects invalid canonical proof despite positive historical locks and accepts exact recovery", () => {
    const { root, report, destination } = repositoryFixture();
    const rejected = () => {
      const result = buildScore80CostReadinessFromRepo(root);
      expect(result.summary.cloudRunSourceReady).toBe(false);
      expect(result.costReadiness.cloudRunCostReadiness.status).toBe("missing_inventory");
      expect(validateScore80CostReadinessReport(result).length).toBeGreaterThan(0);
      expect(result.externalOwnerReviewStillRequired).toBe(true);
    };
    for (const invalid of [
      { ...report, generatedAtUtc: "2026-05-01T00:00:00Z" },
      { ...report, currentHead: "b".repeat(40) },
      { ...report, status: "fail", validationFailures: ["Current source check failed."] },
      { ...report, canClearProviderGate: true },
    ]) {
      writeFileSync(destination, JSON.stringify(invalid));
      rejected();
    }
    rmSync(destination);
    rejected();
    writeFileSync(destination, JSON.stringify(report));
    writeFileSync(path.join(root, "owner.ts"), "export const value = 3;\n");
    rejected();
    writeFileSync(path.join(root, "owner.ts"), "export const value = 2;\n");
    expect(validateScore80CostReadinessReport(buildScore80CostReadinessFromRepo(root))).toEqual([]);
  });

  it("prefers current source cost locks over stale creator dashboard cost inventory", () => {
    const report = buildScore80CostReadinessReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      artifacts: sourceArtifacts,
    });

    expect(report.summary.latestCostLocksPreferred).toBe(true);
    expect(report.costReadiness.cloudRunCostReadiness.status).toBe("source_guarded_external_review_remaining");
    expect(report.costReadiness.cloudSqlCostReadiness.status).toBe("source_ready_no_runtime_usage_detected");
    expect(report.costReadiness.geminiCloudAssistCostReadiness.status).toBe("source_guarded_external_review_remaining");
    expect(report.costReadiness.route4xxReadiness.status).toBe("source_ready_retry_storm_guarded");
    expect(report.costReadiness.route4xxReadiness.evidence.join("\n")).toContain("sourcePath=src/lib/server/route-4xx-classifier.ts");
    expect(report.costReadiness.route4xxReadiness.evidence.join("\n")).not.toContain("creator-dashboard-error-cost-inventory");
    expect(report.staleArtifacts).toContain("agent/state/creator-dashboard-error-cost-inventory.generated.json");
    expect(validateScore80CostReadinessReport(report)).toEqual([]);
  });

  it("keeps owner review separate from pass scoring", () => {
    const report = buildScore80CostReadinessReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      artifacts: sourceArtifacts,
    });
    const score = scoreCostReadiness(report.costReadiness);

    expect(score.score).toBeGreaterThan(68);
    expect(score.ownerReviewRequired).toBe(true);
    expect(report.externalOwnerReviewStillRequired).toBe(true);
    expect(report.costRiskScoreExplanation).toContain("source readiness");
    expect(report.costRiskScoreExplanation).toContain("external billing evidence");
  });

  it("keeps same-commit generated cost snapshots current by impact", () => {
    const report = buildScore80CostReadinessReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "score-refresh-head",
      artifacts: sourceArtifacts,
      artifactCurrentByImpact: {
        finalCostAuditLock: true,
        cloudSqlGeminiCostGuards: true,
        analyticsCostRuntimeInventory: true,
        finalTelemetryClosureLock: true,
      },
    });

    expect(report.costReadiness.cloudRunCostReadiness.status).toBe("source_guarded_external_review_remaining");
    expect(report.costReadiness.cloudSqlCostReadiness.status).toBe("source_ready_no_runtime_usage_detected");
    expect(report.costReadiness.geminiCloudAssistCostReadiness.status).toBe("source_guarded_external_review_remaining");
    expect(report.costReadiness.route4xxReadiness.status).toBe("source_ready_retry_storm_guarded");
    expect(report.sourceReadinessSignals).toEqual(expect.arrayContaining([
      "finalCostCurrent=true",
      "telemetryCurrent=true",
    ]));
    expect(validateScore80CostReadinessReport(report)).toEqual([]);
  });

  it("does not let older exit-pass cost readiness downgrade current source-guarded lanes", () => {
    const report = buildScore80CostReadinessReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      artifacts: {
        ...sourceArtifacts,
        costRiskExitPass: {
          currentHead: "old",
          costReadiness: {
            cloudRunCostReadiness: {
              status: "cost_review_required",
              detail: "Older exit pass had not consumed the current Cloud Run source guard.",
              evidence: ["cloudRunGuarded=false"],
              blocksBetaExit: false,
            },
            cloudSqlCostReadiness: {
              status: "source_ready_no_runtime_usage_detected",
              detail: "SQL runtime is not detected and mirror scripts are guarded.",
              evidence: ["cloudSqlRuntimeDetected=false", "notDetectedIsNotPass=true"],
              blocksBetaExit: false,
            },
            geminiCloudAssistCostReadiness: {
              status: "source_guarded_external_review_remaining",
              detail: "AI routes are source guarded.",
              evidence: ["aiCallsRequireExplicitAction=true"],
              blocksBetaExit: false,
            },
            route4xxReadiness: {
              status: "source_ready_retry_storm_guarded",
              detail: "Route 4xx is source guarded.",
              evidence: ["final-telemetry-closure-lock"],
              blocksBetaExit: false,
            },
          },
        },
      },
      artifactCurrentByImpact: {
        costRiskExitPass: true,
      },
    });

    expect(report.costReadiness.cloudRunCostReadiness.status).toBe("source_guarded_external_review_remaining");
    expect(report.summary.cloudRunSourceReady).toBe(true);
    expect(validateScore80CostReadinessReport(report)).toEqual([]);
  });

  it("fails validation when not detected is treated as a pass", () => {
    const report = buildScore80CostReadinessReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: head,
      artifacts: sourceArtifacts,
    });
    report.costReadiness.cloudSqlCostReadiness.status = "source_inventory_complete";
    report.costReadiness.cloudSqlCostReadiness.evidence.push("cloudSqlRuntimeDetected=false");

    expect(validateScore80CostReadinessReport(report)).toContain(
      "Cloud SQL not-detected/external-billing state must remain owner-review, not pass.",
    );
  });
});
