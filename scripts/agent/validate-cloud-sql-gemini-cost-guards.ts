import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Finding = {
  id: string;
  status: string;
  severity: "P0" | "P1" | "P2";
  evidence: string[];
  nextAction: string;
};

export type CloudSqlGeminiCostGuardsReport = {
  generatedAtUtc: string;
  reportKey: "cloud-sql-gemini-cost-guards";
  currentHead: string;
  summary: {
    cloudSqlRuntimeDetected: boolean;
    cloudSqlExternalBillingObserved: boolean;
    sqlMirrorScriptsGuarded: boolean;
    sqlMirrorRequiresExplicitApproval: boolean;
    dataConnectRuntimeDetected: boolean;
    geminiRuntimeDetected: boolean;
    geminiExternalBillingObserved: boolean;
    aiCallsRequireExplicitAction: boolean;
    aiCallsHaveRateOrCacheGuard: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  sqlFindings: Finding[];
  dataConnectFindings: Finding[];
  geminiFindings: Finding[];
  fixesApplied: Finding[];
  deferredOwnerReview: Finding[];
  prCleanupActions: Array<{
    number: number;
    action: "not_relevant" | "closed" | "merged" | "preserved";
    reason: string;
  }>;
  nextFixOrder: string[];
};

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/cloud-sql-gemini-cost-guards.generated.json";
const DOC_PATH = "docs/agent-truth/cloud-sql-gemini-cost-guards.md";

function read(relativePath: string) {
  const fullPath = path.join(ROOT, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "") : "";
}

function currentHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function walk(dir: string): string[] {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) return walk(relative);
    return /\.(ts|tsx|js|mjs|cjs)$/u.test(entry.name) ? [relative] : [];
  });
}

