import { describe, expect, it } from "vitest";

import {
  buildLegacyRecoveryStatusCleanupReport,
  validateLegacyRecoveryStatusCleanupReport,
} from "../../scripts/agent/validate-legacy-recovery-status-cleanup";

describe("legacy recovery status cleanup", () => {
  it("keeps March 1 recovery dry-run safe and explains degraded status", () => {
    const report = buildLegacyRecoveryStatusCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.dryRunMutationProtection).toBe(true);
    expect(report.marchFirstBoundaryPresent).toBe(true);
    expect(report.rawRowsDefaultVisible).toBe(false);
    expect(report.status === "degraded" ? report.degradedCause.length > 0 : true).toBe(true);
    expect(validateLegacyRecoveryStatusCleanupReport(report)).toEqual([]);
  });
});
