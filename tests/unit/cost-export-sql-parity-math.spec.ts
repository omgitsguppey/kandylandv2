import { describe, expect, it } from "vitest";

import {
  calculateAdminReadRisk,
  calculateExportBatchWindow,
  calculateHotPathCostRisk,
  calculateSummaryFreshness,
  calculateWatermarkRange,
  classifyCostReadiness,
  explainCostAccuracyTradeoff,
} from "@/lib/math/cost-export-parity-math";
import {
  buildCostExportSqlParityMathReport,
  classifyCostExportSqlParityMathDirtyFile,
  validateCostExportSqlParityMathReport,
} from "../../scripts/agent/validate-cost-export-sql-parity-math";

describe("cost export SQL parity math", () => {
  it("builds daily watermark batch windows and rejects event-triggered export semantics", () => {
    const nowMs = Date.UTC(2026, 4, 26, 12);
    const previousWatermarkMs = nowMs - (26 * 60 * 60 * 1000);

    expect(calculateExportBatchWindow({ lastWatermarkMs: previousWatermarkMs, nowMs, requestedRows: 750 })).toMatchObject({
      cadenceMs: 86_400_000,
      maxRows: 500,
      mode: "watermark_batch",
      perEventExportAllowed: false,
      windowStartMs: previousWatermarkMs,
      windowEndMs: nowMs,
    });

    expect(calculateWatermarkRange({ eventTriggered: true, nowMs })).toMatchObject({
      status: "blocked_per_event_export",
      perEventExportAllowed: false,
    });
  });

  it("enforces refresh floors for noncritical analytics, realtime summaries, and diagnostics", () => {
    expect(calculateSummaryFreshness({ kind: "noncritical_analytics", refreshMs: 60 * 60 * 1000 })).toMatchObject({
      status: "too_frequent",
      minimumRefreshMs: 86_400_000,
    });

    expect(calculateSummaryFreshness({ kind: "realtime_summary", refreshMs: 60_000, userFacingCritical: false })).toMatchObject({
      status: "too_frequent",
      minimumRefreshMs: 300_000,
    });

    expect(calculateSummaryFreshness({ kind: "diagnostic_rollup", refreshMs: 3_600_000 })).toMatchObject({
      status: "allowed",
      minimumRefreshMs: 3_600_000,
    });
  });

  it("keeps hot-path cost reductions accuracy-preserving", () => {
    expect(calculateHotPathCostRisk({
      writesEssentialFactsOnly: true,
      duplicateMaterializerCount: 0,
      canonicalFactsDropped: false,
    })).toMatchObject({ risk: "low", accuracyPreserved: true });

    expect(calculateHotPathCostRisk({
      writesEssentialFactsOnly: true,
      duplicateMaterializerCount: 0,
      canonicalFactsDropped: true,
    })).toMatchObject({ risk: "critical", accuracyPreserved: false, reason: "canonical_facts_dropped" });
  });

  it("requires compact summary defaults and paged drilldowns for admin/debug reads", () => {
    expect(calculateAdminReadRisk({
      defaultReadsSummary: true,
      rawDrilldownPaged: true,
      compactSummaryLimit: 100,
      rawFirehoseDefault: false,
    })).toMatchObject({ risk: "low", defaultSafe: true });

    expect(calculateAdminReadRisk({
      defaultReadsSummary: false,
      rawDrilldownPaged: false,
      compactSummaryLimit: 10_000,
      rawFirehoseDefault: true,
    })).toMatchObject({ risk: "critical", defaultSafe: false, reason: "raw_firehose_default" });
  });

  it("separates source guards from external billing proof", () => {
    expect(classifyCostReadiness({ sourceGuarded: true, externalBillingReviewed: false, runtimeUsageDetected: false })).toMatchObject({
      status: "source_guarded_external_review_remaining",
      scoreCredit: "partial",
      externalReviewRemaining: true,
    });

    expect(classifyCostReadiness({ sourceGuarded: true, externalBillingReviewed: true, runtimeUsageDetected: true })).toMatchObject({
      status: "externally_reviewed_full_credit",
      scoreCredit: "full",
      externalReviewRemaining: false,
    });

    expect(classifyCostReadiness({ sourceGuarded: false, externalBillingReviewed: false, runtimeUsageDetected: null })).toMatchObject({
      status: "owner_review",
      scoreCredit: "none",
    });
  });

  it("blocks cost savings that delete canonical facts", () => {
    expect(explainCostAccuracyTradeoff({
      canonicalFactsDropped: false,
      duplicateReadsReduced: true,
      excessiveRefreshReduced: true,
    })).toMatchObject({ allowed: true, accuracyPreserved: true });

    expect(explainCostAccuracyTradeoff({
      canonicalFactsDropped: true,
      duplicateReadsReduced: true,
      excessiveRefreshReduced: true,
    })).toMatchObject({ allowed: false, accuracyPreserved: false, reason: "cost_reduction_drops_required_facts" });
  });

  it("builds a source-only validator report with scoped dirty file classifications", () => {
    const report = buildCostExportSqlParityMathReport({
      currentHead: "test-head",
      dirtyFiles: [
        "src/lib/math/cost-export-parity-math.ts",
        "functions/src/analytics-bigquery-export.ts",
        "src/app/api/paypal/capture/route.ts",
      ],
      openPrs: [],
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 84.2,
        evidenceCompleteness: 69.6,
        freshness: 75.63,
        costRisk: 42,
        regressionRisk: 86,
        overallHealthScore: 77.83,
      },
    });

    expect(report).toMatchObject({
      reportKey: "cost-export-sql-parity-math",
      currentHead: "test-head",
      productionExportsRun: false,
      providerCallsRun: false,
      deployPerformed: false,
      externalBillingReviewed: false,
      debugLane: {
        label: "Cost/export math",
        sqlMirrorGuard: "manual_cost_approved_only",
        accuracyPreserved: true,
      },
    });
    expect(report.costReadinessStatus.status).toBe("source_guarded_external_review_remaining");
    expect(report.remainingGaps).toContain("External billing/provider review remains required before full cost closure.");
    expect(validateCostExportSqlParityMathReport(report)).toEqual([
      "src/app/api/paypal/capture/route.ts is unclassified for cost/export SQL parity math.",
    ]);
    expect(classifyCostExportSqlParityMathDirtyFile("src/lib/math/cost-export-parity-math.ts")).toBe("current_source_change");
    expect(classifyCostExportSqlParityMathDirtyFile("functions/src/analytics-bigquery-export.ts")).toBe("cost_export_source_evidence");
    expect(classifyCostExportSqlParityMathDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
  });
});
