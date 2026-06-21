import { describe, expect, it } from "vitest";

import {
  buildFeatureTelemetryCoverageCleanupReport,
  validateFeatureTelemetryCoverageCleanupReport,
} from "../../scripts/agent/validate-feature-telemetry-coverage-cleanup";
import { renderSimpleDoc } from "../../scripts/agent/tracking-summary-lane-cleanup-shared";

describe("feature telemetry coverage cleanup", () => {
  it("keeps registry-backed feature coverage actionable without vague failed status", () => {
    const report = buildFeatureTelemetryCoverageCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.status).not.toBe("failed_unclassified");
    expect(report.featureCoverageStatus).toBe("source_ready");
    expect(report.missingItems.every((item) => item.featureId || item.eventName)).toBe(true);
    expect(report.eventOwnerMap.length).toBeLessThanOrEqual(24);
    expect(report.eventOwnerMapTruncated).toBe(true);
    expect(report.featureTelemetryRows.every((row) => row.telemetryEventCount >= row.telemetryEventSample.length)).toBe(true);
    expect(report.debugLane.status).toBe("mapped");
    const doc = renderSimpleDoc("Feature Telemetry Coverage Cleanup", report).join("\n");
    expect(doc).toContain("featureTelemetryRows:");
    expect(doc).toContain("Full machine-readable report remains");
    expect(doc).not.toContain("```json");
    expect(doc.length).toBeLessThan(4000);
    expect(validateFeatureTelemetryCoverageCleanupReport(report)).toEqual([]);
  });
});
