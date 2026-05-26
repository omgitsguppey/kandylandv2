import { describe, expect, it } from "vitest";

import {
  buildCostRiskExitPassReport,
  classifyCostRiskExitPassDirtyFile,
  validateCostRiskExitPassReport,
} from "../../scripts/agent/validate-cost-risk-exit-pass";
import type { CostOwnerReviewSourceInput } from "../../src/lib/cost/cost-owner-review-classifier";

const head = "cost-risk-exit";

function guardedCostInput(): CostOwnerReviewSourceInput {
  return {
    currentHead: head,
    finalCostAudit: {
      currentHead: head,
      cloudRunGuarded: true,
      route4xxSourceReady: true,
      scheduledRuntimeGuarded: true,
      adminDefaultLoadGuarded: true,
    },
    cloudSqlGemini: {
      currentHead: head,
      cloudSqlRuntimeDetected: false,
      dataConnectRuntimeDetected: false,
      sqlMirrorScriptsGuarded: true,
      sqlMirrorRequiresExplicitApproval: true,
      geminiRuntimeDetected: true,
      geminiExternalBillingObserved: true,
      aiCallsRequireExplicitAction: true,
      aiCallsHaveRateOrCacheGuard: true,
    },
    bigQuery: {
      currentHead: head,
      scheduledWindowExportEnabled: true,
      eventTriggeredExportDisabled: true,
      watermarkDefined: true,
      queryCostGuardDefined: true,
    },
    analyticsRuntime: {
      currentHead: head,
      ingestGuarded: true,
      retry4xxClassified: true,
    },
    globalCost: {
      sourceClean: true,
    },
  };
}

describe("cost risk exit pass", () => {
  it("raises source-verifiable costRisk while preserving external billing review", () => {
    const report = buildCostRiskExitPassReport({
      generatedAtUtc: "2026-05-26T05:00:00.000Z",
      currentHead: head,
      costInput: guardedCostInput(),
      scoreBefore: {
        sourceHealth: 100,
        runtimeHealth: 84.2,
        evidenceCompleteness: 84.6,
        freshness: 83.75,
        costRisk: 42,
        regressionRisk: 86,
        overallHealthScore: 84.12,
      },
      dirtyFiles: [],
    });

    expect(report.status).toBe("pass");
    expect(report.costRisk.before).toBe(42);
    expect(report.costRisk.after).toBeGreaterThanOrEqual(80);
    expect(report.externalBillingReviewed).toBe(false);
    expect(report.externalBillingRemaining).toEqual(
      expect.arrayContaining(["cloudRun", "cloudSqlDataConnect", "geminiCloudAssistVertex"]),
    );
    expect(report.lanes.cloudRun.sourceGuardStatus).toBe("source_guarded_external_review_remaining");
    expect(report.lanes.cloudSqlDataConnect.sourceGuardStatus).toBe("source_ready_no_runtime_usage_detected");
    expect(report.lanes.geminiCloudAssistVertex.externalBillingRequirement).toBe("external_billing_required");
    expect(report.lanes.route4xx.sourceGuardStatus).toBe("source_ready_retry_storm_guarded");
    expect(report.formalEvidenceImpact).toBe("source_cost_guard_only_does_not_clear_provider_billing");
    expect(validateCostRiskExitPassReport(report)).toEqual([]);
  });

  it("requires exact next actions when costRisk remains below target", () => {
    const input = guardedCostInput();
    input.finalCostAudit = {
      currentHead: head,
      cloudRunGuarded: false,
      route4xxSourceReady: false,
      scheduledRuntimeGuarded: false,
      adminDefaultLoadGuarded: false,
    };
    input.analyticsRuntime = { currentHead: head, ingestGuarded: false, retry4xxClassified: false };

    const report = buildCostRiskExitPassReport({
      generatedAtUtc: "2026-05-26T05:00:00.000Z",
      currentHead: head,
      costInput: input,
      dirtyFiles: [],
    });
    report.nextExactSteps = [];

    expect(validateCostRiskExitPassReport(report)).toContain("costRisk below 80 requires exact lane next action.");
  });

  it("blocks fake billing proof and product runtime changes", () => {
    const report = buildCostRiskExitPassReport({
      generatedAtUtc: "2026-05-26T05:00:00.000Z",
      currentHead: head,
      costInput: guardedCostInput(),
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    report.lanes.cloudRun.evidence.push("externalBillingReviewed=true");

    expect(validateCostRiskExitPassReport(report)).toEqual(
      expect.arrayContaining([
        "missing external billing is treated as pass.",
        "product runtime files changed.",
      ]),
    );
  });

  it("classifies scoped files without allowing payment or GumDrop runtime", () => {
    expect(classifyCostRiskExitPassDirtyFile("scripts/agent/validate-cost-risk-exit-pass.ts")).toBe("cost_evidence_validator");
    expect(classifyCostRiskExitPassDirtyFile("tests/unit/cost-risk-exit-pass.spec.ts")).toBe("cost_evidence_test");
    expect(classifyCostRiskExitPassDirtyFile("agent/state/cost-risk-exit-pass.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyCostRiskExitPassDirtyFile("src/lib/agent-score/evidence-quality.ts")).toBe("score_model_evidence_supported");
    expect(classifyCostRiskExitPassDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
  });
});
