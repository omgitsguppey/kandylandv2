import { describe, expect, it } from "vitest";

import {
  buildConsentTrackingModeCleanupReport,
  validateConsentTrackingModeCleanupReport,
} from "../../scripts/agent/validate-consent-tracking-mode-cleanup";

describe("consent tracking mode cleanup", () => {
  it("allows minimal product liveness while blocking behavioral tracking without consent", () => {
    const report = buildConsentTrackingModeCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.capabilities.minimalAnalyticsAllowsProductLiveness).toBe(true);
    expect(report.capabilities.necessaryAllowsIntegritySession).toBe(true);
    expect(report.capabilities.behavioralBlockedUnderNecessary).toBe(true);
    expect(report.debugLane.blockedEventFamilies.length).toBeGreaterThan(0);
    expect(validateConsentTrackingModeCleanupReport(report)).toEqual([]);
  });
});
