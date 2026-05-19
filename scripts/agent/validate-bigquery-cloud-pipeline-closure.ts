import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BIGQUERY_EXPORT_CONTRACT,
  buildBigQueryExportEvidenceState,
  resolveBigQueryExportStatus,
  validateBigQueryExportContractClosure,
} from "../../src/lib/analytics/bigquery-export-contract";
import { listBigQueryExportCandidates } from "../../src/lib/analytics/materialization-contract";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type BigQueryCloudPipelineClosureReport = {
  generatedAtUtc: string;
  reportKey: "bigquery-cloud-pipeline-closure";
  currentHead: string;
  summary: {
    exportContractCreated: boolean;
    scheduledWindowExportEnabled: boolean;
    eventTriggeredExportDisabled: boolean;
    watermarkDefined: boolean;
    failureTtlDefined: boolean;
    configMissingStateDefined: boolean;
    missingBigQueryNotZeroTraffic: boolean;
    exportedClaimRequiresInsertPath: boolean;
    queryCostGuardDefined: boolean;
    eventFactsExportEligible: boolean;
    firstPartySummariesRemainProductTruth: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  exportContract: typeof BIGQUERY_EXPORT_CONTRACT;
  exportFindings: Finding[];
  configFindings: Finding[];
  costFindings: Finding[];
  truthFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/bigquery-cloud-pipeline-closure.generated.json";
const docsRelativePath = "docs/agent-truth/bigquery-cloud-pipeline-closure.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countBlocking(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: BigQueryCloudPipelineClosureReport) {
  const lines = [
    "# BigQuery Cloud Pipeline Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Export contract created: ${report.summary.exportContractCreated ? "yes" : "no"}`,
    `- Scheduled/windowed export enabled: ${report.summary.scheduledWindowExportEnabled ? "yes" : "no"}`,
    `- Event-triggered export disabled: ${report.summary.eventTriggeredExportDisabled ? "yes" : "no"}`,
    `- Watermark defined: ${report.summary.watermarkDefined ? "yes" : "no"}`,
    `- Failure TTL defined: ${report.summary.failureTtlDefined ? "yes" : "no"}`,
    `- Config-missing state defined: ${report.summary.configMissingStateDefined ? "yes" : "no"}`,
    `- Missing BigQuery treated as zero traffic: ${report.summary.missingBigQueryNotZeroTraffic ? "no" : "risk"}`,
    `- Exported status requires insert path: ${report.summary.exportedClaimRequiresInsertPath ? "yes" : "no"}`,
    `- Query cost guard defined: ${report.summary.queryCostGuardDefined ? "yes" : "no"}`,
    `- Event facts export eligible: ${report.summary.eventFactsExportEligible ? "yes" : "no"}`,
    `- First-party summaries remain product truth: ${report.summary.firstPartySummariesRemainProductTruth ? "yes" : "no"}`,
    "",
    "## Export Contract",
    "",
    `- Source collection: ${report.exportContract.sourceCollection}`,
    `- Destination: ${report.exportContract.destination.defaultDatasetId}.${report.exportContract.destination.defaultTableId}`,
    `- Watermark: ${report.exportContract.watermark.collection}/${report.exportContract.watermark.documentId}`,
    `- Cadence: ${report.exportContract.cadence.kind} (${report.exportContract.cadence.schedule})`,
    `- Max rows per batch: ${report.exportContract.batch.maxRows}`,
    `- Truth class: ${report.exportContract.truthClass}`,
    `- Missing config behavior: ${report.exportContract.missingConfigTrafficBehavior}`,
    "",
    "## Findings",
    "",
    ...[
      ...report.exportFindings,
      ...report.configFindings,
      ...report.costFindings,
      ...report.truthFindings,
    ].map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

export function validateBigQueryCloudPipelineClosure(options: { writeReport?: boolean } = {}) {
  const contractValidation = validateBigQueryExportContractClosure();
  const functionsIndex = read("functions/src/index.ts");
  const exportSource = read("functions/src/analytics-bigquery-export.ts");
  const materializationCandidates = listBigQueryExportCandidates();
  const missingConfigEvidence = buildBigQueryExportEvidenceState({ env: {}, firstPartySummariesActive: true });

  const exportContractCreated = has("src/lib/analytics/bigquery-export-contract.ts");
  const scheduledWindowExportEnabled = functionsIndex.includes("scheduledBigQueryRawEventsExport")
    && exportSource.includes('schedule: "0 4 * * *"')
    && exportSource.includes("runBigQueryRawEventsExportWindow");
  const eventTriggeredExportDisabled = !functionsIndex.includes("onAnalyticsEventFactBigQueryExport")
    && !exportSource.includes("onDocumentCreated")
    && !exportSource.includes("onAnalyticsEventFactBigQueryExport");
  const watermarkDefined = exportSource.includes("buildBigQueryExportWatermarkWindow")
    && exportSource.includes("analytics_export_status")
    && exportSource.includes("lastExportedEventTimestampMs")
    && BIGQUERY_EXPORT_CONTRACT.watermark.collection === "analytics_export_status";
  const failureTtlDefined = exportSource.includes("BIGQUERY_EXPORT_STATUS_FAILURE_TTL_MS")
    && exportSource.includes("BIGQUERY_EXPORT_READINESS_FAILURE_TTL_MS")
    && BIGQUERY_EXPORT_CONTRACT.retry.failureTtlMs > 0;
  const configMissingStateDefined = resolveBigQueryExportStatus({}) === "config_missing"
    && exportSource.includes("config_missing")
    && exportSource.includes("BigQuery export config missing");
  const missingBigQueryNotZeroTraffic = missingConfigEvidence.trafficInterpretation === "unavailable_not_zero"
    && missingConfigEvidence.productAnalyticsFailure === false
    && BIGQUERY_EXPORT_CONTRACT.missingConfigTrafficBehavior === "unavailable_not_zero";
  const exportedClaimRequiresInsertPath = exportSource.includes("await dataset.table(TABLE_ID).insert(rows)")
    && exportSource.includes('status: "healthy"')
    && BIGQUERY_EXPORT_CONTRACT.successSemantics.claimsExportedOnlyAfterInsert === true;
  const queryCostGuardDefined = exportSource.includes("dryRunRequiredForQueries: true")
    && exportSource.includes("maximumBytesBilledRequiredForQueries: true")
    && exportSource.includes("partitionFilterRequired: true")
    && BIGQUERY_EXPORT_CONTRACT.queryCostGuards.dryRunRequiredForQueries === true;
  const eventFactsExportEligible = materializationCandidates.includes("analytics_event_facts")
    && BIGQUERY_EXPORT_CONTRACT.sourceCollection === "analytics_event_facts";
  const firstPartySummariesRemainProductTruth = BIGQUERY_EXPORT_CONTRACT.primaryProductTruth === false
    && BIGQUERY_EXPORT_CONTRACT.firstPartyFallback.missingBigQueryDoesNotFailProductAnalytics === true;

  const exportFindings = [
    finding("export-contract-validates", contractValidation.ok, contractValidation.ok
      ? "BigQuery export contract validates with no open findings."
      : `BigQuery export contract findings: ${contractValidation.findings.join("; ")}`, "P0"),
    finding("scheduled-window-export-enabled", scheduledWindowExportEnabled, "Functions index exposes scheduledBigQueryRawEventsExport and the source keeps the daily window.", "P0"),
    finding("event-triggered-export-disabled", eventTriggeredExportDisabled, "Event-fact-created BigQuery export trigger is no longer an active export claim path.", "P0"),
    finding("watermark-defined", watermarkDefined, "BigQuery export uses analytics_export_status watermark fields.", "P0"),
    finding("exported-claim-requires-insert", exportedClaimRequiresInsertPath, "Healthy/exported status is only recorded through the batch insert path.", "P0"),
  ];

  const configFindings = [
    finding("config-missing-state-defined", configMissingStateDefined, "Missing BigQuery env produces config_missing instead of a default export claim.", "P0"),
    finding("missing-bigquery-not-zero", missingBigQueryNotZeroTraffic, "Missing BigQuery evidence is unavailable_not_zero and first-party summaries remain product truth.", "P0"),
  ];

  const costFindings = [
    finding("failure-ttl-defined", failureTtlDefined, "Readiness and status failures are TTL-capped.", "P0"),
    finding("query-cost-guards-defined", queryCostGuardDefined, "Future query lanes require dry-run, maximumBytesBilled, and partition filters.", "P0"),
  ];

  const truthFindings = [
    finding("event-facts-export-eligible", eventFactsExportEligible, "analytics_event_facts is explicitly marked as a BigQuery export candidate.", "P0"),
    finding("first-party-summaries-product-truth", firstPartySummariesRemainProductTruth, "BigQuery remains analytics evidence only; first-party summaries remain product truth.", "P0"),
  ];

  const fixesApplied = [
    finding("bigquery-export-contract-added", exportContractCreated, "Added src/lib/analytics/bigquery-export-contract.ts."),
    finding("scheduled-export-surface-exposed", scheduledWindowExportEnabled, "Exposed scheduledBigQueryRawEventsExport as the active Functions export lane."),
    finding("event-trigger-export-retired-from-source", eventTriggeredExportDisabled, "Removed the event-triggered BigQuery export claim from source."),
    finding("config-missing-evidence-state-added", configMissingStateDefined, "Added config_missing status handling for missing BigQuery export env."),
  ];

  const allFindings = [
    ...exportFindings,
    ...configFindings,
    ...costFindings,
    ...truthFindings,
    ...fixesApplied,
  ];

  const report: BigQueryCloudPipelineClosureReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "bigquery-cloud-pipeline-closure",
    currentHead: currentHead(),
    summary: {
      exportContractCreated,
      scheduledWindowExportEnabled,
      eventTriggeredExportDisabled,
      watermarkDefined,
      failureTtlDefined,
      configMissingStateDefined,
      missingBigQueryNotZeroTraffic,
      exportedClaimRequiresInsertPath,
      queryCostGuardDefined,
      eventFactsExportEligible,
      firstPartySummariesRemainProductTruth,
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    exportContract: BIGQUERY_EXPORT_CONTRACT,
    exportFindings,
    configFindings,
    costFindings,
    truthFindings,
    fixesApplied,
    prCleanupActions: ["No open BigQuery/export/cloud pipeline PRs were present at start."],
    nextFixOrder: [
      "After deployment, verify scheduledBigQueryRawEventsExport heartbeat in Firebase/Cloud console before treating warehouse evidence as active.",
      "If owner approves BigQuery queries, add dry-run and maximumBytesBilled validation before any query executes.",
      "Keep first-party Firestore summaries as product truth even when BigQuery evidence is configured.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const failures = allFindings.filter((entry) => entry.status === "missing");
  if (failures.length > 0) {
    throw new Error(`BigQuery cloud pipeline closure failed: ${failures.map((entry) => entry.id).join(", ")}`);
  }

  return report;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/agent/validate-bigquery-cloud-pipeline-closure.ts")) {
  validateBigQueryCloudPipelineClosure({ writeReport: true });
  console.log("BigQuery cloud pipeline closure validation passed.");
}
