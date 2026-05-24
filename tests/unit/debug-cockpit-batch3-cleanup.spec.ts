import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch3CleanupReport,
  validateDebugCockpitBatch3CleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";

describe("debug cockpit batch3 cleanup", () => {
  it("locks runtime surface statuses without fake live activity", () => {
    const report = buildDebugCockpitBatch3CleanupReport();

    expect(validateDebugCockpitBatch3CleanupReport(report)).toEqual([]);
    expect(report.pwaStatusAfter).toBe("source_ready_not_registered");
    expect(report.identityStatusAfter).toBe("source_ready_collecting");
    expect(report.walletFunnelStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.emptyLiveLanesAfter).toBe(0);
    expect(report.staleBadgeConflictsAfter).toBe(0);
  });
});
