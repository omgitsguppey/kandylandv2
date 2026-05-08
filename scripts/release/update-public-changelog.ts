import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_MAX_COUNT,
  PUBLIC_RELEASE_NOTES_PAGE_SIZE,
  type PublicReleaseNote,
  type PublicReleaseNotesDocument,
  isReleaseGeneratedArtifactPath,
} from "../../src/lib/release-notes/release-version-contract";
import {
  buildReleaseBullets,
  buildReleaseDescriptor,
  buildReleaseSummary,
  buildReleaseTitle,
  classifyCategory,
} from "../../src/lib/release-notes/release-note-classifier";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
};

const root = process.cwd();
const publicJsonPath = join(root, "public/kandydrops-release-notes.json");
const fallbackTsPath = join(root, "src/lib/release-notes/public-release-notes.ts");
const changelogPath = join(root, "CHANGELOG.md");

function nowIso() {
  return new Date().toISOString();
}

function runGit(args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function safeRunGit(args: string[]) {
  try {
    return runGit(args);
  } catch {
    return "";
  }
}

function parseSemver(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function formatSemver(major: number, minor: number, patch: number) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(currentVersion: string, bumpType: "minor" | "patch") {
  const parsed = parseSemver(currentVersion) ?? parseSemver(INITIAL_PUBLIC_VERSION);
  if (!parsed) return INITIAL_PUBLIC_VERSION;
  if (bumpType === "minor") return formatSemver(parsed.major, parsed.minor + 1, 0);
  return formatSemver(parsed.major, parsed.minor, parsed.patch + 1);
}

function readExistingDocument(): PublicReleaseNotesDocument {
  if (!existsSync(publicJsonPath)) {
    const now = nowIso();
    return {
      currentVersion: INITIAL_PUBLIC_VERSION,
      betaReleaseCounter: 0,
      channel: PUBLIC_RELEASE_CHANNEL,
      generatedAt: now,
      generatedAtUtc: now,
      lastCommitSha: "",
      notes: [],
    };
  }

  return JSON.parse(readFileSync(publicJsonPath, "utf8")) as PublicReleaseNotesDocument;
}

function getCommit(sha: string): CommitRecord | null {
  const raw = safeRunGit(["show", "-s", "--format=%H%x00%cI%x00%s", sha]);
  if (!raw) return null;
  const [commitSha, committedAt, title] = raw.split("\u0000");
  if (!commitSha || !committedAt || !title) return null;
  return { sha: commitSha, committedAt, title };
}

function getPendingCommits(lastCommitSha: string) {
  const hasAnchor = lastCommitSha && safeRunGit(["rev-parse", "--verify", lastCommitSha]);
  const raw = hasAnchor
    ? safeRunGit(["rev-list", "--reverse", `${lastCommitSha}..HEAD`])
    : safeRunGit(["rev-list", "--reverse", "HEAD"]);

  return raw
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(getCommit)
    .filter((entry): entry is CommitRecord => Boolean(entry));
}

function getChangedFiles(sha: string) {
  const raw = safeRunGit(["show", "--numstat", "--format=", "--no-renames", sha]);
  if (!raw) return [];
  return raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/u).slice(2).join(" ").replace(/\\/gu, "/"))
    .filter(Boolean);
}

function getDiffStats(sha: string) {
  const raw = safeRunGit(["show", "--numstat", "--format=", "--no-renames", sha]);
  if (!raw) return { raw: 0, effective: 0, excluded: 0 };

  let rawCount = 0;
  let effectiveCount = 0;
  let excludedCount = 0;
  const changedFiles = getChangedFiles(sha);
  const packageJsonChanged = changedFiles.includes("package.json");

  for (const line of raw.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
    const [addsRaw, delsRaw, ...fileRest] = line.split(/\s+/u);
    const filePath = fileRest.join(" ").replace(/\\/gu, "/");
    const adds = /^\d+$/u.test(addsRaw) ? Number(addsRaw) : 0;
    const dels = /^\d+$/u.test(delsRaw) ? Number(delsRaw) : 0;
    const change = adds + dels;
    rawCount += change;

    if (isReleaseGeneratedArtifactPath(filePath, packageJsonChanged)) {
      excludedCount += change;
      continue;
    }
    effectiveCount += change;
  }

  return { raw: rawCount, effective: effectiveCount, excluded: excludedCount };
}

function toUtc(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : nowIso();
}

function formatDate(iso: string) {
  return toUtc(iso).slice(0, 10);
}

