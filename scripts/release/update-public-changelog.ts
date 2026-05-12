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
} from "../../src/lib/release-notes/release-version-contract";
import { formatBetaOdometerVersion, parseBetaOdometerVersion } from "../../src/lib/release-notes/beta-odometer-version";
import {
  buildReleaseBullets,
  buildReleaseDescriptor,
  buildReleaseSummary,
  buildReleaseTitle,
  classifyCategory,
  getEffectiveChangedFiles,
} from "../../src/lib/release-notes/release-note-classifier";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
  changedFiles: string[];
};

const root = process.cwd();
const publicJsonPath = join(root, "public/kandydrops-release-notes.json");
const fallbackTsPath = join(root, "src/lib/release-notes/public-release-notes.ts");
const changelogPath = join(root, "CHANGELOG.md");
const contractPath = join(root, "src/lib/release-notes/release-version-contract.ts");

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

function isAcceptRequested() {
  return process.env.PUBLIC_BETA_ACCEPT_RELEASE === "1" || process.argv.includes("--accept");
}

function readExistingDocument(): PublicReleaseNotesDocument {
  if (!existsSync(publicJsonPath)) {
    const now = nowIso();
    return {
      currentVersion: INITIAL_PUBLIC_VERSION,
      betaReleaseCounter: parseBetaOdometerVersion(INITIAL_PUBLIC_VERSION)?.counter ?? 0,
      channel: PUBLIC_RELEASE_CHANNEL,
      generatedAt: now,
      generatedAtUtc: now,
      lastCommitSha: "",
      notes: [],
    };
  }

  return JSON.parse(readFileSync(publicJsonPath, "utf8")) as PublicReleaseNotesDocument;
}

