import { describe, expect, it } from "vitest";

import {
  buildSameCommitReleaseHeadDisciplineReport,
  shouldWriteSameCommitReleaseHeadDisciplineReport,
  validateSameCommitReleaseHeadDiscipline,
  type SameCommitReleaseHeadDisciplineInput,
} from "../../scripts/agent/validate-same-commit-release-head-discipline";

function inputFixture(overrides: Partial<SameCommitReleaseHeadDisciplineInput> = {}): SameCommitReleaseHeadDisciplineInput {
  return {
    nowMs: Date.parse("2026-05-30T12:00:00.000Z"),
    head: "abc1234",
    changedFiles: ["package.json"],
    packageJsonDiff: '"build": "next build"\n"build": "node --max-old-space-size=4096 ./node_modules/next/dist/bin/next build"',
    releaseNotes: {
      currentVersion: "1.5.24",
      betaReleaseCounter: 524,
      lastCommitSha: "pending-same-commit",
      generatedAtUtc: "2026-05-30T11:59:00.000Z",
      notes: [
        {
          version: "1.5.24",
          betaReleaseCounter: 524,
          title: "Deployment build stability",
          summary: "Improved internal beta reliability by raising the production build heap.",
          bullets: ["Raised the production Next build Node heap to prevent OOM during TypeScript/build phase."],
          updatedAtUtc: "2026-05-30T11:59:00.000Z",
          hiddenFromPublic: false,
          changedFiles: ["package.json"],
        },
      ],
    },
    fallbackSource: '"currentVersion": "1.5.24"\n"betaReleaseCounter": 524\n"lastCommitSha": "pending-same-commit"',
    currentHeadArtifacts: [],
    ...overrides,
  };
}

describe("same-commit release/head discipline", () => {
  it("blocks build script changes without same-commit release-note artifacts", () => {
    const report = buildSameCommitReleaseHeadDisciplineReport(inputFixture({
      changedFiles: ["package.json"],
    }));

    expect(validateSameCommitReleaseHeadDiscipline(report)).toContain(
      "build/deploy script changes must include same-commit release-note artifacts.",
    );
  });

  it("accepts build script changes when release freshness is present in the same diff", () => {
    const report = buildSameCommitReleaseHeadDisciplineReport(inputFixture({
      changedFiles: [
        "package.json",
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
      ],
    }));

    expect(validateSameCommitReleaseHeadDiscipline(report)).toEqual([]);
  });

  it("blocks stale currentHead artifacts without generated-pre-commit classification", () => {
    const report = buildSameCommitReleaseHeadDisciplineReport(inputFixture({
      changedFiles: [
        "package.json",
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
      ],
      currentHeadArtifacts: [
        {
          path: "agent/state/current-beta-exit-status.generated.json",
          currentHead: "oldhead",
        },
      ],
    }));

    expect(validateSameCommitReleaseHeadDiscipline(report)).toContain(
      "stale currentHead artifact agent/state/current-beta-exit-status.generated.json must be refreshed or classified generated_pre_commit.",
    );
  });

  it("does not rewrite generated reports during a clean post-commit check", () => {
    const report = buildSameCommitReleaseHeadDisciplineReport(inputFixture({
      changedFiles: [],
      packageJsonDiff: "",
    }));

    expect(shouldWriteSameCommitReleaseHeadDisciplineReport(report)).toBe(false);
  });
});