function findRuntimeSqlHits() {
  const sqlPattern = /(from\s+["'](?:@prisma\/client|pg|postgres|mysql2|knex|sequelize|firebase\/data-connect|@firebase\/data-connect)["']|require\(["'](?:@prisma\/client|pg|postgres|mysql2|knex|sequelize|firebase\/data-connect|@firebase\/data-connect)["']\)|new\s+PrismaClient)/u;
  return [...walk("src"), ...walk("functions/src")]
    .map((file) => ({ file, source: read(file) }))
    .filter(({ source }) => sqlPattern.test(source))
    .map(({ file }) => file);
}

function finding(id: string, ok: boolean, status: string, evidence: string[], nextAction: string, severity: Finding["severity"] = "P1"): Finding {
  return {
    id,
    status: ok ? status : `failed_${status}`,
    severity,
    evidence,
    nextAction,
  };
}

function buildReport(): CloudSqlGeminiCostGuardsReport {
  const packageJson = read("package.json");
  const syncSql = read("scripts/agent/sync-sql.ts");
  const inventory = read("agent/state/analytics-cost-runtime-inventory.generated.json");
  const cadence = read("agent/state/analytics-cadence-cost-policy.generated.json");
  const currentBeta = read("agent/state/current-beta-exit-status.generated.json");
  const doctrine = read("docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md");
  const dataConnectConfigDetected = fs.existsSync(path.join(ROOT, "dataconnect/dataconnect.yaml"));
  const runtimeSqlHits = findRuntimeSqlHits();
  const dataConnectRuntimeHits = runtimeSqlHits.filter((file) => /data-connect|dataconnect/iu.test(read(file)));

  const aiRouteFiles = [
    "src/app/api/admin/ai/drop-covers/generate/route.ts",
    "src/app/api/admin/ai/drop-descriptions/generate/route.ts",
    "src/app/api/admin/debug/assistant/route.ts",
  ];
  const aiLibraryFiles = [
    "src/lib/server/ai-drop-covers.ts",
    "src/lib/server/ai-drop-descriptions.ts",
    "src/lib/server/ai-debug-assistant.ts",
  ];
  const aiRouteSource = aiRouteFiles.map(read).join("\n");
  const aiLibrarySource = aiLibraryFiles.map(read).join("\n");
  const aiSource = `${aiRouteSource}\n${aiLibrarySource}`;

  const cloudSqlExternalBillingObserved = /cloud sql[\s\S]{0,240}(external billing|billing_observed|billing observed)|external billing[\s\S]{0,240}cloud sql/iu.test(`${inventory}\n${cadence}\n${currentBeta}`);
  const geminiExternalBillingObserved = /(gemini|vertex|cloud assist)[\s\S]{0,240}(external billing|billing_observed|billing observed)|external billing[\s\S]{0,240}(gemini|vertex|cloud assist)/iu.test(`${inventory}\n${cadence}\n${currentBeta}`);
  const sqlMirrorRequiresExplicitApproval = [
    "ALLOW_SQL_MIRROR_SYNC",
    "SQL_MIRROR_SYNC_REASON",
    "SQL_MIRROR_SYNC_ENV",
    "SQL_MIRROR_DRY_RUN",
    "ciBlockedByDefault",
  ].every((token) => syncSql.includes(token));
  const agentRefreshSafe = !/"agent:refresh"\s*:\s*"[^"]*agent:sync-sql/u.test(packageJson);
  const sqlMirrorScriptsGuarded = sqlMirrorRequiresExplicitApproval && agentRefreshSafe;
  const geminiRuntimeDetected = /generateContent|@google-cloud\/vertexai|publishers\/google\/models/iu.test(aiSource);
  const noBackgroundAiCalls = !/setInterval|onSchedule|pubsub\.schedule|cron/iu.test(aiSource);
  const aiCallsRequireExplicitAction = geminiRuntimeDetected
    && aiRouteFiles.every((file) => {
      const source = read(file);
      return source.includes("guardApiRequest")
        && source.includes('auth: "admin"')
        && source.includes("rateLimit")
        && (source.includes("requireTrustedOrigin") || file.includes("/debug/assistant/route.ts"))
        && source.includes("POST_handler");
    })
    && read("src/app/api/admin/debug/assistant/route.ts").includes("page_load_no_live_call")
    && noBackgroundAiCalls;
  const aiCallsHaveRateOrCacheGuard = geminiRuntimeDetected
    && aiRouteSource.includes("rateLimit")
    && /DEFAULT_TIMEOUT_MS|maxOutputTokens|estimateAdminAi|clientRequestId|lastLiveCallAtMs|settings\.enabled/iu.test(aiLibrarySource);

  const sqlFindings = [
    finding(
      "cloud_sql_runtime_detection",
      runtimeSqlHits.length === 0,
      runtimeSqlHits.length === 0 ? "cloud_sql_runtime_not_detected" : "cloud_sql_runtime_detected_owner_review_required",
      runtimeSqlHits.length === 0 ? ["No runtime SQL client imports were detected in src or functions/src."] : runtimeSqlHits,
      runtimeSqlHits.length === 0 ? "Keep Cloud SQL as owner-review until runtime source proves app usage." : "Classify every runtime SQL import before any cost claim.",
      runtimeSqlHits.length === 0 ? "P2" : "P0",
    ),
    finding(
      "cloud_sql_external_billing",
      cloudSqlExternalBillingObserved,
      "cloud_sql_external_billing_observed_owner_review_required",
      ["External billing was operator-provided context and remains separate from source-proven runtime SQL."],
      "Review GCP Cloud SQL instance/process externally; do not invent repo pooling code without runtime SQL source.",
      "P1",
    ),
    finding(
      "sql_mirror_manual_guard",
      sqlMirrorScriptsGuarded,
      "sql_mirror_scripts_guarded_manual_only",
      ["scripts/agent/sync-sql.ts requires ALLOW_SQL_MIRROR_SYNC, SQL_MIRROR_SYNC_REASON, SQL_MIRROR_SYNC_ENV, and supports SQL_MIRROR_DRY_RUN."],
      "Run SQL mirror sync only with explicit local/staging/manual approval and a reason.",
      "P1",
    ),
  ];

  const dataConnectFindings = [
    finding(
      "dataconnect_agent_context_mirror",
      dataConnectConfigDetected && dataConnectRuntimeHits.length === 0,
      "dataconnect_agent_context_mirror_runtime_not_detected",
      dataConnectConfigDetected
        ? ["dataconnect/dataconnect.yaml exists as an agent-context mirror.", "No Data Connect runtime imports were detected."]
        : ["No dataconnect/dataconnect.yaml was detected."],
      "Keep Data Connect classified as repo intelligence mirror unless explicitly promoted with a runtime ApiCostContract.",
      "P2",
    ),
    finding(
      "dataconnect_doctrine_manual_only",
      /manual-only|manual only|ALLOW_SQL_MIRROR_SYNC/iu.test(doctrine),
      "dataconnect_doctrine_manual_only",
      ["Cloud analytics doctrine documents manual SQL/Data Connect mirror guardrails."],
      "Keep doctrine and package scripts aligned when SQL mirror tooling changes.",
      "P2",
    ),
  ];

  const geminiFindings = [
    finding(
      "gemini_runtime_detection",
      geminiRuntimeDetected,
      "gemini_vertex_admin_ai_runtime_detected",
      aiLibraryFiles,
      "Keep runtime AI behind explicit admin action, settings, rate limit, timeout, and owner-review cost lanes.",
      "P1",
    ),
    finding(
      "gemini_explicit_action",
      aiCallsRequireExplicitAction,
      "gemini_vertex_calls_require_explicit_admin_action",
      aiRouteFiles,
      "Do not add background AI calls; GET/default views must use saved/deterministic output.",
      "P1",
    ),
    finding(
      "gemini_rate_cache_guard",
      aiCallsHaveRateOrCacheGuard,
      "gemini_vertex_calls_have_rate_timeout_budget_guard",
      ["Admin AI routes use rate limits; libraries include settings gates, timeout/token or cost-budget evidence."],
      "Add cache/idempotency before any new repeated same-prompt AI lane.",
      "P1",
    ),
    finding(
      "gemini_external_billing",
      geminiExternalBillingObserved,
      "gemini_cloud_assist_external_billing_observed_owner_review_required",
      ["External Gemini/Vertex billing was operator-provided context and is not a repo-local pass state."],
      "Review Google Cloud billing/Vertex usage externally and map service account/job owners.",
      "P1",
    ),
  ];

  const failed = [...sqlFindings, ...dataConnectFindings, ...geminiFindings].filter((entry) => entry.status.startsWith("failed_"));
  const deferredOwnerReview = [
    sqlFindings[1],
    geminiFindings[3],
  ];
  const fixesApplied = [sqlFindings[2], dataConnectFindings[1]].filter((entry) => !entry.status.startsWith("failed_"));

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "cloud-sql-gemini-cost-guards",
    currentHead: currentHead(),
    summary: {
      cloudSqlRuntimeDetected: runtimeSqlHits.length > 0,
      cloudSqlExternalBillingObserved,
      sqlMirrorScriptsGuarded,
      sqlMirrorRequiresExplicitApproval,
      dataConnectRuntimeDetected: dataConnectRuntimeHits.length > 0,
      geminiRuntimeDetected,
      geminiExternalBillingObserved,
      aiCallsRequireExplicitAction,
      aiCallsHaveRateOrCacheGuard,
      p0Count: failed.filter((entry) => entry.severity === "P0").length,
      p1Count: failed.filter((entry) => entry.severity === "P1").length,
      p2Count: failed.filter((entry) => entry.severity === "P2").length,
    },
    sqlFindings,
    dataConnectFindings,
    geminiFindings,
    fixesApplied,
    deferredOwnerReview,
    prCleanupActions: [
      {
        number: 271,
        action: "not_relevant",
        reason: "Monolith responsibility PR is not a SQL/Data Connect/Gemini cost guard change.",
      },
      {
        number: 272,
        action: "not_relevant",
        reason: "Creator dashboard aria-expanded PR is UI accessibility work, outside this cost guard lane.",
      },
      {
        number: 273,
        action: "not_relevant",
        reason: "Admin Debug Map optimization is separate from SQL/Data Connect/Gemini provider cost guards.",
      },
    ],
    nextFixOrder: [
      "Owner-review Cloud SQL billing in GCP to identify whether Data Connect mirror, App Hosting, or another external process owns spend.",
      "Owner-review Vertex/Gemini billing in GCP and map service accounts to the admin AI routes or Cloud Assist usage.",
      "Keep SQL mirror sync manual-only; require approval env, reason, and dry-run for local verification.",
      "Add cache/idempotency before any future repeated same-prompt Gemini or Vertex lane.",
    ],
  };
}

