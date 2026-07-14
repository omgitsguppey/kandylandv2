import { describe, expect, it } from "vitest";

import { LAUNCH_ANALYTICS_FIRST_DAY_KEY } from "@/lib/analytics/source-agreement-detail";

import {
  buildFinalMathNormalizationLockReport,
  classifyFinalMathNormalizationDirtyFile,
  validateFinalMathNormalizationLockReport,
} from "../../scripts/agent/validate-final-math-normalization-lock";

describe("final math normalization lock", () => {
  it("summarizes finalized formulas, accuracy improvements, legacy recovery, and gates", () => {
    const report = buildFinalMathNormalizationLockReport({
      currentHead: "test-head",
      dirtyFiles: [
        "scripts/agent/validate-final-math-normalization-lock.ts",
        "tests/unit/final-math-normalization-lock.spec.ts",
        "agent/state/final-math-normalization-lock.generated.json",
        "docs/agent-truth/final-math-normalization-lock.md",
        "src/app/api/paypal/capture/route.ts",
      ],
      openPrs: [],
      scoreBefore: {
        sourceHealth: 100,
        runtimeHealth: 84.2,
        evidenceCompleteness: 84.6,
        freshness: 91.88,
        costRisk: 42,
        regressionRisk: 86,
        overallHealthScore: 85.34,
      },
    });

    expect(report).toMatchObject({
      reportKey: "final-math-normalization-lock",
      currentHead: "test-head",
      productionReadsPerformed: false,
      legacyMutationPerformed: false,
      providerCallsPerformed: false,
      deployPerformed: false,
      paymentRuntimeChanged: false,
      gumdropPricingMathChanged: false,
      formulasFinalized: {
        betaScore: "finalized",
        confidence: "finalized",
        legacyRecovery: "finalized",
        globalUserCounting: "finalized",
        watchTime: "finalized",
        sessionBounce: "finalized",
        gumdropLedger: "finalized",
        creatorRevenue: "finalized",
        costExport: "finalized",
        metricDisplay: "finalized",
      },
      legacyRecoverySummary: {
        dryRunOnly: true,
        startDate: LAUNCH_ANALYTICS_FIRST_DAY_KEY,
        exactPromotionsBlocked: true,
      },
    });
    expect(report.accuracyImprovements).toHaveLength(10);
    expect(report.accuracyImprovements.every((entry) => entry.whyMoreAccurate.length > 20)).toBe(true);
    expect(report.remainingUnknowns).toContain("Unknown legacy data stays archive-only unless deterministic identity, event, route, and timestamp evidence exists.");
    expect(report.remainingFormalGates).toContain("Runtime/provider smoke remains formal evidence and is not cleared by source math locks.");
    expect(report.remainingCostReviews).toContain("External billing review remains separate from source cost guards.");

    expect(validateFinalMathNormalizationLockReport(report)).toEqual([
      "src/app/api/paypal/capture/route.ts is unclassified for final math normalization lock.",
    ]);
    expect(classifyFinalMathNormalizationDirtyFile("scripts/agent/validate-final-math-normalization-lock.ts")).toBe("validator_artifact_expected");
    expect(classifyFinalMathNormalizationDirtyFile("tests/unit/final-math-normalization-lock.spec.ts")).toBe("test_artifact_expected");
    expect(classifyFinalMathNormalizationDirtyFile("agent/state/final-math-normalization-lock.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyFinalMathNormalizationDirtyFile("docs/agent-truth/final-math-normalization-lock.md")).toBe("documentation_artifact_expected");
    expect(classifyFinalMathNormalizationDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
  });
});
