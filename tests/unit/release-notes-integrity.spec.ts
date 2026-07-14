import { describe, expect, it } from "vitest";

import {
  buildReleaseNotesIntegrityReport,
  buildReleaseReadinessContext,
  validateReleaseNotesIntegrityReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("release notes integrity", () => {
  const currentNote = {
    version: "1.6.16",
    betaReleaseCounter: 616,
    commitSha: "accepted-head",
    sourceCommit: "accepted-head",
    updatedAtUtc: "2026-07-14T11:00:00.000Z",
    generatedAtUtc: "2026-07-14T11:00:00.000Z",
    committedAtUtc: "2026-07-14T10:59:00.000Z",
    hiddenFromPublic: false,
    title: "Improved internal beta reliability",
    summary: "Bug fixes and performance improvements.",
    bullets: ["Kept stale launch evidence visible until it is refreshed."],
  };

  it("blocks false beta-exit and provider-proof claims", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      releaseNotes: { currentVersion: "1.5.9", notes: [{ summary: "beta exit ready with provider smoke passed" }] },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildReleaseNotesIntegrityReport(context);

    expect(report.claimsBetaExit).toBe(true);
    expect(report.claimsProviderRuntimeProof).toBe(true);
    expect(validateReleaseNotesIntegrityReport(report)).toEqual(
      expect.arrayContaining([
        "release notes claim false readiness.",
        "release notes mention provider/runtime proof when not formally passed.",
      ]),
    );
  });

  it("derives a current synchronized release note instead of hardcoding a pass", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
      currentHead: "head",
      releaseNotes: {
        currentVersion: currentNote.version,
        betaReleaseCounter: currentNote.betaReleaseCounter,
        lastCommitSha: currentNote.commitSha,
        notes: [currentNote],
      },
      releaseNotesChangelog: [
        "# Changelog",
        "",
        `## ${currentNote.version} - 2026-07-14`,
        `- ${currentNote.title}`,
        `- ${currentNote.bullets[0]}`,
        "",
      ].join("\n"),
      releaseNotesAnchorStatus: "ancestor_of_current_head",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });

    const report = buildReleaseNotesIntegrityReport(context);

    expect(report.changelogMentionsLatestHardening).toBe(true);
    expect(report.releaseNotesStaleToCurrentHead).toBe(false);
    expect(validateReleaseNotesIntegrityReport(report)).toEqual([]);
  });

  it("keeps an expired accepted note as a truthful release blocker", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-16T12:00:00.000Z",
      currentHead: "head",
      releaseNotes: {
        currentVersion: currentNote.version,
        betaReleaseCounter: currentNote.betaReleaseCounter,
        lastCommitSha: currentNote.commitSha,
        notes: [currentNote],
      },
      releaseNotesChangelog: [
        `## ${currentNote.version} - 2026-07-14`,
        `- ${currentNote.title}`,
        `- ${currentNote.bullets[0]}`,
      ].join("\n"),
      releaseNotesAnchorStatus: "ancestor_of_current_head",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });

    const report = buildReleaseNotesIntegrityReport(context);

    expect(report.releaseNotesStaleToCurrentHead).toBe(true);
    expect(validateReleaseNotesIntegrityReport(report)).toContain("release notes stale to currentHead.");
  });

  it("blocks a fresh note whose accepted anchor is outside current branch ancestry", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
      currentHead: "head",
      releaseNotes: {
        currentVersion: currentNote.version,
        betaReleaseCounter: currentNote.betaReleaseCounter,
        lastCommitSha: currentNote.commitSha,
        notes: [currentNote],
      },
      releaseNotesChangelog: [
        `## ${currentNote.version} - 2026-07-14`,
        `- ${currentNote.title}`,
        `- ${currentNote.bullets[0]}`,
      ].join("\n"),
      releaseNotesAnchorStatus: "not_ancestor",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });

    const report = buildReleaseNotesIntegrityReport(context);

    expect(report.releaseNotesStaleToCurrentHead).toBe(true);
    expect(validateReleaseNotesIntegrityReport(report)).toContain(
      "release notes anchor is not_ancestor; it does not establish currentHead ancestry.",
    );
  });
});