function renderMarkdown(report: CloudSqlGeminiCostGuardsReport) {
  const findings = [...report.sqlFindings, ...report.dataConnectFindings, ...report.geminiFindings];
  return [
    "# Cloud SQL and Gemini Cost Guards",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "This report is source-only. It does not run SQL/Data Connect sync, production reads, Gemini, Vertex, Cloud Assist, or provider billing calls.",
    "",
    "## Summary",
    "",
    `- Cloud SQL runtime detected: ${report.summary.cloudSqlRuntimeDetected}`,
    `- Cloud SQL external billing observed: ${report.summary.cloudSqlExternalBillingObserved}`,
    `- SQL mirror scripts guarded: ${report.summary.sqlMirrorScriptsGuarded}`,
    `- SQL mirror explicit approval required: ${report.summary.sqlMirrorRequiresExplicitApproval}`,
    `- Data Connect runtime detected: ${report.summary.dataConnectRuntimeDetected}`,
    `- Gemini/Vertex runtime detected: ${report.summary.geminiRuntimeDetected}`,
    `- Gemini external billing observed: ${report.summary.geminiExternalBillingObserved}`,
    `- AI calls require explicit action: ${report.summary.aiCallsRequireExplicitAction}`,
    `- AI calls have rate/cache guard: ${report.summary.aiCallsHaveRateOrCacheGuard}`,
    `- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}`,
    "",
    "## Findings",
    "",
    "| Id | Severity | Status | Next action |",
    "| --- | --- | --- | --- |",
    ...findings.map((entry) => `| ${entry.id} | ${entry.severity} | ${entry.status} | ${entry.nextAction} |`),
    "",
    "## Owner Review",
    "",
    ...report.deferredOwnerReview.map((entry) => `- ${entry.status}: ${entry.nextAction}`),
    "",
    "## PR Cleanup Actions",
    "",
    ...report.prCleanupActions.map((entry) => `- #${entry.number}: ${entry.action} - ${entry.reason}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ].join("\n");
}

export function validateCloudSqlGeminiCostGuards(options: { writeReport?: boolean } = {}) {
  const report = buildReport();
  const failures: string[] = [];

  if (!report.summary.sqlMirrorScriptsGuarded) failures.push("SQL mirror script is not guarded or agent:refresh can still trigger it casually.");
  if (!report.summary.sqlMirrorRequiresExplicitApproval) failures.push("SQL sync can run without explicit approval env vars.");
  if (report.summary.cloudSqlRuntimeDetected) failures.push("Runtime SQL import exists but is not classified for this phase.");
  if (!report.sqlFindings.some((entry) => entry.status === "cloud_sql_external_billing_observed_owner_review_required")) {
    failures.push("Cloud SQL external billing is not owner-review.");
  }
  if (report.summary.geminiRuntimeDetected && !report.summary.aiCallsRequireExplicitAction) {
    failures.push("Gemini/Vertex runtime call exists without explicit user/admin action.");
  }
  if (report.summary.geminiRuntimeDetected && !report.summary.aiCallsHaveRateOrCacheGuard) {
    failures.push("Gemini/Vertex runtime call lacks rate/cache/idempotency guard.");
  }
  if (!report.geminiFindings.some((entry) => entry.status === "gemini_cloud_assist_external_billing_observed_owner_review_required")) {
    failures.push("Gemini external billing is not owner-review.");
  }
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) {
    failures.push("P0/P1 source guard failures remain.");
  }

  if (failures.length > 0) {
    if (options.writeReport) {
      fs.mkdirSync(path.dirname(path.join(ROOT, ARTIFACT_PATH)), { recursive: true });
      fs.mkdirSync(path.dirname(path.join(ROOT, DOC_PATH)), { recursive: true });
      fs.writeFileSync(path.join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      fs.writeFileSync(path.join(ROOT, DOC_PATH), renderMarkdown(report), "utf8");
    }
    throw new Error(`Cloud SQL/Gemini cost guard validation failed:\n- ${failures.join("\n- ")}`);
  }

  if (options.writeReport !== false) {
    fs.mkdirSync(path.dirname(path.join(ROOT, ARTIFACT_PATH)), { recursive: true });
    fs.mkdirSync(path.dirname(path.join(ROOT, DOC_PATH)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(ROOT, DOC_PATH), renderMarkdown(report), "utf8");
  }

  return report;
}

if (require.main === module) {
  try {
    const report = validateCloudSqlGeminiCostGuards();
    console.log(
      `Cloud SQL/Gemini cost guards passed. sqlRuntime=${report.summary.cloudSqlRuntimeDetected} geminiRuntime=${report.summary.geminiRuntimeDetected} ownerReview=${report.deferredOwnerReview.length}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
