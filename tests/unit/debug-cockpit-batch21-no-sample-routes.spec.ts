import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch21NoSampleRoutesReport, validateDebugCockpitBatch21NoSampleRoutesReport } from "@/lib/debug/debug-cockpit-batch21-no-sample-routes";

describe("Batch 21 no-sample route final lock", () => {
  it("reports no false-live no-sample routes and keeps required smoke visible", () => {
    const report = buildDebugCockpitBatch21NoSampleRoutesReport();

    expect(report.noSampleRoutesBefore).toBe(22);
    expect(report.noSampleRoutesAfter).toBe(22);
    expect(report.falseLiveNoSampleBefore).toBeGreaterThan(0);
    expect(report.falseLiveNoSampleAfter).toBe(0);
    expect(report.requiredSmokeRoutes).toContain("user/revoke-sessions:POST");
    expect(report.legacyCompatRoutes).toContain("creator/messages:POST");
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(validateDebugCockpitBatch21NoSampleRoutesReport(report)).toEqual([]);
  });
});
