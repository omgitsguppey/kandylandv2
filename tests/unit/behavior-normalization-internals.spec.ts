import { describe, expect, it } from "vitest";
import { buildBehaviorNormalizationInternals } from "@/lib/behavioral/behavior-normalization-internals-engine";

describe("behavior normalization internals", () => {
  it("does not treat 0 findings over 0 inspected events as clean", () => {
    const report = buildBehaviorNormalizationInternals({
      normalizedEventCount: 0,
      evalEligibleCount: 0,
      evalEligibleDenominator: 0,
      sourcePath: "orchestration evidence collections",
    });

    expect(report.status.status).toBe("source_ready_no_sample_loaded");
    expect(report.healthMath.denominator).toBe(0);
    expect(report.healthMath.confidence).toBeNull();
    expect(report.coverageByDomain[0].status).toBe("source_ready_no_sample_loaded");
  });

  it("documents health math when samples are present", () => {
    const report = buildBehaviorNormalizationInternals({
      normalizedEventCount: 10,
      evalEligibleCount: 4,
      evalEligibleDenominator: 10,
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
      sourcePath: "orchestration evidence collections",
    });

    expect(report.status.status).toBe("loaded_with_data");
    expect(report.healthMath.formula).toContain("health =");
    expect(report.healthMath.confidence).toBe(40);
  });
});
