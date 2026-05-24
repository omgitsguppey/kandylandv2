import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch10CleanupReport,
  validateDebugCockpitBatch10CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch10-shared";

describe("debug cockpit batch10 cleanup report", () => {
  it("records refreshed readiness artifacts and remaining hardening fixes", () => {
    const report = buildDebugCockpitBatch10CleanupReport({
      repoHead: "head-current",
      betaScoreHeadBefore: "old-beta-head",
      betaScoreHeadAfter: "head-current",
      selfHealingAgeBeforeHours: 406_694.6,
      selfHealingAgeAfterHours: 0.01,
      speedSecurityScoreBefore: 51,
      speedSecurityScoreAfter: 91,
      speedSecurityFindingsBefore: 177,
      speedSecurityFindingsAfter: 0,
      speedSecurityAgeAfterHours: 0.01,
      hardeningScoreBefore: 97,
      hardeningScoreAfter: 100,
      hardeningFindingsBefore: 6,
      hardeningFindingsAfter: 0,
      hardeningAgeAfterHours: 0.01,
      scoreBefore: 79,
      scoreAfter: 79,
    });

    expect(report.betaScoreHeadAfter).toBe("head-current");
    expect(report.adminBalanceBodyCapStatus).toBe("bounded_parser_cap_8192");
    expect(report.creatorAccountControlsBodyCapStatus).toBe("bounded_parser_cap_16384");
    expect(report.creatorAccountControlsTypedErrorsStatus).toBe("typed_safe_error_mapping");
    expect(report.creatorAgreementsTypedErrorsStatus).toBe("typed_safe_error_mapping");
    expect(report.viewerEntitlementStatus).toBe("entitlement_evidence_current");
    expect(report.aiBudgetGuardStatus).toBe("ai_budget_guard_current");
    expect(report.touchedPaymentRuntime).toBe(false);
    expect(report.gumdropMathChanged).toBe(false);
    expect(report.providerCallsRun).toBe(false);
    expect(validateDebugCockpitBatch10CleanupReport(report)).toEqual([]);
  });
});
