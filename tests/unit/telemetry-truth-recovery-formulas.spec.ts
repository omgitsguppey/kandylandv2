import { describe, expect, it } from "vitest";
import { TELEMETRY_TRUTH_RECOVERY_FORMULAS, calculateTelemetryTruthRecoveryFormulas } from "@/lib/analytics/telemetry-truth-recovery-formulas";
import { buildTelemetryTruthRecoveryStatus } from "@/lib/analytics/telemetry-truth-recovery-status";

describe("telemetry truth recovery formulas", () => {
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
  });
});
