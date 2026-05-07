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
  isReleaseGeneratedArtifactPath,
  resolveCurrentBetaReleaseCounter,
  type PublicReleaseAudience,
  type PublicReleaseNote,
  type PublicReleaseNoteCategory,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";
import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
};

type NumstatRecord = {
  additions: number;
  deletions: number;
  path: string;
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

function parseNumstat(sha: string): NumstatRecord[] {
  const raw = safeRunGit(["show", "--numstat", "--format=", "--no-renames", sha]);
  if (!raw) return [];

  return raw.split(/\r?\n/u).flatMap((line) => {
    const [rawAdditions, rawDeletions, ...pathParts] = line.split(/\t/u);
    const path = pathParts.join("\t");
    if (!path) return [];

    return [{
      additions: Number.parseInt(rawAdditions, 10) || 0,
      deletions: Number.parseInt(rawDeletions, 10) || 0,
      path: path.replace(/\\/gu, "/"),
    }];
  });
}

function getChangedFiles(sha: string) {
  return parseNumstat(sha).map((item) => item.path);
}

function affectedSurfacesFor(paths: string[]) {
  const surfaces = new Set<string>();
  for (const path of paths) {
    if (path.includes("ReleaseNotes") || path.includes("release-notes") || path.includes("kandydrops-release-notes") || path === "CHANGELOG.md") surfaces.add("release-notes");
    if (path.includes("Navbar") || path.includes("Navigation/")) surfaces.add("navigation");
    if (path.includes("telemetry")) surfaces.add("telemetry");
    if (path.startsWith("docs/") || path === "README.md" || path === "AGENTS.md") surfaces.add("documentation");
    if (path.startsWith("scripts/") || path === "package.json" || path.startsWith(".github/") || path.startsWith("cloudbuild")) surfaces.add("repo-tooling");
    if (path.includes("wallet") || path.includes("paypal")) surfaces.add("wallet");
    if (path.includes("chat")) surfaces.add("chat");
    if (path.includes("admin")) surfaces.add("admin");
    if (path.includes("security")) surfaces.add("security");
  }
  return surfaces.size > 0 ? Array.from(surfaces).sort() : ["app"];
}

function resolveAudience(titles: string[], surfaces: string[]): PublicReleaseAudience {
  const normalized = titles.join(" ").toLowerCase();
  if (surfaces.includes("admin") || normalized.includes("admin") || normalized.includes("debug")) return "admins";
  if (surfaces.includes("wallet") || surfaces.includes("chat") || surfaces.includes("navigation")) return "users";
  if (normalized.includes("creator")) return "creators";
  return "all";
}

function buildReleaseTitle(titles: string[], surfaces: string[], audience: PublicReleaseAudience) {
  const normalized = titles.join(" ").toLowerCase();
  if (surfaces.includes("release-notes")) return "Improved Beta update notes";
  if (audience === "admins") {
    if (normalized.includes("viewer") || normalized.includes("watch")) return "Improved viewer analytics";
    if (normalized.includes("transaction") || normalized.includes("commerce")) return "Improved transaction review";
    if (normalized.includes("drop")) return "Improved drop conversion review";
    return "Improved admin reliability and status accuracy";
  }
  if (surfaces.includes("chat")) return "Improved chat reliability";
  if (surfaces.includes("wallet")) return "Improved wallet reliability";
  return "Bug fixes and quality-of-life improvements";
}

function buildReleaseSummary(surfaces: string[], audience: PublicReleaseAudience) {
  if (surfaces.includes("release-notes")) {
    return "Cleaner Beta update notes with clearer summaries and timestamps.";
  }
  if (audience === "admins") {
    return "Bug fixes and quality-of-life improvements for admin review tools.";
  }
  return "Bug fixes and quality-of-life improvements.";
}

function ensureBulletVerb(value: string) {
  const trimmed = value.trim().replace(/\.$/u, "");
  if (/^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u.test(trimmed)) {
    return `${trimmed}.`;
  }
  return `Improved ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

function buildReleaseBullets(titles: string[], surfaces: string[], audience: PublicReleaseAudience) {
  const normalized = titles.join(" ").toLowerCase();

  if (surfaces.includes("release-notes")) {
    return [
      "Improved Beta notes with cleaner summaries and compact bullets.",
      "Updated timestamps so recent changes are easier to compare with reports.",
      "Reduced technical wording in public update notes.",
    ];
  }

  if (audience === "admins") {
    if (normalized.includes("viewer") || normalized.includes("watch")) {
      return [
        "Clarified verified and estimated viewer watch time.",
        "Improved stale and quiet viewer activity labels.",
        "Updated viewer rows to use readable names where available.",
      ];
    }

    if (normalized.includes("transaction") || normalized.includes("commerce")) {
      return [
        "Added clearer names to recent transaction rows.",
        "Improved GumDrops transaction labels and timestamps for admin review.",
        "Clarified unavailable commerce details instead of showing waiting states.",
      ];
    }

    return [
      "Fixed admin labels that could appear stuck after data loaded.",
      "Improved how hidden, delayed, or unavailable data is labeled.",
      "Reduced confusing status messages in Beta admin tools.",
    ];
  }

  if (surfaces.includes("chat")) {
    return [
      "Fixed chat spacing so messages stay easier to read on mobile.",
      "Improved the composer area so state changes feel more stable.",
    ];
  }

  return [
    "Fixed beta issues to make KandyDrops smoother to use.",
    "Improved reliability for the latest Beta build.",
  ];
}

function buildTechnicalDetails(commitCount: number, titles: string[], surfaces: string[]) {
  const details: string[] = [];

  if (commitCount > 1) {
    details.push(`Grouped ${commitCount} commits into one accepted beta release.`);
  }

  if (surfaces.includes("release-notes")) {
    details.push("Release note summaries remain separate from collapsed technical details.");
  }

  if (titles.join(" ").toLowerCase().includes("unlock")) {
    details.push("Display language uses unwrap; backend entitlement fields may still use unlock.");
  }

  return details.length > 0 ? details : undefined;
}

function classifyCategory(titles: string[], surfaces: string[]): PublicReleaseNoteCategory {
  const normalized = titles.join(" ").toLowerCase();
  if (normalized.includes("security")) return "Security";
  if (surfaces.includes("release-notes")) return "Fixed";
  if (normalized.includes("feat(") || normalized.includes("feat:")) return "New";
  if (normalized.includes("perf(") || normalized.includes("perf:")) return "Improved";
  if (normalized.includes("admin")) return "Admin";
  return "Fixed";
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
  const committedAtUtc = toUtcIso(note.committedAtUtc ?? note.committedAt);
  const generatedAtUtc = toUtcIso(note.generatedAtUtc ?? note.generatedAt);

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
  const titles = commits.map((commit) => commit.title);
  const allChangedFiles = Array.from(new Set(commits.flatMap((commit) => getChangedFiles(commit.sha))));
  const packageJsonChanged = allChangedFiles.includes("package.json");
  const relevantChangedFiles = allChangedFiles.filter((path) => !isReleaseGeneratedArtifactPath(path, packageJsonChanged));
  const affectedSurfaces = affectedSurfacesFor(relevantChangedFiles);
  const audience = resolveAudience(titles, affectedSurfaces);
  const nextCounter = previousCounter + 1;
  const generatedAtUtc = nowUtcIso();

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
    category: classifyCategory(titles, affectedSurfaces),
    title: buildReleaseTitle(titles, affectedSurfaces, audience),
    updatedAtUtc: generatedAtUtc,
    summary: buildReleaseSummary(affectedSurfaces, audience),
    userFacingTitle: buildReleaseTitle(titles, affectedSurfaces, audience),
    bullets: buildReleaseBullets(titles, affectedSurfaces, audience).map(ensureBulletVerb).slice(0, 5),
    audience,
    technicalDetails: buildTechnicalDetails(commits.length, titles, affectedSurfaces),
    affectedSurfaces,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  const fallbackDocument = {
    ...document,
    notes: document.notes.slice(0, PUBLIC_RELEASE_NOTES_VISIBLE_COUNT),
  };

  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(fallbackDocument, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n\nexport const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;\n`;
}

function renderChangelog(notes: PublicReleaseNote[]) {
  const lines = ["# Changelog", "", "User-facing KandyDrops Beta updates, newest first.", ""];
  for (const note of notes.slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT)) {
    const committedAtUtc = note.committedAtUtc ?? toUtcIso(note.committedAt);
    const date = committedAtUtc.slice(0, 10);
    lines.push(
      `## [${note.version}] - ${date}`,
      "",
      `### ${note.category}`,
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
  } else if (acceptRelease && pendingCommits.length === 0) {
    console.log("No unreleased commits found for an accepted beta release.");
  } else {
    console.log("Release notes normalized without creating a new accepted beta release. Pass --accept or PUBLIC_BETA_ACCEPT_RELEASE=1 to publish the next beta release.");
  }

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextDocument.notes));
  console.log(`Public release notes current at v${nextDocument.currentVersion} (counter ${nextDocument.betaReleaseCounter}).`);
}

main();
