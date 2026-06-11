import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
  getPublicReleaseNotesVisibleNotes,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";
import { formatBetaOdometerVersion ,
  migrateLegacyVersionToBetaCounter,
  parseBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";
import {
  getEffectiveChangedFiles,
  isUserFacingReleaseSurfaceCategory,
} from "../../src/lib/release-notes/release-note-classifier";


const root = process.cwd();
const failures: string[] = [];
const PHASE_ONE_BADGE_FRESHNESS_MS = 24 * 60 * 60 * 1000;
const SAFE_INTERNAL_COPY = /\b(Bug fixes and general improvements|Bug fixes and performance improvements|Improved internal beta reliability)\b/iu;
const FORBIDDEN_UNPROVEN_EVIDENCE_CLAIM = /\b(smoke|provider|production|screenshot|real-device|manual qa)\b.{0,32}\b(pass|passed|verified|complete|completed|green)\b/iu;

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
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

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function requireExcludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) failures.push(`${label} must not include "${forbidden}".`);
}

function safeRunGit(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getHeadCommit() {
  const raw = safeRunGit(["show", "-s", "--format=%H%x00%s", "HEAD"]);
  if (!raw) return null;
  const [sha, title] = raw.split("\u0000");
  if (!sha || !title) return null;
  const changedFiles = safeRunGit(["show", "--name-only", "--format=", "--no-renames", "HEAD"])
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
  return { sha, title, changedFiles };
}

const RELEASE_ARTIFACT_PATHS = new Set([
  "CHANGELOG.md",
  "public/kandydrops-release-notes.json",
  "src/lib/release-notes/public-release-notes.ts",
  "src/lib/release-notes/release-version-contract.ts",
  "docs/agent-truth/public-beta-release-notes.md",
]);

const REQUIRED_PATCH_RELEASE_ARTIFACTS = [
  "CHANGELOG.md",
  "public/kandydrops-release-notes.json",
  "src/lib/release-notes/public-release-notes.ts",
  "src/lib/release-notes/release-version-contract.ts",
] as const;

function isReleaseArtifactOnly(changedFiles: string[]) {
  return changedFiles.length > 0 && changedFiles.every((path) => RELEASE_ARTIFACT_PATHS.has(path));
}

const document = readJson<PublicReleaseNotesDocument>("public/kandydrops-release-notes.json");
const fallback = readRequired("src/lib/release-notes/public-release-notes.ts");
const contract = readRequired("src/lib/release-notes/release-version-contract.ts");
const helper = readRequired("src/lib/release-notes/beta-odometer-version.ts");
const releaseScript = readRequired("scripts/release/update-public-changelog.ts");
const releaseWorkflow = readRequired(".github/workflows/public-release-notes.yml");
const releaseCloudBuild = readRequired("cloudbuild.release-notes.yaml");
const docs = readRequired("docs/agent-truth/public-beta-release-notes.md");
const firebaseAutomationDocs = readRequired("docs/agent-truth/firebase-owned-repo-automation.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const headCommit = getHeadCommit();

if (document) {
  if (document.channel !== PUBLIC_RELEASE_CHANNEL) failures.push("public release notes channel must remain beta.");
  if (document.currentVersion !== CURRENT_BETA_RELEASE_VERSION) failures.push(`currentVersion must match canonical version ${CURRENT_BETA_RELEASE_VERSION}.`);
  if (document.betaReleaseCounter !== CURRENT_BETA_RELEASE_COUNTER) failures.push(`betaReleaseCounter must match canonical counter ${CURRENT_BETA_RELEASE_COUNTER}.`);
  if (document.currentVersion !== formatBetaOdometerVersion(document.betaReleaseCounter)) failures.push("currentVersion must match the odometer value for betaReleaseCounter.");
  if ((parseBetaOdometerVersion(document.currentVersion)?.counter ?? -1) < (migrateLegacyVersionToBetaCounter("1.113.4") ?? 201)) {
    failures.push("currentVersion must be 1.2.1 or newer after legacy migration.");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(document.generatedAtUtc)) {
    failures.push("document.generatedAtUtc must be a full UTC timestamp.");
  }

  const visibleNotes = getPublicReleaseNotesVisibleNotes(document.notes);
  if (visibleNotes.length > PUBLIC_RELEASE_NOTES_VISIBLE_COUNT) {
    failures.push(`visible notes must stay at or below ${PUBLIC_RELEASE_NOTES_VISIBLE_COUNT}.`);
  }
  if (visibleNotes.length === 0) {
    failures.push("Beta badge must expose at least one visible note.");
  }

  for (const [index, note] of visibleNotes.entries()) {
    if (typeof note.betaReleaseCounter !== "number") failures.push(`notes[${index}].betaReleaseCounter must be present.`);
    if (!Array.isArray(note.commitShas) || note.commitShas.length === 0) failures.push(`notes[${index}].commitShas must be present.`);
    if (typeof note.commitCount !== "number" || note.commitCount < 1) failures.push(`notes[${index}].commitCount must be present.`);
    if (typeof note.surfaceCategory !== "string" || note.surfaceCategory.length === 0) failures.push(`notes[${index}].surfaceCategory must be present.`);
    if (note.surfaceCategory === "Internal reliability" || note.surfaceCategory === "Admin tools" || note.audience === "admins") {
      failures.push(`notes[${index}] must stay user-facing in the visible public feed.`);
    }
    if (note.version === "1.113.4") failures.push(`notes[${index}] must not keep legacy 1.113.4 as a visible version.`);
    if (FORBIDDEN_UNPROVEN_EVIDENCE_CLAIM.test(`${note.title} ${note.summary} ${note.bullets.join(" ")}`)) {
      failures.push(`notes[${index}] must not claim smoke/provider/manual QA passed without repo evidence.`);
    }
  }

  const latestVisible = visibleNotes[0];
  if (latestVisible) {
    const latestTimestamp = Date.parse(latestVisible.updatedAtUtc || latestVisible.generatedAtUtc || latestVisible.committedAtUtc);
    if (!Number.isFinite(latestTimestamp)) {
      failures.push("latest visible Beta note must include a valid UTC timestamp.");
    } else if ((Date.now() - latestTimestamp) > PHASE_ONE_BADGE_FRESHNESS_MS) {
      failures.push("latest visible Beta note is stale for the Phase 1 badge freshness rule.");
    }

    if (latestVisible.betaReleaseCounter !== document.betaReleaseCounter) {
      failures.push("latest visible Beta note must carry the document betaReleaseCounter.");
    }
    if (latestVisible.version !== document.currentVersion) {
      failures.push("latest visible Beta note must carry the document currentVersion.");
    }
    if (latestVisible.previousBetaReleaseCounter !== null && latestVisible.betaReleaseCounter !== latestVisible.previousBetaReleaseCounter + 1) {
      failures.push("latest visible Beta note must advance betaReleaseCounter by exactly 1 for the accepted patch batch.");
    }
    if (latestVisible.version !== formatBetaOdometerVersion(latestVisible.betaReleaseCounter)) {
      failures.push("latest visible Beta note version must match its odometer counter.");
    }

    const changedFiles = latestVisible.changedFiles ?? [];
    const { productFacingFiles } = getEffectiveChangedFiles(changedFiles);
    const publicCopy = `${latestVisible.title} ${latestVisible.summary} ${latestVisible.bullets.join(" ")}`;
    if (productFacingFiles.length === 0 && !SAFE_INTERNAL_COPY.test(publicCopy)) {
      failures.push("internal-only accepted patches must use safe generic bug-fix/improvement copy.");
    }
    if (productFacingFiles.length > 0 && !isUserFacingReleaseSurfaceCategory(latestVisible.surfaceCategory)) {
      failures.push("user-facing accepted patches must use a user-facing surface category.");
    }
    if (productFacingFiles.length > 0 && /^Bug fixes and general improvements\.?$/iu.test(latestVisible.summary.trim())) {
      failures.push("user-facing accepted patches must not use generic-only release-note copy.");
    }
  }

  if (
    headCommit && 
    !/\[skip release-notes\]/iu.test(headCommit.title) && 
    !/^(docs|chore|test)\b/iu.test(headCommit.title) && 
    !isReleaseArtifactOnly(headCommit.changedFiles)
  ) {
    for (const artifact of REQUIRED_PATCH_RELEASE_ARTIFACTS) {
      if (!headCommit.changedFiles.includes(artifact)) {
        failures.push(`non-release patch commits must include same-commit release-note artifact ${artifact}.`);
      }
    }
  }
}

if (document) {
  requireIncludes(fallback, `"currentVersion": "${document.currentVersion}"`, "bundled fallback");
  requireIncludes(fallback, `"betaReleaseCounter": ${document.betaReleaseCounter}`, "bundled fallback");
  requireIncludes(fallback, `"generatedAtUtc": "${document.generatedAtUtc}"`, "bundled fallback");
  requireIncludes(fallback, `"lastCommitSha": "${document.lastCommitSha}"`, "bundled fallback");
}

for (const source of [docs, readme, agents]) {
  requireIncludes(source, "KandyDrops Beta release notes are user-facing", "release note doctrine");
  requireIncludes(source, "1.<block>.<release>", "release note doctrine");
  requireIncludes(source, "accepted public beta release", "release note doctrine");
  requireIncludes(source, "group multiple commits", "release note doctrine");
  requireExcludes(source, "MAJOR.MINOR.PATCH", "release note doctrine");
  requireExcludes(source, "Effective non-generated diff size above 100 additions/deletions bumps MINOR", "release note doctrine");
  requireExcludes(source, "update after every commit", "release note doctrine");
}

for (const expected of [
  "1.113.4",
  "betaReleaseCounter = 201",
  "1.2.1",
  "1.2.2",
  "lose-our-minds overflow rule",
  "Beta badge is the operator's manual stale-version detector",
  "every accepted patch batch must create or update a Beta badge-visible release note",
  "badge version counter must advance by exactly 1 per accepted patch batch",
]) {
  requireIncludes(docs, expected, "release note doctrine");
}

for (const expected of [
  "CURRENT_BETA_RELEASE_COUNTER =",
  "CURRENT_BETA_RELEASE_VERSION",
  "betaReleaseCounter: number",
  "commitCount: number",
  "commitShas: string[]",
]) {
  requireIncludes(contract, expected, "release version contract");
}

for (const forbidden of [
  "MAJOR.MINOR.PATCH",
  "PublicReleaseBumpType",
  "classifyPublicVersionBump",
  "bumpPublicVersion",
]) {
  requireExcludes(contract, forbidden, "release version contract");
}

for (const expected of [
  "formatBetaOdometerVersion",
  "parseBetaOdometerVersion",
  "getNextBetaOdometerVersion",
  "migrateLegacyVersionToBetaCounter",
  "1.99.99.",
  "Beta version overflow exhausted. Manual product-era decision required.",
]) {
  requireIncludes(helper, expected, "beta odometer helper");
}

for (const expected of [
  "PUBLIC_BETA_ACCEPT_RELEASE",
  "--accept",
  "commitCount",
  "commitShas",
  "betaReleaseCounter",
  "surfaceCategory",
  "No product-facing unreleased commits found for an accepted beta release.",
  "renderReleaseVersionContract",
  "getAcceptedPatchCommits",
]) {
  requireIncludes(releaseScript, expected, "release notes generator");
}

for (const expected of [
  "paths-ignore:",
  "\"public/kandydrops-release-notes.json\"",
  "\"src/lib/release-notes/public-release-notes.ts\"",
  "\"src/lib/release-notes/release-version-contract.ts\"",
  "\"docs/agent-truth/public-beta-release-notes.md\"",
  "\"CHANGELOG.md\"",
  "github.event_name == 'workflow_dispatch' &&",
  "!contains(github.event.head_commit.message || '', '[skip release-notes]')",
  "Push events are retained for paths-ignore only",
  "contents: read",
  "git diff --exit-code -- public/kandydrops-release-notes.json src/lib/release-notes/public-release-notes.ts src/lib/release-notes/release-version-contract.ts CHANGELOG.md",
  "npm run check:release-notes",
]) {
  requireIncludes(releaseWorkflow, expected, "public-release-notes workflow");
}

for (const expected of [
  "docs/agent-truth/public-beta-release-notes.md",
  "src/lib/release-notes/release-version-contract.ts|docs/agent-truth/public-beta-release-notes.md|CHANGELOG.md",
  "git diff --exit-code -- public/kandydrops-release-notes.json src/lib/release-notes/public-release-notes.ts src/lib/release-notes/release-version-contract.ts CHANGELOG.md",
  "npm run check:release-notes",
]) {
  requireIncludes(releaseCloudBuild, expected, "public release notes Cloud Build lane");
}

for (const [label, source] of [
  ["public-release-notes workflow", releaseWorkflow],
  ["public release notes Cloud Build lane", releaseCloudBuild],
] as const) {
  for (const forbidden of [
    "git commit",
    "git push",
    "release:notes:accept",
    "contents: write",
    "GITHUB_TOKEN",
    "secretEnv",
  ]) {
    requireExcludes(source, forbidden, label);
  }
}

for (const expected of [
  "GitHub Actions release-note workflow is manual-only while hosted-runner billing is locked.",
  "Push events must resolve as skipped before runner allocation.",
  "Patch notes are same-commit artifacts.",
  "Automation validates; it does not create follow-up commits.",
  "Separate docs(release) commits are legacy/forbidden except explicit manual recovery.",
]) {
  requireIncludes(docs, expected, "release note workflow billing doctrine");
}

for (const expected of [
  "GitHub Actions workflows are manual fallbacks only until hosted-runner billing is reliable again.",
  "push events are intentionally skipped before runner allocation",
]) {
  requireIncludes(firebaseAutomationDocs, expected, "firebase-owned automation docs");
}

for (const forbidden of [
  "classifyPublicVersionBump",
  "bumpPublicVersion",
  "effectiveChangeCount > 100",
  "--numstat",
  "additions:",
  "deletions:",
  "last git commit must be represented",
]) {
  requireExcludes(releaseScript, forbidden, "release notes generator");
}

requireIncludes(fallback, `\"currentVersion\": \"${CURRENT_BETA_RELEASE_VERSION}\"`, "bundled fallback");
requireIncludes(fallback, `betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter`, "bundled fallback version context");
requireExcludes(fallback, "\"currentVersion\": \"1.113.4\"", "bundled fallback");

if (failures.length > 0) {
  console.error("Public beta changelog validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public beta changelog validation passed.");
