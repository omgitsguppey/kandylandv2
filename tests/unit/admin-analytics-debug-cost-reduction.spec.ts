import { describe, expect, it } from "vitest";

import { validateAdminAnalyticsDebugCostReduction } from "../../scripts/agent/validate-admin-analytics-debug-cost-reduction";

describe("admin analytics and debug cost reduction", () => {
  it("keeps default Admin Analytics and Debug reads snapshot-first, bounded, and truth-labeled", () => {
    const report = validateAdminAnalyticsDebugCostReduction({ writeReport: false });

    expect(report.summary.adminHistoricalDefaultCacheEnabled).toBe(true);
    expect(report.summary.gaSnapshotFirstEnabled).toBe(true);
    expect(report.summary.eventFactsDefaultLimitReduced).toBe(true);
    expect(report.summary.guestDiagnosticsDefaultLimitReduced).toBe(true);
    expect(report.summary.dropsArchivePaged).toBe(true);
    expect(report.summary.debugInitialLoadLazy).toBe(true);
    expect(report.summary.heartbeatFullScanBlocked).toBe(true);
    expect(report.summary.supportThreadsPaged).toBe(true);
    expect(report.summary.rosterSummaryDefault).toBe(true);
    expect(report.summary.userDetailExpensiveSectionsLazy).toBe(true);
    expect(report.summary.truthSemanticsPreserved).toBe(true);
    expect(report.summary.p0Count).toBe(0);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("records percentage/formula savings instead of unsupported dollar claims", () => {
    const report = validateAdminAnalyticsDebugCostReduction({ writeReport: false });

    expect(report.costSavingsModel.length).toBeGreaterThan(0);
    expect(JSON.stringify(report.costSavingsModel)).not.toMatch(/\$\d/u);
    expect(report.costSavingsModel.every((entry) => entry.estimatedReduction.includes("%") || entry.formula.includes("reduction"))).toBe(true);
  });
});
