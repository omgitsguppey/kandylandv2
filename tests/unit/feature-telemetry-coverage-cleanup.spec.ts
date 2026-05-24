import { describe, expect, it } from "vitest";

import {
  buildFeatureTelemetryCoverageCleanupReport,
  validateFeatureTelemetryCoverageCleanupReport,
} from "../../scripts/agent/validate-feature-telemetry-coverage-cleanup";

describe("feature telemetry coverage cleanup", () => {
  it("keeps registry-backed feature coverage actionable without vague failed status", () => {
    const report = buildFeatureTelemetryCoverageCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.status).not.toBe("failed_unclassified");
    expect(report.featureCoverageStatus).toBe("source_ready");
    expect(report.missingItems.every((item) => item.featureId || item.eventName)).toBe(true);
    expect(report.debugLane.status).toBe("mapped");
    expect(validateFeatureTelemetryCoverageCleanupReport(report)).toEqual([]);
  });
});
