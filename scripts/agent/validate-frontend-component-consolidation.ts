import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFrontendComponentConsolidationReport,
  buildFrontendGutConsolidationReport,
  buildFrontendSurfaceInventoryReport,
  validateFrontendComponentConsolidationReport,
  validateFrontendSurfaceInventoryReport,
} from "@/lib/frontend-hardening/frontend-surface-inventory";
import { listWorkingTreeFiles, readRepoToolchainState } from "./shared";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function lineCount(path: string) {
  return read(path).split(/\r?\n/u).length;
}

function readPublicBetaScore() {
  try {
    const parsed = JSON.parse(read("agent/state/public-beta-score.generated.json")) as { healthScore?: number; scannerScore?: number };
    return typeof parsed.healthScore === "number" ? String(parsed.healthScore) : typeof parsed.scannerScore === "number" ? String(parsed.scannerScore) : "unknown";
  } catch {
    return "unknown";
  }
}

function changedFiles() {
  return listWorkingTreeFiles();
}

function classifyDirtyFile(path: string) {
  if (path === "AGENTS.md" || path === "REPO_MEMORY_LEDGER.md" || path === "agent/index/known-pitfalls.json") return "memory_update_expected";
  if (path === "package.json" || path === "package-lock.json") return "real_source_change_needs_review";
  if (path.startsWith("agent/context/")) return "generated_context_noise_leave_unstaged";
  if (path.startsWith("agent/index/")) return "generated_index_noise_leave_unstaged";
  if (path === "src/components/Support/SupportInbox.tsx") return "hydration_race_logic_to_fix";
  if (path === "src/lib/analytics/event-translation-bridge.ts" || path === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (path.startsWith("src/lib/frontend-hardening/")) return "real_source_change_needs_review";
  if (path.startsWith("scripts/agent/validate-frontend-") || path === "scripts/agent/validate-client-state-ownership.ts" || path === "scripts/agent/validate-hydration-race-cleanup.ts" || path === "scripts/agent/validate-codex-frontend-memory-writeback.ts") return "real_source_change_needs_review";
  if (path === "scripts/agent/build-agent-indexes.ts" || path === "scripts/agent/validate-freshness-window-repair.ts" || path === "scripts/repo-inventory.ts") return "tooling_change_needs_separate_review";
  if (path.startsWith("tests/unit/frontend-") || path === "tests/unit/client-state-ownership.spec.ts" || path === "tests/unit/hydration-race-cleanup.spec.ts" || path === "tests/unit/codex-frontend-memory-writeback.spec.ts") return "real_source_change_needs_review";
  if (path.startsWith("agent/state/frontend-") || path === "agent/state/client-state-ownership.generated.json" || path === "agent/state/hydration-race-cleanup.generated.json" || path === "agent/state/codex-frontend-memory-writeback.generated.json") return "current_generated_artifact_to_commit";
  if (path.startsWith("docs/agent-truth/frontend-") || path === "docs/agent-truth/client-state-ownership.md" || path === "docs/agent-truth/hydration-race-cleanup.md" || path === "docs/agent-truth/codex-frontend-memory-writeback.md") return "current_generated_artifact_to_commit";
  if (path === "agent/state/event-translation-bridge.generated.json" || path === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (path === "docs/agent-truth/event-translation-bridge.md" || path === "docs/agent-truth/person-metrics-hydration.md") return "current_generated_artifact_to_commit";
  if (path === "agent/state/public-beta-score.generated.json" || path === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (path.startsWith("agent/state/") && path.endsWith(".generated.json")) return "generated_report_noise_leave_unstaged";
  if (path.startsWith("docs/agent-truth/") && path.endsWith(".md")) return "generated_report_doc_noise_leave_unstaged";
  if (path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  return "unsafe_unknown";
}

function renderDoc(report: ReturnType<typeof buildFrontendComponentConsolidationReport>, classifications: Record<string, string>) {
  return [
    "# Frontend Component Consolidation",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Components audited: ${report.componentsAudited}`,
    `- Bloated components found: ${report.bloatedComponentsFound.length}`,
    `- Duplicate local state risks classified: ${report.duplicateLocalStateRemoved}`,
    `- Direct telemetry calls routed to owner review: ${report.directTelemetryCallsReduced}`,
    `- Hydration race risks classified: ${report.hydrationRaceRisksFixed}`,
    "",
    "## Top Gaps",
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
const toolchain = readRepoToolchainState();
const currentHead = toolchain.currentHead?.slice(0, 12) ?? "unknown";
const report = buildFrontendComponentConsolidationReport({ generatedAtUtc, currentHead });
const inventory = buildFrontendSurfaceInventoryReport({ generatedAtUtc, currentHead });
const betaScore = readPublicBetaScore();
const gut = buildFrontendGutConsolidationReport({ generatedAtUtc, currentHead, scoreBefore: betaScore, scoreAfter: betaScore });
const validations = [
  ...validateFrontendComponentConsolidationReport(report).failures,
  ...validateFrontendSurfaceInventoryReport(inventory).failures,
];
const classifications = Object.fromEntries(changedFiles().map((file) => [file, classifyDirtyFile(file)]));

const toolingFailures = toolchain.gitStatus !== "available"
  ? [`git_required: frontend component consolidation cannot clear current-head/dirty-tree proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`]
  : [];
write("agent/state/frontend-component-consolidation.generated.json", JSON.stringify({ ...report, gitStatus: toolchain.gitStatus, currentHeadSource: toolchain.currentHeadSource, toolingDegraded: toolchain.toolingDegraded, degradationReason: toolchain.degradationReason, dirtyFileClassification: classifications, validationFailures: [...validations, ...toolingFailures] }, null, 2));
write("docs/agent-truth/frontend-component-consolidation.md", renderDoc(report, classifications));
write("agent/state/frontend-gut-consolidation.generated.json", JSON.stringify({ ...gut, dirtyFileClassification: classifications }, null, 2));
write("docs/agent-truth/frontend-gut-consolidation.md", [
  "# Frontend Gut Consolidation",
  "",
  `Generated: ${gut.generatedAtUtc}`,
  `Current head: ${gut.currentHead}`,
  "",
  `- Components audited: ${gut.componentsAudited}`,
  `- Components consolidated: ${gut.componentsConsolidated.join("; ")}`,
  `- Hooks consolidated: ${gut.hooksConsolidated.join("; ")}`,
  `- Memory entries added: ${gut.memoryEntriesAdded}`,
  `- Score before/after: ${gut.scoreBefore} -> ${gut.scoreAfter}`,
  "",
].join("\n"));

const failures = [...validations, ...toolingFailures];
for (const [file, classification] of Object.entries(classifications)) {
  if (classification === "unsafe_unknown") failures.push(`Dirty/untracked file is unclassified: ${file}`);
}
for (const path of ["agent/state/frontend-component-consolidation.generated.json", "agent/state/frontend-gut-consolidation.generated.json"]) {
  if (lineCount(path) > 500) failures.push(`${path} exceeds 500 lines.`);
}
if (failures.length) {
  console.error("Frontend component consolidation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Frontend component consolidation validation passed.");
