import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Severity = "P0" | "P1" | "P2";
type DetectionState = "repo_detected" | "external_billing_observed" | "unknown" | "not_detected_in_repo";

type InventoryFinding = {
  id: string;
  severity: Severity;
  status: string;
  detectionState: DetectionState;
  evidence: string[];
  nextAction: string;
};

export type AnalyticsCostRuntimeInventoryReport = {
  generatedAtUtc: string;
  reportKey: "analytics-cost-runtime-inventory";
  currentHead: string;
  summary: {
    cloudRunCostFindings: number;
    cloudSqlDetected: boolean;
    cloudSqlFindings: number;
    bigQueryDetected: boolean;
    bigQueryExportFindings: number;
    geminiCloudAssistDetected: boolean;
    geminiCloudAssistFindings: number;
    nonPriorityAnalyticsCadenceFindings: number;
    retry4xxFindings: number;
    guestTrackingFindings: number;
    userTrackingFindings: number;
    watchTimeFindings: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  cloudRunFindings: InventoryFinding[];
  cloudSqlFindings: InventoryFinding[];
  bigQueryFindings: InventoryFinding[];
  geminiCloudAssistFindings: InventoryFinding[];
  retry4xxFindings: InventoryFinding[];
  analyticsCadenceFindings: InventoryFinding[];
  trackingFindings: InventoryFinding[];
  watchTimeFindings: InventoryFinding[];
  nextFixOrder: string[];
};

export type AnalyticsCostRuntimeInventoryInputs = {
  currentHead: string;
  generatedAtUtc: string;
  sources: Record<string, string>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/analytics-cost-runtime-inventory.generated.json";
const docsRelativePath = "docs/agent-truth/analytics-cost-runtime-inventory.md";

const sourcePaths = {
  deepTracker: "src/components/Analytics/DeepTracker.tsx",
  analyticsIngestRoute: "src/app/api/analytics/ingest/route.ts",
  analyticsEventContract: "src/lib/analytics/analytics-event-contract.ts",
  runtimeWatchTime: "src/lib/analytics/watch-time-v2.ts",
  bigQueryExport: "functions/src/analytics-bigquery-export.ts",
  adminAnalyticsData: "src/lib/server/admin-analytics-data.ts",
  adminAnalyticsMaterializers: "src/lib/server/admin-analytics-materializers.ts",
  functionsAnalyticsCore: "functions/src/analytics-core.ts",
  functionsAnalyticsGuestBatches: "functions/src/analytics-guest-batches.ts",
  functionsAnalyticsEventFacts: "functions/src/analytics-event-facts.ts",
  functionsAnalyticsSemantics: "functions/src/analytics-semantics.ts",
  packageJson: "package.json",
} as const;

const walkRoots = ["src", "functions", "scripts", "docs", "agent", "tests", "dataconnect"] as const;
const skipDirs = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", "playwright-report", "test-results"]);

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readIfExists(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "") : "";
}

function walkFiles(rootRelativePath: string, files: string[] = []) {
  const rootPath = join(repoRoot, rootRelativePath);
  if (!existsSync(rootPath)) return files;
  for (const entry of readdirSync(rootPath)) {
    if (skipDirs.has(entry)) continue;
    const fullPath = join(rootPath, entry);
    const relativePath = fullPath.slice(repoRoot.length + 1).replace(/\\/gu, "/");
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(relativePath, files);
    } else if (/\.(ts|tsx|js|json|md|yaml|yml|gql)$/iu.test(entry)) {
      files.push(relativePath);
    }
  }
  return files;
}

function collectSearchText(pattern: RegExp) {
  const matches: string[] = [];
  for (const root of walkRoots) {
    for (const file of walkFiles(root)) {
      const source = readIfExists(file);
      if (pattern.test(source) || pattern.test(file)) {
        matches.push(`${file}\n${source.slice(0, 4000)}`);
      }
    }
  }
  return matches.join("\n\n");
}

function finding(input: InventoryFinding): InventoryFinding {
  return input;
}

function countSeverity(findings: InventoryFinding[], severity: Severity) {
  return findings.filter((entry) => entry.severity === severity).length;
}

function detected(source: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return pattern.test(source);
}

function hasText(source: string) {
  return source.trim().length > 0;
}

