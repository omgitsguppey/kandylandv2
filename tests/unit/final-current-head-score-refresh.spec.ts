import { describe, expect, it } from "vitest";

import { buildFinalCurrentHeadScoreRefreshReport } from "@/lib/release-readiness/final-beta-exit-closure";

describe("final current-head score refresh", () => {
  it("keeps beta exit false and score dimensions visible", () => {
    const report = buildFinalCurrentHeadScoreRefreshReport(process.cwd());
    expect(report.betaExitReady).toBe(false);
    expect(typeof report.scoreDimensions.costRisk).toBe("number");
  });
});
