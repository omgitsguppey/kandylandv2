import { describe, expect, it } from "vitest";

import {
  buildSitewideImageOptimizationCleanupReport,
  validateSitewideImageOptimizationCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch12-shared";

describe("sitewide image optimization cleanup", () => {
  it("turns unavailable/no timestamp image loading into a timestamped source status", () => {
    const report = buildSitewideImageOptimizationCleanupReport();

    expect(report.packageScriptPresent).toBe(true);
    expect(report.imageLoadingStatusAfter).not.toBe("WAIT");
    expect(report.imageLoadingStatusAfter).not.toBe("unavailable");
    expect(report.imageLoadingTimestampStatus).toBe("generatedAt_present");
    expect(report.visualScreenshotProofRequired).toBe(false);
    expect(validateSitewideImageOptimizationCleanupReport({ ...report, visualScreenshotProofRequired: true })).toContain(
      "image loading cleanup must use source evidence before optional visual reproduction.",
    );
    expect(validateSitewideImageOptimizationCleanupReport(report).filter(
      (failure) => failure !== "image artifact remains older than 72h.",
    )).toEqual([]);
  });
});
