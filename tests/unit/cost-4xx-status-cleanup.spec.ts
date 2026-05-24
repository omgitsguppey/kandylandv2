import { describe, expect, it } from "vitest";

import {
  buildCost4xxStatusCleanupReport,
  validateCost4xxStatusCleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("cost 4xx status cleanup", () => {
  it("does not treat bounded debug loading as external billing proof", () => {
    const report = buildCost4xxStatusCleanupReport();

    expect(validateCost4xxStatusCleanupReport(report)).toEqual([]);
    expect(report.costGuardConfigStatus).toBe("config_healthy_current");
    expect(report.runtimeCostSampleStatus).toBe("source_ready_no_sample_loaded");
    expect(report.externalCostReviewStatus).toBe("external_review_required");
    expect(report.boundedSummaryIsExternalProof).toBe(false);
  });
});

