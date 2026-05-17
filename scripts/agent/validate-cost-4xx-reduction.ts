import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Severity = "p0" | "p1" | "p2";
type FindingStatus =
  | "fixed"
  | "source_inventory_complete"
  | "deferred_owner_review"
  | "cloud_sql_not_detected_in_repo"
  | "gemini_cloud_assist_not_detected_in_repo"
  | "config_not_in_repo"
  | "pass";
type Route4xxClassification = "expected" | "unexpected";

type Cost4xxFinding = {
  id: string;
  lane: "cloud_run" | "cloud_sql" | "gemini_cloud_assist" | "route_4xx";
  severity: Severity;
  status: FindingStatus;
  owner: string;
  filePath: string;
  detail: string;
  action: string;
  evidence: string[];
};

type Route4xxFinding = Cost4xxFinding & {
  classification: Route4xxClassification;
  retryRisk: string;
  expectedCodes: string[];
};

type SpeedSecuritySnapshot = {
  score: number;
  status: string;
  findings: number;
  criticalFindings: number;
  evidence: string;
};

export type Cost4xxReductionReport = {
  generatedAtUtc: string;
  reportKey: "cost-4xx-reduction";
  currentHead: string;
  cloudRunFindings: Cost4xxFinding[];
  cloudSqlFindings: Cost4xxFinding[];
  geminiCloudAssistFindings: Cost4xxFinding[];
  route4xxFindings: Route4xxFinding[];
  fixesApplied: Cost4xxFinding[];
  deferredFindings: Cost4xxFinding[];
  speedSecurityBefore: SpeedSecuritySnapshot;
  speedSecurityAfter: SpeedSecuritySnapshot;
  p0Count: number;
  p1Count: number;
  p2Count: number;
};

type SourceMap = Record<string, string>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/cost-4xx-reduction.generated.json";
const artifactPath = join(repoRoot, artifactRelativePath);
const docsRelativePath = "docs/agent-truth/cost-4xx-reduction.md";
const docsPath = join(repoRoot, docsRelativePath);

const touchedRouteFiles = [
  "src/app/api/user/follow/route.ts",
  "src/app/api/user/onboarding-progress/route.ts",
];

