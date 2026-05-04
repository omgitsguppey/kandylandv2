import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type GoogleCostFinding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  costClass: string;
  routePath?: string;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: unknown[];
};

type RouteSummary = {
  filePath: string;
  routePath: string;
  methods: string[];
  contract: {
    routePattern: string;
    methods: string[];
    costClass: string;
    ratePolicy: string;
    cachePolicy: string;
    authRequired: string;
    trustedOriginRequired: boolean;
    budgetGuardRequired: boolean;
    notes: string;
  } | null;
};

type GoogleCostReport = {
  score: number;
  status: string;
  generatedAt: string;
  repoRoot: string;
  findings: GoogleCostFinding[];
  criticalCount: number;
  majorCount: number;
  routeContracts: unknown[];
  routes: RouteSummary[];
  suspectedCostSurfaces: unknown[];
  requiredFixes: string[];
  safeAutofixSuggestions: string[];
  minimalVerificationCommands: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const reportPath = "agent/state/google-cost-bleed.generated.json";

const costClasses = [
  "free_read",
  "firestore_read",
  "firestore_write",
  "firestore_transaction",
  "firestore_listener",
  "storage_egress",
  "ga_quota",
  "ai_paid",
  "sql_forbidden",
  "cloud_run_compute",
  "payment_sensitive",
  "support_admin",
  "unknown",
];

const categories = [
  "route_contract",
  "trusted_origin",
  "ai_paid",
  "ga_quota",
  "firestore",
  "storage_egress",
  "sql_forbidden",
  "cloud_run_compute",
  "rate_limit",
  "cache_policy",
  "debug_evidence",
];

function readRequired(relativePath: string) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireNumber(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function expectedStatus(score: number, criticalCount: number) {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function readReport() {
  const source = readRequired(reportPath);
  if (!source) return null;
  try {
    return JSON.parse(source) as GoogleCostReport;
  } catch (error) {
    failures.push(`${reportPath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: GoogleCostFinding, index: number) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  if (!categories.includes(finding.category)) {
    failures.push(`findings[${index}].category is invalid.`);
  }
  if (!costClasses.includes(finding.costClass)) {
    failures.push(`findings[${index}].costClass is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  if (finding.canAutofix) {
    failures.push(`findings[${index}] must not be autofixable by default for Google cost scoring.`);
  }
  if (!Array.isArray(finding.evidence)) {
    failures.push(`findings[${index}].evidence must be an array.`);
  }
}

const report = readReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid Google cost score status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("generatedAt must be an ISO timestamp.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const criticalCount = report.findings.filter((finding) => finding.severity === "critical").length;
    const majorCount = report.findings.filter((finding) => finding.severity === "major").length;
    if (criticalCount !== report.criticalCount) {
      failures.push("criticalCount must match critical findings.");
    }
    if (majorCount !== report.majorCount) {
      failures.push("majorCount must match major findings.");
    }
  }
  if (!Array.isArray(report.routeContracts) || report.routeContracts.length < 20) {
    failures.push("routeContracts must include the canonical route contract set.");
  }
  if (!Array.isArray(report.routes) || report.routes.length < 100) {
    failures.push("routes must enumerate current API routes.");
  }
  const unclassifiedRoutes = report.routes.filter((route) => !route.contract);
  if (unclassifiedRoutes.length > 0) {
    failures.push(`All current API routes must be classified by a cost contract. Unclassified: ${unclassifiedRoutes.map((route) => route.routePath).join(", ")}`);
  }
  for (const requiredRoute of [
    "/api/admin/ai/drop-covers/generate",
    "/api/admin/analytics/historical",
    "/api/drops/content",
    "/api/paypal/capture",
    "/api/cron/process-creator-subscriptions",
  ]) {
    if (!report.routes.some((route) => route.routePath === requiredRoute && route.contract)) {
      failures.push(`routes must include classified ${requiredRoute}.`);
    }
  }
  if (!Array.isArray(report.suspectedCostSurfaces) || report.suspectedCostSurfaces.length === 0) {
    failures.push("suspectedCostSurfaces must record Google/Firebase/SQL cost-bearing imports/usages.");
  }
  for (const command of ["npm run score:google-cost", "npm run check:google-cost"]) {
    if (!report.minimalVerificationCommands?.includes(command)) {
      failures.push(`minimalVerificationCommands must include ${command}.`);
    }
    if (!report.commandBudget?.allowedCommands?.includes(command)) {
      failures.push(`commandBudget.allowedCommands must include ${command}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check"]) {
    if (!report.commandBudget?.forbiddenCommands?.includes(forbidden)) {
      failures.push(`commandBudget.forbiddenCommands must include ${forbidden}.`);
    }
  }
  if (report.safeAutofixSuggestions.length !== 0) {
    failures.push("safeAutofixSuggestions must stay empty by default; cost/business logic is advisory only.");
  }
}

const packageJson = readRequired("package.json");
const contract = readRequired("src/lib/server/api-cost-contract.ts");
const scorer = readRequired("scripts/agent/score-google-cost-bleed.ts");
const validator = readRequired("scripts/agent/validate-google-cost-bleed.ts");
const docs = readRequired("docs/agent-truth/google-cost-bleed.md");
const readme = readRequired("README.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const memory = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "\"score:google-cost\": \"tsx scripts/agent/score-google-cost-bleed.ts\"",
  "\"check:google-cost\": \"tsx scripts/agent/validate-google-cost-bleed.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "ApiCostContract",
  "free_read",
  "firestore_read",
  "firestore_write",
  "firestore_transaction",
  "firestore_listener",
  "storage_egress",
  "ga_quota",
  "ai_paid",
  "sql_forbidden",
  "cloud_run_compute",
  "payment_sensitive",
  "support_admin",
  "matchApiCostContract",
  "/api/admin/ai/**",
  "/api/drops/content",
  "/api/paypal/**",
]) {
  requireIncludes(contract, expected, "API cost contract");
}

for (const expected of [
  "scanAiSurfaces",
  "scanGaSurfaces",
  "scanFirestoreRisks",
  "scanStorageRisks",
  "scanSqlRuntime",
  "scanCloudRun",
  "returnPropertyQuota",
  "MEDIA_PROXY",
  "Data Connect",
  "agent/state/google-cost-bleed.generated.json",
]) {
  requireIncludes(scorer, expected, "Google cost scorer");
}

requireNotIncludes(scorer, "node:child_process", "Google cost audit default path");
requireNotIncludes(scorer, "execSync", "Google cost audit default path");
requireNotIncludes(scorer, "spawnSync", "Google cost audit default path");

const doctrine = "Google cost-bearing surfaces must be declared before use.";
for (const [label, source] of [
  ["google cost docs", docs],
  ["README", readme],
  ["full audit ledger", audit],
  ["repo memory ledger", memory],
  ["file function checklist", checklist],
] as const) {
  requireIncludes(source, doctrine, label);
}

for (const expected of [
  "Firestore, Storage, Google Analytics Data API, Vertex AI, Cloud Run/App Hosting, and any SQL/Data Connect runtime",
  "The app must fail audits before it surprises billing.",
  "score:google-cost",
  "check:google-cost",
  "No autofix is enabled by default",
]) {
  requireIncludes(docs, expected, "google cost docs");
}

if (failures.length > 0) {
  console.error("Google cost bleed validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Google cost bleed audit validated.");
