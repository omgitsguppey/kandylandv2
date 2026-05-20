import { describe, expect, it } from "vitest";

import {
  buildFinalMorningBetaLockReport,
  validateFinalMorningBetaLockReport,
} from "../../scripts/agent/validate-final-morning-beta-lock";

describe("final morning beta lock", () => {
  it("locks PR, dirty file, stale artifact, evidence, and beta status without clearing formal gates", () => {
    const report = buildFinalMorningBetaLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T23:00:00.000Z",
      openPrs: [],
      changedFiles: [
        "agent/state/final-morning-beta-lock.generated.json",
        "docs/agent-truth/final-morning-beta-lock.md",
        "scripts/agent/validate-final-morning-beta-lock.ts",
        "tests/unit/final-morning-beta-lock.spec.ts",
        "CHANGELOG.md",
      ],
      untrackedFiles: [],
      refreshPlan: [
        {
          artifactPath: "agent/state/operator-revenue-smoke.generated.json",
          status: "stale_source_version",
          nextAction: "Refresh this report from the latest code version. Run: npm run check:operator-revenue-smoke",
          refreshCommand: "npm run check:operator-revenue-smoke",
        },
      ],
      evidence: {
        operatorRevenueSmokeStatus: "operator_confirmed_revenue_smoke",
        formalProviderSmokeStatus: "missing_formal_evidence",
        manualEvidenceStatus: "missing",
        runtimeEvidenceStatus: "missing",
        adminTruthEvidenceStatus: "missing",
        canStartBetaExitReview: false,
      },
      beta: {
        betaScore: 41.92,
        betaStatus: "Stale evidence",
      },
    });

    expect(report.summary.openPrsClassified).toBe(true);
    expect(report.summary.dirtyFilesClassified).toBe(true);
    expect(report.summary.staleArtifactsHaveRefreshActions).toBe(true);
    expect(report.summary.operatorRevenueSmokeStatus).toBe("operator_confirmed_revenue_smoke");
    expect(report.summary.formalProviderSmokeStatus).toBe("missing_formal_evidence");
    expect(report.summary.canStartBetaExitReview).toBe(false);
    expect(report.summary.chatUntouched).toBe(true);
    expect(report.summary.navUntouched).toBe(true);
    expect(validateFinalMorningBetaLockReport(report, "head")).toEqual([]);
  });

  it("fails when stale artifacts lack actions or provider proof is overclaimed", () => {
    const report = buildFinalMorningBetaLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T23:00:00.000Z",
      openPrs: [{ number: 1, title: "Unclassified", url: "https://example.test", mergeStateStatus: "UNKNOWN" }],
      changedFiles: ["src/components/Chat/ChatThread.tsx"],
      refreshPlan: [
        {
          artifactPath: "agent/state/operator-revenue-smoke.generated.json",
          status: "stale_source_version",
          nextAction: "",
          refreshCommand: "",
        },
      ],
      evidence: {
        operatorRevenueSmokeStatus: "operator_confirmed_revenue_smoke",
        formalProviderSmokeStatus: "formal_provider_smoke_passed",
        manualEvidenceStatus: "missing",
        runtimeEvidenceStatus: "missing",
        adminTruthEvidenceStatus: "missing",
        canStartBetaExitReview: true,
      },
      beta: {
        betaScore: 41.92,
        betaStatus: "Stale evidence",
      },
    });

    expect(validateFinalMorningBetaLockReport(report, "head")).toEqual(expect.arrayContaining([
      "open PRs must be classified.",
      "stale artifacts must include refresh actions.",
      "operator-confirmed revenue smoke must not clear formal provider smoke.",
      "beta exit cannot be true without formal evidence lanes.",
      "chat/nav files must remain untouched.",
    ]));
  });
});
