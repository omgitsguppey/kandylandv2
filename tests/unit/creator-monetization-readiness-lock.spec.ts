import { describe, expect, it } from "vitest";

import {
  buildCreatorMonetizationReadinessLockReport,
  classifyCreatorMonetizationReadinessLockDirtyFile,
  validateCreatorMonetizationReadinessLockReport,
} from "../../scripts/agent/validate-creator-monetization-readiness-lock";

describe("creator monetization readiness lock", () => {
  const testHead = "a".repeat(40);

  it("locks Fan Pass, settings, entitlements, chat pricing, admin debug, telemetry, and score evidence", () => {
    const report = buildCreatorMonetizationReadinessLockReport({
      currentHead: testHead,
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.status).toBe("pass");
    expect(report.fanPassLifecycleStatus).toBe("pass");
    expect(report.creatorSettingsTruthStatus).toBe("pass");
    expect(report.entitlementLedgerStatus).toBe("pass");
    expect(report.chatPricingStatus).toBe("pass");
    expect(report.accessRulesStatus).toBe("pass");
    expect(report.adminDebugStatus).toBe("pass");
    expect(report.telemetryStatus).toBe("pass");
    expect(report.personMetricsStatus).toBe("pass");
    expect(report.paymentRuntimeStatus).toBe("unchanged");
    expect(report.gumdropMathStatus).toBe("unchanged");
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "regressionRisk",
    ]));
    expect(report.remainingGaps).toEqual([]);
    expect(report.nextExactSteps).toEqual(expect.arrayContaining([
      "Keep Fan Pass purchases paid-source only and route future monetization consumers through the creator monetization resolver.",
    ]));
    expect(validateCreatorMonetizationReadinessLockReport(report)).toEqual([]);
  });

  it("blocks payment, wallet, payout, provider payload, and GumDrop runtime files", () => {
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("scripts/agent/validate-creator-monetization-readiness-lock.ts")).toBe("validator_artifact_expected");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("agent/state/creator-monetization-readiness-lock.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("docs/agent-truth/creator-monetization-readiness-lock.md")).toBe("documentation_artifact_expected");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("tests/unit/creator-monetization-readiness-lock.spec.ts")).toBe("test_artifact_expected");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
    expect(classifyCreatorMonetizationReadinessLockDirtyFile("src/lib/server/paypal.ts")).toBe("unsafe_unknown");

    const report = buildCreatorMonetizationReadinessLockReport({
      currentHead: testHead,
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateCreatorMonetizationReadinessLockReport(report)).toContain("src/lib/gumdrop-ledger.ts is unclassified for creator monetization readiness lock.");
  });
});
