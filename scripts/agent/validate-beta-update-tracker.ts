import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PUBLIC_APP_VERSION,
  PUBLIC_RELEASE_NOTES_FALLBACK,
  PUBLIC_RELEASE_NOTES_VERSION_CONTEXT,
} from "../../src/lib/release-notes/public-release-notes";
import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
  getPublicReleaseNotesVisibleNotes,
  isReleaseGeneratedArtifactPath,
  type PublicReleaseNote,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";
import {
  formatBetaOdometerVersion,
  migrateLegacyVersionToBetaCounter,
  parseBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

type RawReleaseNote = PublicReleaseNote & {
  commitRange?: {
    from?: string;
    to?: string;
  };
};

type CommitRecord = {
  sha: string;
  parents: string[];
  subject: string;
  body: string;
  files: string[];
};

const root = process.cwd();
const failures: string[] = [];
const baselineCounter = migrateLegacyVersionToBetaCounter("1.113.4") ?? 201;
const releaseArtifacts = readJson<PublicReleaseNotesDocument>("public/kandydrops-release-notes.json");
const fallbackSource = readRequired("src/lib/release-notes/public-release-notes.ts");
const firebaseMessagingSource = readRequired("src/lib/firebase-messaging.ts");
const packageJsonSource = readRequired("package.json");
const releaseScriptSource = readRequired("scripts/release/update-public-changelog.ts");
const releaseDoctrineSource = readRequired("docs/agent-truth/public-beta-release-notes.md");

const bannedVisibleJargon =
  /\b(sourceTruth|validator|Firestore|canonical|materializer|route runtime|diff scope)\b|scripts\/|src\/|\.tsx?\b|[0-9a-f]{7,40}/iu;

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

function runGit(args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function readCommitLog(limit = 200) {
  const raw = runGit(["log", `-${limit}`, "--format=%H%x00%P%x00%s%x00%B%x1e"]);
  return raw
    .split("\u001e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, parentString, subject, ...bodyParts] = entry.split("\u0000");
      const body = bodyParts.join("\u0000");
      const files = runGit(["show", "--name-only", "--format=", "--no-renames", sha])
        .split(/\r?\n/u)
        .map((value) => value.trim().replace(/\\/gu, "/"))
        .filter(Boolean);
      return {
        sha,
        parents: parentString ? parentString.split(" ").filter(Boolean) : [],
        subject: subject?.trim() ?? "",
        body: body.trim(),
        files,
      } satisfies CommitRecord;
    });
}

function hasSkipReleaseNotesMarker(commit: CommitRecord) {
  return /\[skip release-notes\]/iu.test(`${commit.subject}\n${commit.body}`);
}

function isNonAppChange(path: string) {
  const normalizedPath = path.replace(/\\/gu, "/");
  if (isReleaseGeneratedArtifactPath(normalizedPath, normalizedPath === "package-lock.json")) {
    return true;
  }

  return normalizedPath === "CODEX_HANDOFF.md"
    || normalizedPath === "PHASE1_TRUTH_AUDIT.md"
    || normalizedPath === "CHANGELOG.md"
    || normalizedPath === "README.md"
    || normalizedPath === "AGENTS.md"
    || normalizedPath.startsWith("docs/")
    || normalizedPath.startsWith("agent/")
    || normalizedPath.startsWith(".github/")
    || normalizedPath.startsWith("tests/")
    || normalizedPath.startsWith("scripts/")
    || normalizedPath === "package.json"
    || normalizedPath.endsWith(".md");
}

function commitHasAppChanges(commit: CommitRecord) {
  return commit.files.some((path) => !isNonAppChange(path));
}

function commitRequiresPublicReleaseNote(commit: CommitRecord) {
  if (hasSkipReleaseNotesMarker(commit)) {
    return false;
  }

  if (commit.parents.length > 1 && !commitHasAppChanges(commit)) {
    return false;
  }

  return commitHasAppChanges(commit);
}

function findLatestRelevantCommit(commits: CommitRecord[]) {
  return commits.find(commitRequiresPublicReleaseNote) ?? null;
}

function compareStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function noteCoversCommit(note: RawReleaseNote | null | undefined, sha: string) {
  if (!note) return false;

  if (Array.isArray(note.commitShas) && note.commitShas.includes(sha)) {
    return true;
  }

  if (typeof note.commitSha === "string" && note.commitSha === sha) {
    return true;
  }

  const commitRange = note.commitRange;
  if (commitRange?.from && commitRange?.to) {
    const shas = runGit(["rev-list", `${commitRange.from}..${commitRange.to}`])
      .split(/\r?\n/u)
      .filter(Boolean);
    return sha === commitRange.from || sha === commitRange.to || shas.includes(sha);
  }

  return false;
}

function firstVisibleNote(document: PublicReleaseNotesDocument | null) {
  return document ? (getPublicReleaseNotesVisibleNotes(document.notes)[0] as RawReleaseNote | undefined) ?? null : null;
}

function firstTrackedNote(document: PublicReleaseNotesDocument | null) {
  return document ? (document.notes[0] as RawReleaseNote | undefined) ?? null : null;
}

if (!packageJsonSource.includes('"check:beta-update-tracker": "tsx scripts/agent/validate-beta-update-tracker.ts"')) {
  failures.push('package.json must expose "check:beta-update-tracker".');
}

for (const forbidden of [
  "--numstat",
  "additions:",
  "deletions:",
  "PublicReleaseBumpType",
  "classifyPublicVersionBump",
  "bumpPublicVersion",
  "effectiveChangeCount",
  "MAJOR.MINOR.PATCH",
]) {
  if (releaseScriptSource.includes(forbidden)) {
    failures.push(`Release generator must not keep legacy semver or diff-size logic: found "${forbidden}".`);
  }
}

for (const expected of [
  "1.113.4",
  "betaReleaseCounter = 201",
  "1.2.1",
  "1.2.2",
  "lose-our-minds overflow rule",
]) {
  if (!releaseDoctrineSource.includes(expected)) {
    failures.push(`Release-note doctrine must document "${expected}".`);
  }
}

if (!releaseArtifacts) {
  failures.push("public/kandydrops-release-notes.json must exist.");
} else {
  if (releaseArtifacts.currentVersion !== PUBLIC_APP_VERSION) {
    failures.push("PUBLIC_APP_VERSION and public release-note currentVersion must agree.");
  }
  if (releaseArtifacts.currentVersion !== PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion) {
    failures.push("Public JSON and bundled fallback currentVersion must agree.");
  }
  if (releaseArtifacts.betaReleaseCounter !== PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter) {
    failures.push("Public JSON and bundled fallback betaReleaseCounter must agree.");
  }
  if (PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion !== PUBLIC_APP_VERSION) {
    failures.push("PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion must match PUBLIC_APP_VERSION.");
  }
  if (PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.betaReleaseCounter !== releaseArtifacts.betaReleaseCounter) {
    failures.push("PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.betaReleaseCounter must match public JSON.");
  }

  if (formatBetaOdometerVersion(releaseArtifacts.betaReleaseCounter) !== releaseArtifacts.currentVersion) {
    failures.push("current betaReleaseCounter must map to the displayed currentVersion.");
  }
  if (releaseArtifacts.currentVersion !== CURRENT_BETA_RELEASE_VERSION || releaseArtifacts.betaReleaseCounter !== CURRENT_BETA_RELEASE_COUNTER) {
    failures.push("Current release contract constants must agree with public release-note artifacts.");
  }
  if (!parseBetaOdometerVersion(releaseArtifacts.currentVersion)) {
    failures.push("Current version must parse as a beta odometer version.");
  }
  if (releaseArtifacts.currentVersion === "1.113.4") {
    failures.push("Current version must not remain at legacy 1.113.4.");
  }
  if ((parseBetaOdometerVersion(releaseArtifacts.currentVersion)?.counter ?? -1) < baselineCounter) {
    failures.push("Current version must be 1.2.1 or newer.");
  }

  const publicTopNote = firstTrackedNote(releaseArtifacts);
  const fallbackTopNote = firstTrackedNote(PUBLIC_RELEASE_NOTES_FALLBACK);
  const visiblePublicNote = firstVisibleNote(releaseArtifacts);

  if (!publicTopNote || !fallbackTopNote) {
    failures.push("Public JSON and bundled fallback must both expose a current tracked beta release entry.");
  } else {
    if (publicTopNote.commitSha !== fallbackTopNote.commitSha) {
      failures.push("Public JSON and bundled fallback top tracked release note must agree on commitSha.");
    }
    if (!compareStringArray(publicTopNote.commitShas ?? [], fallbackTopNote.commitShas ?? [])) {
      failures.push("Public JSON and bundled fallback top tracked release note must agree on commitShas.");
    }
    if ((publicTopNote.commitCount ?? 0) !== (fallbackTopNote.commitCount ?? 0)) {
      failures.push("Public JSON and bundled fallback top tracked release note must agree on commitCount.");
    }
    if (visiblePublicNote && bannedVisibleJargon.test(`${visiblePublicNote.title} ${visiblePublicNote.summary} ${(visiblePublicNote.bullets ?? []).join(" ")}`)) {
      failures.push("Current public release note exposes forbidden technical jargon in visible copy.");
    }
    if (visiblePublicNote && (visiblePublicNote.surfaceCategory === "Internal reliability" || visiblePublicNote.surfaceCategory === "Admin tools")) {
      failures.push("Current visible public release note must stay user-facing.");
    }
  }
}

const commits = readCommitLog();
const latestRelevantCommit = findLatestRelevantCommit(commits);
const publicTopNote = firstTrackedNote(releaseArtifacts);
const fallbackTopNote = firstTrackedNote(PUBLIC_RELEASE_NOTES_FALLBACK);

if (latestRelevantCommit) {
  if (!noteCoversCommit(publicTopNote, latestRelevantCommit.sha)) {
    failures.push(`Latest non-skipped app commit ${latestRelevantCommit.sha} is not represented by the current public release note entry.`);
  }
  if (!noteCoversCommit(fallbackTopNote, latestRelevantCommit.sha)) {
    failures.push(`Latest non-skipped app commit ${latestRelevantCommit.sha} is not represented by the bundled fallback release note entry.`);
  }
} else {
  failures.push("Unable to find a latest non-skipped app commit to verify against the beta update tracker.");
}

if (!firebaseMessagingSource.includes('import { PUBLIC_APP_VERSION } from "./release-notes/public-release-notes";')) {
  failures.push("Service worker registration must import PUBLIC_APP_VERSION from the release-note version source.");
}
if (!firebaseMessagingSource.includes("v: PUBLIC_APP_VERSION")) {
  failures.push("Service worker registration must pass PUBLIC_APP_VERSION into the worker URL version query.");
}
if (!firebaseMessagingSource.includes("appVersion: PUBLIC_APP_VERSION")) {
  failures.push("Service worker update events must continue using PUBLIC_APP_VERSION.");
}
if (!fallbackSource.includes("export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;")) {
  failures.push("Bundled fallback must continue exporting PUBLIC_APP_VERSION from the version context.");
}

if (failures.length > 0) {
  console.error("Beta update tracker validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Beta update tracker validation passed.");
