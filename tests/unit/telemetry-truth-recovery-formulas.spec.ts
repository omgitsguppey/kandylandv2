import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { TELEMETRY_TRUTH_RECOVERY_FORMULAS, calculateTelemetryTruthRecoveryFormulas } from "@/lib/analytics/telemetry-truth-recovery-formulas";
import { buildTelemetryTruthRecoveryStatus } from "@/lib/analytics/telemetry-truth-recovery-status";

describe("telemetry truth recovery formulas", () => {
  it("routes source/evidence classification through the recovery spine", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/analytics/telemetry-truth-recovery-formulas.ts"), "utf8");

    expect(source).toContain("classifyRecoveryMetricSourceEvidence");
    expect(source).not.toContain("function sourceTruthForRecoveryFormula");
    expect(source).not.toContain("function evidenceKindForRecoveryFormula");
  });

  it("documents every required formula", () => {
    expect(TELEMETRY_TRUTH_RECOVERY_FORMULAS.observedViews).toContain("observedViews =");
    expect(TELEMETRY_TRUTH_RECOVERY_FORMULAS.checkedViews).toContain("checkedViews =");
    expect(TELEMETRY_TRUTH_RECOVERY_FORMULAS.finalViews).toContain("finalViews =");
    expect(TELEMETRY_TRUTH_RECOVERY_FORMULAS.estimatedRatio).toContain("estimatedRatio =");
    expect(TELEMETRY_TRUTH_RECOVERY_FORMULAS.confidence).toContain("confidence =");
  });

  it("keeps observed, checked, final, and estimated layers separate", () => {
    const result = calculateTelemetryTruthRecoveryFormulas({
      observedViews: 10,
      checkedViews: 8,
      estimatedViews: 2,
      freshnessScore: 100,
      sourceCompletenessScore: 100,
    });

    expect(result.finalViews).toBe(10);
    expect(result.estimatedRatioPct).toBe(20);
    expect(result.duplicateRatePct).toBe(20);
    expect(result.sourceTruth).toBe("first_party_event_fact");
    expect(result.evidenceKind).toBe("observed");
    expect(result.freshnessState).toBe("refresh_due");
    expect(result.confidenceScore).toBe(result.confidencePct);
    expect(result.formulaConfidenceScore).toBe(result.confidenceScore);
    expect(result.confidenceBand).toBe("directional");
    expect(result.formulaConfidenceBand).toBe("directional");
    expect(result.recoverySpineConfidenceScore).toBeGreaterThanOrEqual(90);
    expect(result.recoverySpineConfidenceBand).toBe("verified");
    expect(result.productTruthEligible).toBe(true);
    expect(result.missingVsZeroState).toBe("source_present");
    expect(result.dedupeKey).toContain("launch_recovery|page_view");
    expect(result.lateArrivalWindowDays).toBe(12);
    expect(result.dedupeDimensions).toEqual([
      "event_id",
      "session_id",
      "identity_link_id",
      "user_id",
      "guest_id",
      "route",
      "object_id",
      "timestamp_window",
      "semantic_action",
    ]);
  });

  it("labels GA-only recovered views as modeled evidence, not product truth", () => {
    const result = calculateTelemetryTruthRecoveryFormulas({
      observedViews: 0,
      checkedViews: 0,
      estimatedViews: 5,
      freshnessScore: 100,
      sourceCompletenessScore: 40,
      recoveryQualityScore: 55,
      lastRebuildAtUtc: "2026-06-20T12:00:00.000Z",
      sourcePath: "ga4 recovery sample",
    });

    expect(result.finalViews).toBe(5);
    expect(result.sourceTruth).toBe("ga4_evidence_only");
    expect(result.evidenceKind).toBe("modeled");
    expect(result.freshnessState).toBe("external_evidence_required");
    expect(result.productTruthEligible).toBe(false);
    expect(result.missingVsZeroState).toBe("source_present");
    expect(result.confidenceBand).toBe("directional");
    expect(result.formulaConfidenceBand).toBe("directional");
    expect(result.recoverySpineConfidenceBand).toBe("directional");
  });

  it("labels final-count-only recovery as inferred instead of GA-modeled evidence", () => {
    const result = calculateTelemetryTruthRecoveryFormulas({
      observedViews: 0,
      checkedViews: 0,
      finalViews: 7,
      estimatedViews: 0,
      freshnessScore: 80,
      sourceCompletenessScore: 20,
      recoveryQualityScore: 40,
      lastRebuildAtUtc: "2026-06-20T12:00:00.000Z",
      sourcePath: "legacy recovery summary",
    });

    expect(result.finalViews).toBe(7);
    expect(result.sourceTruth).toBe("legacy_directional_only");
    expect(result.evidenceKind).toBe("inferred");
    expect(result.freshnessState).toBe("external_evidence_required");
    expect(result.productTruthEligible).toBe(false);
    expect(result.missingVsZeroState).toBe("source_present");
    expect(result.recoverySpineConfidenceBand).toBe("weak");
  });

  it("keeps empty recovery missing instead of zero-as-truth", () => {
    const result = calculateTelemetryTruthRecoveryFormulas({
      observedViews: 0,
      checkedViews: 0,
      estimatedViews: 0,
    });

    expect(result.finalViews).toBe(0);
    expect(result.sourceTruth).toBe("source_missing");
    expect(result.evidenceKind).toBe("missing");
    expect(result.freshnessState).toBe("source_missing");
    expect(result.productTruthEligible).toBe(false);
    expect(result.missingVsZeroState).toBe("source_missing");
    expect(result.recoverySpineConfidenceScore).toBe(0);
    expect(result.recoverySpineConfidenceBand).toBe("missing");
  });

  it("does not treat missing per-drop/user rows as healthy", () => {
    const report = buildTelemetryTruthRecoveryStatus({
      observedViews: 0,
      checkedViews: 0,
      estimatedViews: 0,
      dropMetricCount: 0,
      userMetricCount: 0,
      sourcePath: "analytics truth recovery",
    });

    expect(report.status.status).toBe("stale_rebuild_required");
    expect(report.status.nextAction).toContain("reconciliation job");
    expect(report.sourceTruth).toBe("source_missing");
    expect(report.evidenceKind).toBe("missing");
    expect(report.lateArrivalWindowDays).toBe(12);
  });
});
