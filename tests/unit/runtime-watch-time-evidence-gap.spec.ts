import { describe, expect, it } from "vitest";

import {
  buildRuntimeWatchTimeEvidenceGapReport,
  buildWatchTimeTruthReport,
  validateRuntimeWatchTimeEvidenceGapReport,
  validateWatchTimeTruthReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 runtime watch-time truth", () => {
  it("timestamps the watch-time lane while keeping source-ready gaps degraded", () => {
    const truth = buildWatchTimeTruthReport();
    expect(truth.status).toBe("source_ready_evidence_gap");
    expect(truth.generatedAtUtc).toMatch(/T/);
    expect(truth.pageTimeCountsAsWatchTime).toBe(false);
    expect(truth.claimsPersistedLiveMetric).toBe(false);
    expect(validateWatchTimeTruthReport(truth)).toEqual([]);

    const gap = buildRuntimeWatchTimeEvidenceGapReport();
    expect(gap.runtimeWatchStatusAfter).toBe("source_ready_evidence_gap");
    expect(gap.debugPanelHealthClaim).toBe("degraded");
    expect(gap.nextAction).toContain("persisted watch-session evidence");
    expect(validateRuntimeWatchTimeEvidenceGapReport(gap)).toEqual([]);
  });
});
