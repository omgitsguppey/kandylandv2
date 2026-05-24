import { describe, expect, it } from "vitest";

import {
  buildAuthLaneStatusCleanupReport,
  validateAuthLaneStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("auth lane status cleanup", () => {
  it("keeps mapped config healthy while classifying all-zero runtime samples as collecting", () => {
    const report = buildAuthLaneStatusCleanupReport();

    expect(validateAuthLaneStatusCleanupReport(report)).toEqual([]);
    expect(report.providerConflictStatusAfter).toBe("healthy_current");
    expect(report.persistenceStatusAfter).toBe("source_ready_collecting");
    expect(report.runtimeStatusAfter).toBe("source_ready_collecting");
    expect(report.rawCredentialExposure).toBe(false);
  });
});
