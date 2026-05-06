import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_MAX_COUNT,
  PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
  bumpPublicVersion,
  classifyPublicVersionBump,
  isReleaseGeneratedArtifactPath,
  type PublicReleaseBumpType,
  type PublicReleaseNote,
  type PublicReleaseNoteCategory,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

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
    const generatedAtUtc = new Date(0).toISOString();
    return {
      currentVersion: INITIAL_PUBLIC_VERSION,
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
  const raw = lastCommitSha && safeRunGit(["rev-parse", "--verify", lastCommitSha])
    ? safeRunGit(["rev-list", "--reverse", `${lastCommitSha}..HEAD`])
    : safeRunGit(["rev-parse", "HEAD"]);
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

function buildDiffStats(sha: string) {
  const stats = parseNumstat(sha);
  const packageJsonChanged = stats.some((item) => item.path === "package.json");
  const changedFiles = new Set(stats.map((item) => item.path));
  let rawAdditions = 0;
  let rawDeletions = 0;
  let effectiveAdditions = 0;
  let effectiveDeletions = 0;
  let excludedGeneratedChangeCount = 0;

  for (const item of stats) {
    const changeCount = item.additions + item.deletions;
    rawAdditions += item.additions;
    rawDeletions += item.deletions;

    if (isReleaseGeneratedArtifactPath(item.path, packageJsonChanged)) {
      excludedGeneratedChangeCount += changeCount;
      continue;
    }
    effectiveAdditions += item.additions;
    effectiveDeletions += item.deletions;
  }

  return {
    rawAdditions,
    rawDeletions,
    rawChangeCount: rawAdditions + rawDeletions,
    additions: rawAdditions,
    deletions: rawDeletions,
    effectiveAdditions,
    effectiveDeletions,
    changedFiles: changedFiles.size,
    effectiveChangeCount: effectiveAdditions + effectiveDeletions,
    excludedGeneratedChangeCount,
  };
}

function normalizeExistingNote(note: PublicReleaseNote): PublicReleaseNote {
  const diffStats = buildDiffStats(note.commitSha);
  const bumpType = classifyPublicVersionBump(diffStats.effectiveChangeCount);
  const committedAtUtc = toUtcIso(note.committedAtUtc ?? note.committedAt);
  const generatedAtUtc = toUtcIso(note.generatedAtUtc ?? note.generatedAt);

  return {
    ...note,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    diffStats,
    bumpType,
  };
}

function normalizeExistingDocument(document: PublicReleaseNotesDocument): PublicReleaseNotesDocument {
  const generatedAtUtc = toUtcIso(document.generatedAtUtc ?? document.generatedAt);

  return {
    ...document,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    notes: document.notes.map(normalizeExistingNote),
  };
}

function getChangedFiles(sha: string) {
  return parseNumstat(sha).map((item) => item.path);
}

function classifyCategory(title: string, changedFiles: string[]): PublicReleaseNoteCategory {
  const normalized = title.toLowerCase();
  if (/^(security|sec)(\(|:)/u.test(normalized)) return "Security";
  if (/^perf(\(|:)/u.test(normalized)) return "Performance";
  if (/^fix(\(|:)/u.test(normalized)) return "Fixed";
  if (/^feat(\(|:)/u.test(normalized)) return "Added";

  const touchesUserSurface = changedFiles.some((path) =>
    path.startsWith("src/app/")
    || path.startsWith("src/components/")
    || path.startsWith("src/hooks/")
    || path.startsWith("public/"),
  );

  if (/^(docs|chore|test)(\(|:)/u.test(normalized) && !touchesUserSurface) return "Internal";
  return "Changed";
}

function affectedSurfacesFor(paths: string[]) {
  const surfaces = new Set<string>();
  for (const path of paths) {
    if (path.includes("ReleaseNotes") || path.includes("release-notes") || path.includes("kandydrops-release-notes") || path === "CHANGELOG.md") surfaces.add("release-notes");
    if (path.includes("Navbar") || path.includes("Navigation/")) surfaces.add("navigation");
    if (path.includes("telemetry")) surfaces.add("telemetry");
    if (path.startsWith("docs/") || path === "README.md" || path === "AGENTS.md") surfaces.add("documentation");
    if (path.startsWith("scripts/") || path === "package.json" || path.startsWith(".github/")) surfaces.add("repo-tooling");
    if (path.includes("wallet") || path.includes("paypal")) surfaces.add("wallet");
    if (path.includes("chat")) surfaces.add("chat");
    if (path.includes("admin")) surfaces.add("admin");
    if (path.includes("security")) surfaces.add("security");
  }
  return surfaces.size > 0 ? Array.from(surfaces).sort() : ["app"];
}

function isInternalBetaStabilizationChange(title: string, surfaces: string[]) {
  const normalized = title.toLowerCase();
  const internalOnlyPrefixes = /^(docs|chore|test|audit)(\(|:)/u.test(normalized);
  const toolingOnly = surfaces.every((surface) =>
    ["documentation", "repo-tooling", "release-notes"].includes(surface),
  );

  return internalOnlyPrefixes && toolingOnly;
}

function shippedBetaBadgeFeature(title: string) {
  const normalized = title.toLowerCase();
  return normalized.includes("add beta release notes badge")
    || normalized.includes("beta release notes badge")
    || normalized.includes("public beta release notes badge");
}

function buildUserFacingTitle(title: string, category: PublicReleaseNoteCategory, surfaces: string[]) {
  const normalized = title.toLowerCase();
  if (normalized.includes("debug-first") || normalized.includes("stabilization roadmap") || normalized.includes("roadmap")) {
    return "Improved beta stabilization guidance so fixes stay focused and easier to track.";
  }
  if (normalized.includes("refresh system health truth") || normalized.includes("health reporting")) {
    return "Improved internal health reporting so beta issues show fresher, clearer status.";
  }
  if (normalized.includes("separate diagnostics sample freshness") || normalized.includes("diagnostics sample freshness")) {
    return "Improved internal diagnostics timing so health panels separate current issues from older samples.";
  }
  if (normalized.includes("clarify downstream writer freshness") || normalized.includes("downstream writer freshness")) {
    return "Improved internal health panels so writer freshness and repeated diagnostics are easier to read.";
  }
  if (normalized.includes("classify debug signals by severity") || normalized.includes("debug signals by severity")) {
    return "Improved internal debug status labels so inventory counts do not look like system failures.";
  }
  if (normalized.includes("clarify task issue attribution") || normalized.includes("task issue attribution")) {
    return "Improved internal task assignment diagnostics.";
  }
  if (normalized.includes("dedupe debug repair proposals") || normalized.includes("debug repair proposals")) {
    return "Improved internal repair proposal grouping so duplicate debug actions are easier to review.";
  }
  if (normalized.includes("refresh creator lane parity evidence") || normalized.includes("creator review status")) {
    return "Improved internal creator review status checks.";
  }
  if (normalized.includes("annotate missing id request history evidence") || normalized.includes("id request history")) {
    return "Improved internal creator review history checks.";
  }
  if (
    normalized.includes("downgrade optional owner override reason")
    || normalized.includes("owner override reason")
    || normalized.includes("admin override rules")
  ) {
    return "Adjusted internal creator review warnings to match admin override rules.";
  }
  if (
    normalized.includes("require default live creator settings")
    || normalized.includes("default live creator settings")
    || normalized.includes("creator experience defaults")
    || normalized.includes("synthetic creator default settings")
  ) {
    return "Improved internal creator experience defaults for beta reliability.";
  }
  if (
    normalized.includes("classify synthetic agreement evidence")
    || normalized.includes("classify synthetic countersign evidence")
    || normalized.includes("internal creator classification")
    || normalized.includes("synthetic agreement evidence")
    || normalized.includes("synthetic countersign evidence")
  ) {
    return "Improved internal creator classification checks.";
  }
  if (isInternalBetaStabilizationChange(title, surfaces)) {
    return "Improved internal beta reliability and support traceability.";
  }
  if (shippedBetaBadgeFeature(title)) {
    return "Added a Beta badge with app update notes in the top navigation.";
  }
  if (
    normalized.includes("verify media and firestore guard evidence")
    || normalized.includes("media and session safety checks")
  ) {
    return "Improved internal media and session safety checks.";
  }
  if (
    normalized.includes("guard creator id document egress")
    || (normalized.includes("creator id document") && normalized.includes("egress"))
    || (normalized.includes("creator verification") && normalized.includes("documents"))
  ) {
    return "Improved internal safety checks for creator verification documents.";
  }
  if (
    normalized.includes("guard creator agreement document egress")
    || (normalized.includes("creator agreement") && normalized.includes("document") && normalized.includes("egress"))
    || (normalized.includes("creator agreement") && normalized.includes("document safety"))
  ) {
    return "Improved safety checks for creator agreement document access.";
  }
  if (
    normalized.includes("prove admin content entitlement scope")
    || normalized.includes("protect locked content access")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("entitlement"))
  ) {
    return "Improved internal checks that protect locked content access.";
  }
  if (
    normalized.includes("guard admin content media egress")
    || normalized.includes("prevent unnecessary storage traffic")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("media egress"))
  ) {
    return "Improved internal media safety checks to prevent unnecessary storage traffic.";
  }
  if (
    normalized.includes("guard content storage route evidence")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("storage"))
  ) {
    return "Improved internal content safety checks for admin media tools.";
  }
  if (
    normalized.includes("refresh navigation session read bounds")
    || normalized.includes("navigation session read bounds")
    || normalized.includes("navigation session firestore read bounds")
    || normalized.includes("prove navigation session firestore read bounds")
    || (normalized.includes("auth") && normalized.includes("navigation session") && normalized.includes("firestore"))
  ) {
    return "Improved behind-the-scenes session safety checks.";
  }
  if (
    normalized.includes("make attachment cancel idempotent")
    || normalized.includes("refresh attachment cancel idempotency")
    || normalized.includes("attachment cancel idempotency")
    || normalized.includes("attachment cancel idempotent")
  ) {
    return "Improved reliability for canceling pending chat attachments.";
  }
  if (
    normalized.includes("bound attachment completion lookup")
    || (normalized.includes("chat") && normalized.includes("attachment") && normalized.includes("completion"))
  ) {
    return "Improved behind-the-scenes safety checks for chat media uploads.";
  }
  if (
    normalized.includes("bound attachment cancel lookup")
    || (normalized.includes("chat") && normalized.includes("attachment") && normalized.includes("cancel"))
  ) {
    return "Improved behind-the-scenes safety checks for chat attachments.";
  }
  if (surfaces.includes("release-notes")) {
    return "Improved Beta update notes so changes are easier to match with support reports.";
  }
  if (normalized.includes("chat")) {
    return "Improved chat spacing and stability for a cleaner mobile experience.";
  }
  if (normalized.includes("wallet") || normalized.includes("paypal")) {
    return "Improved wallet checkout clarity behind the scenes.";
  }
  if (category === "Security" || normalized.includes("security")) {
    return "Improved security checks behind the scenes.";
  }
  if (normalized.includes("admin")) {
    return "Improved internal admin tools used to keep beta features stable.";
  }
  if (normalized.includes("doctrine") || normalized.startsWith("docs")) {
    return "Updated internal product guidance so future fixes stay more consistent.";
  }
  if (category === "Fixed") return "Fixed a beta issue to make KandyDrops smoother to use.";
  if (category === "Performance") return "Improved app speed and reliability behind the scenes.";
  if (category === "Internal") return "Improved internal beta reliability.";
  return "Updated KandyDrops with a small beta improvement.";
}

function buildBullets(category: PublicReleaseNoteCategory, surfaces: string[]) {
  if (surfaces.includes("release-notes")) {
    return [
      "Beta notes stay user-safe while preserving enough detail for support follow-up.",
      "UTC timestamps make updates easier to compare with screenshots, reports, and incidents.",
    ];
  }
  if (category === "Security") return ["Improved security checks behind the scenes."];
  if (category === "Performance") return ["Reduced behind-the-scenes friction for a smoother beta."];
  if (category === "Internal") return ["Improved internal beta reliability without changing your core flows."];
  return ["Kept the update focused on user-visible polish and reliability."];
}

function createNote(commit: CommitRecord, previousVersion: string, isInitial: boolean): PublicReleaseNote {
  const changedFiles = getChangedFiles(commit.sha);
  const diffStats = buildDiffStats(commit.sha);
  const bumpType = classifyPublicVersionBump(diffStats.effectiveChangeCount);
  const nextVersion = isInitial ? INITIAL_PUBLIC_VERSION : bumpPublicVersion(previousVersion, bumpType);
  const category = classifyCategory(commit.title, changedFiles);
  const affectedSurfaces = affectedSurfacesFor(changedFiles);
  const committedAtUtc = toUtcIso(commit.committedAt);
  const generatedAtUtc = nowUtcIso();

  return {
    version: nextVersion,
    previousVersion,
    commitSha: commit.sha,
    commitTitle: commit.title,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    diffStats,
    bumpType: bumpType as PublicReleaseBumpType,
    category,
    userFacingTitle: buildUserFacingTitle(commit.title, category, affectedSurfaces),
    bullets: buildBullets(category, affectedSurfaces),
    affectedSurfaces,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  const fallbackDocument = {
    ...document,
    notes: document.notes.slice(0, PUBLIC_RELEASE_NOTES_VISIBLE_COUNT),
  };

  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(fallbackDocument, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n`;
}

function renderChangelog(notes: PublicReleaseNote[]) {
  const lines = ["# Changelog", "", "User-facing KandyDrops Beta updates, newest first.", ""];
  for (const note of notes) {
    const committedAtUtc = note.committedAtUtc ?? toUtcIso(note.committedAt);
    const date = committedAtUtc.slice(0, 10);
    lines.push(
      `## [${note.version}] - ${date}`,
      "",
      `### ${note.category}`,
      "",
      `- Updated ${formatUtcTimestamp(committedAtUtc)}`,
      `- ${note.userFacingTitle}`,
    );
    for (const bullet of note.bullets.slice(0, 3)) lines.push(`- ${bullet}`);
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
  const existing = normalizeExistingDocument(readExistingDocument());
  const pendingCommits = getPendingCommits(existing.lastCommitSha);
  if (pendingCommits.length === 0 && existsSync(publicJsonPath) && existsSync(fallbackTsPath) && existsSync(changelogPath)) {
    writeIfChanged(publicJsonPath, `${JSON.stringify(existing, null, 2)}\n`);
    writeIfChanged(fallbackTsPath, renderFallbackTs(existing));
    writeIfChanged(changelogPath, renderChangelog(existing.notes));
    console.log("Public release notes already current.");
    return;
  }

  let currentVersion = existing.currentVersion || INITIAL_PUBLIC_VERSION;
  const newNotes: PublicReleaseNote[] = [];
  for (const commit of pendingCommits) {
    const note = createNote(commit, currentVersion, existing.notes.length === 0 && newNotes.length === 0);
    currentVersion = note.version;
    newNotes.push(note);
  }

  const nextNotes = [...newNotes.reverse(), ...existing.notes].slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const generatedAtUtc = nowUtcIso();
  const nextDocument: PublicReleaseNotesDocument = {
    currentVersion,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    lastCommitSha: newNotes[0]?.commitSha ?? existing.lastCommitSha,
    notes: nextNotes,
  };

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextNotes));
  console.log(`Public release notes current at v${nextDocument.currentVersion}.`);
}

main();
