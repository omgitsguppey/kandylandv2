import { describe, expect, it } from "vitest";

import {
  buildSettingsHealthStatusCleanupReport,
  validateSettingsHealthStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("settings health status cleanup", () => {
  it("reports six passing settings components without degrading for stale labels", () => {
    const report = buildSettingsHealthStatusCleanupReport();

    expect(validateSettingsHealthStatusCleanupReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("healthy_current");
    expect(report.components).toHaveLength(6);
    expect(report.refreshCommand).toBe("npm run check:settings-debug-validator-authority");
  });
});
