import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLegacyRecoveryReconciliationReport,
  validateLegacyRecoveryReconciliationReport,
  type LegacyRecoveryCandidateInput,
  type LegacyRecoveryReconciliationReport,
} from "../../src/lib/analytics/legacy-recovery-reconciler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

const sourceInventoryPath = "agent/state/analytics-legacy-source-inventory.generated.json";
const mappingReportPath = "agent/state/analytics-legacy-mapping-report.generated.json";
const artifactPath = "agent/state/analytics-legacy-recovery-reconciliation.generated.json";
const docsPath = "docs/agent-truth/analytics-legacy-recovery-reconciliation.md";
const reconcilerPath = "src/lib/analytics/legacy-recovery-reconciler.ts";

function currentHead() {
  const headPath = join(repoRoot, ".git", "HEAD");
  if (!existsSync(headPath)) return "unknown";
  const head = readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref:")) return head;
  const refPath = join(repoRoot, ".git", head.slice("ref:".length).trim());
  if (existsSync(refPath)) {
    return readFileSync(refPath, "utf8").trim();
  }
  return "unknown";
}

function readRequired(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(fullPath, "utf8");
}

function readJsonRequired<T>(relativePath: string): T {
  return JSON.parse(readRequired(relativePath)) as T;
}

function renderMarkdown(report: LegacyRecoveryReconciliationReport) {
  const candidateRows = report.candidateMappings
    .map((candidate) => `| ${candidate.legacySource} | ${candidate.legacyId} | ${candidate.targetTruthLayer} | ${candidate.identityConfidence} | ${candidate.duplicateRisk} | ${candidate.recoveryAction} | ${candidate.recoveryMode} | ${candidate.productionMutationAllowed ? "yes" : "no"} | ${candidate.reason} |`)
    .join("\n");
  const sourceRows = report.sourceTruthMap
    .map((entry) => `| ${entry.source} | ${entry.truthLayer} | ${entry.currentProductTruth ? "yes" : "no"} | ${entry.notes} |`)
    .join("\n");
  const costRows = report.costFindings
    .map((finding) => `| ${finding.lane} | ${finding.status} | ${finding.severity} | ${finding.action} |`)
    .join("\n");
  const nextRows = report.nextFixOrder.map((item, index) => `${index + 1}. ${item}`).join("\n");

  return `# Analytics Legacy Recovery Reconciliation

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

## Summary

- Candidate mappings: ${report.summary.candidateCount}
- Exact matches: ${report.summary.exactMatchCount}
- High duplicate risk: ${report.summary.duplicateRiskHighCount}
- Evidence-only candidates: ${report.summary.evidenceOnlyCount}
- Product truth sources: ${report.summary.productTruthSources}
- Overwrites current truth: ${report.summary.overwritesCurrentTruth ? "yes" : "no"}
- Dry run only: ${report.productTruthPolicy.dryRunOnly ? "yes" : "no"}
- Production mutation allowed: ${report.productTruthPolicy.productionMutationAllowed ? "yes" : "no"}
- External evidence can promote product truth: ${report.productTruthPolicy.externalEvidenceCanPromoteProductTruth ? "yes" : "no"}
- Cloud SQL status: ${report.summary.cloudSqlStatus}
- Gemini/Cloud Assist status: ${report.summary.geminiCloudAssistStatus}

## Candidate Mappings

| Legacy source | Legacy id | Target truth layer | Identity confidence | Duplicate risk | Recovery action | Recovery mode | Production mutation | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${candidateRows}

## Source Truth

| Source | Truth layer | Current product truth | Notes |
| --- | --- | --- | --- |
${sourceRows}

## Cost Lanes

| Lane | Status | Severity | Action |
| --- | --- | --- | --- |
${costRows}

## Next Fix Order

${nextRows}
`;
}

function writeReport(report: LegacyRecoveryReconciliationReport) {
  const artifactFullPath = join(repoRoot, artifactPath);
  const docsFullPath = join(repoRoot, docsPath);
  mkdirSync(dirname(artifactFullPath), { recursive: true });
  mkdirSync(dirname(docsFullPath), { recursive: true });
  writeFileSync(artifactFullPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsFullPath, renderMarkdown(report));
}

function run() {
  const sourceInventory = readJsonRequired<{ sources?: Array<{ sourceName?: string; recoverability?: string }> }>(sourceInventoryPath);
  const mappingReport = readJsonRequired<{ recoveredEvents?: LegacyRecoveryCandidateInput[]; unmappedRecords?: unknown[] }>(mappingReportPath);
  const report = buildLegacyRecoveryReconciliationReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    sourceInventory,
    mappingReport,
    currentTruth: {
      eventIds: [],
      dedupeKeys: [],
      identityLinks: [],
    },
  });
  const failures = validateLegacyRecoveryReconciliationReport(report, {
    reconcilerSource: readRequired(reconcilerPath),
    currentHead: report.currentHead,
  });

  if (failures.length > 0) {
    console.error("Analytics legacy recovery reconciliation validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  writeReport(report);
  console.log(`Wrote ${artifactPath}`);
  console.log(`Wrote ${docsPath}`);
  console.log("Analytics legacy recovery reconciliation validation passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
