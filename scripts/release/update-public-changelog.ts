import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_MAX_COUNT,
  PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
  getPublicReleaseNotesVisibleNotes,
  resolveCurrentBetaReleaseCounter,
  type PublicReleaseNote,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";
import {
  buildReleaseBullets,
  buildReleaseDescriptor,
  buildReleaseSummary,
  buildReleaseTitle,
  buildTechnicalDetails,
  classifyCategory,
  ensureBulletVerb,
} from "../../src/lib/release-notes/release-note-classifier";
import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
};

const root = process.cwd();
const publicJsonPath = join(root, "public/kandydrops-release-notes.json");
const fallbackTsPath = join(root, "src/lib/release-notes/public-release-notes.ts");
const changelogPath = join(root, "CHANGELOG.md");
const acceptRelease = process.argv.includes("--accept") || process.env.PUBLIC_BETA_ACCEPT_RELEASE === "1";

function toUtcIso(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date(0).toISOString();
}

function nowUtcIso() {
  return new Date().toISOString();
}

function formatUtcTimestamp(value: string) {
  const date = new Date(toUtcIso(value));
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
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

function readExistingDocument(): PublicReleaseNotesDocument {
  if (!existsSync(publicJsonPath)) {
    const generatedAtUtc = nowUtcIso();
    return {
      currentVersion: CURRENT_BETA_RELEASE_VERSION,
      betaReleaseCounter: CURRENT_BETA_RELEASE_COUNTER,
      channel: PUBLIC_RELEASE_CHANNEL,
      generatedAt: generatedAtUtc,
      generatedAtUtc,
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
    : "";
  const shas = raw ? raw.split(/\r?\n/u).filter(Boolean) : [];

  return shas
    .map(getCommit)
    .filter((commit): commit is CommitRecord => Boolean(commit))
    .filter((commit) => !/\[skip release-notes\]/iu.test(commit.title));
}

function getChangedFiles(sha: string) {
  const raw = safeRunGit(["show", "--name-only", "--format=", "--no-renames", sha]);
  if (!raw) return [];

  return raw
    .split(/\r?\n/u)
    .map((path) => path.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function normalizeExistingNote(
  note: PublicReleaseNote,
  index: number,
  currentCounter: number,
): PublicReleaseNote {
  const betaReleaseCounter = typeof note.betaReleaseCounter === "number"
    ? note.betaReleaseCounter
    : Math.max(currentCounter - index, 0);
  const previousBetaReleaseCounter = betaReleaseCounter > 0 ? betaReleaseCounter - 1 : null;
  const version = formatBetaOdometerVersion(betaReleaseCounter);
  const previousVersion = previousBetaReleaseCounter === null
    ? INITIAL_PUBLIC_VERSION
    : formatBetaOdometerVersion(previousBetaReleaseCounter);
  const commitShas = Array.isArray(note.commitShas) && note.commitShas.length > 0
    ? note.commitShas
    : [note.commitSha].filter(Boolean);
  const commitCount = typeof note.commitCount === "number" && note.commitCount > 0
    ? note.commitCount
    : commitShas.length || 1;
  const commits = commitShas
    .map(getCommit)
    .filter((commit): commit is CommitRecord => Boolean(commit));
  const descriptor = buildReleaseDescriptor(
    commits.map((commit) => commit.title),
    commits.flatMap((commit) => getChangedFiles(commit.sha)),
  );
  const committedAtUtc = toUtcIso(note.committedAtUtc ?? note.committedAt);
  const generatedAtUtc = toUtcIso(note.generatedAtUtc ?? note.generatedAt);
  const title = buildReleaseTitle(descriptor);

  return {
    ...note,
    version,
    previousVersion,
    betaReleaseCounter,
    previousBetaReleaseCounter,
    commitCount,
    commitShas,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    updatedAtUtc: note.updatedAtUtc || generatedAtUtc,
    category: classifyCategory(descriptor),
    title,
    summary: buildReleaseSummary(descriptor),
    userFacingTitle: title,
    surfaceCategory: descriptor.surfaceCategory,
    bullets: buildReleaseBullets(descriptor).map(ensureBulletVerb).slice(0, 5),
    audience: descriptor.audience,
    technicalDetails: buildTechnicalDetails(descriptor, commitCount),
    affectedSurfaces: descriptor.affectedSurfaces,
    hiddenFromPublic: descriptor.hiddenFromPublic,
  };
}

function normalizeExistingDocument(document: PublicReleaseNotesDocument): PublicReleaseNotesDocument {
  const currentCounter = resolveCurrentBetaReleaseCounter(document.betaReleaseCounter ?? document.currentVersion);
  const generatedAtUtc = toUtcIso(document.generatedAtUtc ?? document.generatedAt);
  const notes = (document.notes ?? [])
    .slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT)
    .map((note, index) => normalizeExistingNote(note, index, currentCounter));

  return {
    currentVersion: formatBetaOdometerVersion(currentCounter),
    betaReleaseCounter: currentCounter,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    lastCommitSha: document.lastCommitSha ?? "",
    notes,
  };
}

function createAggregatedNote(commits: CommitRecord[], previousCounter: number): PublicReleaseNote {
  const latestCommit = commits[commits.length - 1];
  const commitShas = commits.map((commit) => commit.sha);
  const descriptor = buildReleaseDescriptor(
    commits.map((commit) => commit.title),
    commits.flatMap((commit) => getChangedFiles(commit.sha)),
  );
  const nextCounter = previousCounter + 1;
  const generatedAtUtc = nowUtcIso();
  const title = buildReleaseTitle(descriptor);

  return {
    version: getNextBetaOdometerVersion(previousCounter),
    previousVersion: formatBetaOdometerVersion(previousCounter),
    betaReleaseCounter: nextCounter,
    previousBetaReleaseCounter: previousCounter,
    commitSha: latestCommit.sha,
    commitTitle: latestCommit.title,
    commitCount: commits.length,
    commitShas,
    committedAt: toUtcIso(latestCommit.committedAt),
    generatedAt: generatedAtUtc,
    committedAtUtc: toUtcIso(latestCommit.committedAt),
    generatedAtUtc,
    category: classifyCategory(descriptor),
    title,
    updatedAtUtc: generatedAtUtc,
    summary: buildReleaseSummary(descriptor),
    userFacingTitle: title,
    surfaceCategory: descriptor.surfaceCategory,
    bullets: buildReleaseBullets(descriptor).map(ensureBulletVerb).slice(0, 5),
    audience: descriptor.audience,
    technicalDetails: buildTechnicalDetails(descriptor, commits.length),
    affectedSurfaces: descriptor.affectedSurfaces,
    hiddenFromPublic: descriptor.hiddenFromPublic,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(document, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n\nexport const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;\n`;
}

function renderChangelog(notes: PublicReleaseNote[]) {
  const visibleNotes = getPublicReleaseNotesVisibleNotes(notes, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const lines = ["# Changelog", "", "User-facing KandyDrops Beta updates, newest first.", ""];
  for (const note of visibleNotes) {
    const committedAtUtc = note.committedAtUtc ?? toUtcIso(note.committedAt);
    const date = committedAtUtc.slice(0, 10);
    lines.push(
      `## [${note.version}] - ${date}`,
      "",
      `### ${note.surfaceCategory}`,
      "",
      `- Updated ${formatUtcTimestamp(note.updatedAtUtc || committedAtUtc)}`,
      `- ${note.title || note.userFacingTitle}`,
      `- ${note.summary}`,
    );
    for (const bullet of note.bullets.slice(0, 5)) lines.push(`- ${bullet}`);
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function renderReleaseVersionContract(nextCounter: number) {
  const source = readFileSync(join(root, "src/lib/release-notes/release-version-contract.ts"), "utf8");
  const nextVersion = formatBetaOdometerVersion(nextCounter);

  const withCounter = source.replace(
    /export const CURRENT_BETA_RELEASE_COUNTER = \d+;/u,
    `export const CURRENT_BETA_RELEASE_COUNTER = ${nextCounter};`,
  );
  const withVersion = withCounter.replace(
    /export const CURRENT_BETA_RELEASE_VERSION = .*?;/u,
    `export const CURRENT_BETA_RELEASE_VERSION = "${nextVersion}";`,
  );

  return withVersion;
}

function writeIfChanged(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (current !== content) writeFileSync(path, content);
}

function main() {
  const normalizedExisting = normalizeExistingDocument(readExistingDocument());
  const pendingCommits = getPendingCommits(normalizedExisting.lastCommitSha);
  let nextDocument = normalizedExisting;

  if (acceptRelease && pendingCommits.length > 0) {
    const nextDescriptor = buildReleaseDescriptor(
      pendingCommits.map((commit) => commit.title),
      pendingCommits.flatMap((commit) => getChangedFiles(commit.sha)),
    );
    if (nextDescriptor.hiddenFromPublic) {
      console.log("No product-facing unreleased commits found for an accepted beta release.");
    } else {
      const nextNote = createAggregatedNote(pendingCommits, normalizedExisting.betaReleaseCounter);
      const generatedAtUtc = nowUtcIso();
      nextDocument = {
        currentVersion: nextNote.version,
        betaReleaseCounter: nextNote.betaReleaseCounter,
        channel: PUBLIC_RELEASE_CHANNEL,
        generatedAt: generatedAtUtc,
        generatedAtUtc,
        lastCommitSha: nextNote.commitSha,
        notes: [nextNote, ...normalizedExisting.notes].slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT),
      };
    }
  } else if (acceptRelease && pendingCommits.length === 0) {
    console.log("No unreleased commits found for an accepted beta release.");
  } else {
    console.log("Release notes normalized without creating a new accepted beta release. Pass --accept or PUBLIC_BETA_ACCEPT_RELEASE=1 to publish the next beta release.");
  }

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextDocument.notes));
  if (acceptRelease && nextDocument.betaReleaseCounter !== CURRENT_BETA_RELEASE_COUNTER) {
    writeIfChanged(
      join(root, "src/lib/release-notes/release-version-contract.ts"),
      renderReleaseVersionContract(nextDocument.betaReleaseCounter),
    );
  }
  console.log(`Public release notes current at v${nextDocument.currentVersion} (counter ${nextDocument.betaReleaseCounter}).`);
}

main();
