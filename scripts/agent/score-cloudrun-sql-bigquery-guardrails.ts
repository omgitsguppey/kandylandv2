import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_SQL_MIRROR_PATHS,
  BIGQUERY_PIPELINE_CONTRACTS,
  CLOUD_RUN_SERVICE_GUARDRAILS,
  FORBIDDEN_SQL_RUNTIME_PATHS,
  SQL_COST_SURFACES,
  type BigQueryPipelineContract,
  type CloudRunServiceGuardrail,
  type SqlCostSurface,
} from "../../src/lib/server/cloud-cost-contract";

type Severity = "info" | "minor" | "moderate" | "major" | "critical";
type CloudCostFinding = {
  id: string;
  severity: Severity;
  category: "cloud_run" | "cloud_sql" | "dataconnect" | "bigquery_export" | "bigquery_import" | "docs_evidence" | "cost_debug";
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  evidence: string[];
};

type CloudCostReport = {
  generatedAt: string;
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  cloudRunFindings: CloudCostFinding[];
  sqlFindings: CloudCostFinding[];
  bigQueryFindings: CloudCostFinding[];
  recommendedLimits: CloudRunServiceGuardrail[];
  sqlCostSurfaces: SqlCostSurface[];
  bigQueryPipelines: BigQueryPipelineContract[];
  manualCloudConsoleChecklist: string[];
  forbiddenRuntimePaths: readonly string[];
  allowedSqlMirrorPaths: readonly string[];
  bigQueryExportStatus: "export_config_found" | "export_config_missing" | "bigquery_export_unconfirmed";
  bigQueryImportStatus: "import_validator_found" | "import_validator_missing" | "runtime_import_blocked";
  minimalCommands: string[];
  forbiddenCommands: string[];
  suggestedCommands: string[];
  summary: string;
};

const repoRoot = process.cwd();
const reportPath = "agent/state/cloudrun-sql-bigquery-guardrails.generated.json";

const severityImpact: Record<Severity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const minimalCommands = [
  "npm run score:cloud-cost",
  "npm run check:cloud-cost",
];

const forbiddenCommands = [
  "playwright",
  "cypress",
  "lighthouse",
  "npm run check",
  "gcloud",
  "firebase deploy",
  "BigQuery jobs",
  "Data Connect deploys",
];

function repoPath(...segments: string[]) {
  return path.join(repoRoot, ...segments);
}

function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function readIfExists(relativePath: string) {
  const absolutePath = repoPath(relativePath);
  if (!existsSync(absolutePath)) return "";
  return readFileSync(absolutePath, "utf8");
}

