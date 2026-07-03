import { describe, expect, it } from "vitest";

import {
  buildScore80CostReadinessReport,
  validateScore80CostReadinessReport,
} from "../../scripts/agent/validate-score-80-cost-readiness";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";

const head = "score80cost";

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
    expect(report.costReadiness.route4xxReadiness.evidence.join("\n")).toContain("final-telemetry-closure-lock");
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
