import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch14CleanupReport,
  validateDebugCockpitBatch14CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("Batch 14 final cleanup lock", () => {
  it("summarizes orphaned logic, dedupe, materializer, recovery, and creator lane cleanup", () => {
    const report = buildDebugCockpitBatch14CleanupReport();

    expect(report.orphanedLogicAgeAfter).toBeLessThanOrEqual(72);
    expect(report.adminRealtimeHotCacheStatus).toBe("retired_snapshot_first");
    expect(report.telemetryDuplicateIntentStatus).toBe("telemetry_alias_classified");
    expect(report.recommendedActionsAfter).toBeLessThan(report.recommendedActionsBefore);
    expect(report.duplicateActionsCollapsed).toBeGreaterThan(0);
    expect(report.systemHealthScoreStatusAfter).toBe("unavailable_no_sample");
    expect(report.downstreamWriterSampleStatus).toBe("materializer_sample_missing");
    expect(report.analyticsRecoveryStatus).toBe("backfill_disabled_by_policy");
    expect(report.creatorLaneFreshnessAfter).toBe("source_ready_no_sample_loaded");
    expect(report.creatorLaneMaterializerStatus).toBe("materializer_completion_missing");
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateDebugCockpitBatch14CleanupReport(report),
      expectedIsolationFailures: ["dirty files unclassified."],
    });
  });
});
