import { describe, expect, it } from "vitest";

import {
  buildTrackingSummaryLaneCleanupReport,
  validateTrackingSummaryLaneCleanupReport,
} from "../../scripts/agent/validate-tracking-summary-lane-cleanup";

describe("tracking summary lane cleanup", () => {
  it("locks tracking summary lanes without raw warning spam or contradictory statuses", () => {
    const report = buildTrackingSummaryLaneCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.rawDetailsDefaultOpen).toBe(false);
    expect(report.featureCoverageStatus).not.toBe("failed_unclassified");
    expect(report.runtimeDebugWarningGroupsAfter).toBeLessThanOrEqual(report.runtimeDebugWarningsBefore);
    expect(report.eventLivenessSourceMissingAfter).toBe("source_missing_actionable");
    expect(report.behaviorMathStatus).not.toBe("live_unknown");
    expect(validateTrackingSummaryLaneCleanupReport(report)).toEqual([]);
  });
});
