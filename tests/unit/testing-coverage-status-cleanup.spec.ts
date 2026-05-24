import { describe, expect, it } from "vitest";

import {
  buildTestingCoverageStatusCleanupReport,
  validateTestingCoverageStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("testing coverage status cleanup", () => {
  it("keeps clean current coverage healthy and stale coverage refresh-only", () => {
    const report = buildTestingCoverageStatusCleanupReport();

    expect(validateTestingCoverageStatusCleanupReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("healthy_current");
    expect(report.artifactFreshnessStatus).toBe("current");
    expect(report.refreshCommand).toBe("npm run check:telemetry-trigger-test-matrix");
  });
});
