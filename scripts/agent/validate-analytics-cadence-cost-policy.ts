import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAnalyticsCadenceCostPolicyReport,
  validateAnalyticsCadenceCostPolicyReport,
  type AnalyticsCadenceCostPolicyReport,
} from "../../src/lib/analytics/analytics-cadence-policy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = "agent/state/analytics-cadence-cost-policy.generated.json";
const docPath = "docs/agent-truth/analytics-cadence-cost-policy.md";

function read(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "") : "";
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function renderMarkdown(report: AnalyticsCadenceCostPolicyReport) {
  const lines = [
    "# Analytics Cadence Cost Policy",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "This report locks source policy for analytics cadence and cost. It does not prove provider billing reduction and does not downgrade priority-live tracking.",
    "",
    "## Summary",
    "",
    `- Non-priority TTL: ${report.summary.nonPriorityTtlMs} ms`,
    `- Priority live preserved: ${report.summary.priorityLivePreserved}`,
    `- BigQuery export detected: ${report.summary.bigQueryExportDetected}`,
    `- BigQuery daily cadence: ${report.summary.bigQueryDailyCadence}`,
    `- BigQuery query cost guards: ${report.summary.bigQueryQueryCostGuards}`,
    `- Cloud SQL detected: ${report.summary.cloudSqlDetected}`,
    `- Cloud SQL pool/batch classified: ${report.summary.cloudSqlPoolBatchClassified}`,
    `- Admin evidence cadence guarded: ${report.summary.adminEvidenceCadenceGuarded}`,
    `- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}`,
    "",
    "## Priority Map",
    "",
    "| Task | Priority | Cadence |",
    "| --- | --- | --- |",
    ...report.priorityMap.map((entry) => `| ${entry.taskKey} | ${entry.priority} | ${entry.cadence} |`),
    "",
    "## Findings",
    "",
    "| Id | Severity | Status | Next action |",
    "| --- | --- | --- | --- |",
    ...[...report.bigQueryFindings, ...report.cloudSqlFindings, ...report.cadenceFindings]
      .map((entry) => `| ${entry.id} | ${entry.severity} | ${entry.status} | ${entry.nextAction} |`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  return lines.join("\n");
}

function assertSourceContracts(report: AnalyticsCadenceCostPolicyReport) {
  const failures: string[] = [];
  const cadencePolicy = read("src/lib/analytics/analytics-cadence-policy.ts");
  const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
  const adminAnalyticsData = read("src/lib/server/admin-analytics-data.ts");
  const analyticsIngest = read("src/app/api/analytics/ingest/route.ts");

  if (!cadencePolicy.includes("ANALYTICS_NON_PRIORITY_TTL_MS = 24 * 60 * 60 * 1000")) {
    failures.push("non-priority analytics lacks 24h TTL.");
  }
  if (!cadencePolicy.includes('"priority_live"') || !cadencePolicy.includes('"non_priority_evidence"')) {
    failures.push("analytics priority levels are missing.");
  }
  if (!adminAnalyticsData.includes("ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS = ANALYTICS_NON_PRIORITY_TTL_MS")) {
    failures.push("debug/evidence routes refresh eagerly or lack 24h cadence.");
  }
  if (!analyticsIngest.includes("materializeUserTrackingIndexes") || !cadencePolicy.includes("analytics_ingest")) {
    failures.push("priority ingest is downgraded for cost.");
  }
  if (report.summary.bigQueryExportDetected) {
    for (const expected of [
      "BIGQUERY_EXPORT_MIN_CADENCE_MS",
      "dryRunRequiredForQueries",
      "maximumBytesBilledRequiredForQueries",
      "partitionFilterRequired",
      "claimBigQueryExportWindow",
    ]) {
      if (!bigQueryExport.includes(expected)) {
        failures.push(`BigQuery export source missing ${expected}.`);
      }
    }
  }
  if (report.summary.cloudSqlDetected && !report.summary.cloudSqlPoolBatchClassified) {
    failures.push("Cloud SQL detected but no pool/batch/cost finding.");
  }
  if (!report.cloudSqlFindings.some((entry) => /billing_observed|external billing/iu.test(`${entry.status} ${entry.evidence.join(" ")}`))) {
    failures.push("report ignores billing-observed Cloud SQL cost.");
  }

  return failures;
}

function main() {
  const report = buildAnalyticsCadenceCostPolicyReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    sources: {
      bigQueryExport: read("functions/src/analytics-bigquery-export.ts"),
      cloudSql: [
        read("AGENTS.md"),
        read("dataconnect/dataconnect.yaml"),
        read("docs/doctrine/surfaces/cloud-sql-bigquery.md"),
        read("agent/state/analytics-cost-runtime-inventory.generated.json"),
      ].join("\n"),
      adminAnalyticsData: read("src/lib/server/admin-analytics-data.ts"),
      priorityIngest: [
        read("src/app/api/analytics/ingest/route.ts"),
        read("src/lib/analytics/watch-time-v2.ts"),
        read("src/app/api/analytics/identity-link/route.ts"),
      ].join("\n"),
    },
  });

  const failures = [
    ...validateAnalyticsCadenceCostPolicyReport(report).failures,
    ...assertSourceContracts(report),
  ];

  if (failures.length > 0) {
    console.error("Analytics cadence cost policy validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  mkdirSync(dirname(join(repoRoot, artifactPath)), { recursive: true });
  mkdirSync(dirname(join(repoRoot, docPath)), { recursive: true });
  writeFileSync(join(repoRoot, artifactPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(repoRoot, docPath), renderMarkdown(report), "utf8");

  console.log(
    `Analytics cadence cost policy passed. ttl=${report.summary.nonPriorityTtlMs} bigQuery=${report.summary.bigQueryDailyCadence} cloudSqlBatch=${report.summary.cloudSqlPoolBatchClassified}`,
  );
}

main();
