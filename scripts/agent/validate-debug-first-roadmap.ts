import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type PublicReleaseNotesDocument = {
  generatedAt?: string;
  generatedAtUtc?: string;
  lastCommitSha?: string;
  notes?: Array<{
    commitSha?: string;
    committedAt?: string;
    generatedAt?: string;
    committedAtUtc?: string;
    generatedAtUtc?: string;
  }>;
};

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

function readJson(relativePath: string): PublicReleaseNotesDocument | null {
  const source = readRequired(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as PublicReleaseNotesDocument;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function isFullUtcIso(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value);
}

function isDateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

const roadmap = readRequired("docs/agent-truth/beta-roadmap.md");
const agents = readRequired("AGENTS.md");
const packageJson = readRequired("package.json");
const releaseContract = readRequired("src/lib/release-notes/release-version-contract.ts");
const releaseScript = readRequired("scripts/release/update-public-changelog.ts");
const releaseValidator = readRequired("scripts/agent/validate-public-beta-changelog.ts");
const drawer = readRequired("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const changelog = readRequired("CHANGELOG.md");
const publicNotes = readJson("public/kandydrops-release-notes.json");

for (const expected of [
  "Phase 1: Debug-First Stabilization",
  "one selected Debug Control Tower/admin-evidence issue at a time",
  "No broad fixes.",
  "No unrelated refactors.",
  "No cleanup sweep unless a specific debug issue demands it.",
  "KreditFlow by iKandy is Phase 2",
  "Advocacy and referral mechanics are Phase 3",
  "Beta Exit",
  "selectedIssueIdOrFingerprint",
  "affectedSurface",
  "expectedUserImpact",
  "filesAllowed",
  "filesForbidden",
  "validatorToRun",
  "releaseNoteImpact",
  "rollbackNote",
]) {
  requireIncludes(roadmap, expected, "beta roadmap");
}

for (const expected of [
  "Phase 1 fixes must work from one Debug Control Tower/admin-evidence issue at a time.",
  "No broad fixes, unrelated refactors, or cleanup sweeps are canonical in Phase 1 unless a specific selected debug issue demands them.",
  "selectedIssueIdOrFingerprint",
  "affectedSurface",
  "expectedUserImpact",
  "filesAllowed",
  "filesForbidden",
  "validatorToRun",
  "releaseNoteImpact",
  "rollbackNote",
  "KreditFlow by iKandy is Phase 2 only.",
  "Advocacy and referral economy work is Phase 3 only",
]) {
  requireIncludes(agents, expected, "AGENTS.md Phase 1 stabilization rule");
}

const forbiddenCanonicalPhrases = [
  "Phase 1 allows broad fixes",
  "Phase 1 allows unrelated refactors",
  "cleanup sweeps are canonical in Phase 1.",
  "cleanup sweeps are allowed in Phase 1",
  "KreditFlow is Phase 1",
  "referrals are Phase 2 before KreditFlow",
];
for (const phrase of forbiddenCanonicalPhrases) {
  if (roadmap.includes(phrase) || agents.includes(phrase)) {
    failures.push(`Forbidden broad/stale roadmap phrase is marked canonical: ${phrase}`);
  }
}

for (const expected of [
  '"check:debug-first-roadmap": "tsx scripts/agent/validate-debug-first-roadmap.ts"',
  '"release:notes": "tsx scripts/release/update-public-changelog.ts"',
  '"check:release-notes": "tsx scripts/agent/validate-public-beta-changelog.ts"',
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of ["committedAtUtc", "generatedAtUtc"]) {
  requireIncludes(releaseContract, expected, "release note contract");
  requireIncludes(releaseScript, expected, "release note update script");
  requireIncludes(releaseValidator, expected, "release note validator");
}

for (const expected of [
  "beta_changelog_opened",
  "currentVersion",
  "latestNoteCommittedAtUtc",
  "latestNoteCommitSha",
  "releaseNotesFreshnessState",
]) {
  requireIncludes(drawer, expected, "Beta release notes drawer telemetry");
}

for (const expected of [
  "latestNoteCommittedAtUtc",
  "latestNoteCommitSha",
  "releaseNotesFreshnessState",
]) {
  requireIncludes(telemetryCatalog, expected, "telemetry catalog aliases");
}

if (!publicNotes) {
  failures.push("public release notes JSON must exist.");
} else {
  if (!isFullUtcIso(publicNotes.generatedAtUtc)) {
    failures.push("public release notes document generatedAtUtc must be a full ISO UTC timestamp ending in Z.");
  }
  if (!Array.isArray(publicNotes.notes) || publicNotes.notes.length === 0) {
    failures.push("public release notes must contain at least one note.");
  }
  for (const [index, note] of (publicNotes.notes ?? []).entries()) {
    if (!isFullUtcIso(note.committedAtUtc)) {
      failures.push(`notes[${index}].committedAtUtc must be a full ISO UTC timestamp ending in Z.`);
    }
    if (!isFullUtcIso(note.generatedAtUtc)) {
      failures.push(`notes[${index}].generatedAtUtc must be a full ISO UTC timestamp ending in Z.`);
    }
    if (isDateOnly(note.committedAt) || isDateOnly(note.generatedAt)) {
      failures.push(`notes[${index}] must not use date-only committedAt/generatedAt.`);
    }
  }
}

if (!/## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/u.test(changelog)) {
  failures.push("CHANGELOG.md must keep date headings.");
}
if (!/- Updated \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/u.test(changelog)) {
  failures.push("CHANGELOG.md entries must include UTC timestamps, not date-only entries.");
}

requireIncludes(releaseValidator, "last git commit must be represented", "release notes validator latest commit check");

if (failures.length > 0) {
  console.error("Debug-first roadmap validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug-first roadmap validation passed.");
