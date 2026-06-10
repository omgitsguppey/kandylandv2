import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLegacyHistoryPurgatoryQueueReport,
  buildLegacyHistoryReconciliationReport,
  validateLegacyHistoryReconciliationReport,
  type LegacyHistoryPurgatoryQueueReport,
  type LegacyHistoryCandidate,
  type LegacyHistoryReconciliationReport,
} from "../../src/lib/analytics/legacy-history-reconciler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

const mappingReportPath = "agent/state/analytics-legacy-mapping-report.generated.json";
const artifactPath = "agent/state/analytics-legacy-history-reconciliation.generated.json";
const purgatoryQueuePath = "agent/state/analytics-legacy-purgatory-queue.generated.json";
const docsPath = "docs/agent-truth/analytics-legacy-history-reconciliation.md";
const reconcilerPath = "src/lib/analytics/legacy-history-reconciler.ts";
const testPath = "tests/unit/analytics-legacy-history-reconciliation.spec.ts";
const truthLayerDocPath = "docs/agent-truth/analytics-truth-layer-v2.md";
const sourceHierarchyDocPath = "docs/agent-truth/analytics-source-hierarchy.md";
const rewireDocPath = "docs/agent-truth/analytics-rewire-phase-one.md";

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

function parseTime(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toCandidate(raw: Record<string, unknown>): LegacyHistoryCandidate {
  const canonical = (raw.canonicalEvent ?? {}) as Record<string, unknown>;
  return {
    legacySource: String(raw.legacySource ?? "unknown"),
    legacyId: String(raw.legacyId ?? "unknown"),
    eventId: typeof canonical.eventId === "string" ? canonical.eventId : undefined,
    mappedEventName: typeof raw.mappedEventName === "string" ? raw.mappedEventName : undefined,
    sessionId: typeof canonical.sessionId === "string" ? canonical.sessionId : undefined,
    userId: typeof canonical.userId === "string" ? canonical.userId : undefined,
    guestId: typeof canonical.anonymousVisitorId === "string" ? canonical.anonymousVisitorId : undefined,
    identityLinkId: typeof canonical.identityLinkId === "string" ? canonical.identityLinkId : undefined,
    route: typeof canonical.route === "string" ? canonical.route : undefined,
    source: typeof canonical.source === "string" ? canonical.source : undefined,
    occurredAtMs: parseTime(canonical.occurredAt) || parseTime(raw.legacyTimestamp),
    canonicalEvent: {
      eventId: typeof canonical.eventId === "string" ? canonical.eventId : null,
      sessionId: typeof canonical.sessionId === "string" ? canonical.sessionId : null,
      userId: typeof canonical.userId === "string" ? canonical.userId : null,
      anonymousVisitorId: typeof canonical.anonymousVisitorId === "string" ? canonical.anonymousVisitorId : null,
      identityLinkId: typeof canonical.identityLinkId === "string" ? canonical.identityLinkId : null,
      route: typeof canonical.route === "string" ? canonical.route : null,
      source: typeof canonical.source === "string" ? canonical.source : null,
      occurredAt: typeof canonical.occurredAt === "string" ? canonical.occurredAt : null,
    },
  };
}

function renderMarkdown(report: LegacyHistoryReconciliationReport, purgatory: LegacyHistoryPurgatoryQueueReport) {
  const rows = report.candidateMappings
    .map((entry) => `| ${entry.legacySource} | ${entry.legacyId} | ${entry.targetTruthLayer} | ${entry.purgatoryClassification} | ${entry.identityConfidence} | ${entry.duplicateRisk} | ${entry.suggestedRecoveryAction} | ${entry.currentTotalsEligible ? "yes" : "no"} |`)
    .join("\n");
  const purgatoryRows = purgatory.queue
    .map((entry) => `| ${entry.legacySource} | ${entry.legacyId} | ${entry.purgatoryClassification} | ${entry.reasonCodes.join(", ")} | ${entry.suggestedRecoveryAction} | ${entry.manualReviewRequired ? "yes" : "no"} |`)
    .join("\n");
  const cleanupRows = report.sourceCleanupFindings
    .map((entry) => `| ${entry.source} | ${entry.status} | ${entry.action} |`)
    .join("\n");
  const costRows = report.costFindings
    .map((entry) => `| ${entry.lane} | ${entry.status} | ${entry.action} |`)
    .join("\n");
  const nextRows = report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`).join("\n");

  return `# Analytics Legacy History Reconciliation

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

This is a dry-run source artifact. It maps legacy history into current truth lanes with confidence and duplicate-risk labels. It does not read production data, write production data, run BigQuery jobs, or promote legacy evidence into current totals.

## Summary

- Candidates: ${report.summary.candidateCount}
- Exact matches: ${report.summary.exactMatchCount}
- Probable matches: ${report.summary.probableMatchCount}
- Weak matches: ${report.summary.weakMatchCount}
- Unknown legacy rows: ${report.summary.unknownLegacyCount}
- Purgatory queue rows: ${report.summary.purgatoryQueueCount}
- High duplicate risk: ${report.summary.highDuplicateRiskCount}
- Current totals eligible: ${report.summary.currentTotalsEligibleCount}
- Overwrites current truth: ${report.summary.overwritesCurrentTruth ? "yes" : "no"}

## Candidate Mappings

| Legacy source | Legacy id | Target truth layer | Purgatory classification | Identity confidence | Duplicate risk | Suggested recovery action | Current totals eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Purgatory Queue

| Legacy source | Legacy id | Classification | Reason codes | Suggested action | Manual review |
| --- | --- | --- | --- | --- | --- |
${purgatoryRows}

## Source Cleanup

| Source | Status | Action |
| --- | --- | --- |
${cleanupRows}

## Cost Lanes

| Lane | Status | Action |
| --- | --- | --- |
${costRows}

## Next Fix Order

${nextRows}
`;
}

function writeReport(report: LegacyHistoryReconciliationReport, purgatory: LegacyHistoryPurgatoryQueueReport) {
  const artifactFullPath = join(repoRoot, artifactPath);
  const purgatoryFullPath = join(repoRoot, purgatoryQueuePath);
  const docsFullPath = join(repoRoot, docsPath);
  mkdirSync(dirname(artifactFullPath), { recursive: true });
  mkdirSync(dirname(purgatoryFullPath), { recursive: true });
  mkdirSync(dirname(docsFullPath), { recursive: true });
  writeFileSync(artifactFullPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(purgatoryFullPath, `${JSON.stringify(purgatory, null, 2)}\n`);
  writeFileSync(docsFullPath, renderMarkdown(report, purgatory));
}

function assertIncludes(source: string, expected: string, label: string, failures: string[]) {
  if (!source.includes(expected)) {
    failures.push(`${label} missing: ${expected}`);
  }
}

function run() {
  const mappingReport = readJsonRequired<{ recoveredEvents?: Array<Record<string, unknown>> }>(mappingReportPath);
  const candidates = (mappingReport.recoveredEvents ?? []).map(toCandidate);
  const report = buildLegacyHistoryReconciliationReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    candidates,
    currentTruth: {
      events: [],
      identityLinks: [],
    },
  });
  const purgatory = buildLegacyHistoryPurgatoryQueueReport({
    currentHead: report.currentHead,
    generatedAtUtc: report.generatedAtUtc,
    reconciliation: report,
  });
  const failures = validateLegacyHistoryReconciliationReport(report, {
    reconcilerSource: readRequired(reconcilerPath),
    currentHead: report.currentHead,
  });

  const truthLayerDoc = readRequired(truthLayerDocPath);
  const sourceHierarchyDoc = readRequired(sourceHierarchyDocPath);
  const rewireDoc = readRequired(rewireDocPath);
  const tests = readRequired(testPath);

  assertIncludes(truthLayerDoc, "GA4 and BigQuery are verification/export lanes, not product truth by default.", truthLayerDocPath, failures);
  assertIncludes(truthLayerDoc, "analytics_admin_metric_snapshots", truthLayerDocPath, failures);
  assertIncludes(sourceHierarchyDoc, "realtime", sourceHierarchyDocPath, failures);
  assertIncludes(rewireDoc, "remains a legacy, fallback, live-pulse, or evidence source", rewireDocPath, failures);
  assertIncludes(tests, "archives unknown identity candidates", testPath, failures);
  assertIncludes(tests, "keeps external evidence and realtime summaries out of product truth", testPath, failures);

  if (report.summary.overwritesCurrentTruth !== false) {
    failures.push("current product truth cannot be overwritten.");
  }
  if (report.candidateMappings.some((entry) => entry.identityConfidence === "unknown" && entry.currentTotalsEligible)) {
    failures.push("unknown legacy data cannot appear as current totals.");
  }
  if (purgatory.summary.productTruthEligible !== 0 || purgatory.queue.some((entry) => entry.currentTotalsEligible)) {
    failures.push("purgatory queue cannot mark legacy rows product-truth eligible.");
  }
  if (purgatory.queue.length !== report.summary.purgatoryQueueCount) {
    failures.push("purgatory queue count does not match reconciliation summary.");
  }
  if (!purgatory.productTruthPolicy.weakMatchesRemainEvidenceOnly || !purgatory.productTruthPolicy.unknownLegacyIsNotZero) {
    failures.push("purgatory queue policy does not protect weak/unknown legacy rows.");
  }

  if (failures.length > 0) {
    console.error("Analytics legacy history reconciliation validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  writeReport(report, purgatory);
  console.log(`Wrote ${artifactPath}`);
  console.log(`Wrote ${purgatoryQueuePath}`);
  console.log(`Wrote ${docsPath}`);
  console.log("Analytics legacy history reconciliation validation passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
