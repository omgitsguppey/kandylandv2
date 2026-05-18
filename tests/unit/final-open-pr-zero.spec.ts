import { describe, expect, it } from "vitest";

import {
  validateFinalOpenPrZeroReport,
  type FinalOpenPrZeroReport,
} from "../../scripts/agent/validate-final-open-pr-zero";

function pr(number: number, reason = "classified") {
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/omgitsguppey/kandylandv2/pull/${number}`,
    reason,
  };
}

function reportFixture(overrides: Partial<FinalOpenPrZeroReport> = {}): FinalOpenPrZeroReport {
  return {
    generatedAtUtc: "2026-05-18T18:30:00.000Z",
    reportKey: "final-open-pr-zero",
    currentHead: "head",
    prsBefore: [216, 251, 252, 260].map((number) => pr(number)),
    prsMerged: [216, 251, 252, 260].map((number) => ({
      ...pr(number),
      checks: ["inspected diff", "npm run typecheck"],
      mergeCommit: `merge-${number}`,
    })),
    prsManuallyIncorporated: [],
    prsClosedRejected: [],
    remainingOpenPrs: [],
    workingTreeStatusBefore: "clean",
    workingTreeStatusAfter: "clean",
    checksRun: ["npm run check:final-open-pr-zero"],
    finalOpenPrCount: 0,
    notes: ["zero open PRs"],
    nextExactSteps: ["No zombie PR cleanup remains."],
    ...overrides,
  };
}

describe("final open PR zero report", () => {
  it("passes when all four PRs are merged and zero remain open", () => {
    expect(validateFinalOpenPrZeroReport(reportFixture())).toEqual([]);
  });

  it("fails when a scoped PR is missing", () => {
    const report = reportFixture({ prsBefore: [216, 251, 252].map((number) => pr(number)) });
    report.prsMerged = report.prsMerged.filter((entry) => entry.number !== 260);

    expect(validateFinalOpenPrZeroReport(report)).toContain("required PR #260 missing from report.");
  });

  it("fails when final open PR count is not zero", () => {
    expect(validateFinalOpenPrZeroReport(reportFixture({ finalOpenPrCount: 1 }))).toContain(
      "finalOpenPrCount must be 0 unless GitHub API failure prevented action.",
    );
  });

  it("fails when merged PRs lack checks", () => {
    const report = reportFixture();
    report.prsMerged[0].checks = [];

    expect(validateFinalOpenPrZeroReport(report)).toContain("merged PR #216 lacks checks.");
  });

  it("fails when rejected PRs lack reasons", () => {
    const report = reportFixture({ prsMerged: [251, 252, 260].map((number) => ({
      ...pr(number),
      checks: ["checked"],
      mergeCommit: `merge-${number}`,
    })) });
    report.prsClosedRejected = [{ ...pr(216), reason: "" }];

    expect(validateFinalOpenPrZeroReport(report)).toContain("rejected PR #216 lacks reason.");
  });
});
