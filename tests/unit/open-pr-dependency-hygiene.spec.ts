import { describe, expect, it } from "vitest";

import {
  buildOpenPrDependencyHygieneReport,
  buildReleaseReadinessContext,
  classifyOpenPr,
  validateOpenPrDependencyHygieneReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("open PR dependency hygiene", () => {
  it("risk-scores security and dependency PRs without blindly merging them", () => {
    expect(classifyOpenPr({ number: 1, title: "Sentinel [HIGH] Fix weak PRNG" }).classification).toBe("security_pr_to_cherry_pick");
    expect(classifyOpenPr({ number: 2, title: "chore(deps): bump npm-minor-patch group" }).dependencyRiskClass).toBe("major_risk");

    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      publicBetaScore: { currentHead: "head" },
      currentBetaExitStatus: { currentHead: "head" },
      openPrs: [{ number: 1, title: "Sentinel [HIGH] Fix weak PRNG" }],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildOpenPrDependencyHygieneReport(context);
    expect(report.securityPrCount).toBe(1);
    expect(validateOpenPrDependencyHygieneReport(report)).toEqual([]);
  });
});
