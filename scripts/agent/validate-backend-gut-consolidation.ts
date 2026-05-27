import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildBackendGutConsolidationReport,
  validateBackendGutConsolidationReport,
} from "@/lib/backend-hardening/backend-service-consolidator";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/backend-gut-consolidation.generated.json";
const DOC_PATH = "docs/agent-truth/backend-gut-consolidation.md";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function read(path: string) {
  return existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8") : "";
}

function lineCount(path: string) {
  return read(path).split(/\r?\n/u).length;
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  if (path === "AGENTS.md" || path === "REPO_MEMORY_LEDGER.md") return "memory_update_expected";
  if (path === "package.json" || path === "package-lock.json") return "real_source_change_needs_review";
  if (path.startsWith("src/lib/backend-hardening/")) return "real_source_change_needs_review";
  if (path === "src/lib/analytics/event-translation-bridge.ts" || path === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (path.startsWith("scripts/agent/validate-backend-") || path === "scripts/agent/validate-codex-memory-writeback.ts") return "real_source_change_needs_review";
  if (path.startsWith("tests/unit/backend-") || path === "tests/unit/codex-memory-writeback.spec.ts") return "real_source_change_needs_review";
  if (path.startsWith("agent/state/backend-") || path === "agent/state/codex-memory-writeback.generated.json") return "current_generated_artifact_to_commit";
  if (path.startsWith("docs/agent-truth/backend-") || path === "docs/agent-truth/codex-memory-writeback.md") return "current_generated_artifact_to_commit";
  if (path === "agent/context/optimized-task-context.generated.json") return "current_generated_artifact_to_commit";
  if (path === "agent/state/public-beta-score.generated.json" || path === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  return "unsafe_unknown";
}

function renderDoc(report: ReturnType<typeof buildBackendGutConsolidationReport>, classifications: Record<string, string>) {
  return [
    "# Backend Gut Consolidation",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Backend routes audited: ${report.backendRoutesAudited}`,
    `- Backend routes consolidated: ${report.backendRoutesConsolidated}`,
    `- Backend routes removed: ${report.backendRoutesRemoved}`,
    `- Services created or reused: ${report.servicesCreatedOrReused.length}`,
    `- Unsafe unknowns: ${report.unsafeUnknowns.length}`,
    `- Score before/after: ${report.scoreBefore} -> ${report.scoreAfter}`,
    "",
    "## Consolidation",
    "",
    ...report.duplicateHelpersRemoved.map((item) => `- ${item}`),
    ...report.duplicateDebugLanesRetired.map((item) => `- ${item}`),
    "",
    "## Memory",
    "",
    `- Source: ${report.memoryWriteback.memorySource}`,
    `- Entries added: ${report.memoryWriteback.entriesAdded}`,
    "",
    "## Remaining Gaps",
    "",
    ...report.remainingGaps.map((gap) => `- ${gap}`),
    "",
    "## Dirty File Classification",
    "",
    ...(Object.keys(classifications).length ? Object.entries(classifications).map(([file, classification]) => `- ${file}: ${classification}`) : ["- none"]),
    "",
  ].join("\n");
}

const generatedAtUtc = new Date().toISOString();
const currentHead = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const report = buildBackendGutConsolidationReport({ generatedAtUtc, currentHead });
const validation = validateBackendGutConsolidationReport(report);
const classifications = Object.fromEntries(changedFiles().map((file) => [file, classifyDirtyFile(file)]));
write(REPORT_PATH, JSON.stringify({ ...report, dirtyFileClassification: classifications, validationFailures: validation.failures }));
write(DOC_PATH, renderDoc(report, classifications));

const failures = [...validation.failures];
for (const [file, classification] of Object.entries(classifications)) {
  if (classification === "unsafe_unknown") failures.push(`Dirty/untracked file is unclassified: ${file}`);
}
if (lineCount(REPORT_PATH) > 500) failures.push(`${REPORT_PATH} exceeds 500 lines.`);
for (const path of [
  "agent/state/backend-route-inventory.generated.json",
  "agent/state/backend-service-ownership.generated.json",
  "agent/state/backend-cost-consolidation.generated.json",
  "agent/state/codex-memory-writeback.generated.json",
]) {
  if (existsSync(join(ROOT, path)) && lineCount(path) > 500) failures.push(`${path} exceeds 500 lines.`);
}
if (failures.length) {
  console.error("Backend gut consolidation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Backend gut consolidation validation passed.");
