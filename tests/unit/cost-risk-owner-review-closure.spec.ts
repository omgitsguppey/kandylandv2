import { describe, expect, it } from "vitest";

import {
  buildCostRiskEvidenceReport,
  classifyCostRiskEvidence,
  validateCostRiskEvidenceReport,
} from "../../src/lib/cost/cost-risk-evidence-classifier";
import type { CostOwnerReviewSourceInput } from "../../src/lib/cost/cost-owner-review-classifier";
import { validateCostRiskSourceDependencies } from "../../scripts/agent/validate-cost-risk-owner-review-closure";

function guardedInput(): CostOwnerReviewSourceInput {
  return {
    currentHead: "head",
    finalCostAudit: {
      currentHead: "head",
      cloudRunGuarded: true,
      route4xxSourceReady: true,
      scheduledRuntimeGuarded: true,
      adminDefaultLoadGuarded: true,
    },
    cloudSqlGemini: {
      currentHead: "head",
      cloudSqlRuntimeDetected: false,
      dataConnectRuntimeDetected: false,
      sqlMirrorScriptsGuarded: true,
      sqlMirrorRequiresExplicitApproval: true,
      geminiRuntimeDetected: true,
      aiCallsRequireExplicitAction: true,
      aiCallsHaveRateOrCacheGuard: true,
      geminiExternalBillingObserved: true,
    },
    bigQuery: {
      currentHead: "head",
      scheduledWindowExportEnabled: true,
      eventTriggeredExportDisabled: true,
      watermarkDefined: true,
      queryCostGuardDefined: true,
    },
    analyticsRuntime: {
      currentHead: "head",
      ingestGuarded: true,
      retry4xxClassified: true,
    },
    globalCost: {
      sourceClean: true,
    },
  };
}

describe("cost risk owner-review closure", () => {
  it("requires every actual cost child to be current and passing before using its source facts", () => {
    const head = "a".repeat(40);
    const nowMs = Date.parse("2026-10-01T05:00:00Z");
    const keys = ["cloud-sql-gemini-cost-guards", "bigquery-cloud-pipeline-closure", "analytics-hot-path-cost-reduction", "scheduled-runtime-cost-reduction", "admin-analytics-debug-cost-reduction"];
    const reports = Object.fromEntries(keys.map((key) => [key, {
      reportKey: key, currentHead: head, sourceCommit: head,
      generatedAtUtc: new Date(nowMs).toISOString(), status: "pass", canClearSourceGate: true, validationFailures: [],
    }]));
    expect(validateCostRiskSourceDependencies(reports, head, nowMs)).toEqual([]);
    const child = reports["scheduled-runtime-cost-reduction"];
    child.generatedAtUtc = "2026-05-01T00:00:00Z";
    expect(validateCostRiskSourceDependencies(reports, head, nowMs).join("\n")).toContain("scheduled-runtime-cost-reduction child generatedAtUtc");
    child.generatedAtUtc = new Date(nowMs).toISOString();
    child.currentHead = "b".repeat(40);
    expect(validateCostRiskSourceDependencies(reports, head, nowMs).join("\n")).toContain("scheduled-runtime-cost-reduction child currentHead");
    child.currentHead = head;
    child.status = "fail";
    expect(validateCostRiskSourceDependencies(reports, head, nowMs).join("\n")).toContain("scheduled-runtime-cost-reduction child status");
    child.status = "pass";
    expect(validateCostRiskSourceDependencies(reports, head, nowMs)).toEqual([]);
    delete reports["bigquery-cloud-pipeline-closure"];
    expect(validateCostRiskSourceDependencies(reports, head, nowMs).join("\n")).toContain("bigquery-cloud-pipeline-closure child report must be an object");
  });

  it("credits source-guarded lanes without claiming external billing proof", () => {
    const report = buildCostRiskEvidenceReport({
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
      currentHead: "head",
      costInput: guardedInput(),
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 66,
        evidenceCompleteness: 37.5,
        freshness: 62.86,
        costRisk: 42,
        regressionRisk: 30,
        overallHealthScore: 60.25,
      },
      dirtyFilesClassification: [
        { path: "src/lib/cost/cost-risk-evidence-classifier.ts", status: "M ", classification: "real_source_change_needs_review" },
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.externalBillingReviewed).toBe(false);
    expect(report.externalBillingRemaining).toContain("cloudRun");
    expect(report.scoreBefore.costRisk).toBe(42);
    expect(report.scoreAfter.costRisk).toBeGreaterThanOrEqual(80);
    expect(report.lanes.cloudSqlDataConnect.status).toBe("source_ready_no_runtime_usage_detected");
    expect(report.lanes.route4xx.status).toBe("source_ready_retry_storm_guarded");
    expect(report.lanes.bigQuery.status).toBe("source_ready_batched_or_cached");
  });

  it("keeps missing source guards actionable instead of hiding them as reviewed", () => {
    const input = guardedInput();
    input.bigQuery = {
      currentHead: "head",
      scheduledWindowExportEnabled: true,
      eventTriggeredExportDisabled: false,
      watermarkDefined: false,
      queryCostGuardDefined: false,
    };

    const { lanes } = classifyCostRiskEvidence(input);

    expect(lanes.bigQuery.status).toBe("cost_review_required");
    expect(lanes.bigQuery.sourceGuarded).toBe(false);
    expect(lanes.bigQuery.externalBillingReviewed).toBe(false);
  });

  it("fails validation if source evidence claims external billing review", () => {
    const report = buildCostRiskEvidenceReport({
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
      currentHead: "head",
      costInput: guardedInput(),
    });
    report.lanes.cloudRun.evidence.push("externalBillingReviewed=true");

    expect(validateCostRiskEvidenceReport(report)).toContain("external billing review or dollar savings are claimed from source evidence.");
  });
});