export function buildAnalyticsCostRuntimeInventoryReport(
  input: AnalyticsCostRuntimeInventoryInputs,
): AnalyticsCostRuntimeInventoryReport {
  const sources = input.sources;
  const cloudSqlDetected = detected(sources.cloudSqlSearch ?? "", /Cloud SQL|cloudsql|postgres|mysql|prisma|knex|sequelize|DATABASE_URL|dataconnect|kandydrops-db/iu);
  const bigQueryDetected = detected(`${sources.bigQuerySearch ?? ""}\n${sources.bigQueryExport ?? ""}`, /BigQuery|bigquery|raw_events|Storage Write|maximumBytesBilled|dry_run|partition|cluster/iu);
  const bigQueryCadenceGuarded = detected(sources.bigQueryExport ?? "", /BIGQUERY_EXPORT_MIN_CADENCE_MS|claimBigQueryExportWindow|daily cadence/iu);
  const bigQueryQueryGuarded = detected(sources.bigQueryExport ?? "", /dryRunRequiredForQueries|maximumBytesBilledRequiredForQueries|partitionFilterRequired/iu);
  const geminiCloudAssistDetected = detected(sources.geminiSearch ?? "", /Gemini|Cloud Assist|Vertex|GenerativeAI|genai|model|prompt|token/iu);

  const cloudRunFindings: InventoryFinding[] = [
    finding({
      id: "analytics-ingest-cloud-run-request-work",
      severity: "P1",
      status: "repo_detected_external_billing_observed_operator_context",
      detectionState: "repo_detected",
      evidence: [
        "src/app/api/analytics/ingest/route.ts: force-dynamic analytics ingest route.",
        "src/app/api/analytics/ingest/route.ts: materializeUserTrackingIndexes runs after guest ingest.",
        "operator_context: billing screenshot showed Cloud Run/App Hosting/Functions costs; not used as source truth.",
      ],
      nextAction: "Review guest ingest request-path work, cache boundaries, and whether index materialization should move out of the hot request path.",
    }),
    finding({
      id: "guest-analytics-flush-cadence",
      severity: "P1",
      status: "repo_detected_non_priority_2_5s_flush",
      detectionState: "repo_detected",
      evidence: [
        "src/components/Analytics/DeepTracker.tsx: GUEST_ANALYTICS_FLUSH_INTERVAL_MS = 2_500.",
        "src/components/Analytics/DeepTracker.tsx: page_view, visibility, pagehide, online, and interval can flush.",
      ],
      nextAction: "Classify priority vs non-priority analytics cadence and consider longer debounce/batch windows in a behavior-change pass.",
    }),
  ];

  const cloudSqlFindings: InventoryFinding[] = cloudSqlDetected
    ? [
      finding({
        id: "cloud-sql-dataconnect-agent-context-mirror",
        severity: "P1",
        status: "repo_detected_agent_context_mirror_external_billing_observed_operator_context",
        detectionState: "repo_detected",
        evidence: [
          "AGENTS.md/doctrine: Data Connect / Cloud SQL mirror targets kandydrops-db.",
          "dataconnect and doctrine references classify Cloud SQL as agent-context mirror unless promoted.",
          "operator_context: billing screenshot showed Cloud SQL cost; source pass cannot explain provider billing alone.",
        ],
        nextAction: "Inventory Data Connect execution cadence, generated mirror refreshes, connection pooling/reuse, and provider-side instance state with owner evidence.",
      }),
    ]
    : [
      finding({
        id: "cloud-sql-not-detected",
        severity: "P2",
        status: "cloud_sql_not_detected_in_repo",
        detectionState: "not_detected_in_repo",
        evidence: ["No Cloud SQL/Postgres/MySQL/Data Connect source hit in scoped repository scan."],
        nextAction: "Do not invent SQL fixes; confirm provider billing source with owner evidence.",
      }),
    ];

  const bigQueryFindings: InventoryFinding[] = bigQueryDetected
    ? [
      finding({
        id: "bigquery-analytics-event-fact-export",
        severity: "P1",
        status: "repo_detected_export_lane_external_billing_unknown",
        detectionState: "repo_detected",
        evidence: [
          "functions/src/analytics-bigquery-export.ts exports analytics_event_facts into BigQuery raw_events.",
          "functions/src/analytics-bigquery-export.ts creates DAY partitioning and eventName/origin clustering.",
          bigQueryCadenceGuarded
            ? "Daily non-priority export cadence guard is visible in source."
            : "Daily non-priority export cadence guard is not visible in source.",
          bigQueryQueryGuarded
            ? "Dry-run/max-bytes/partition query guard contract is documented for future query paths."
            : "Dry-run/max-bytes/partition query guard contract is not visible.",
        ],
        nextAction: "Keep BigQuery raw-events export non-priority and require dry-run bytes estimate, maximumBytesBilled, daily quotas, and staged materialization before adding warehouse queries.",
      }),
    ]
    : [
      finding({
        id: "bigquery-not-detected",
        severity: "P2",
        status: "bigquery_not_detected_in_repo",
        detectionState: "not_detected_in_repo",
        evidence: ["No BigQuery/export source hit in scoped repository scan."],
        nextAction: "Do not invent BigQuery fixes; keep external analytics evidence-only unless source appears.",
      }),
    ];

  const geminiCloudAssistFindings: InventoryFinding[] = geminiCloudAssistDetected
    ? [
      finding({
        id: "gemini-vertex-admin-ai-cost-lane",
        severity: "P1",
        status: "repo_detected_admin_ai_external_billing_observed_operator_context",
        detectionState: "repo_detected",
        evidence: [
          "src/lib/admin-ai-models.ts contains Gemini model registry and token/cost estimation language.",
          "admin AI/cover generation lanes are outside analytics runtime but share Vertex/Gemini cost exposure.",
          "operator_context: billing screenshot showed Vertex AI cost; not proof of analytics usage.",
        ],
        nextAction: "Gate Gemini/Vertex calls with explicit admin budget controls and separate analytics runtime from AI cost review.",
      }),
    ]
    : [
      finding({
        id: "gemini-cloud-assist-not-detected",
        severity: "P2",
        status: "gemini_cloud_assist_not_detected_in_repo",
        detectionState: "not_detected_in_repo",
        evidence: ["No Gemini/Cloud Assist/Vertex source hit in scoped repository scan."],
        nextAction: "Do not add model-call assumptions or AI fixes without explicit source evidence.",
      }),
    ];

  const retry4xxFindings: InventoryFinding[] = [
    finding({
      id: "analytics-ingest-503-retryable",
      severity: "P1",
      status: "repo_detected_retryable_route_failure",
      detectionState: "repo_detected",
      evidence: [
        "src/app/api/analytics/ingest/route.ts returns { success: false, retryable: true } with status 503 on catch.",
        "src/components/Analytics/DeepTracker.tsx persists failed queue and can flush again by interval/visibility/online.",
      ],
      nextAction: "Classify which analytics failures are retryable and make 4xx/validation failures calm, non-retried, and cheap.",
    }),
    finding({
      id: "expected-product-4xx-inventory",
      severity: "P2",
      status: "repo_detected_expected_4xx_mixed_with_runtime_scan",
      detectionState: "repo_detected",
      evidence: ["Search found expected 400/401/403/404 tests and routes; this pass does not classify each product route as cost leak."],
      nextAction: "Separate expected product 4xx from unexpected analytics/client retry 4xx before fixes.",
    }),
  ];

  const analyticsCadenceFindings: InventoryFinding[] = [
    finding({
      id: "deeptracker-non-priority-cadence",
      severity: "P1",
      status: "repo_detected_high_cadence_guest_flush",
      detectionState: "repo_detected",
      evidence: [
        "DeepTracker flush interval is 2.5s while visible.",
        "Guest queue caps exist, but non-priority analytics cadence is still a Cloud Run/App Hosting cost review target.",
      ],
      nextAction: "Move non-priority cadence to a lower-frequency batch policy after source-owner review.",
    }),
    finding({
      id: "admin-analytics-cold-sources",
      severity: "P2",
      status: "repo_detected_cached_but_broad_admin_sources",
      detectionState: "repo_detected",
      evidence: [
        "src/lib/server/admin-analytics-data.ts uses 30s ephemeral route cache.",
        "Admin historical analytics combines GA Data API reports with Firestore source reads and bounded limits.",
      ],
      nextAction: "Confirm admin analytics views read hot snapshots first and reserve cold reads for explicit refresh/drill-down.",
    }),
  ];

  const trackingFindings: InventoryFinding[] = [
    finding({
      id: "guest-tracking-source",
      severity: "P2",
      status: "repo_detected_guest_queue_and_batch_identity",
      detectionState: "repo_detected",
      evidence: [
        "DeepTracker queues anonymous events with anonymousVisitorId/sessionId.",
        "analytics ingest writes analytics_guest_batches and guest session docs with stable batch dedupe.",
      ],
      nextAction: "Keep guest data distinct until linked; future cost changes must not erase guest history.",
    }),
    finding({
      id: "user-tracking-source",
      severity: "P2",
      status: "repo_detected_identityState_userId_session_continuity",
      detectionState: "repo_detected",
      evidence: [
        "analytics-event-contract includes identityState, identityLinkId, userId, anonymousVisitorId, and sessionId.",
        "guest-user identity transfer final lock is source-ready but runtime proof remains separate.",
      ],
      nextAction: "Review user index materialization cadence before moving it into any runtime hot path.",
    }),
  ];

  const watchTimeFindings: InventoryFinding[] = [
    finding({
      id: "runtime-watch-time-v2-source-ready",
      severity: "P2",
      status: "repo_detected_source_ready_runtime_proof_required",
      detectionState: "repo_detected",
      evidence: [
        "src/lib/analytics/watch-time-v2.ts defines 10s heartbeat and 15s server delta cap.",
        "Runtime watch-time v2 is source-ready but integration/runtime evidence remains pending.",
      ],
      nextAction: "Wire runtime watch tracker to selected media component and capture deployed evidence before claiming live accuracy.",
    }),
    finding({
      id: "legacy-watch-seconds-still-present",
      severity: "P2",
      status: "repo_detected_legacy_watch_seconds_rollup",
      detectionState: "repo_detected",
      evidence: [
        "functions/src/analytics-event-facts.ts and analytics-semantics.ts still read watchSeconds/sessionWatchSeconds.",
        "Legacy watch seconds must remain labeled until runtime watch v2 rollups are wired.",
      ],
      nextAction: "Keep legacy watchSeconds as evidence/legacy fallback, not canonical playback truth.",
    }),
  ];

  const allFindings = [
    ...cloudRunFindings,
    ...cloudSqlFindings,
    ...bigQueryFindings,
    ...geminiCloudAssistFindings,
    ...retry4xxFindings,
    ...analyticsCadenceFindings,
    ...trackingFindings,
    ...watchTimeFindings,
  ];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "analytics-cost-runtime-inventory",
    currentHead: input.currentHead,
    summary: {
      cloudRunCostFindings: cloudRunFindings.length,
      cloudSqlDetected,
      cloudSqlFindings: cloudSqlFindings.length,
      bigQueryDetected,
      bigQueryExportFindings: bigQueryFindings.length,
      geminiCloudAssistDetected,
      geminiCloudAssistFindings: geminiCloudAssistFindings.length,
      nonPriorityAnalyticsCadenceFindings: analyticsCadenceFindings.length,
      retry4xxFindings: retry4xxFindings.length,
      guestTrackingFindings: trackingFindings.filter((entry) => entry.id.includes("guest")).length,
      userTrackingFindings: trackingFindings.filter((entry) => entry.id.includes("user")).length,
      watchTimeFindings: watchTimeFindings.length,
      p0Count: countSeverity(allFindings, "P0"),
      p1Count: countSeverity(allFindings, "P1"),
      p2Count: countSeverity(allFindings, "P2"),
    },
    cloudRunFindings,
    cloudSqlFindings,
    bigQueryFindings,
    geminiCloudAssistFindings,
    retry4xxFindings,
    analyticsCadenceFindings,
    trackingFindings,
    watchTimeFindings,
    nextFixOrder: [
      "Separate non-priority analytics cadence from product-critical telemetry and propose a lower-frequency batch policy.",
      "Classify analytics/client retry failures so 4xx validation paths are calm, cheap, and non-retried.",
      "Owner-review Cloud SQL/Data Connect billing and BigQuery/Gemini provider cost lanes before source changes.",
      "Wire runtime watch-time v2 to media playback only after cost/idempotency route review.",
    ],
  };
}

