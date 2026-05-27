import { describe, expect, it } from "vitest";

import { buildReleaseReadinessContext } from "@/lib/release-readiness/final-release-readiness";
import {
  buildLiveEvidenceGateReplacementReport,
  validateLiveEvidenceGateReplacementReport,
} from "@/lib/release-readiness/live-evidence-resolver";

describe("live evidence gate replacement", () => {
  it("splits broad manual gates without turning source-only evidence into live proof", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
      publicBetaScore: {
        healthScore: 85.34,
        sourceHealthScore: 100,
        runtimeHealthScore: 84.2,
        evidenceCompletenessScore: 84.6,
        freshnessScore: 91.88,
        costRiskScore: 42,
        regressionRiskScore: 86,
      },
      currentBetaExitStatus: { summary: { canStartBetaExitReview: false } },
    });
    const report = buildLiveEvidenceGateReplacementReport(context);

    expect(report.betaExitReadyAfter).toBe(false);
    expect(report.broadManualGatesAfter).not.toContain("manual production smoke");
    expect(report.visualOnlyManualGatesRemaining[0]?.replacement).toContain("visual layout QA only");
    expect(report.externalProviderGatesRemaining.length).toBe(1);
    expect(report.externalBillingGatesRemaining.length).toBe(1);
    expect(report.liveEvidenceBySystem.every((system) => system.freshnessWindowHours > 0)).toBe(true);
    expect(report.liveEvidenceBySystem.every((system) => system.privacyRedactionPolicy.length > 0)).toBe(true);
    expect(report.liveEvidenceBySystem.some((system) => system.status === "source_only_evidence" || system.status === "source_missing_live_evidence")).toBe(true);
    expect(validateLiveEvidenceGateReplacementReport(report)).toEqual([]);
  });

  it("fails if visual QA is allowed to prove backend behavior", () => {
    const context = buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] });
    const report = buildLiveEvidenceGateReplacementReport(context);
    report.visualOnlyManualGatesRemaining[0] = {
      ...report.visualOnlyManualGatesRemaining[0]!,
      replacement: "visual QA proves backend runtime payment behavior",
    };

    expect(validateLiveEvidenceGateReplacementReport(report)).toContain("visual QA claims to prove backend/runtime/payment behavior.");
  });
});
