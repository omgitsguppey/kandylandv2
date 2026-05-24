import { describe, expect, it } from "vitest";

import {
  classifyAnalyticsRecoveryEvidence,
  classifySystemHealthMaterializer,
} from "../../src/lib/debug/system-health-materializer-status";
import {
  buildSystemHealthMaterializerCleanupReport,
  validateSystemHealthMaterializerCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("system health materializer cleanup", () => {
  it("does not treat missing materializer samples as live healthy", () => {
    const status = classifySystemHealthMaterializer({
      scorePercent: 0,
      penaltyCount: 0,
      routeFailureCount: 0,
      downstreamWritersNeedingReview: 0,
      materializerSampleLoaded: false,
      freshestSignalLabel: "just now",
    });

    expect(status.scoreStatus).toBe("unavailable_no_sample");
    expect(status.downstreamWriterSampleStatus).toBe("materializer_sample_missing");
    expect(status.displayAsHealthyLive).toBe(false);
    expect(status.nextAction).toContain("materializer sample");
  });

  it("classifies analytics recovery disabled by policy separately from failure", () => {
    const status = classifyAnalyticsRecoveryEvidence({
      available: false,
      lanes: 0,
      productionAllowedNow: false,
      promotedNow: 0,
    });

    expect(status.status).toBe("backfill_disabled_by_policy");
    expect(status.isFailure).toBe(false);
    expect(status.displayAsLive).toBe(false);
  });

  it("writes the cleanup report with contradictions resolved", () => {
    const report = buildSystemHealthMaterializerCleanupReport();

    expect(report.systemHealthScoreStatusAfter).toBe("unavailable_no_sample");
    expect(report.downstreamWriterSampleStatus).toBe("materializer_sample_missing");
    expect(report.analyticsRecoveryStatus).toBe("backfill_disabled_by_policy");
    expect(validateSystemHealthMaterializerCleanupReport(report)).toEqual([]);
  });
});