export function validateAnalyticsCostRuntimeInventoryReport(report: AnalyticsCostRuntimeInventoryReport | null) {
  const failures: string[] = [];
  if (!report) return { failures: ["analytics cost runtime inventory report missing."] };
  if (report.reportKey !== "analytics-cost-runtime-inventory") failures.push("reportKey must be analytics-cost-runtime-inventory.");
  if (report.cloudRunFindings.length === 0) failures.push("Cloud Run lane missing.");
  if (report.cloudSqlFindings.length === 0) failures.push("Cloud SQL lane missing.");
  if (report.bigQueryFindings.length === 0) failures.push("BigQuery lane missing.");
  if (report.geminiCloudAssistFindings.length === 0) failures.push("Gemini/Cloud Assist lane missing.");
  if (report.retry4xxFindings.length === 0) failures.push("4xx/retry inventory missing.");
  if (report.analyticsCadenceFindings.length === 0) failures.push("analytics cadence inventory missing.");
  if (report.trackingFindings.length === 0) failures.push("guest/user tracking inventory missing.");
  if (report.watchTimeFindings.length === 0) failures.push("watch-time inventory missing.");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty.");
  for (const findingGroup of [
    report.cloudRunFindings,
    report.cloudSqlFindings,
    report.bigQueryFindings,
    report.geminiCloudAssistFindings,
  ]) {
    for (const entry of findingGroup) {
      if (!["repo_detected", "external_billing_observed", "unknown", "not_detected_in_repo"].includes(entry.detectionState)) {
        failures.push(`${entry.id} must declare repo-detected, external-billing-observed, unknown, or not-detected state.`);
      }
      if (/not_detected_in_repo.*\bpass(ed)?\b|\bpass(ed)?\b.*not_detected_in_repo/iu.test(entry.status)) {
        failures.push(`${entry.id} must not mark not_detected_in_repo as pass.`);
      }
    }
  }
  const reportText = JSON.stringify(report);
  if (/\b(cost reduction achieved|reduced cost|cost win|savings achieved)\b/iu.test(reportText)) {
    failures.push("report must not claim cost reduction without code/evidence.");
  }
  return { failures };
}

