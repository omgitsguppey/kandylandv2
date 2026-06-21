import { describe, expect, it } from "vitest";

import {
  buildFinalReleaseExitReadinessPacketReport,
  buildReleaseReadinessContext,
  validateFinalReleaseExitReadinessPacketReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("final release exit readiness packet", () => {
  it("keeps beta exit false while formal evidence and operator QA remain", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      publicBetaScore: {
        currentHead: "head",
        healthScore: 85.34,
        launchGateStatus: "owner_review",
        launchBlockers: ["Provider-backed site activity evidence: missing", "Admin source sample evidence: missing"],
        sourceHealthScore: 100,
        runtimeHealthScore: 84.2,
        evidenceCompletenessScore: 84.6,
        freshnessScore: 91.88,
        costRiskScore: 42,
        regressionRiskScore: 86,
      },
      currentBetaExitStatus: { currentHead: "head" },
      openPrs: [{ number: 304, title: "Sentinel [HIGH] Fix open redirect and weak PRNG" }],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildFinalReleaseExitReadinessPacketReport(context);

    expect(report.betaExitReady).toBe(false);
    expect(report.remainingFormalEvidence).toEqual(expect.arrayContaining(["deployed route evidence", "provider-backed site activity evidence", "redacted admin source sample"]));
    expect(report.remainingManualItems).not.toContain("visual-only operator QA");
    expect(report.liveEvidenceGateReplacement.status).toBe("split_ready");
    expect(report.costRiskStatus.status).toBe("below80_external_review_required");
    expect(validateFinalReleaseExitReadinessPacketReport(report)).toEqual([]);
  });
});
