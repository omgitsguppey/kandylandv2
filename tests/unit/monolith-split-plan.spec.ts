import { describe, expect, it } from "vitest";

import {
  buildMonolithSplitPlanReport,
  validateMonolithSplitPlanReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 monolith split plan", () => {
  it("keeps critical monoliths visible with bounded future split plans", () => {
    const report = buildMonolithSplitPlanReport();

    expect(report.adminDebugMonolithStatus).toBe("monolith_split_plan_required");
    expect(report.adminAnalyticsMonolithStatus).toBe("monolith_split_plan_required");
    expect(report.unsafeBroadRefactorPerformed).toBe(false);
    expect(report.addedEvidenceLaneToDebugRoute).toBe(false);
    expect(report.splitPlans.some((plan) => plan.filePath === "src/app/api/admin/debug/route.ts")).toBe(true);
    expect(report.splitPlans.some((plan) => plan.filePath === "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx")).toBe(true);
    expect(validateMonolithSplitPlanReport(report)).toEqual([]);
  });
});