function currentHead(root = repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function readIfExists(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string) {
  const source = readIfExists(relativePath);
  if (!source) return null;
  return JSON.parse(source) as Record<string, unknown>;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function speedSnapshot(evidence: string): SpeedSecuritySnapshot {
  const report = readJson("agent/state/speed-security-hardening.generated.json") ?? {};
  return {
    score: numberValue(report.overallScore),
    status: stringValue(report.overallStatus),
    findings: countArray(report.findings),
    criticalFindings: countArray(report.criticalFindings),
    evidence,
  };
}

function finding(input: Cost4xxFinding): Cost4xxFinding {
  return input;
}

function routeFinding(input: Route4xxFinding): Route4xxFinding {
  return input;
}

export function buildCost4xxReductionReport(input: {
  currentHead: string;
  generatedAtUtc: string;
}): Cost4xxReductionReport {
  const cloudRunFindings = [
    finding({
      id: "cloud-run-app-hosting-source-config",
      lane: "cloud_run",
      severity: "p2",
      status: "source_inventory_complete",
      owner: "platform-cost",
      filePath: "apphosting.yaml",
      detail: "App Hosting source config remains documented as a source-only Cloud Run/App Hosting cost lane; no infra deployment config changed.",
      action: "Use provider metrics before changing min/max instances, concurrency, or CPU allocation.",
      evidence: ["docs/agent-truth/creator-dashboard-error-cost-inventory.md", "agent/state/beta-score-cleanup.generated.json"],
    }),
    finding({
      id: "user-route-body-limit-reduction",
      lane: "cloud_run",
      severity: "p2",
      status: "fixed",
      owner: "server-truth",
      filePath: "src/app/api/user",
      detail: "User follow and onboarding-progress POST bodies now use the bounded JSON parser before zod validation or analytics work.",
      action: "Keep non-payment user mutations bounded before route work starts.",
      evidence: touchedRouteFiles,
    }),
  ];

  const cloudSqlFindings = [
    finding({
      id: "cloud-sql-agent-context-mirror-only",
      lane: "cloud_sql",
      severity: "p2",
      status: "deferred_owner_review",
      owner: "platform-cost",
      filePath: "dataconnect/dataconnect.yaml",
      detail: "Cloud SQL/Data Connect remains classified as an agent-context mirror; no user/creator product runtime SQL usage was fixed in this pass.",
      action: "Owner should confirm provider billing and active connection state outside source-only validation.",
      evidence: ["agent/state/source-truth-authority-map.generated.json", "docs/agent-truth/beta-score-cleanup.md"],
    }),
  ];

  const geminiCloudAssistFindings = [
    finding({
      id: "gemini-cloud-assist-admin-ai-only",
      lane: "gemini_cloud_assist",
      severity: "p2",
      status: "deferred_owner_review",
      owner: "admin-ai",
      filePath: "src/lib/server/api-cost-contract.ts",
      detail: "Gemini/Cloud Assist/Vertex source references are admin/provider cost lanes; no user/creator route AI call path was found or changed.",
      action: "Run the admin AI cost owner lane before changing model calls, token budgets, or provider behavior.",
      evidence: ["agent/state/creator-dashboard-error-cost-inventory.generated.json", "agent/state/beta-score-cleanup.generated.json"],
    }),
  ];

  const route4xxFindings = [
    routeFinding({
      id: "expected-user-auth-validation-4xx",
      lane: "route_4xx",
      severity: "p2",
      status: "source_inventory_complete",
      owner: "server-truth",
      filePath: "src/app/api/user",
      detail: "User routes intentionally return 401/400/404/409 for auth, invalid body, missing target, and unavailable creator states.",
      action: "UI should not retry expected auth or validation failures without user input.",
      evidence: ["src/app/api/user/follow/route.ts", "src/app/api/user/onboarding-progress/route.ts"],
      classification: "expected",
      retryRisk: "classified_no_auto_retry",
      expectedCodes: ["400", "401", "404", "409", "413"],
    }),
    routeFinding({
      id: "expected-creator-business-4xx",
      lane: "route_4xx",
      severity: "p2",
      status: "source_inventory_complete",
      owner: "creator-api",
      filePath: "src/app/api/creator",
      detail: "Creator routes already classify auth, paid-GD shortfall, slot unavailable, disabled features, and bounded-body errors as typed expected 4xx states.",
      action: "Keep calm client copy for expected creator business failures.",
      evidence: ["docs/agent-truth/creator-dashboard-error-cost-inventory.md"],
      classification: "expected",
      retryRisk: "classified_requires_user_action",
      expectedCodes: ["400", "401", "402", "403", "409", "413", "429"],
    }),
    routeFinding({
      id: "unexpected-unbounded-user-body",
      lane: "route_4xx",
      severity: "p2",
      status: "fixed",
      owner: "server-truth",
      filePath: "src/app/api/user/follow/route.ts",
      detail: "Plain request.json parsing in user follow/onboarding-progress could parse oversized or malformed bodies before typed bounded-body responses.",
      action: "Replaced with readBoundedJsonBody and explicit payload_too_large/invalid_json responses.",
      evidence: touchedRouteFiles,
      classification: "unexpected",
      retryRisk: "fixed_no_repeated_parse_work",
      expectedCodes: ["400", "413"],
    }),
  ];

  const fixesApplied = [
    cloudRunFindings[1],
    route4xxFindings[2],
    finding({
      id: "user-route-bounded-json-body",
      lane: "route_4xx",
      severity: "p2",
      status: "fixed",
      owner: "server-truth",
      filePath: "src/app/api/user",
      detail: "Bounded JSON body parsing was added to safe user mutation routes that had request.json parsing.",
      action: "Keep future user mutation bodies behind readBoundedJsonBody when the route contract declares a body limit.",
      evidence: touchedRouteFiles,
    }),
  ];
  const deferredFindings = [
    cloudRunFindings[0],
    ...cloudSqlFindings,
    ...geminiCloudAssistFindings,
  ];
  const allFindings = [
    ...cloudRunFindings,
    ...cloudSqlFindings,
    ...geminiCloudAssistFindings,
    ...route4xxFindings,
  ];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "cost-4xx-reduction",
    currentHead: input.currentHead,
    cloudRunFindings,
    cloudSqlFindings,
    geminiCloudAssistFindings,
    route4xxFindings,
    fixesApplied,
    deferredFindings,
    speedSecurityBefore: {
      score: 51,
      status: "beta-risk",
      findings: 91,
      criticalFindings: 0,
      evidence: "Pre-pass required score:speed-security baseline from this prompt.",
    },
    speedSecurityAfter: speedSnapshot("Post-fix score:speed-security artifact."),
    p0Count: allFindings.filter((entry) => entry.severity === "p0").length,
    p1Count: allFindings.filter((entry) => entry.severity === "p1").length,
    p2Count: allFindings.filter((entry) => entry.severity === "p2").length,
  };
}

function hasUnboundedPromiseAll(source: string) {
  return /Promise\.all\(\s*[^)]*\.map\(/u.test(source) && !/mapWithConcurrency|cost-bound|bounded Promise\.all/u.test(source);
}

function costFindings(report: Cost4xxReductionReport) {
  return [
    ...report.cloudRunFindings,
    ...report.cloudSqlFindings,
    ...report.geminiCloudAssistFindings,
  ];
}

export function validateCost4xxReductionReport(
  report: Cost4xxReductionReport | null,
  sources: SourceMap,
  options: { currentHead: string },
) {
  const failures: string[] = [];
  if (!report) return ["cost-4xx-reduction artifact missing"];
  if (report.reportKey !== "cost-4xx-reduction") {
    failures.push("reportKey must be cost-4xx-reduction.");
  }
  if (report.currentHead !== options.currentHead) {
    failures.push(`cost-4xx-reduction currentHead must match git HEAD (${options.currentHead}).`);
  }
  if (report.cloudRunFindings.length === 0) failures.push("Cloud Run lane missing.");
  if (report.cloudSqlFindings.length === 0) failures.push("Cloud SQL lane missing.");
  if (report.geminiCloudAssistFindings.length === 0) failures.push("Gemini/Cloud Assist lane missing.");
  if (!report.route4xxFindings.some((entry) => entry.classification === "expected")) {
    failures.push("expected 4xx classification missing.");
  }
  if (!report.route4xxFindings.some((entry) => entry.classification === "unexpected")) {
    failures.push("unexpected 4xx classification missing.");
  }
  for (const entry of report.route4xxFindings) {
    if (!entry.retryRisk) {
      failures.push(`4xx finding ${entry.id} lacks retry risk classification.`);
    }
    if (!entry.owner || !entry.action) {
      failures.push(`4xx finding ${entry.id} lacks owner/action.`);
    }
  }
  for (const entry of costFindings(report)) {
    if (entry.evidence.length === 0) {
      failures.push(`cost finding ${entry.id} lacks evidence.`);
    }
    if (entry.status === "pass") {
      failures.push(`cost finding ${entry.id} claims pass without artifact evidence.`);
    }
  }
  for (const filePath of touchedRouteFiles) {
    const source = sources[filePath] ?? "";
    if (!source) continue;
    if (source.includes("request.json()")) {
      failures.push(`${filePath} still uses request.json() after body-limit reduction.`);
    }
    if (!source.includes("readBoundedJsonBody")) {
      failures.push(`${filePath} missing readBoundedJsonBody after body-limit reduction.`);
    }
    if (!source.includes("isBoundedJsonBodyError")) {
      failures.push(`${filePath} missing typed bounded-body error handling.`);
    }
    if (hasUnboundedPromiseAll(source)) {
      failures.push(`${filePath} contains unbounded Promise.all map fanout.`);
    }
  }
  const dashboardInventory = readJson("agent/state/creator-dashboard-error-cost-inventory.generated.json") ?? {};
  const dashboardSummary = dashboardInventory.summary as Record<string, unknown> | undefined;
  if (dashboardSummary && numberValue(dashboardSummary.creatorDashboardErrorsFixed, 0) < 1) {
    failures.push("creator dashboard eager manager fetch/error inventory is not represented.");
  }
  if (report.speedSecurityAfter.evidence.length === 0 || report.speedSecurityAfter.findings < 1) {
    failures.push("speed-security after snapshot must include artifact evidence.");
  }
  return failures;
}

function readWorkspaceSources(): SourceMap {
  return Object.fromEntries(touchedRouteFiles.map((path) => [path, readIfExists(path)]));
}

function renderDocs(report: Cost4xxReductionReport) {
  const lines = [
    "# Cost And 4xx Reduction",
    "",
    `Artifact: \`${artifactRelativePath}\``,
    "Validator: `npm run check:cost-4xx-reduction`",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current source head: \`${report.currentHead}\``,
    "",
    "## Summary",
    "",
    `- Speed/security before: ${report.speedSecurityBefore.score}/${report.speedSecurityBefore.status}, findings ${report.speedSecurityBefore.findings}.`,
    `- Speed/security after: ${report.speedSecurityAfter.score}/${report.speedSecurityAfter.status}, findings ${report.speedSecurityAfter.findings}.`,
    `- P0/P1/P2 findings: ${report.p0Count}/${report.p1Count}/${report.p2Count}.`,
    "- Payment, GumDrop math, Firebase rules, Cloud Functions, BigQuery, deployment config, and admin runtime were not changed.",
    "",
    "## Safe Fixes",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "## 4xx Classification",
    "",
    ...report.route4xxFindings.map((entry) => `- ${entry.id} [${entry.classification}, ${entry.retryRisk}]: ${entry.detail}`),
    "",
    "## Cloud Run / App Hosting",
    "",
    ...report.cloudRunFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "## Cloud SQL",
    "",
    ...report.cloudSqlFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "## Gemini / Cloud Assist / Vertex",
    "",
    ...report.geminiCloudAssistFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "## Deferred Owner Review",
    "",
    ...report.deferredFindings.map((entry) => `- ${entry.id}: ${entry.action}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function main() {
  const report = buildCost4xxReductionReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(docsPath, renderDocs(report), "utf8");

  const failures = validateCost4xxReductionReport(report, readWorkspaceSources(), { currentHead: currentHead() });
  if (failures.length > 0) {
    console.error("Cost/4xx reduction validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Cost/4xx reduction passed. route4xx=${report.route4xxFindings.length} ` +
      `cloudRun=${report.cloudRunFindings.length} cloudSql=${report.cloudSqlFindings.length} ai=${report.geminiCloudAssistFindings.length}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
