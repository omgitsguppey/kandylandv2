import { describe, expect, it } from "vitest";

import {
  buildTrackingLaneFreshnessDisplayCleanupReport,
  validateTrackingLaneFreshnessDisplayCleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";

describe("tracking lane freshness display cleanup", () => {
  it("separates stale artifact badges from source health", () => {
    const report = buildTrackingLaneFreshnessDisplayCleanupReport({
      lanes: [{ laneId: "event_envelope", sourceStatus: "live", artifactCurrent: false }],
    });

    expect(validateTrackingLaneFreshnessDisplayCleanupReport(report)).toEqual([]);
    expect(report.conflictsAfter).toBe(0);
    expect(report.lanes[0].displayStatus).toBe("source_live_artifact_stale");
    expect(report.lanes[0].nextAction).toContain("Refresh");
  });
});
