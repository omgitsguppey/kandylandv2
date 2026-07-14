import { describe, expect, it } from "vitest";

import {
  buildFinalReleaseExitReadinessPacketReport,
  buildReleaseReadinessContext,
  validateFinalReleaseExitReadinessPacketReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("final release exit readiness packet", () => {
  it("keeps beta exit false while formal evidence and operator QA remain", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
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
      releaseNotes: {
        currentVersion: "1.6.16",
        betaReleaseCounter: 616,
        lastCommitSha: "accepted-head",
        notes: [{
          version: "1.6.16",
          betaReleaseCounter: 616,
          commitSha: "accepted-head",
          updatedAtUtc: "2026-07-14T11:00:00.000Z",
          generatedAtUtc: "2026-07-14T11:00:00.000Z",
          committedAtUtc: "2026-07-14T10:59:00.000Z",
          title: "Improved internal beta reliability",
          summary: "Bug fixes and performance improvements.",
          bullets: ["Kept stale launch evidence visible until it is refreshed."],
        }],
      },
      releaseNotesChangelog: [
        "## 1.6.16 - 2026-07-14",
        "- Improved internal beta reliability",
        "- Kept stale launch evidence visible until it is refreshed.",
      ].join("\n"),
      releaseNotesAnchorStatus: "ancestor_of_current_head",
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
    expect(report.formalEvidenceLedger.find((entry) => entry.category === "release notes")).toMatchObject({
      status: "formal_passed",
      blocksBetaExit: false,
    });
    expect(validateFinalReleaseExitReadinessPacketReport(report)).toEqual([]);
  });

  it("keeps stale release notes in the formal blocker ledger", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
      currentHead: "head",
      releaseNotes: {
        currentVersion: "1.6.16",
        betaReleaseCounter: 616,
        lastCommitSha: "accepted-head",
        notes: [{
          version: "1.6.16",
          betaReleaseCounter: 616,
          commitSha: "accepted-head",
          updatedAtUtc: "2026-07-14T11:00:00.000Z",
          generatedAtUtc: "2026-07-14T11:00:00.000Z",
          committedAtUtc: "2026-07-14T10:59:00.000Z",
          title: "Improved internal beta reliability",
          summary: "Bug fixes and performance improvements.",
          bullets: ["Kept stale launch evidence visible until it is refreshed."],
        }],
      },
      releaseNotesChangelog: [
        "## 1.6.16 - 2026-07-14",
        "- Improved internal beta reliability",
        "- Kept stale launch evidence visible until it is refreshed.",
      ].join("\n"),
      releaseNotesAnchorStatus: "not_ancestor",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildFinalReleaseExitReadinessPacketReport(context);

    expect(report.formalEvidenceLedger.find((entry) => entry.category === "release notes")).toMatchObject({
      status: "stale",
      blocksBetaExit: true,
    });
    expect(report.remainingFormalEvidence).toContain("release notes");
    expect(report.releaseNotesIntegrity.status).toBe("warning");
    expect(report.validationFailures).toContain("release notes stale.");
  });
});
