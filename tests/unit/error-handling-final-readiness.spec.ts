import { describe, expect, it } from "vitest";

import {
  validateErrorHandlingFinalReadinessReport,
  type ErrorHandlingFinalReadinessReport,
} from "../../scripts/agent/validate-error-handling-final-readiness";

function reportFixture(): ErrorHandlingFinalReadinessReport {
  const report: ErrorHandlingFinalReadinessReport = {
    generatedAtUtc: "2026-05-17T00:00:00.000Z",
    reportKey: "error-handling-final-readiness" as const,
    currentHead: "head",
    summary: {
      phase1LanguageContract: "pass" as const,
      phase2BugReportReward: "pass" as const,
      phase3SurfaceWiring: "pass" as const,
      phase4DebugTruth: "pass" as const,
      rawUserErrorLeaks: 0,
      bugReportRewardGd: 10,
      rewardCreditsRewardBalanceOnly: true,
      purchasedBalanceUntouched: true,
      duplicateGuard: true,
      dailyCapGuard: true,
      debugTruthVisibility: true,
      betaCanUseErrorPhaseAsSourceComplete: true,
      p0Count: 0,
      p1Count: 0,
      p2Count: 0,
    },
    phaseChecks: [
      { command: "npm run check:error-language-contract", status: "passed", evidence: "pass" },
      { command: "npm run check:bug-report-reward-flow", status: "passed", evidence: "pass" },
      { command: "npm run check:human-error-surface-wiring", status: "passed", evidence: "pass" },
      { command: "npm run check:error-truth-debug-visibility", status: "passed", evidence: "pass" },
    ],
    rawErrorLeakFindings: [],
    debugTruthFindings: [],
    rewardSafetyFindings: [],
    deferredFindings: [],
    nextFixOrder: ["Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked."],
  };
  return report;
}

describe("error handling final readiness validator", () => {
  it("accepts a source-complete error handling report", () => {
    expect(validateErrorHandlingFinalReadinessReport(reportFixture(), "head")).toEqual([]);
  });

  it("blocks source complete when raw user-facing leaks remain", () => {
    const report = reportFixture();
    report.summary.rawUserErrorLeaks = 1;

    expect(validateErrorHandlingFinalReadinessReport(report, "head")).toContain(
      "rawUserErrorLeaks must be 0.",
    );
  });

  it("blocks purchased-balance bug report rewards", () => {
    const report = reportFixture();
    report.summary.purchasedBalanceUntouched = false;

    expect(validateErrorHandlingFinalReadinessReport(report, "head")).toContain(
      "bug report rewards must not touch purchased balance.",
    );
  });

  it("requires phase 4 to be passed or formally deferred", () => {
    const report = reportFixture();
    report.summary.phase4DebugTruth = "fail";

    expect(validateErrorHandlingFinalReadinessReport(report, "head")).toContain(
      "phase4DebugTruth must be pass or deferred.",
    );
  });
});
