import { describe, expect, it } from "vitest";

import { buildWiringTruthAuditReport, validateWiringTruthAuditReport } from "@/lib/release-readiness/wiring-truth-auditor";

describe("wiring truth audit", () => {
  it("keeps every major lane classified instead of silently passing it", () => {
    const report = buildWiringTruthAuditReport(process.cwd());
    expect(report.lanes.length).toBeGreaterThanOrEqual(10);
    expect(report.lanes.every((lane) => lane.status !== "unsafe_unknown")).toBe(true);
    expect(validateWiringTruthAuditReport(report)).toEqual([]);
  }, 120000);
});
