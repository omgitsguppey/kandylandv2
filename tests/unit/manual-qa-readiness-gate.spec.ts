import { describe, expect, it } from "vitest";

import { buildManualQaReadinessGateReport, validateManualQaReadinessGateReport } from "@/lib/release-readiness/manual-qa-readiness-gate";

describe("manual QA readiness gate", () => {
  it("does not recommend manual QA while security PRs and formal evidence remain", () => {
    const report = buildManualQaReadinessGateReport(process.cwd());
    expect(report.manualQaRecommended).toBe(false);
    expect(report.betaExitReady).toBe(false);
    expect(report.prerequisites.some((entry) => entry.id === "security-prs-handled-or-blocked" && entry.status === "blocked")).toBe(true);
    expect(validateManualQaReadinessGateReport(report)).toEqual([]);
  }, 120000);
});
