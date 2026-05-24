import { describe, expect, it } from "vitest";

import {
  buildCostDataConnectRefreshReport,
  buildDataConnectMirrorStatusReport,
  validateCostDataConnectRefreshReport,
  validateDataConnectMirrorStatusReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 cost and Data Connect refresh", () => {
  it("keeps Data Connect manual-only while cost artifacts are current", () => {
    const mirror = buildDataConnectMirrorStatusReport();
    expect(mirror.status).toBe("manual_only_safe");
    expect(mirror.liveSyncRequiresExplicitApproval).toBe(true);
    expect(mirror.safeDefaultCommand).toBe("npm run check:data-connect-mirror-status");
    expect(validateDataConnectMirrorStatusReport(mirror)).toEqual([]);

    const report = buildCostDataConnectRefreshReport();
    expect(report.dataConnectMirrorStatusAfter).toBe("manual_only_safe");
    expect(report.googleCostAgeAfter).toBeLessThanOrEqual(72);
    expect(report.cloudCostAgeAfter).toBeLessThanOrEqual(72);
    expect(report.costLanesClaimExternalBillingProof).toBe(false);
    expect(validateCostDataConnectRefreshReport(report)).toEqual([]);
  });
});
