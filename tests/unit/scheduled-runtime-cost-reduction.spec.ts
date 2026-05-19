import { describe, expect, it } from "vitest";

import { validateScheduledRuntimeCostReduction } from "../../scripts/agent/validate-scheduled-runtime-cost-reduction";

describe("scheduled runtime cost reduction guardrails", () => {
  it("keeps realtime summary on a guarded five-minute cadence", () => {
    const report = validateScheduledRuntimeCostReduction({ writeReport: false });

    expect(report.summary.realtimeSummaryCadenceMinutes).toBe(5);
  });

  it("uses analytics truth cursors and requires explicit full rebuilds", () => {
    const report = validateScheduledRuntimeCostReduction({ writeReport: false });

    expect(report.summary.analyticsTruthUsesIncrementalCursor).toBe(true);
  });

  it("uses changed behavioral sources and skips unchanged profile writes", () => {
    const report = validateScheduledRuntimeCostReduction({ writeReport: false });

    expect(report.summary.behavioralIntelligenceUsesChangedSources).toBe(true);
    expect(report.summary.behavioralProfileWritesDiffOnly).toBe(true);
  });

  it("queries queue lifecycle, active notifications, and subscriptions by due work", () => {
    const report = validateScheduledRuntimeCostReduction({ writeReport: false });

    expect(report.summary.queueLifecycleDueOnly).toBe(true);
    expect(report.summary.activeDropNotificationsDueOnly).toBe(true);
    expect(report.summary.creatorSubscriptionsDueOnly).toBe(true);
  });

  it("records all requested audit items and no unsupported dollar claims", () => {
    const report = validateScheduledRuntimeCostReduction({ writeReport: false });

    expect(report.auditItemsAddressed).toEqual([44, 45, 46, 47, 48, 49, 50]);
    expect(report.costSavingsModel.length).toBeGreaterThan(0);
    expect(JSON.stringify(report.costSavingsModel)).not.toMatch(/\$\d/u);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });
});
