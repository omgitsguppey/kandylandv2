import { describe, expect, it } from "vitest";

import {
  buildPanelLogStatusCleanupReport,
  validatePanelLogStatusCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch15-shared";

describe("panel log status cleanup", () => {
  it("classifies empty persisted panel logs as no-sample, not live", () => {
    const report = buildPanelLogStatusCleanupReport();

    expect(report.panelStatusBefore).toBe("LIVE");
    expect(report.panelStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.panelLogsLoaded).toBe(false);
    expect(report.panelLogsProvenZero).toBe(false);
    expect(report.rawPanelLogsDefaultOpen).toBe(false);
    expect(report.panelLogFreshness).toBe("sample_unavailable");
    expect(validatePanelLogStatusCleanupReport(report)).toEqual([]);
  });
});
