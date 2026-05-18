import { describe, expect, it } from "vitest";

import {
  validateOpenPrFinalActionReport,
  type OpenPrFinalActionReport,
} from "../../scripts/agent/validate-open-pr-final-action";

const requiredNumbers = [216, 217, 218, 228, 233, 241, 242, 243, 247, 251, 252, 259, 260];

function pr(number: number, reason = "classified") {
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/omgitsguppey/kandylandv2/pull/${number}`,
    reason,
  };
}

function reportFixture(overrides: Partial<OpenPrFinalActionReport> = {}): OpenPrFinalActionReport {
  return {
    generatedAtUtc: "2026-05-18T18:20:00.000Z",
    reportKey: "open-pr-final-action",
    currentHead: "head",
    openPrsBefore: requiredNumbers.map((number) => pr(number)),
    closedPrs: [217, 218, 228, 241, 242, 243, 247, 259].map((number) => pr(number)),
    mergedPrs: [{
      ...pr(233),
      checks: ["gh pr checks 233: no checks reported", "npm run typecheck: pass"],
      mergeCommit: "merge",
    }],
    preservedPrs: [216, 251, 252, 260].map((number) => pr(number)),
    remainingOpenPrs: [216, 251, 252, 260].map((number) => pr(number)),
    unsafeUntouched: [],
    checksRun: ["npm run check:open-pr-final-action"],
    workingTreeStatusBefore: "clean",
    workingTreeStatusAfter: "clean",
    nextExactSteps: ["Review preserved owner-review PRs in dedicated lanes."],
    ...overrides,
  };
}

describe("open PR final action report", () => {
  it("passes when all 13 PRs are classified", () => {
    expect(validateOpenPrFinalActionReport(reportFixture())).toEqual([]);
  });

  it("fails when one scoped PR is missing", () => {
    const report = reportFixture({ openPrsBefore: requiredNumbers.filter((number) => number !== 260).map((number) => pr(number)) });
    report.preservedPrs = report.preservedPrs.filter((entry) => entry.number !== 260);
    report.remainingOpenPrs = report.remainingOpenPrs.filter((entry) => entry.number !== 260);

    expect(validateOpenPrFinalActionReport(report)).toContain("required PR #260 missing from report.");
  });

  it("fails when closed PRs lack reasons", () => {
    const report = reportFixture();
    report.closedPrs[0].reason = "";

    expect(validateOpenPrFinalActionReport(report)).toContain("closed PR #217 lacks reason.");
  });

  it("fails when preserved PRs lack reasons", () => {
    const report = reportFixture();
    report.preservedPrs[0].reason = "";

    expect(validateOpenPrFinalActionReport(report)).toContain("preserved PR #216 lacks reason.");
  });

  it("fails when merged PRs lack checks", () => {
    const report = reportFixture();
    report.mergedPrs[0].checks = [];

    expect(validateOpenPrFinalActionReport(report)).toContain("merged PR #233 lacks checks.");
  });
});
