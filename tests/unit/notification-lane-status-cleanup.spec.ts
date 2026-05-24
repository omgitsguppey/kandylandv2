import { describe, expect, it } from "vitest";

import {
  buildNotificationLaneStatusCleanupReport,
  validateNotificationLaneStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("notification lane status cleanup", () => {
  it("does not show all-zero notification and push samples as live", () => {
    const report = buildNotificationLaneStatusCleanupReport();

    expect(validateNotificationLaneStatusCleanupReport(report)).toEqual([]);
    expect(report.permissionStatusAfter).toBe("source_ready_collecting");
    expect(report.pushTokenStatusAfter).toBe("source_ready_collecting");
    expect(report.targetingStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.realPushSendsInTests).toBe(false);
  });
});
