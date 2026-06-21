import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch9CleanupReport,
  validateDebugCockpitBatch9CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch9-shared";

describe("debug cockpit batch9 cleanup report", () => {
  it("records refreshed beta/self-healing/speed-security artifacts and the admin balance body cap", () => {
    const report = buildDebugCockpitBatch9CleanupReport({
      repoHead: "head-current",
      publicBetaScoreHeadBefore: "old-beta-head",
      publicBetaScoreHeadAfter: "head-current",
      selfHealingAgeBeforeHours: 406_694.6,
      selfHealingAgeAfterHours: 0.01,
      speedSecurityAgeBeforeHours: 144.5,
      speedSecurityAgeAfterHours: 0.01,
      scoreBefore: 79,
      scoreAfter: 79,
    });

    expect(report.publicBetaScoreHeadBefore).toBe("old-beta-head");
    expect(report.publicBetaScoreHeadAfter).toBe("head-current");
    expect(report.selfHealingAgeAfter).toBeLessThan(72);
    expect(report.speedSecurityAgeAfter).toBeLessThan(72);
    expect(report.adminBalanceBodyCapBefore).toBe("missing_direct_request_json");
    expect(report.adminBalanceBodyCapAfter).toBe("bounded_parser_cap_8192");
    expect(report.boundedParserUsed).toBe("readBoundedJsonBody");
    expect(report.maxBytes).toBe(8_192);
    expect(report.directRequestJsonRemaining).toBe(false);
    expect(report.gumdropMathChanged).toBe(false);
    expect(report.authGuardChanged).toBe(false);
    expect(report.remainingGaps.join(" ")).toMatch(/provider-backed site activity/iu);
    expect(report.nextExactSteps.join(" ")).toContain("admin source activity sample evidence");
    expect(`${report.remainingGaps.join(" ")} ${report.nextExactSteps.join(" ")}`).not.toMatch(/formal provider\/runtime\/admin evidence|formal evidence artifacts|manual proof|screenshot proof/iu);
    expect(validateDebugCockpitBatch9CleanupReport(report)).toEqual([]);
  });
});
