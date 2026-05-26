import { describe, expect, it } from "vitest";

import {
  buildReleaseReadinessContext,
  buildReleaseRollbackIncidentReadinessReport,
  validateReleaseRollbackIncidentReadinessReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("release rollback incident readiness", () => {
  it("discloses missing kill switches and includes payment, GumDrop, analytics, and incident coverage", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      releaseNotes: { currentVersion: "1.5.9" },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildReleaseRollbackIncidentReadinessReport(context);

    expect(report.featureFlagsAndKillSwitches.some((entry) => entry.status === "missing_kill_switch")).toBe(true);
    expect(report.safetyNotes.paymentWallet).toBeTruthy();
    expect(report.safetyNotes.gumdropLedger).toBeTruthy();
    expect(report.safetyNotes.analyticsIngest).toBeTruthy();
    expect(validateReleaseRollbackIncidentReadinessReport(report)).toEqual([]);
  });
});
