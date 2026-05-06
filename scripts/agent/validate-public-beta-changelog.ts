import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  bumpPublicVersion,
  classifyPublicVersionBump,
  comparePublicVersions,
  getPublicReleaseNotesVisibleNotes,
  isReleaseGeneratedArtifactPath,
  isValidPublicVersion,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson<T>(relativePath: string): T | null {
  const source = readRequired(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateDocument(document: PublicReleaseNotesDocument | null) {
  if (!document) return;
  if (document.channel !== PUBLIC_RELEASE_CHANNEL) failures.push("public release notes channel must be beta.");
  if (!isValidPublicVersion(document.currentVersion)) failures.push("currentVersion must be MAJOR.MINOR.PATCH.");
  if (comparePublicVersions(document.currentVersion, INITIAL_PUBLIC_VERSION) < 0) {
    failures.push("currentVersion must start at or above 1.0.0.");
  }
  const major = Number(document.currentVersion.split(".")[0]);
  if (major > 1) failures.push("major version must not auto-increment above 1 without an explicit allowMajorVersionBump gate.");
  if (!Array.isArray(document.notes)) failures.push("notes must be an array.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(document.generatedAtUtc)) {
    failures.push("document.generatedAtUtc must be a full ISO UTC timestamp ending in Z.");
  }

  for (const [index, note] of document.notes.entries()) {
    for (const field of ["version", "previousVersion", "commitSha", "commitTitle", "committedAt", "generatedAt", "committedAtUtc", "generatedAtUtc", "updatedAtUtc", "category", "title", "summary", "userFacingTitle", "audience"] as const) {
      if (typeof note[field] !== "string" || note[field].trim().length === 0) {
        failures.push(`notes[${index}].${field} must be non-empty.`);
      }
    }
    for (const field of ["committedAtUtc", "generatedAtUtc", "updatedAtUtc"] as const) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(note[field])) {
        failures.push(`notes[${index}].${field} must be a full ISO UTC timestamp ending in Z.`);
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/u.test(note.committedAt) || /^\d{4}-\d{2}-\d{2}$/u.test(note.generatedAt)) {
      failures.push(`notes[${index}] must not store date-only timestamps.`);
    }
    if (!Array.isArray(note.bullets) || note.bullets.length < 2 || note.bullets.length > 5) {
      failures.push(`notes[${index}].bullets must include 2-5 App Store-style bullets.`);
    }
    for (const bullet of note.bullets ?? []) {
      if (!/^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u.test(bullet)) {
        failures.push(`notes[${index}] bullet must start with an approved verb: ${bullet}`);
      }
    }
    if (/Kept the update focused on user-visible polish and reliability/iu.test(note.bullets.join(" "))) {
      failures.push(`notes[${index}] must not use the generic release-note placeholder.`);
    }
    if (!Array.isArray(note.affectedSurfaces) || note.affectedSurfaces.length === 0) {
      failures.push(`notes[${index}].affectedSurfaces must be non-empty.`);
    }
    if (!note.diffStats) {
      failures.push(`notes[${index}].diffStats must exist.`);
      continue;
    }
    if (note.diffStats.additions !== note.diffStats.rawAdditions || note.diffStats.deletions !== note.diffStats.rawDeletions) {
      failures.push(`notes[${index}].diffStats additions/deletions must store raw Git stats for debug.`);
    }
    if (note.diffStats.rawChangeCount !== note.diffStats.rawAdditions + note.diffStats.rawDeletions) {
      failures.push(`notes[${index}].diffStats rawChangeCount must equal raw additions + deletions.`);
    }
    if (note.diffStats.effectiveChangeCount !== note.diffStats.effectiveAdditions + note.diffStats.effectiveDeletions) {
      failures.push(`notes[${index}].diffStats effective count must equal effective additions + deletions after exclusions.`);
    }
    if (note.diffStats.rawChangeCount !== note.diffStats.effectiveChangeCount + note.diffStats.excludedGeneratedChangeCount) {
      failures.push(`notes[${index}].diffStats raw count must reconcile to effective + excluded generated changes.`);
    }
    if (note.bumpType !== classifyPublicVersionBump(note.diffStats.effectiveChangeCount)) {
      failures.push(`notes[${index}].bumpType must be based on effectiveChangeCount, not raw additions/deletions.`);
    }
    const publicCopy = `${note.title} ${note.summary} ${note.userFacingTitle} ${note.bullets.join(" ")}`;
    if (/src\/|scripts\/|agent\/state|\.tsx|\.ts\b|commit\b|route runtime|telemetry parity|validator|sourceTruth|Firestore|generatedAt|materializer|canonical|stale sample/iu.test(publicCopy)) {
      failures.push(`notes[${index}] public copy must not expose raw technical jargon.`);
    }
    if (note.technicalDetails?.length && !Array.isArray(note.technicalDetails)) {
      failures.push(`notes[${index}].technicalDetails must be an array when present.`);
    }
  }

  const latestTitle = git(["log", "-1", "--format=%s"]);
  const latestSha = git(["rev-parse", "HEAD"]);
  if (latestTitle && !/\[skip release-notes\]/iu.test(latestTitle) && !document.notes.some((note) => note.commitSha === latestSha)) {
    failures.push("last git commit must be represented in public release notes unless it includes [skip release-notes].");
  }
  if (latestTitle && /\[skip release-notes\]/iu.test(latestTitle)) {
    const previousSha = git(["rev-list", "-n", "1", "HEAD^", "--grep=\\[skip release-notes\\]", "--invert-grep", "--regexp-ignore-case"]);
    if (previousSha && !document.notes.some((note) => note.commitSha === previousSha)) {
      failures.push("previous non-skip commit must be represented when the latest commit skips release notes.");
    }
  }

  const visibleNotes = getPublicReleaseNotesVisibleNotes(document.notes);
  const drawer = readRequired("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
  if (visibleNotes.length === 0) requireIncludes(drawer, "No beta updates have been published yet.", "Beta release notes drawer");
}

const betaBadge = readRequired("src/components/ReleaseNotes/BetaBadge.tsx");
const drawer = readRequired("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
const hook = readRequired("src/hooks/usePublicReleaseNotes.ts");
const navbar = readRequired("src/components/Navbar.tsx");
const publicNotesTs = readRequired("src/lib/release-notes/public-release-notes.ts");
const contract = readRequired("src/lib/release-notes/release-version-contract.ts");
const releaseScript = readRequired("scripts/release/update-public-changelog.ts");
const validatorScript = readRequired("scripts/agent/validate-public-beta-changelog.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const docs = readRequired("docs/agent-truth/public-beta-release-notes.md");
const changelog = readRequired("CHANGELOG.md");
const ciWorkflow = readRequired(".github/workflows/ci.yml");
const releaseWorkflow = readRequired(".github/workflows/public-release-notes.yml");
const document = readJson<PublicReleaseNotesDocument>("public/kandydrops-release-notes.json");

validateDocument(document);

for (const expected of [
  "data-beta-badge=\"public-release-notes\"",
  "data-beta-version",
  "BetaReleaseNotesDrawer",
  "beta_badge_clicked",
  "beta_changelog_closed",
]) {
  requireIncludes(betaBadge, expected, "BetaBadge");
}

for (const expected of [
  "BetaBadge",
  "KandyDrops",
  "<BetaBadge />",
]) {
  requireIncludes(navbar, expected, "Navbar");
}

for (const expected of [
  "data-beta-release-notes-count",
  "data-beta-release-notes-freshness",
  "data-beta-changelog-source",
  "What&apos;s new in Beta",
  "App-style Beta notes",
  "beta_changelog_opened",
  "currentVersion",
  "latestNoteCommittedAtUtc",
  "latestNoteCommitSha",
  "releaseNotesFreshnessState",
  "Updated ",
  " UTC",
  "Technical details",
  "<details",
]) {
  requireIncludes(drawer, expected, "Beta release notes drawer");
}

for (const expected of [
  "kandydrops-release-notes.json?v=",
  "cache: \"no-store\"",
  "PUBLIC_RELEASE_NOTES_FALLBACK",
  "bundled-fallback",
]) {
  requireIncludes(hook, expected, "usePublicReleaseNotes");
}

for (const expected of [
  "type PublicReleaseNote",
  "MAJOR.MINOR.PATCH",
  "classifyPublicVersionBump",
  "effectiveChangeCount > 100 ? \"minor\" : \"patch\"",
]) {
  requireIncludes(contract, expected, "release version contract");
}

if (classifyPublicVersionBump(101) !== "minor" || bumpPublicVersion("1.0.4", "minor") !== "1.1.0") {
  failures.push("effectiveChangeCount > 100 must bump minor and reset patch.");
}
if (classifyPublicVersionBump(100) !== "patch" || bumpPublicVersion("1.0.0", "patch") !== "1.0.1") {
  failures.push("effectiveChangeCount <= 100 must bump patch.");
}

for (const expected of [
  "isReleaseGeneratedArtifactPath",
  "effectiveChangeCount",
  "effectiveAdditions",
  "effectiveDeletions",
  "rawAdditions",
  "rawDeletions",
  "skip release-notes",
  "committedAtUtc",
  "generatedAtUtc",
  "formatUtcTimestamp",
  "isInternalBetaStabilizationChange",
  "shippedBetaBadgeFeature",
  "support traceability",
  "buildAppStoreTitle",
  "buildAppStoreBullets",
  "technicalDetails",
]) {
  requireIncludes(releaseScript, expected, "release notes update script");
}

for (const expected of [
  "agent\\/state\\/.*\\.generated\\.json",
  "agent\\/context\\/.*\\.generated\\.json",
  "agent/cache/",
  "coverage/",
  ".next/",
  "dist/",
  "build/",
  "public/kandydrops-release-notes.json",
  "src/lib/release-notes/public-release-notes.ts",
  "CHANGELOG.md",
  "package-lock.json",
]) {
  requireIncludes(contract, expected, "release version contract generated artifact exclusions");
}

const generatedOnlyFixture = [
  { path: "agent/state/public-beta-score.generated.json", additions: 700, deletions: 10 },
  { path: "agent/context/task-pack.generated.json", additions: 300, deletions: 0 },
  { path: "coverage/coverage-summary.json", additions: 250, deletions: 0 },
  { path: "dist/server.js", additions: 220, deletions: 0 },
  { path: "build/app.js", additions: 180, deletions: 0 },
  { path: "package-lock.json", additions: 500, deletions: 200 },
];
const generatedOnlyEffectiveCount = generatedOnlyFixture.reduce((total, item) => {
  return total + (isReleaseGeneratedArtifactPath(item.path, false) ? 0 : item.additions + item.deletions);
}, 0);
const generatedOnlyRawCount = generatedOnlyFixture.reduce((total, item) => total + item.additions + item.deletions, 0);
if (generatedOnlyRawCount <= 100) {
  failures.push("Generated-only validator fixture must have a raw count large enough to catch minor bump regressions.");
}
if (generatedOnlyEffectiveCount !== 0) {
  failures.push("Generated/build/report-only changes must have effectiveChangeCount 0.");
}
if (classifyPublicVersionBump(generatedOnlyEffectiveCount) !== "patch") {
  failures.push("Generated/build/report-only raw changes must not be able to bump MINOR.");
}

for (const eventName of [
  "beta_badge_clicked",
  "beta_changelog_opened",
  "beta_changelog_closed",
  "beta_changelog_entry_clicked",
]) {
  requireIncludes(telemetryCatalog, eventName, "telemetry catalog");
}

for (const expected of [
  "\"release:notes\": \"tsx scripts/release/update-public-changelog.ts\"",
  "\"check:release-notes\": \"tsx scripts/agent/validate-public-beta-changelog.ts\"",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const source of [readme, agents, docs] as const) {
  requireIncludes(source, "KandyDrops Beta release notes are user-facing", "release notes doctrine docs");
  requireIncludes(source, "MAJOR.MINOR.PATCH", "release notes doctrine docs");
}

requireIncludes(changelog, "# Changelog", "CHANGELOG.md");
requireIncludes(changelog, "Updated 20", "CHANGELOG.md UTC entries");
requireIncludes(changelog, " UTC", "CHANGELOG.md UTC entries");
requireIncludes(publicNotesTs, "PUBLIC_RELEASE_NOTES_FALLBACK", "public release notes fallback");
requireIncludes(ciWorkflow, "npm run check:release-notes", "CI workflow");
requireIncludes(releaseWorkflow, "npm run release:notes", "public release notes workflow");
requireIncludes(releaseWorkflow, "[skip release-notes]", "public release notes workflow");
requireIncludes(validatorScript, "last git commit must be represented", "release notes validator");

if (failures.length > 0) {
  console.error("Public beta changelog validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public beta changelog validation passed.");