function walkFiles(startDir: string, extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".gql", ".json", ".yaml", ".yml", ".md"])) {
  const results: string[] = [];
  const absoluteStart = repoPath(startDir);
  if (!existsSync(absoluteStart)) return results;
  const skip = new Set([".git", ".next", "node_modules", "coverage", "test-results", "playwright-report", "lighthouse-results"]);

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) visit(path.join(directory, entry.name));
        continue;
      }
      if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;
      results.push(normalizePath(path.relative(repoRoot, path.join(directory, entry.name))));
    }
  }

  visit(absoluteStart);
  return results.sort();
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function addFinding(findings: CloudCostFinding[], input: Omit<CloudCostFinding, "id" | "scoreImpact">) {
  findings.push({
    ...input,
    id: `cloud-cost-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
  });
}

function parseYamlNumber(source: string, key: string) {
  const match = source.match(new RegExp(`\\b${key}:\\s*(\\d+)`, "u"));
  return match ? Number.parseInt(match[1], 10) : null;
}

function docsCorpus() {
  return [
    "docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md",
    "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
    "docs/agent-truth/environment-deployment-truth.md",
    "docs/agent-truth/analytics-file-inventory.md",
    "README.md",
    "AGENTS.md",
    "REPO_MEMORY_LEDGER.md",
    "EVERY_FILE_FUNCTION_CHECKLIST.md",
  ].map(readIfExists).join("\n");
}

function scanCloudRun(findings: CloudCostFinding[]) {
  const appHosting = readIfExists("apphosting.yaml");
  const maxInstances = parseYamlNumber(appHosting, "maxInstances");
  const concurrency = parseYamlNumber(appHosting, "concurrency");

  if (maxInstances === null) {
    addFinding(findings, {
      severity: "major",
      category: "cloud_run",
      title: "App Hosting lacks maxInstances cost cap",
      filePath: "apphosting.yaml",
      suggestedFix: "Document and configure maxInstances for App Hosting; suggested beta cap is 3-5 for the public shell.",
      evidence: ["maxInstances"],
    });
  }

  if (concurrency === null) {
    addFinding(findings, {
      severity: "major",
      category: "cloud_run",
      title: "App Hosting lacks explicit concurrency",
      filePath: "apphosting.yaml",
      suggestedFix: "Document and configure concurrency; Cloud Run default is 80 and Cloud SQL surfaces need lower route-specific guidance.",
      evidence: ["concurrency"],
    });
  } else if (concurrency > 80) {
    addFinding(findings, {
      severity: "major",
      category: "cloud_run",
      title: "App Hosting concurrency exceeds beta guardrail",
      filePath: "apphosting.yaml",
      line: lineOf(appHosting, "concurrency"),
      excerpt: excerptOf(appHosting, "concurrency"),
      suggestedFix: "Keep public beta concurrency at or below 80; use lower route-specific guidance for AI, media, cron, and Cloud SQL/Data Connect surfaces.",
      evidence: [`concurrency=${concurrency}`, "Cloud Run max concurrency is 1000; default is 80."],
    });
  }

  for (const guardrail of CLOUD_RUN_SERVICE_GUARDRAILS) {
    if (!guardrail.maxInstancesRequired) continue;
    if (guardrail.costRisk === "critical" && guardrail.recommendedMaxInstances > 1) {
      addFinding(findings, {
        severity: "critical",
        category: "cloud_run",
        title: "Critical Cloud Run surface lacks one-instance recommendation",
        filePath: "src/lib/server/cloud-cost-contract.ts",
        suggestedFix: "Set critical AI/Cloud SQL route guidance to max 1 unless an owner-approved budget plan exists.",
        evidence: [guardrail.serviceName],
      });
    }
  }

  if (!readIfExists("firebase.json").includes('"region": "us-central1"')) {
    addFinding(findings, {
      severity: "moderate",
      category: "cloud_run",
      title: "Firebase framework backend region is not documented as us-central1",
      filePath: "firebase.json",
      suggestedFix: "Keep App Hosting/framework backend region explicit so Cloud Run and Data Connect region assumptions stay aligned.",
      evidence: ["frameworksBackend.region"],
    });
  }
}

function scanSql(findings: CloudCostFinding[]) {
  const dataconnect = readIfExists("dataconnect/dataconnect.yaml");
  if (!dataconnect) {
    addFinding(findings, {
      severity: "major",
      category: "dataconnect",
      title: "Data Connect config is missing",
      filePath: "dataconnect/dataconnect.yaml",
      suggestedFix: "If Data Connect is intentionally removed, update the SQL mirror and cloud-cost doctrine.",
      evidence: ["dataconnect/dataconnect.yaml"],
    });
    return;
  }

  for (const expected of ['serviceId: "kandydrops"', 'location: "us-central1"', 'database: "kandydrops_db"', 'instanceId: "kandydrops-db"']) {
    if (!dataconnect.includes(expected)) {
      addFinding(findings, {
        severity: "major",
        category: "dataconnect",
        title: "Data Connect config drifted from approved agent mirror target",
        filePath: "dataconnect/dataconnect.yaml",
        suggestedFix: "Update the SQL cost contract before changing Data Connect service, region, database, or Cloud SQL instance.",
        evidence: [expected],
      });
    }
  }

  const docs = docsCorpus();
  for (const required of ["active", "paused", "deleted", "machine tier", "storage auto-increase", "backup", "HA", "read replica", "monthly budget"]) {
    if (!docs.toLowerCase().includes(required.toLowerCase())) {
      addFinding(findings, {
        severity: "major",
        category: "cloud_sql",
        title: "Cloud SQL cost/status documentation is incomplete",
        filePath: "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
        suggestedFix: "Record kandydrops-db active/paused/deleted state, machine tier, storage auto-increase, backups, HA/read replicas, and monthly budget target.",
        evidence: [required, "Cloud SQL can bill while provisioned/running. Confirm kandydrops-db status in Cloud Console."],
      });
    }
  }

  const schemaFiles = walkFiles("dataconnect/schema", new Set([".gql"]));
  const approvedAgentMirrorTypes = [
    "AgentRepoInventory",
    "AgentSurfaceMap",
    "AgentCanonicalHelper",
    "AgentVerificationCommand",
    "AgentKnowledgeRecord",
    "AgentTaskContextRun",
    "AgentActiveTask",
    "AgentHandoff",
    "AgentRetrievalEdge",
  ];
  const forbiddenRuntimeNames = [
    "users",
    "drops",
    "transactions",
    "support",
    "creator_subscriptions",
    "creator_call_bookings",
    "creator_messages",
    "wallet",
    "gumdrops",
  ];

  for (const filePath of schemaFiles) {
    const source = readIfExists(filePath);
    if (!source.includes("@table")) continue;
    const sourceWithoutComments = source
      .split(/\r?\n/u)
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    const tableNames = [...source.matchAll(/type\s+([A-Za-z0-9_]+)\s+@table/gu)].map((match) => match[1]);
    const nonMirrorTypes = tableNames.filter((tableName) => !approvedAgentMirrorTypes.includes(tableName));
    if (nonMirrorTypes.length > 0) {
      addFinding(findings, {
        severity: "major",
        category: "dataconnect",
        title: "Data Connect schema includes non-agent mirror tables without runtime approval",
        filePath,
        line: lineOf(source, nonMirrorTypes[0]),
        excerpt: excerptOf(source, nonMirrorTypes[0]),
        suggestedFix: "Remove inactive feature-serving tables or add an explicit approved SQL/Data Connect runtime contract before activation.",
        evidence: nonMirrorTypes,
      });
    }
    const declaredSqlNames = [
      ...tableNames,
      ...[...sourceWithoutComments.matchAll(/@table\(\s*name:\s*"([^"]+)"/gu)].map((match) => match[1]),
    ].map((name) => name.toLowerCase());
    for (const forbidden of forbiddenRuntimeNames) {
      if (declaredSqlNames.includes(forbidden)) {
        addFinding(findings, {
          severity: "critical",
          category: "dataconnect",
          title: "Data Connect schema appears to include runtime user/product table names",
          filePath,
          line: lineOf(sourceWithoutComments.toLowerCase(), forbidden),
          excerpt: excerptOf(sourceWithoutComments.toLowerCase(), forbidden),
          suggestedFix: "Block runtime user/product Data Connect schema until an explicit runtime SQL contract is approved.",
          evidence: [forbidden],
        });
      }
    }
  }

  const allowedPathPrefixes = ["dataconnect/", "agent/state/sql-", "scripts/agent/sync-sql.ts"];
  const allowedAuditScannerFiles = new Set([
    "scripts/agent/score-cloudrun-sql-bigquery-guardrails.ts",
    "scripts/agent/validate-cloudrun-sql-bigquery-guardrails.ts",
    "scripts/agent/score-google-cost-bleed.ts",
    "scripts/agent/validate-google-cost-bleed.ts",
  ]);
  const runtimeSqlPatterns = [
    { label: "pg", pattern: /from\s+["']pg["']|require\(["']pg["']\)/u },
    { label: "postgres", pattern: /from\s+["']postgres["']|require\(["']postgres["']\)/u },
    { label: "mysql", pattern: /from\s+["']mysql["']|require\(["']mysql["']\)/u },
    { label: "mysql2", pattern: /from\s+["']mysql2["']|require\(["']mysql2["']\)/u },
    { label: "prisma", pattern: /@prisma\/client|new\s+PrismaClient\s*\(/u },
    { label: "drizzle", pattern: /from\s+["']drizzle-orm/u },
    { label: "kysely", pattern: /from\s+["']kysely["']/u },
    { label: "sequelize", pattern: /from\s+["']sequelize["']/u },
    { label: "cloud-sql-connector", pattern: /@google-cloud\/cloud-sql-connector/u },
    { label: "DATABASE_URL", pattern: /process\.env\.DATABASE_URL/u },
    { label: "CLOUD_SQL_CONNECTION_NAME", pattern: /process\.env\.CLOUD_SQL_CONNECTION_NAME/u },
    { label: "Data Connect generated client", pattern: /from\s+["'][^"']*(?:dataconnect-generated|dataconnect-admin-generated|@firebasegen\/)/u },
  ];

  for (const filePath of [...walkFiles("src"), ...walkFiles("functions/src"), ...walkFiles("scripts")]) {
    if (allowedPathPrefixes.some((prefix) => filePath.startsWith(prefix) || filePath === prefix)) continue;
    if (allowedAuditScannerFiles.has(filePath)) continue;
    const source = readIfExists(filePath);
    const matched = runtimeSqlPatterns.find((candidate) => candidate.pattern.test(source));
    if (!matched) continue;
    const matchText = source.match(matched.pattern)?.[0] ?? matched.label;
    const matchedLine = excerptOf(source, matchText) ?? "";
    const matchIndex = source.indexOf(matchText);
    const context = matchIndex >= 0 ? source.slice(Math.max(0, matchIndex - 180), matchIndex + 260) : matchedLine;
    if (matched.label === "DATABASE_URL" && /FIREBASE_DATABASE_URL|default-rtdb|firebaseio\.com/u.test(context)) {
      continue;
    }
    addFinding(findings, {
      severity: "critical",
      category: "cloud_sql",
      title: "Runtime SQL/Data Connect client or env var appears outside approved mirror paths",
      filePath,
      line: lineOf(source, matchText),
      excerpt: matchedLine,
      suggestedFix: "Remove runtime SQL usage or add an explicit SqlCostSurface and ApiCostContract before use.",
      evidence: [matched.label],
    });
  }
}

function scanBigQuery(findings: CloudCostFinding[]) {
  const exportSource = readIfExists("functions/src/analytics-bigquery-export.ts");
  const docs = docsCorpus();
  const hasExport = exportSource.includes("@google-cloud/bigquery") && exportSource.includes("analytics_export_status");

  if (!hasExport) {
    addFinding(findings, {
      severity: "major",
      category: "bigquery_export",
      title: "BigQuery export status is unconfirmed",
      filePath: "functions/src/analytics-bigquery-export.ts",
      suggestedFix: "Either remove the BigQuery dependency or document the export pipeline and heartbeat surface.",
      evidence: ["bigquery_export_unconfirmed"],
    });
  } else {
    for (const expected of ["kandydrops_canonical_analytics", "raw_events", "analytics_export_status"]) {
      if (!exportSource.includes(expected) && !docs.includes(expected)) {
        addFinding(findings, {
          severity: "major",
          category: "bigquery_export",
          title: "BigQuery export contract lacks dataset/table/status evidence",
          filePath: "functions/src/analytics-bigquery-export.ts",
          suggestedFix: "Document Firebase product, BigQuery project, dataset, table pattern, daily/streaming mode, and status heartbeat.",
          evidence: [expected],
        });
      }
    }
  }

  for (const requiredDoc of ["Firebase product", "BigQuery project", "dataset", "table", "daily", "48h", "event filtering"]) {
    if (!docs.toLowerCase().includes(requiredDoc.toLowerCase())) {
      addFinding(findings, {
        severity: "major",
        category: "bigquery_export",
        title: "BigQuery export documentation is incomplete",
        filePath: "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
        suggestedFix: "Document Firebase export product, project id, dataset id, table pattern, daily/streaming mode, first sync freshness, and event filtering.",
        evidence: [requiredDoc],
      });
    }
  }

  const allSources = [...walkFiles("src"), ...walkFiles("functions/src"), ...walkFiles("scripts")]
    .map((filePath) => ({ filePath, source: readIfExists(filePath) }));
  const importCandidates = allSources.filter(({ source }) =>
    /from\s+["']@google-cloud\/bigquery["']|require\(["']@google-cloud\/bigquery["']\)|new\s+BigQuery\s*\(/u.test(source) &&
    /import|load|backfill|set\(|update\(|batch\.set|batch\.update/iu.test(source)
  );

  for (const candidate of importCandidates) {
    if (candidate.filePath === "functions/src/analytics-bigquery-export.ts") continue;
    if (!/dry.?run|schema|idempotent|validation report|cap rows|limit/iu.test(candidate.source)) {
      addFinding(findings, {
        severity: "critical",
        category: "bigquery_import",
        title: "Potential BigQuery import lacks dry-run/schema/idempotency evidence",
        filePath: candidate.filePath,
        suggestedFix: "Block runtime imports until a dry-run, schema-validated, idempotent, capped import contract exists.",
        evidence: ["BigQuery import safety"],
      });
    }
  }

  if (!docs.includes("importBackToRuntimeAllowed: false") && !docs.includes("runtime_import_blocked")) {
    addFinding(findings, {
      severity: "major",
      category: "bigquery_import",
      title: "BigQuery runtime import block is not documented",
      filePath: "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
      suggestedFix: "Document that BigQuery imports cannot mutate runtime balances, transactions, unlocks, creator subscriptions, or support messages without manual approval.",
      evidence: ["runtime_import_blocked"],
    });
  }

  if (exportSource.includes(".load(")) {
    addFinding(findings, {
      severity: "moderate",
      category: "bigquery_export",
      title: "BigQuery load job usage needs per-table daily limit tracking",
      filePath: "functions/src/analytics-bigquery-export.ts",
      suggestedFix: "Track BigQuery load jobs against the 1,500 load jobs per table per day limit.",
      evidence: ["1,500 load jobs per table per day"],
    });
  }

  if (exportSource.includes(".extract(") || exportSource.includes("extract(")) {
    addFinding(findings, {
      severity: "moderate",
      category: "bigquery_export",
      title: "BigQuery extract usage needs export byte/file limits documented",
      filePath: "functions/src/analytics-bigquery-export.ts",
      suggestedFix: "Document 50 TiB/day shared-pool extract default and 1GB single-file extract limit.",
      evidence: ["50 TiB/day", "1GB single-file extract"],
    });
  }
}

function buildStatus(score: number, criticalCount: number): CloudCostReport["status"] {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function buildReport(): CloudCostReport {
  const cloudRunFindings: CloudCostFinding[] = [];
  const sqlFindings: CloudCostFinding[] = [];
  const bigQueryFindings: CloudCostFinding[] = [];

  scanCloudRun(cloudRunFindings);
  scanSql(sqlFindings);
  scanBigQuery(bigQueryFindings);

  const findings = [...cloudRunFindings, ...sqlFindings, ...bigQueryFindings];
  const score = Math.max(0, Math.min(100, 100 + findings.reduce((sum, finding) => sum + finding.scoreImpact, 0)));
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const exportSource = readIfExists("functions/src/analytics-bigquery-export.ts");
  const bigQueryExportStatus = exportSource.includes("@google-cloud/bigquery")
    ? "export_config_found"
    : "bigquery_export_unconfirmed";

  return {
    generatedAt: new Date().toISOString(),
    score,
    status: buildStatus(score, criticalCount),
    cloudRunFindings,
    sqlFindings,
    bigQueryFindings,
    recommendedLimits: CLOUD_RUN_SERVICE_GUARDRAILS,
    sqlCostSurfaces: SQL_COST_SURFACES,
    bigQueryPipelines: BIGQUERY_PIPELINE_CONTRACTS,
    manualCloudConsoleChecklist: [
      "Check Cloud Run max instances for each deployed service",
      "Check Cloud Run concurrency",
      "Check Cloud SQL instance kandydrops-db active/paused/deleted",
      "Check Cloud SQL tier/storage/backups/HA/read replicas",
      "Check Data Connect operation usage",
      "Check BigQuery linked Firebase exports",
      "Check BigQuery datasets/tables freshness",
      "Check BigQuery import jobs/load jobs",
      "Check budget alerts for Cloud SQL/Data Connect/BigQuery/Cloud Run",
    ],
    forbiddenRuntimePaths: FORBIDDEN_SQL_RUNTIME_PATHS,
    allowedSqlMirrorPaths: ALLOWED_SQL_MIRROR_PATHS,
    bigQueryExportStatus,
    bigQueryImportStatus: "runtime_import_blocked",
    minimalCommands,
    forbiddenCommands,
    suggestedCommands: CLOUD_RUN_SERVICE_GUARDRAILS.map((guardrail) =>
      `gcloud run services update ${guardrail.serviceName} --region ${guardrail.region} --max ${guardrail.recommendedMaxInstances} --concurrency ${guardrail.maxConcurrencyRecommended}`
    ),
    summary: `Cloud cost guardrails found ${findings.length} deterministic finding(s). No deployed settings were changed.`,
  };
}

function writeReport(report: CloudCostReport) {
  const outputPath = repoPath(reportPath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: CloudCostReport) {
  console.log(`Cloud cost guardrail score: ${report.score}/100 (${report.status})`);
  console.log(`Cloud Run findings: ${report.cloudRunFindings.length}`);
  console.log(`SQL/Data Connect findings: ${report.sqlFindings.length}`);
  console.log(`BigQuery findings: ${report.bigQueryFindings.length}`);
  console.log(`BigQuery export status: ${report.bigQueryExportStatus}`);
  console.log(`BigQuery import status: ${report.bigQueryImportStatus}`);
  for (const finding of [...report.cloudRunFindings, ...report.sqlFindings, ...report.bigQueryFindings].slice(0, 8)) {
    console.log(`- [${finding.severity}] ${finding.title} (${finding.filePath})`);
  }
  console.log(`Minimal commands: ${report.minimalCommands.join(", ")}`);
}

const report = buildReport();
writeReport(report);
printSummary(report);