function normalizeInternalReliabilityBullets(bullets: string[]) {
  if (bullets.length > 0) return bullets.slice(0, 5);
  return ["Improved behind-the-scenes reliability."];
}

function buildNoteFromCommit(commit: CommitRecord, previousVersion: string, previousCounter: number): PublicReleaseNote {
  const changedFiles = getChangedFiles(commit.sha);
  const descriptor = buildReleaseDescriptor([commit.title], changedFiles);
  const stats = getDiffStats(commit.sha);
  // [skip release-notes] commits are tracked internally but hidden from public notes.
  const hiddenFromPublic = /\[skip release-notes\]/iu.test(commit.title) || descriptor.hiddenFromPublic;
  const bumpType = hiddenFromPublic ? "none" : (stats.effective > 100 ? "minor" : "patch");
  const version = bumpType === "none" ? previousVersion : bumpVersion(previousVersion, bumpType);
  const category = classifyCategory(descriptor);
  const title = buildReleaseTitle(descriptor);
  const summary = buildReleaseSummary(descriptor);
  const generatedAt = nowIso();
  const committedAt = toUtc(commit.committedAt);
  const bullets = category === "Internal Reliability"
    ? ["Improved behind-the-scenes reliability."]
    : normalizeInternalReliabilityBullets(buildReleaseBullets(descriptor));

  return {
    version,
    previousVersion,
    betaReleaseCounter: previousCounter + (bumpType === "none" ? 0 : 1),
    previousBetaReleaseCounter: previousCounter,
    commitSha: commit.sha,
    commitTitle: commit.title,
    commitCount: 1,
    commitShas: [commit.sha],
    committedAt,
    generatedAt,
    committedAtUtc: committedAt,
    generatedAtUtc: generatedAt,
    updatedAtUtc: generatedAt,
    category,
    title,
    summary,
    userFacingTitle: title,
    surfaceCategory: descriptor.surfaceCategory,
    bullets,
    audience: descriptor.audience,
    technicalDetails: undefined,
    affectedSurfaces: descriptor.affectedSurfaces,
    hiddenFromPublic,
    changedFiles,
    effectiveChangeCount: stats.effective,
    excludedGeneratedChangeCount: stats.excluded,
    bumpType,
    sourceCommit: commit.sha,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(document, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n\nexport const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;\n`;
}

function renderChangelog(document: PublicReleaseNotesDocument) {
  const visible = document.notes.filter((note) => note.hiddenFromPublic !== true).slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const lines = [
    "# Changelog",
    "",
    "What’s new in KandyDrops Beta (latest first).",
    "",
    `Showing the last ${Math.min(PUBLIC_RELEASE_NOTES_MAX_COUNT, visible.length)} public updates in pages of ${PUBLIC_RELEASE_NOTES_PAGE_SIZE}.`,
    "",
  ];
  for (const note of visible) {
    lines.push(`## ${note.version} - ${formatDate(note.committedAtUtc || note.committedAt)}`);
    lines.push(`- ${note.title}`);
    for (const bullet of note.bullets.slice(0, 5)) lines.push(`- ${bullet}`);
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function writeIfChanged(filePath: string, content: string) {
  mkdirSync(dirname(filePath), { recursive: true });
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (current !== content) writeFileSync(filePath, content, "utf8");
}

function main() {
  const existing = readExistingDocument();
  const pending = getPendingCommits(existing.lastCommitSha);
  if (pending.length === 0) {
    console.log("No pending commits for release-note processing.");
    return;
  }

  let version = parseSemver(existing.currentVersion) ? existing.currentVersion : INITIAL_PUBLIC_VERSION;
  let counter = typeof existing.betaReleaseCounter === "number" ? existing.betaReleaseCounter : 0;
  const nextNotes = [...(existing.notes ?? [])];

  for (const commit of pending) {
    const note = buildNoteFromCommit(commit, version, counter);
    nextNotes.unshift(note);
    if (note.bumpType !== "none") {
      version = note.version;
      counter = note.betaReleaseCounter;
    }
  }

  const generatedAt = nowIso();
  const nextDocument: PublicReleaseNotesDocument = {
    currentVersion: version,
    betaReleaseCounter: counter,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt,
    generatedAtUtc: generatedAt,
    lastCommitSha: pending[pending.length - 1]?.sha ?? existing.lastCommitSha,
    notes: nextNotes.slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT),
  };

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextDocument));

  console.log(`Release notes updated to ${nextDocument.currentVersion} with ${pending.length} processed commits.`);
}

main();
