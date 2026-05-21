import { describe, expect, it } from "vitest";

import {
  buildAdminTruthSourceSampleReport,
  validateAdminTruthSourceSampleReport,
} from "../../scripts/agent/validate-admin-truth-source-sample";

describe("admin truth source sample", () => {
  it("records source wiring without clearing formal production admin truth evidence", () => {
    const report = buildAdminTruthSourceSampleReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "abc123",
      adminDebugControlTowerModelPresent: true,
      adminDebugRoutePresent: true,
      summaryCardsPresent: true,
      productionSampleAttached: false,
      formalAdminTruthSamplePassed: false,
      sourceTruthLabelsPresent: true,
      fakeHealthyStateDetected: false,
    });

    expect(report.status).toBe("source_ready_admin_truth_sample");
    expect(report.launchGateImpact).toBe("does_not_clear_admin_truth_sample");
    expect(validateAdminTruthSourceSampleReport(report)).toEqual([]);
  });
});
