import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const GENERATED_REPORT_STALE_MS = 24 * 60 * 60 * 1000;
const EVIDENCE_REFRESH_ONLY_PATHS = new Set([
  "agent/state/final-launch-readiness-report.generated.json",
  "agent/state/generated-report-authority.generated.json",
  "agent/state/launch-pr-triage.generated.json",
  "agent/state/launch-readiness-report.generated.json",
  "agent/state/public-beta-score.generated.json",
  "docs/agent-truth/final-launch-readiness-report.md",
  "docs/agent-truth/launch-pr-triage.md",
  "docs/agent-truth/launch-readiness-final.md",
  "scripts/agent/score-public-beta-readiness.ts",
  "scripts/agent/validate-final-launch-readiness-report.ts",
  "scripts/agent/validate-launch-pr-triage.ts",
  "scripts/agent/validate-launch-readiness-final.ts",
]);

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1): unknown[] {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [];
  }

  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }

  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${label} must be an object.`);
    return {};
  }

  return value as Record<string, unknown>;
}

function readCurrentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function readChangedPathsSince(baseHead: string, currentHead: string) {
  try {
    return execFileSync("git", ["diff", "--name-only", `${baseHead}..${currentHead}`], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((path) => path.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function parseDate(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    failures.push(`${label} must be a valid generatedAt timestamp.`);
    return null;
  }
  return Date.parse(value);
}

const triagePath = "agent/state/launch-pr-triage.generated.json";
const docPath = "docs/agent-truth/launch-pr-triage.md";
const triageSource = readRequired(triagePath);
const doc = readRequired(docPath);
const memoryLedger = readRequired("REPO_MEMORY_LEDGER.md");
const packageJson = readRequired("package.json");

let triage: Record<string, unknown> = {};
try {
  triage = JSON.parse(triageSource) as Record<string, unknown>;
} catch (error) {
  failures.push(`${triagePath} must be valid JSON: ${(error as Error).message}`);
}

const triageGeneratedAtMs = parseDate(triage.generatedAt, "triage.generatedAt");
if (triageGeneratedAtMs && Date.now() - triageGeneratedAtMs > GENERATED_REPORT_STALE_MS) {
  failures.push("Launch PR triage is stale; open PR/current HEAD integrity must be refreshed before launch readiness can be trusted.");
}
const currentHead = readCurrentHead();
if (currentHead && typeof triage.headCommitAtTriage === "string" && triage.headCommitAtTriage !== currentHead) {
  const changedPathsSinceTriage = readChangedPathsSince(triage.headCommitAtTriage, currentHead);
  const nonEvidenceRefreshChanges = changedPathsSinceTriage?.filter((path) => !EVIDENCE_REFRESH_ONLY_PATHS.has(path)) ?? null;
  if (!changedPathsSinceTriage || (nonEvidenceRefreshChanges && nonEvidenceRefreshChanges.length > 0)) {
    failures.push("Launch PR triage was generated before the current HEAD and must cap readiness at Needs review.");
  }
}

const expectedOpenPrs = requireArray(triage.openPrNumbersAtTriage, "triage.openPrNumbersAtTriage")
  .filter((number): number is number => typeof number === "number");
if (expectedOpenPrs.length === 0) {
  failures.push("triage.openPrNumbersAtTriage must include numeric PR ids.");
}
const openPrs = requireArray(triage.openPullRequests, "triage.openPullRequests", expectedOpenPrs.length);
const openPrNumbers = openPrs
  .map((entry) => requireObject(entry, "triage.openPullRequests item").number)
  .filter((number): number is number => typeof number === "number");

for (const number of expectedOpenPrs) {
  if (!openPrNumbers.includes(number)) {
    failures.push(`Open PR #${number} is not classified.`);
  }
  requireIncludes(doc, `#${number}`, docPath);
}

const commits = requireArray(triage.latest20Commits, "triage.latest20Commits", 20);
if (commits.length !== 20) {
  failures.push(`triage.latest20Commits must include exactly 20 commits; found ${commits.length}.`);
}

for (const entry of [...openPrs, ...commits]) {
  const item = requireObject(entry, "triage item");
  const title = typeof item.title === "string" ? item.title : `#${String(item.number ?? item.shortSha ?? "unknown")}`;
  for (const field of [
    "title",
    "filesTouched",
    "systemArea",
    "riskLevel",
    "launchRelevance",
    "likelyConflicts",
    "requiredTests",
    "recommendation",
    "touchesSourceOfTruthDocsOrValidators",
  ]) {
    if (!(field in item)) {
      failures.push(`${title} is missing required field ${field}.`);
    }
  }
  requireArray(item.filesTouched, `${title}.filesTouched`);
  requireArray(item.likelyConflicts, `${title}.likelyConflicts`, 0);
  requireArray(item.requiredTests, `${title}.requiredTests`);
}

const duplicateGroups = requireArray(triage.duplicateGroups, "triage.duplicateGroups");
if (!duplicateGroups.some((entry) => Array.isArray(requireObject(entry, "triage.duplicateGroups item").prs))) {
  failures.push("Duplicate groups must classify at least one superseded/duplicate PR lane.");
}

const mergeCandidates = openPrs
  .map((entry) => requireObject(entry, "triage.openPullRequests item"))
  .filter((entry) => entry.classification === "merge candidate" || entry.secondaryClassification === "merge candidate");
for (const candidate of mergeCandidates) {
  requireArray(candidate.requiredTests, `PR #${String(candidate.number)} requiredTests`);
}

if (triage.automaticMergePerformed !== false) {
  failures.push("automaticMergePerformed must be false.");
}
if (triage.automaticClosePerformed !== false) {
  failures.push("automaticClosePerformed must be false.");
}

for (const phrase of [
  "No PR was merged, closed, rebased, or edited during this pass.",
  "Duplicate group",
  "Current HEAD",
  "Open PRs",
]) {
  requireIncludes(doc, phrase, docPath);
}

for (const phrase of [
  "Launch PR triage is a manual decision gate",
  "agent/state/launch-pr-triage.generated.json",
  "docs/agent-truth/launch-pr-triage.md",
  "No PR was merged",
]) {
  requireIncludes(memoryLedger, phrase, "REPO_MEMORY_LEDGER.md");
}

requireIncludes(packageJson, "\"check:launch-pr-triage\"", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-launch-pr-triage.ts", "package.json");

if (failures.length > 0) {
  console.error("Launch PR triage validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch PR triage validation passed.");
