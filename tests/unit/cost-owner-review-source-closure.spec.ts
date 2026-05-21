import { describe, expect, it } from "vitest";

import {
  classifyCostOwnerReviewLanes,
  type CostOwnerReviewSourceInput,
} from "../../src/lib/cost/cost-owner-review-classifier";
import {
  buildCostOwnerReviewSourceClosureReport,
  validateCostOwnerReviewSourceClosureReport,
} from "../../scripts/agent/validate-cost-owner-review-source-closure";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";

const sourceReadyInput: CostOwnerReviewSourceInput = {
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

describe("cost owner-review source closure", () => {
  it("classifies source-guarded lanes without claiming external billing review", () => {
    const lanes = classifyCostOwnerReviewLanes(sourceReadyInput);

    expect(lanes.cloudRun.status).toBe("source_guarded_external_review_remaining");
    expect(lanes.cloudSqlDataConnect.status).toBe("source_ready_no_runtime_usage_detected");
    expect(lanes.geminiCloudAssistVertex.status).toBe("source_guarded_external_review_remaining");
    expect(lanes.route4xx.status).toBe("source_guarded_external_review_remaining");
    expect(lanes.bigQuery.status).toBe("source_guarded_external_review_remaining");
    expect(Object.values(lanes).every((lane) => lane.externalBillingReviewed === false)).toBe(true);
  });

  it("improves cost scoring while keeping owner review required", () => {
    const report = buildCostOwnerReviewSourceClosureReport({
      generatedAtUtc: "2026-05-21T18:00:00.000Z",
      currentHead: "head",
      input: sourceReadyInput,
    });
    const costScore = scoreCostReadiness(report.costReadiness);

    expect(costScore.score).toBeGreaterThan(60);
    expect(costScore.ownerReviewRequired).toBe(true);
    expect(report.externalBillingReview.reviewed).toBe(false);
    expect(report.costRiskScoreExplanation).toContain("source cost readiness");
    expect(report.costRiskScoreExplanation).toContain("external billing review remains");
    expect(validateCostOwnerReviewSourceClosureReport(report)).toEqual([]);
  });

  it("fails if source-guarded lanes are downgraded to generic owner_review without reason", () => {
    const report = buildCostOwnerReviewSourceClosureReport({
      generatedAtUtc: "2026-05-21T18:00:00.000Z",
      currentHead: "head",
      input: sourceReadyInput,
    });

    report.lanes.cloudSqlDataConnect.status = "owner_review_external_billing_required";
    report.lanes.cloudSqlDataConnect.sourceGuarded = true;
    report.lanes.cloudSqlDataConnect.reason = "";

    expect(validateCostOwnerReviewSourceClosureReport(report)).toEqual(expect.arrayContaining([
      expect.stringContaining("owner_review remains for a source-guarded lane without reason"),
    ]));
  });
});
