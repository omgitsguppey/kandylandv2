import { describe, expect, it } from "vitest";

import {
  buildAdminStatusLaneGeneratedReport,
  buildUserManagementStatusTruthReport,
  validateUserManagementStatusTruthReport,
} from "../../scripts/agent/admin-status-lane-cleanup-shared";

const TEST_HEAD = "a".repeat(40);

describe("user management status truth", () => {
  it("classifies summaries=0 as no sample, not live", () => {
    const report = buildUserManagementStatusTruthReport({ currentHead: TEST_HEAD });
    const generatedReport = buildAdminStatusLaneGeneratedReport(report, "User management status truth", []);

    expect(validateUserManagementStatusTruthReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("source_ready_no_sample_loaded");
    expect(generatedReport.status).toBe("pass");
    expect(generatedReport.statusAfter).toBe("source_ready_no_sample_loaded");
    expect(generatedReport.sourceCommit).toBe(TEST_HEAD);
    expect(generatedReport.canClearSourceGate).toBe(true);
    expect(report.rawTablesDefaultOpen).toBe(false);
    expect(report.summaryFirstRoutePolicy).toBe(true);
  });

  it("keeps a failed envelope distinct from its domain status", () => {
    const report = buildUserManagementStatusTruthReport({ currentHead: TEST_HEAD });
    const generatedReport = buildAdminStatusLaneGeneratedReport(report, "User management status truth", ["synthetic failure"]);

    expect(generatedReport.status).toBe("fail");
    expect(generatedReport.statusAfter).toBe("source_ready_no_sample_loaded");
    expect(generatedReport.canClearSourceGate).toBe(false);
    expect(generatedReport.validationFailures).toEqual(["synthetic failure"]);
  });
});
