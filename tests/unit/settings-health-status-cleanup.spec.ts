import { describe, expect, it } from "vitest";

import {
  buildAdminStatusLaneGeneratedReport,
  buildSettingsHealthStatusCleanupReport,
  validateSettingsHealthStatusCleanupReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

const TEST_HEAD = "b".repeat(40);

describe("settings health status cleanup", () => {
  it("reports six passing settings components without degrading for stale labels", () => {
    const report = buildSettingsHealthStatusCleanupReport({ currentHead: TEST_HEAD });
    const generatedReport = buildAdminStatusLaneGeneratedReport(report, "Settings health status cleanup", [], true);

    expect(validateSettingsHealthStatusCleanupReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("healthy_current");
    expect(report.components).toHaveLength(6);
    expect(report.refreshCommand).toBe("npm run check:settings-debug-validator-authority");
    expect(generatedReport.status).toBe("pass");
    expect(generatedReport.evidenceClass).toBe("historical_evidence_only");
    expect(generatedReport.canClearSourceGate).toBe(false);
    expect(generatedReport.canClearRuntimeGate).toBe(false);
    expect(generatedReport.canClearProviderGate).toBe(false);
    expect(generatedReport.canClearAdminTruthGate).toBe(false);
  });
});
