import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch20StaleRouteSweepReport, validateDebugCockpitBatch20StaleRouteSweepReport } from "@/lib/debug/debug-cockpit-batch20-stale-route-sweep";

describe("Batch 20 stale route sweep report", () => {
  it("reports false-live cleanup, source bug repair, and remaining evidence gaps", () => {
    const report = buildDebugCockpitBatch20StaleRouteSweepReport();

    expect(report.falseLiveRoutesAfter).toBe(0);
    expect(report.fixedSourceBugs).toContain("admin/ai/drop-descriptions/feedback:lastEditedByUid");
    expect(report.paymentRouteEvidenceStatus).toBe("stale_critical_evidence_required");
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(validateDebugCockpitBatch20StaleRouteSweepReport(report)).toEqual([]);
  });
});
