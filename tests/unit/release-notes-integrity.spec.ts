import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

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

  it("keeps an older synchronized accepted release valid without inventing a new acceptance", () => {
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

    expect(report.releaseNotesStaleToCurrentHead).toBe(false);
    expect(validateReleaseNotesIntegrityReport(report)).toEqual([]);
  });

  it.each(["", "not-a-timestamp", "2026-07-15T12:00:00.000Z"])("rejects an invalid accepted timestamp %j", (timestamp) => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
      currentHead: "head",
      releaseNotes: {
        currentVersion: currentNote.version,
        betaReleaseCounter: currentNote.betaReleaseCounter,
        lastCommitSha: currentNote.commitSha,
        notes: [{ ...currentNote, updatedAtUtc: timestamp, generatedAtUtc: timestamp, committedAtUtc: timestamp }],
      },
      releaseNotesChangelog: [`## ${currentNote.version} - 2026-07-14`, `- ${currentNote.title}`, `- ${currentNote.bullets[0]}`].join("\n"),
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

describe("public changelog CLI timestamp boundary", () => {
  it.each([
    { label: "older accepted release", timestamp: "2026-07-14T11:00:00.000Z", failure: null },
    { label: "malformed timestamp", timestamp: "not-a-timestamp", failure: "latest visible Beta note must include a valid UTC timestamp." },
    { label: "future timestamp", timestamp: "2999-01-01T00:00:00.000Z", failure: "latest visible Beta note timestamp must not be in the future." },
  ])("checks the actual validator for $label", ({ timestamp, failure }) => {
    const root = process.cwd();
    const fixture = mkdtempSync(join(tmpdir(), "kandydrops-release-note-cli-"));
    const fixtureFiles = [
      "public/kandydrops-release-notes.json",
      "src/lib/release-notes/public-release-notes.ts",
      "src/lib/release-notes/release-version-contract.ts",
      "src/lib/release-notes/beta-odometer-version.ts",
      "scripts/release/update-public-changelog.ts",
      ".github/workflows/public-release-notes.yml",
      "cloudbuild.release-notes.yaml",
      "docs/agent-truth/public-beta-release-notes.md",
      "docs/agent-truth/firebase-owned-repo-automation.md",
      "README.md",
      "AGENTS.md",
    ];
    try {
      for (const file of fixtureFiles) {
        mkdirSync(dirname(join(fixture, file)), { recursive: true });
        writeFileSync(join(fixture, file), readFileSync(join(root, file)));
      }
      const documentPath = join(fixture, "public/kandydrops-release-notes.json");
      const document = JSON.parse(readFileSync(documentPath, "utf8"));
      document.notes[0].updatedAtUtc = timestamp;
      writeFileSync(documentPath, JSON.stringify(document));
      execFileSync("git", ["init", "--quiet"], { cwd: fixture, windowsHide: true });
      execFileSync("git", ["add", "."], { cwd: fixture, windowsHide: true });
      execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "chore: isolated release-note fixture"], { cwd: fixture, windowsHide: true });
      const require = createRequire(join(root, "package.json"));
      const result = spawnSync(process.execPath, [require.resolve("tsx/cli"), join(root, "scripts/agent/validate-public-beta-changelog.ts")], { cwd: fixture, encoding: "utf8", windowsHide: true });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      expect(result.error).toBeUndefined();
      expect(result.status, output).toBe(failure ? 1 : 0);
      if (failure) expect(output).toContain(failure);
      else expect(output).toContain("Public beta changelog validation passed.");
    } finally {
      const absolute = resolve(fixture);
      if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith("kandydrops-release-note-cli-")) throw new Error("Fixture cleanup escaped its owned temporary directory.");
      rmSync(absolute, { recursive: true, force: true });
    }
  });
});
