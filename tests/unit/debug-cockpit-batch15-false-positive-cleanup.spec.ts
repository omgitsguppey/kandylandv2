import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch15FalsePositiveCleanupReport,
  validateDebugCockpitBatch15FalsePositiveCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch15-shared";

describe("Debug Cockpit Batch 15 false-positive cleanup", () => {
  it("summarizes no-sample false-positive LIVE cleanup", () => {
    const report = buildDebugCockpitBatch15FalsePositiveCleanupReport();

    expect(report.diagnosticsLaneStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.downstreamWriterStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.panelStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.falsePositiveLiveBefore).toBeGreaterThan(report.falsePositiveLiveAfter);
    expect(report.falsePositiveLiveAfter).toBe(0);
    expect(report.noSampleLanes).toEqual(expect.arrayContaining(["diagnostics", "downstream_writers", "panel_logs"]));
    expect(report.healthyProvenZeroLanes).toEqual([]);
    expect(report.sampleUnavailableLanes).toEqual(expect.arrayContaining(["diagnostics", "downstream_writers", "panel_logs"]));
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expect(validateDebugCockpitBatch15FalsePositiveCleanupReport(report)).toEqual([]);
  });
});
