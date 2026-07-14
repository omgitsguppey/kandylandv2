import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFrontendComponentConsolidationReport,
  buildFrontendGutConsolidationReport,
  buildFrontendSurfaceInventoryReport,
  classifyFrontendConsolidationDirtyFile,
  compactFrontendConsolidationDirtyClassifications,
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

function renderDoc(
  report: ReturnType<typeof buildFrontendComponentConsolidationReport>,
  dirtyFiles: ReturnType<typeof compactFrontendConsolidationDirtyClassifications>,
) {
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
    `- Total dirty files classified: ${dirtyFiles.total}`,
    `- Detailed entries retained: ${dirtyFiles.retained}`,
    `- Detailed entries omitted after summary: ${dirtyFiles.omitted}`,
    ...Object.entries(dirtyFiles.summary).map(([classification, count]) => `- ${classification}: ${count}`),
    "",
    "### Retained Detail",
    "",
    ...(Object.keys(dirtyFiles.classifications).length ? Object.entries(dirtyFiles.classifications).map(([file, classification]) => `- ${file}: ${classification}`) : ["- none"]),
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
const classifications = Object.fromEntries(changedFiles().map((file) => [file, classifyFrontendConsolidationDirtyFile(file)]));
const compactClassifications = compactFrontendConsolidationDirtyClassifications(classifications);

const toolingFailures = toolchain.gitStatus !== "available"
  ? [`git_required: frontend component consolidation cannot clear current-head/dirty-tree proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`]
  : [];
write("agent/state/frontend-component-consolidation.generated.json", JSON.stringify({ ...report, gitStatus: toolchain.gitStatus, currentHeadSource: toolchain.currentHeadSource, toolingDegraded: toolchain.toolingDegraded, degradationReason: toolchain.degradationReason, dirtyFileCount: compactClassifications.total, dirtyFileClassificationSummary: compactClassifications.summary, dirtyFileClassificationOmitted: compactClassifications.omitted, dirtyFileClassification: compactClassifications.classifications, validationFailures: [...validations, ...toolingFailures] }, null, 2));
write("docs/agent-truth/frontend-component-consolidation.md", renderDoc(report, compactClassifications));
write("agent/state/frontend-gut-consolidation.generated.json", JSON.stringify({ ...gut, dirtyFileCount: compactClassifications.total, dirtyFileClassificationSummary: compactClassifications.summary, dirtyFileClassificationOmitted: compactClassifications.omitted, dirtyFileClassification: compactClassifications.classifications }, null, 2));
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
