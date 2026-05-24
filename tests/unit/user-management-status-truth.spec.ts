import { describe, expect, it } from "vitest";

import {
  buildUserManagementStatusTruthReport,
  validateUserManagementStatusTruthReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

describe("user management status truth", () => {
  it("classifies summaries=0 as no sample, not live", () => {
    const report = buildUserManagementStatusTruthReport();

    expect(validateUserManagementStatusTruthReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.rawTablesDefaultOpen).toBe(false);
    expect(report.summaryFirstRoutePolicy).toBe(true);
  });
});
