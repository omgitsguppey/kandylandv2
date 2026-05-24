import { describe, expect, it } from "vitest";

import { classifyEmptyLiveLane } from "@/lib/debug/empty-live-lane-classifier";
import {
  buildEmptyLiveLaneStatusCleanupReport,
  validateEmptyLiveLaneStatusCleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";

describe("empty live lane status cleanup", () => {
  it("does not allow all-zero unproven lanes to remain live", () => {
    const decision = classifyEmptyLiveLane({
      laneId: "drop_watch_time",
      sourceContractPresent: true,
      sampleLoaded: false,
      expectedTraffic: true,
      counts: [0, 0, 0],
    });

    expect(decision.status).toBe("source_ready_collecting");
    expect(decision.displayState).not.toBe("live");
  });

  it("keeps low confidence visible even when gaps are zero", () => {
    const report = buildEmptyLiveLaneStatusCleanupReport({
      personMetrics: {
        eventEnvelopesHydrated: 0,
        globalMetricsHydrated: 0,
        signedInMetricsHydrated: 0,
        linkedPersonMetricsHydrated: 0,
        lowConfidenceMetrics: 34,
        gaps: 0,
      },
    });

    expect(validateEmptyLiveLaneStatusCleanupReport(report)).toEqual([]);
    expect(report.personMetricsStatusAfter).toBe("source_ready_collecting");
    expect(report.personMetricsLowConfidenceAfter).toBe(34);
  });
});
