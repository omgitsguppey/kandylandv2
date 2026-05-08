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
import {
  migrateLegacyVersionToBetaCounter,
  parseBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

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

const document = readJson<PublicReleaseNotesDocument>("public/kandydrops-release-notes.json");
const fallback = readRequired("src/lib/release-notes/public-release-notes.ts");
const contract = readRequired("src/lib/release-notes/release-version-contract.ts");
const helper = readRequired("src/lib/release-notes/beta-odometer-version.ts");
const releaseScript = readRequired("scripts/release/update-public-changelog.ts");
const docs = readRequired("docs/agent-truth/public-beta-release-notes.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");

if (document) {
  if (document.channel !== PUBLIC_RELEASE_CHANNEL) failures.push("public release notes channel must remain beta.");
  if (document.currentVersion !== CURRENT_BETA_RELEASE_VERSION) failures.push(`currentVersion must match canonical version ${CURRENT_BETA_RELEASE_VERSION}.`);
  if (document.betaReleaseCounter !== CURRENT_BETA_RELEASE_COUNTER) failures.push(`betaReleaseCounter must match canonical counter ${CURRENT_BETA_RELEASE_COUNTER}.`);
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

  for (const [index, note] of visibleNotes.entries()) {
    if (typeof note.betaReleaseCounter !== "number") failures.push(`notes[${index}].betaReleaseCounter must be present.`);
    if (!Array.isArray(note.commitShas) || note.commitShas.length === 0) failures.push(`notes[${index}].commitShas must be present.`);
    if (typeof note.commitCount !== "number" || note.commitCount < 1) failures.push(`notes[${index}].commitCount must be present.`);
    if (typeof note.surfaceCategory !== "string" || note.surfaceCategory.length === 0) failures.push(`notes[${index}].surfaceCategory must be present.`);
    if (note.surfaceCategory === "Internal reliability" || note.surfaceCategory === "Admin tools" || note.audience === "admins") {
      failures.push(`notes[${index}] must stay user-facing in the visible public feed.`);
    }
    if (note.version === "1.113.4") failures.push(`notes[${index}] must not keep legacy 1.113.4 as a visible version.`);
  }
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
  "currentVersion: CURRENT_BETA_RELEASE_VERSION",
]) {
  requireIncludes(releaseScript, expected, "release notes generator");
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
