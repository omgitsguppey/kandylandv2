import { describe, expect, it } from "vitest";

import { buildCostLieDetectorReport, validateCostLieDetectorReport } from "@/lib/release-readiness/cost-lie-detector";

describe("cost lie detector", () => {
  it("keeps source guards separate from billing proof", () => {
    const report = buildCostLieDetectorReport(process.cwd());
    expect(report.sourceGuardIsBillingProof).toBe(false);
    expect(report.externalBillingReviewRequired).toBe(true);
    expect(report.lanes.some((lane) => lane.blocksCostRisk)).toBe(true);
    expect(validateCostLieDetectorReport(report)).toEqual([]);
  }, 120000);
});
