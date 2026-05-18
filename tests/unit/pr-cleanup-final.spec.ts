import { describe, expect, it } from "vitest";

import {
  validatePrCleanupFinalReport,
  type PrCleanupFinalReport,
} from "../../scripts/agent/validate-pr-cleanup-final";

function reportFixture(overrides: Partial<PrCleanupFinalReport> = {}): PrCleanupFinalReport {
  const closed = {
    number: 1,
    title: "Duplicate cleanup",
    author: "omgitsguppey",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/1",
    classification: "close_superseded" as const,
    reason: "Superseded by current main.",
  };
  const preserved = {
    number: 2,
    title: "Dependency review",
    author: "app/dependabot",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/2",
    classification: "preserve_dependency_security_review" as const,
    reason: "Dependency PR needs human review.",
    owner: "dependency-security-review",
  };

  return {
    generatedAtUtc: "2026-05-18T14:50:09.443Z",
    reportKey: "pr-cleanup-final",
    currentHead: "head",
    workingTreeStatusBefore: "clean",
    workingTreeStatusAfter: "clean",
    dirtyFilesClassified: [],
    prsReviewed: [closed, preserved],
    prsMerged: [],
    prsClosed: [closed],
    prsPreserved: [preserved],
    unsafeUntouched: [],
    remainingOpenPrs: [preserved],
    nextExactSteps: ["Review preserved dependency PRs in a fresh lane."],
    ...overrides,
  };
}

describe("pr cleanup final report", () => {
  it("passes for a classified cleanup report", () => {
    expect(validatePrCleanupFinalReport(reportFixture(), "head")).toEqual([]);
  });

  it("fails when reviewed PRs are missing", () => {
    expect(validatePrCleanupFinalReport(reportFixture({ prsReviewed: [] }), "head")).toContain(
      "prsReviewed must not be empty when open PRs existed.",
    );
  });

  it("fails when a closed PR lacks a close classification", () => {
    const report = reportFixture();
    report.prsClosed = [{
      ...report.prsClosed[0],
      classification: "needs_human_review",
      reason: "",
    }];

    expect(validatePrCleanupFinalReport(report, "head")).toContain(
      "closed PR #1 lacks close reason/classification.",
    );
  });

  it("fails when preserved PRs lack owner or reason", () => {
    const report = reportFixture();
    report.prsPreserved = [{
      ...report.prsPreserved[0],
      owner: "",
    }];

    expect(validatePrCleanupFinalReport(report, "head")).toContain(
      "preserved PR #2 lacks owner/reason.",
    );
  });

  it("fails when currentHead is stale", () => {
    expect(validatePrCleanupFinalReport(reportFixture(), "new-head")).toContain(
      "report currentHead must match git HEAD after cleanup actions.",
    );
  });
});
