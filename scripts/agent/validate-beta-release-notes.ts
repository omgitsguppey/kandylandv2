import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PUBLIC_RELEASE_CHANNEL,
  getPublicReleaseNotesVisibleNotes,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

const root = process.cwd();
const failures: string[] = [];
const approvedBulletVerb = /^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u;
const bannedPublicJargon = /\b(route runtime|telemetry parity|validator|sourceTruth|Firestore|generatedAt|materializer|canonical|stale sample)\b|src\/|scripts\/|\.tsx\b|\.ts\b|raw commit/iu;

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const document = JSON.parse(
  readFileSync(join(root, "public/kandydrops-release-notes.json"), "utf8"),
) as PublicReleaseNotesDocument;
const fallbackSource = readFileSync(join(root, "src/lib/release-notes/public-release-notes.ts"), "utf8");

if (document.channel !== PUBLIC_RELEASE_CHANNEL) failures.push("Release notes channel must remain beta.");
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(document.generatedAtUtc)) {
  failures.push("Release note document must include a full UTC generatedAtUtc timestamp.");
}

const latestSha = git(["rev-parse", "HEAD"]);
const latestTitle = git(["log", "-1", "--format=%s"]);
if (latestSha && !/\[skip release-notes\]/iu.test(latestTitle) && !document.notes.some((note) => note.commitSha === latestSha)) {
  failures.push("Latest non-skip commit must be represented in release notes before publishing.");
}

const visibleNotes = getPublicReleaseNotesVisibleNotes(document.notes);
if (visibleNotes.length > 5) failures.push("Beta panel must expose only the last 5 updates.");

const seenPublicCopy = new Set<string>();
for (const [index, note] of visibleNotes.entries()) {
  if (!note.title || !note.summary || !note.audience || !note.updatedAtUtc) {
    failures.push(`Visible note ${index} must include title, summary, audience, and updatedAtUtc.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(note.updatedAtUtc)) {
    failures.push(`Visible note ${index} updatedAtUtc must be a full UTC timestamp.`);
  }
  if (!Array.isArray(note.bullets) || note.bullets.length < 2 || note.bullets.length > 5) {
    failures.push(`Visible note ${index} must have 2-5 concise bullets.`);
  }
  for (const bullet of note.bullets) {
    if (!approvedBulletVerb.test(bullet)) failures.push(`Bullet must start with an approved verb: ${bullet}`);
  }

  const publicCopy = `${note.title} ${note.summary} ${note.bullets.join(" ")}`;
  if (bannedPublicJargon.test(publicCopy)) failures.push(`Visible note ${index} exposes technical jargon in public copy.`);
  if (/Kept the update focused on user-visible polish and reliability/iu.test(publicCopy)) {
    failures.push(`Visible note ${index} uses the generic fallback placeholder.`);
  }
  if (seenPublicCopy.has(publicCopy)) failures.push(`Visible note ${index} repeats the same public copy as another update.`);
  seenPublicCopy.add(publicCopy);
}

if (!fallbackSource.includes("PUBLIC_RELEASE_NOTES_FALLBACK")) {
  failures.push("Bundled fallback must continue to mirror the canonical release notes source.");
}

if (failures.length > 0) {
  console.error("Beta release notes validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Beta release notes validation passed.");
