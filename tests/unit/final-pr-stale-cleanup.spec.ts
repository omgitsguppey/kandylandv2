import { describe, expect, it } from "vitest";

import {
  buildFinalPrStaleCleanupReport,
  validateFinalPrStaleCleanupReport,
  type FinalPrCleanupAction,
} from "../../scripts/agent/validate-final-pr-stale-cleanup";

const actions: FinalPrCleanupAction[] = [
  {
    number: 275,
    title: "Reduce duplicate computation in high-ROI aggregation hotspot",
    action: "integrated_and_closed",
    reason: "Scoped admin analytics optimization was applied directly.",
  },
  {
    number: 274,
    title: "Reduce monolith file risk and clarify responsibility boundaries",
    action: "closed_superseded",
    reason: "Broad stale doctrine was superseded by newer cleanup locks.",
  },
];

describe("final PR stale cleanup", () => {
  it("passes when no open PRs remain and dirty files are classified", () => {
    const report = buildFinalPrStaleCleanupReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      openPrs: [],
      changedFiles: [
        "src/lib/server/admin-analytics-historical-engagement.ts",
        "src/components/ui/Button.tsx",
        "agent/state/final-pr-stale-cleanup.generated.json",
        "docs/agent-truth/final-pr-stale-cleanup.md",
        "CHANGELOG.md",
      ],
      untrackedFiles: [
        "scripts/agent/validate-final-pr-stale-cleanup.ts",
        "tests/unit/final-pr-stale-cleanup.spec.ts",
      ],
      prCleanupActions: actions,
      releaseNotesUpdated: true,
    });

    expect(report.summary.openPrCount).toBe(0);
    expect(report.summary.prsUnclassified).toBe(0);
    expect(report.summary.dirtyFilesUnclassified).toBe(0);
    expect(report.summary.releaseNotesSameCommit).toBe(true);
    expect(validateFinalPrStaleCleanupReport(report)).toEqual([]);
  });

  it("fails when an open PR is unclassified", () => {
    const report = buildFinalPrStaleCleanupReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      openPrs: [{ number: 277, title: "Unknown PR" }],
      changedFiles: [],
      untrackedFiles: [],
      prCleanupActions: actions,
      releaseNotesUpdated: true,
    });

    expect(validateFinalPrStaleCleanupReport(report)).toContain("open PRs exist without classification.");
  });

  it("fails if PR 274 or 275 remains open without exact reason", () => {
    const report = buildFinalPrStaleCleanupReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      openPrs: [{ number: 275, title: "Reduce duplicate computation", classification: "" }],
      changedFiles: [],
      untrackedFiles: [],
      prCleanupActions: [],
      releaseNotesUpdated: true,
    });

    expect(validateFinalPrStaleCleanupReport(report)).toContain("PR #274 or #275 remains open without exact reason.");
  });

  it("fails on unclassified dirty files", () => {
    const report = buildFinalPrStaleCleanupReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      openPrs: [],
      changedFiles: ["src/unknown-runtime.ts"],
      untrackedFiles: [],
      prCleanupActions: actions,
      releaseNotesUpdated: true,
    });

    expect(validateFinalPrStaleCleanupReport(report)).toContain("working tree dirty files are unclassified.");
  });

  it("fails when release notes are missing from the real cleanup commit", () => {
    const report = buildFinalPrStaleCleanupReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      openPrs: [],
      changedFiles: ["src/components/ui/Button.tsx"],
      untrackedFiles: [],
      prCleanupActions: actions,
      releaseNotesUpdated: false,
    });

    expect(validateFinalPrStaleCleanupReport(report)).toContain("release notes separated from real commit.");
  });
});
