import { describe, expect, it } from "vitest";

import {
  classifyCreatorLaneFreshness,
} from "../../src/lib/creator/creator-lane-freshness-status";
import {
  buildCreatorLaneFreshnessCleanupReport,
  validateCreatorLaneFreshnessCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("creator lane freshness cleanup", () => {
  it("keeps parity separate from missing materializer freshness", () => {
    const status = classifyCreatorLaneFreshness({
      parityStatus: "ok",
      issueCount: 0,
      historyGapCount: 0,
      freshness: "not_recorded",
      sourceSnapshotCount: 0,
      lastMaterializedAtUtc: null,
      sourceWindowProvesZero: false,
    });

    expect(status.freshnessStatus).toBe("source_ready_no_sample_loaded");
    expect(status.materializerStatus).toBe("materializer_completion_missing");
    expect(status.displayAsNoActionNeeded).toBe(false);
    expect(status.nextAction).toContain("materializer");
  });

  it("writes a report that does not claim full freshness without a timestamp", () => {
    const report = buildCreatorLaneFreshnessCleanupReport();

    expect(report.creatorLaneFreshnessAfter).toBe("source_ready_no_sample_loaded");
    expect(report.creatorLaneMaterializerStatus).toBe("materializer_completion_missing");
    expect(validateCreatorLaneFreshnessCleanupReport(report)).toEqual([]);
  });
});
