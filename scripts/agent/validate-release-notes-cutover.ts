import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isUserFacingReleaseSurfaceCategory } from "../../src/lib/release-notes/release-note-classifier";
import {
  CURRENT_BETA_RELEASE_VERSION,
  getPublicReleaseNotesVisibleNotes,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function fail(message: string) {
  failures.push(message);
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    fail(`${label} must not include "${needle}".`);
  }
}

const document = JSON.parse(read("public/kandydrops-release-notes.json")) as PublicReleaseNotesDocument;
const generator = read("scripts/release/update-public-changelog.ts");
const classifier = read("src/lib/release-notes/release-note-classifier.ts");
const fallback = read("src/lib/release-notes/public-release-notes.ts");
const changelog = read("CHANGELOG.md");
const drawer = read("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
const packageJson = read("package.json");

if (document.currentVersion !== CURRENT_BETA_RELEASE_VERSION) {
  fail(`public release notes currentVersion must match ${CURRENT_BETA_RELEASE_VERSION}.`);
}

requireIncludes(packageJson, "\"check:release-notes-cutover\": \"tsx scripts/agent/validate-release-notes-cutover.ts\"", "package.json");
requireIncludes(generator, "release-note-classifier", "release notes generator");
requireIncludes(generator, "PUBLIC_BETA_ACCEPT_RELEASE", "release notes generator");
requireIncludes(generator, "\\[skip release-notes\\]", "release notes generator");
requireIncludes(generator, "No product-facing unreleased commits found for an accepted beta release.", "release notes generator");
requireIncludes(generator, "renderReleaseVersionContract", "release notes generator");

for (const forbidden of [
  "--numstat",
  "additions:",
  "deletions:",
  "effectiveChangeCount",
  "PublicReleaseBumpType",
  "bumpPublicVersion",
  "classifyPublicVersionBump",
]) {
  requireExcludes(generator, forbidden, "release notes generator");
}

requireIncludes(classifier, "USER_FACING_RELEASE_SURFACE_CATEGORIES", "release note classifier");
requireIncludes(classifier, "isInternalReliabilityPath", "release note classifier");
requireIncludes(classifier, "Improved Beta updates and version visibility", "release note classifier");
requireIncludes(classifier, "Reduced stale or repeated release-note copy in the visible Beta feed.", "release note classifier");

const visibleNotes = getPublicReleaseNotesVisibleNotes(document.notes);
if (visibleNotes.length > 5) {
  fail("Visible public release notes must stay capped at 5.");
}
if (visibleNotes.length === 0) {
  fail("Visible public release notes must include at least one user-facing note.");
}

for (const [index, note] of visibleNotes.entries()) {
  if (note.hiddenFromPublic === true) {
    fail(`Visible note ${index} must not be hidden from public feed.`);
  }
  if (!isUserFacingReleaseSurfaceCategory(note.surfaceCategory)) {
    fail(`Visible note ${index} must use a user-facing surface category, found ${note.surfaceCategory}.`);
  }
  if (note.audience === "admins") {
    fail(`Visible note ${index} must not be admin-only.`);
  }
  if (/internal reliability/iu.test(`${note.title} ${note.summary}`)) {
    fail(`Visible note ${index} must not read like internal reliability churn.`);
  }
}

const lastFivePublicCopy = visibleNotes
  .map((note) => `${note.title} ${note.summary} ${note.bullets.join(" ")}`.toLowerCase())
  .join("\n");
if ((lastFivePublicCopy.match(/internal reliability/gu) ?? []).length > 1) {
  fail("Last 5 visible notes must not be flooded by internal reliability churn.");
}

requireIncludes(fallback, `\"currentVersion\": \"${document.currentVersion}\"`, "bundled fallback");
requireIncludes(drawer, "App-style Beta notes with the latest user-facing fixes and improvements.", "beta release notes drawer");
const newestVisibleNote = visibleNotes[0];
if (newestVisibleNote) {
  requireIncludes(changelog, `## [${newestVisibleNote.version}]`, "CHANGELOG.md");
}

if (failures.length > 0) {
  console.error("Release notes cutover validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release notes cutover validation passed.");
