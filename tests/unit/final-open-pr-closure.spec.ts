import { describe, expect, it } from "vitest";

import { buildFinalOpenPrClosureReport, validateFinalOpenPrClosureReport } from "@/lib/release-readiness/final-beta-exit-closure";

describe("final open PR closure", () => {
  it("requires security PRs resolved and dependency PRs deferred with reasons", () => {
    const report = buildFinalOpenPrClosureReport(process.cwd(), []);
    expect(report.securityPrsResolved).toBe(true);
    expect(report.dependencyPrsDeferred.every((pr) => pr.nextWindow === "post_beta_dependency_window" && pr.reason.length > 0)).toBe(true);
    expect(validateFinalOpenPrClosureReport(report)).toEqual([]);
  });
});
