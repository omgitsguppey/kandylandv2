import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  getPublicReleaseNotesVisibleNotes,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

const root = process.cwd();
const failures: string[] = [];
const approvedBulletVerb = /^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u;
const bannedPublicJargon = /\b(route runtime|telemetry parity|validator|sourceTruth|Firestore|generatedAt|materializer|canonical|stale sample)\b|src\/|scripts\/|\.tsx\b|\.ts\b|raw commit/iu;

const document = JSON.parse(
  readFileSync(join(root, "public/kandydrops-release-notes.json"), "utf8"),
) as PublicReleaseNotesDocument;
const fallbackSource = readFileSync(join(root, "src/lib/release-notes/public-release-notes.ts"), "utf8");

if (document.channel !== PUBLIC_RELEASE_CHANNEL) failures.push("Release notes channel must remain beta.");
if (document.currentVersion !== CURRENT_BETA_RELEASE_VERSION) failures.push(`Current version must be ${CURRENT_BETA_RELEASE_VERSION}.`);
if (document.betaReleaseCounter !== CURRENT_BETA_RELEASE_COUNTER) failures.push(`Current betaReleaseCounter must be ${CURRENT_BETA_RELEASE_COUNTER}.`);
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(document.generatedAtUtc)) {
  failures.push("Release note document must include a full UTC generatedAtUtc timestamp.");
}

const visibleNotes = getPublicReleaseNotesVisibleNotes(document.notes);
if (visibleNotes.length > 5) failures.push("Beta panel must expose only the last 5 updates.");
  const internalOnlyVisibleNotes = visibleNotes.filter((note) =>
    note.surfaceCategory === "Internal reliability"
    || note.surfaceCategory === "Admin tools"
    || note.audience === "admins"
    || note.hiddenFromPublic === true
    || note.affectedSurfaces.length === 0,
  );
if (internalOnlyVisibleNotes.length > 0) {
  failures.push("Visible beta notes must stay product-facing and must not be internal-reliability-only.");
}

const seenPublicCopy = new Set<string>();
for (const [index, note] of visibleNotes.entries()) {
  if (!note.title || !note.summary || !note.audience || !note.updatedAtUtc || typeof note.betaReleaseCounter !== "number" || !note.surfaceCategory) {
    failures.push(`Visible note ${index} must include title, summary, audience, updatedAtUtc, betaReleaseCounter, and surfaceCategory.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(note.updatedAtUtc)) {
    failures.push(`Visible note ${index} updatedAtUtc must be a full UTC timestamp.`);
  }
  if (!Array.isArray(note.commitShas) || note.commitShas.length === 0 || typeof note.commitCount !== "number") {
    failures.push(`Visible note ${index} must include grouped commit metadata.`);
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
if (!fallbackSource.includes("betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter")) {
  failures.push("Bundled fallback version context must expose betaReleaseCounter.");
}

if (failures.length > 0) {
  console.error("Beta release notes validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Beta release notes validation passed.");
