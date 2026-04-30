import { describe, expect, it } from "vitest";

import {
  buildAnalyticsEcosystemParityResult,
  calculateParityDelta,
  summarizeParityReport,
} from "@/lib/analytics/legacy-recovery-contract";

describe("analytics ecosystem parity", () => {
  it("calculates parity deltas without converting missing values to zero", () => {
    expect(calculateParityDelta(10, 8)).toBe(2);
    expect(calculateParityDelta(null, 8)).toBeNull();
    expect(calculateParityDelta(10, null)).toBeNull();
  });

  it("flags admin exclusion leakage while preserving admin classification", () => {
    const result = buildAnalyticsEcosystemParityResult({
      lane: "admin_exclusion",
      sourceA: "admin/system events found in user/guest lane",
      sourceB: "expected admin/system leakage",
      expectedRelationship: "Admin/system events must not enter user behavior.",
      sourceAValue: 1,
      sourceBValue: 0,
      confidence: "high",
      recommendedFix: "Fix actor classification before snapshot inclusion.",
      failThreshold: 1,
    });

    expect(result.severity).toBe("fail");
    expect(result.requiresManualReview).toBe(true);
    expect(result.snapshotParity.status).toBe("fail");
  });

  it("keeps guest estimate gaps unavailable instead of fake zero", () => {
    const result = buildAnalyticsEcosystemParityResult({
      lane: "guest_auth",
      sourceA: "guest estimate",
      sourceB: "identified first-party traffic",
      expectedRelationship: "Guest estimates require compatible GA and first-party ranges.",
      sourceAValue: null,
      sourceBValue: 42,
      confidence: "unknown",
      recommendedFix: "Keep guest traffic labeled unavailable until the estimate inputs exist.",
      fakeZeroPrevented: true,
    });

    expect(result.delta).toBeNull();
    expect(result.severity).toBe("warn");
    expect(result.snapshotParity.fakeZeroPrevented).toBe(true);
  });

  it("returns snapshot parity rows for non-blocking parity reports", () => {
    const result = buildAnalyticsEcosystemParityResult({
      lane: "snapshots",
      sourceA: "hot cache snapshots",
      sourceB: "ecosystem parity",
      expectedRelationship: "Parity updates Debug metadata without blocking UI.",
      sourceAValue: 5,
      sourceBValue: 5,
      confidence: "medium",
      recommendedFix: "No action.",
    });
    const report = summarizeParityReport({
      generatedAt: "2026-04-30T12:00:00.000Z",
      selectedRange: "all",
      lanes: [result],
    });

    expect(report.highestSeverity).toBe("pass");
    expect(report.snapshotParityIntegration.blocksUiRendering).toBe(false);
    expect(report.snapshotParityIntegration.parityResultCount).toBe(1);
    expect(report.lanes[0].snapshotParity).toMatchObject({
      key: "snapshots",
      status: "pass",
      expectedValue: 5,
      comparedValue: 5,
      fakeZeroPrevented: false,
    });
  });

  it("keeps fake-zero regressions visible as parity failures", () => {
    const result = buildAnalyticsEcosystemParityResult({
      lane: "data_validation_debug",
      sourceA: "unknown source shown as pass",
      sourceB: "required source state",
      expectedRelationship: "Unknown source must not render as pass or zero.",
      sourceAValue: 0,
      sourceBValue: null,
      confidence: "unknown",
      recommendedFix: "Expose unavailable state and block pass.",
      requiresManualReview: true,
      fakeZeroPrevented: false,
    });

    expect(result.severity).toBe("fail");
    expect(result.snapshotParity.status).toBe("fail");
    expect(result.snapshotParity.fakeZeroPrevented).toBe(false);
  });
});