function getChangedFiles(sha: string) {
  const raw = safeRunGit(["show", "--name-only", "--format=", "--no-renames", sha]);
  if (!raw) return [];
  return raw
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function getCommit(sha: string): CommitRecord | null {
  const raw = safeRunGit(["show", "-s", "--format=%H%x00%cI%x00%s", sha]);
  if (!raw) return null;
  const [commitSha, committedAt, title] = raw.split("\u0000");
  if (!commitSha || !committedAt || !title) return null;
  return { sha: commitSha, committedAt, title, changedFiles: getChangedFiles(commitSha) };
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

function isReleaseArtifactOnlyCommit(commit: CommitRecord) {
  const releaseArtifactPaths = new Set([
    "CHANGELOG.md",
    "public/kandydrops-release-notes.json",
    "src/lib/release-notes/public-release-notes.ts",
    "src/lib/release-notes/release-version-contract.ts",
  ]);

  return commit.changedFiles.length > 0 && commit.changedFiles.every((path) => releaseArtifactPaths.has(path));
}

function getAcceptedPatchCommits(commits: CommitRecord[]) {
  return commits.filter((commit) => !/\[skip release-notes\]/iu.test(commit.title) && !isReleaseArtifactOnlyCommit(commit));
}

function toUtc(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : nowIso();
}

function formatDate(iso: string) {
  return toUtc(iso).slice(0, 10);
}

function normalizeCounter(document: PublicReleaseNotesDocument) {
  if (typeof document.betaReleaseCounter === "number" && Number.isInteger(document.betaReleaseCounter)) {
    return document.betaReleaseCounter;
  }

  return parseBetaOdometerVersion(document.currentVersion)?.counter
    ?? parseBetaOdometerVersion(INITIAL_PUBLIC_VERSION)?.counter
    ?? 0;
}

function normalizeVersion(document: PublicReleaseNotesDocument, counter: number) {
  const parsed = parseBetaOdometerVersion(document.currentVersion);
  return parsed?.counter === counter ? document.currentVersion : formatBetaOdometerVersion(counter);
}

function normalizeBullets(bullets: string[], fallback: string[]) {
  const next = bullets.length > 0 ? bullets : fallback;
  return next.slice(0, 5);
}

function buildInternalPhaseOneBullets() {
  return [
    "Improved internal beta reliability.",
    "Updated the latest Beta build with behind-the-scenes fixes.",
  ];
}

function buildAcceptedPatchCopy(titles: string[], changedFiles: string[], descriptor: ReturnType<typeof buildReleaseDescriptor>, userFacing: boolean) {
  if (!userFacing) {
    return {
      title: "Bug fixes and general improvements",
      summary: "Bug fixes and general improvements.",
      surfaceCategory: "App experience" as const,
      bullets: buildInternalPhaseOneBullets(),
    };
  }

  const normalized = `${titles.join(" ")} ${changedFiles.join(" ")}`.toLowerCase();
  const mixedPhaseOneBatch = descriptor.affectedSurfaces.length > 2
    || /\b(analytics|readiness|launch|evidence|score|hardening)\b/u.test(normalized);

  if (mixedPhaseOneBatch) {
    return {
      title: "Bug fixes and general improvements",
      summary: "Bug fixes and reliability improvements for chat, Beta readiness, and behind-the-scenes analytics.",
      surfaceCategory: "App experience" as const,
      bullets: [
        "Improved chat media sizing and message-thread scrolling.",
        "Improved guest analytics and admin truth checks behind the scenes.",
        "Updated Beta readiness evidence so stale or missing launch evidence stays visible.",
      ],
    };
  }

  return {
    title: buildReleaseTitle(descriptor),
    summary: buildReleaseSummary(descriptor),
    surfaceCategory: descriptor.surfaceCategory,
    bullets: normalizeBullets(buildReleaseBullets(descriptor), buildInternalPhaseOneBullets()),
  };
}

function buildAcceptedPatchBatchNote(
  commits: CommitRecord[],
  previousVersion: string,
  previousCounter: number,
): PublicReleaseNote {
  const titles = commits.map((commit) => commit.title);
  const changedFiles = Array.from(new Set(commits.flatMap((commit) => commit.changedFiles))).sort();
  const descriptor = buildReleaseDescriptor(titles, changedFiles);
  const { productFacingFiles } = getEffectiveChangedFiles(changedFiles);
  const userFacing = productFacingFiles.length > 0 && descriptor.userFacing;
  const generatedAt = nowIso();
  const lastCommit = commits[commits.length - 1];
  const nextCounter = previousCounter + 1;
  const nextVersion = formatBetaOdometerVersion(nextCounter);
  const copy = buildAcceptedPatchCopy(titles, changedFiles, descriptor, userFacing);

  return {
    version: nextVersion,
    previousVersion,
    betaReleaseCounter: nextCounter,
    previousBetaReleaseCounter: previousCounter,
    commitSha: lastCommit.sha,
    commitTitle: lastCommit.title,
    commitCount: commits.length,
    commitShas: commits.map((commit) => commit.sha),
    committedAt: toUtc(lastCommit.committedAt),
    generatedAt,
    committedAtUtc: toUtc(lastCommit.committedAt),
    generatedAtUtc: generatedAt,
    updatedAtUtc: generatedAt,
    category: userFacing ? classifyCategory(descriptor) : "Fixed",
    title: copy.title,
    summary: copy.summary,
    userFacingTitle: copy.title,
    surfaceCategory: copy.surfaceCategory,
    bullets: copy.bullets,
    audience: userFacing ? descriptor.audience : "all",
    technicalDetails: commits.length > 1 ? [`Grouped ${commits.length} commits into one accepted patch batch.`] : undefined,
    affectedSurfaces: userFacing ? descriptor.affectedSurfaces : ["app"],
    hiddenFromPublic: false,
    changedFiles,
    sourceCommit: lastCommit.sha,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(document, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n\nexport const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;\n`;
}

function renderReleaseVersionContract(document: PublicReleaseNotesDocument) {
  const current = existsSync(contractPath) ? readFileSync(contractPath, "utf8") : "";
  return current
    .replace(/export const PUBLIC_RELEASE_VERSION_SHAPE = "[^"]+";/u, 'export const PUBLIC_RELEASE_VERSION_SHAPE = "BETA_ODOMETER";')
    .replace(/export const CURRENT_BETA_RELEASE_COUNTER = \d+;/u, `export const CURRENT_BETA_RELEASE_COUNTER = ${document.betaReleaseCounter};`)
    .replace(/export const CURRENT_BETA_RELEASE_VERSION = "[^"]+";/u, `export const CURRENT_BETA_RELEASE_VERSION = "${document.currentVersion}";`);
}

function renderChangelog(document: PublicReleaseNotesDocument) {
  const visible = document.notes.filter((note) => note.hiddenFromPublic !== true).slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const lines = [
    "# Changelog",
    "",
    "What's new in KandyDrops Beta (latest first).",
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

function writeReleaseArtifacts(document: PublicReleaseNotesDocument) {
  writeIfChanged(publicJsonPath, `${JSON.stringify(document, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(document));
  writeIfChanged(changelogPath, renderChangelog(document));
  writeIfChanged(contractPath, renderReleaseVersionContract(document));
}

function main() {
  const existing = readExistingDocument();
  const pending = getPendingCommits(existing.lastCommitSha);
  const acceptedPatchCommits = getAcceptedPatchCommits(pending);
  const counter = normalizeCounter(existing);
  const version = normalizeVersion(existing, counter);

  if (!isAcceptRequested()) {
    writeReleaseArtifacts({ ...existing, currentVersion: version, betaReleaseCounter: counter });
    if (acceptedPatchCommits.length > 0) {
      console.log(`Pending accepted-patch candidates detected: ${acceptedPatchCommits.length}. Run npm run release:notes:accept to publish the next Beta badge note.`);
    } else {
      console.log("Release notes normalized with no pending accepted-patch candidates.");
    }
    return;
  }

  if (acceptedPatchCommits.length === 0) {
    writeReleaseArtifacts({ ...existing, currentVersion: version, betaReleaseCounter: counter });
    console.log("No product-facing unreleased commits found for an accepted beta release.");
    return;
  }

  const note = buildAcceptedPatchBatchNote(acceptedPatchCommits, version, counter);
  const generatedAt = nowIso();
  const nextDocument: PublicReleaseNotesDocument = {
    currentVersion: note.version,
    betaReleaseCounter: note.betaReleaseCounter,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt,
    generatedAtUtc: generatedAt,
    lastCommitSha: note.commitSha,
    notes: [note, ...(existing.notes ?? [])].slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT),
  };

  writeReleaseArtifacts(nextDocument);

  console.log(`Accepted Beta badge release ${nextDocument.currentVersion} with ${acceptedPatchCommits.length} commits.`);
}

main();