function readInputs(): AnalyticsCostRuntimeInventoryInputs {
  const sources: Record<string, string> = {};
  for (const [key, relativePath] of Object.entries(sourcePaths)) {
    sources[key] = readIfExists(relativePath);
  }
  sources.cloudSqlSearch = collectSearchText(/Cloud SQL|cloudsql|postgres|mysql|prisma|knex|sequelize|DATABASE_URL|pool|connection|dataconnect|kandydrops-db/iu);
  sources.bigQuerySearch = collectSearchText(/BigQuery|bigquery|bq|export|Storage Write|maximumBytesBilled|dry_run|partition|cluster/iu);
  sources.geminiSearch = collectSearchText(/Gemini|Cloud Assist|Vertex|GenerativeAI|genai|model|prompt|token/iu);
  sources.retry4xxSearch = collectSearchText(/setInterval|setTimeout|retry|429|404|401|403|400|4xx|fetch\(/iu);
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    sources,
  };
}

function renderFindingRows(findings: InventoryFinding[]) {
  return findings
    .map((entry) => `| ${entry.id} | ${entry.severity} | ${entry.status} | ${entry.detectionState} | ${entry.nextAction} |`)
    .join("\n");
}

function renderMarkdown(report: AnalyticsCostRuntimeInventoryReport) {
  const nextFixOrder = report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return `# Analytics Cost Runtime Inventory

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

This is a source-only inventory. Operator billing screenshots are context only and are not treated as source truth or proof of cost reduction.

## Summary

- Cloud Run findings: ${report.summary.cloudRunCostFindings}
- Cloud SQL detected: ${report.summary.cloudSqlDetected}; findings: ${report.summary.cloudSqlFindings}
- BigQuery detected: ${report.summary.bigQueryDetected}; findings: ${report.summary.bigQueryExportFindings}
- Gemini/Cloud Assist/Vertex detected: ${report.summary.geminiCloudAssistDetected}; findings: ${report.summary.geminiCloudAssistFindings}
- Non-priority analytics cadence findings: ${report.summary.nonPriorityAnalyticsCadenceFindings}
- 4xx/retry findings: ${report.summary.retry4xxFindings}
- Guest tracking findings: ${report.summary.guestTrackingFindings}
- User tracking findings: ${report.summary.userTrackingFindings}
- Watch-time findings: ${report.summary.watchTimeFindings}
- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}

## Cost Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
${renderFindingRows([
  ...report.cloudRunFindings,
  ...report.cloudSqlFindings,
  ...report.bigQueryFindings,
  ...report.geminiCloudAssistFindings,
])}

## Retry And Analytics Runtime Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
${renderFindingRows([
  ...report.retry4xxFindings,
  ...report.analyticsCadenceFindings,
  ...report.trackingFindings,
  ...report.watchTimeFindings,
])}

## Next Fix Order

${nextFixOrder}
`;
}

function writeReport(report: AnalyticsCostRuntimeInventoryReport) {
  const artifactPath = join(repoRoot, artifactRelativePath);
  const docsPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderMarkdown(report));
}

function main() {
  const report = buildAnalyticsCostRuntimeInventoryReport(readInputs());
  const { failures } = validateAnalyticsCostRuntimeInventoryReport(report);
  if (failures.length > 0) {
    console.error("Analytics cost runtime inventory validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  writeReport(report);
  console.log(
    `Analytics cost runtime inventory passed. cloudRun=${report.summary.cloudRunCostFindings} cloudSqlDetected=${report.summary.cloudSqlDetected} bigQueryDetected=${report.summary.bigQueryDetected} geminiDetected=${report.summary.geminiCloudAssistDetected}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
