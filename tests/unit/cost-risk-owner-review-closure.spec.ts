import { describe, expect, it } from "vitest";

import {
  buildCostRiskEvidenceReport,
  classifyCostRiskEvidence,
  validateCostRiskEvidenceReport,
} from "../../src/lib/cost/cost-risk-evidence-classifier";
import type { CostOwnerReviewSourceInput } from "../../src/lib/cost/cost-owner-review-classifier";

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
