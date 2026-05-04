import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { SPEED_SECURITY_REPORT_PATH } from "../../src/lib/server/route-cache-contract";
import {
  APP_CHECK_READINESS_CONTRACT,
  SECURITY_ROUTE_CONTRACTS,
  type SecurityRouteContract,
} from "../../src/lib/server/security-hardening-contract";
import {
  SPEED_SECURITY_DOCTRINE_NOTE,
  SPEED_SECURITY_FORBIDDEN_COMMANDS,
} from "./score-speed-security-hardening";

type Finding = {
  id: string;
  domain: string;
  severity: string;
  filePath: string;
  title: string;
  evidence: string[];
  expectedRule: string;
  actualPattern: string;
  canAutofix: boolean;
  autofixConfidence: number;
  suggestedFix: string;
  humanReadableEscalation: string;
};

type Report = {
  overallScore: number;
  overallStatus: string;
  domainScores: Record<string, unknown>;
  routeCacheClassification: { routes: Array<{ routePath: string; filePath: string }> };
  routeSecurityClassification: {
    totals: Record<string, number>;
    routes: Array<{
      routePath: string;
      filePath: string;
      mutation: boolean;
      trustedOriginChecked: boolean;
      trustedOriginRequired: boolean;
      trustedOriginPresent: boolean;
      sensitiveWrites: boolean;
      rateLimitPresent: boolean;
      idempotencyRequired: boolean;
      idempotencyPresent: boolean;
    }>;
  };
  firebaseRulesFindings: Finding[];
  appCheckReadiness: { enforcementMode: string; protectedSurfaces: string[] };
  findings: Finding[];
  criticalFindings: Finding[];
  minimalVerificationCommands: string[];
  forbiddenCommands: string[];
};

const root = process.cwd();
const failures: string[] = [];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRECTORIES = new Set([".git", ".next", "node_modules", "out", "playwright-report", "test-results", "lighthouse-results"]);
const DOMAINS = [
  "speedCachingHydration",
  "apiRouteSecurityExploitHardening",
  "firebaseRulesAppCheckReadiness",
  "contentPaymentEconomyProtection",
  "costRunawayWorkControls",
  "docsDebugEvidenceCompleteness",
];

function fail(message: string) {
  failures.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function walkFiles(startPath: string): string[] {
  const fullStartPath = join(root, startPath);
  if (!existsSync(fullStartPath)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(fullStartPath)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const fullPath = join(fullStartPath, entry);
    const stat = statSync(fullPath);
    const child = `${startPath}/${entry}`.replace(/\\/g, "/");
    if (stat.isDirectory()) {
      output.push(...walkFiles(child));
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      output.push(child);
    }
  }
  return output;
}

function routePathFromFile(filePath: string) {
  return `/${filePath
    .replace(/^src\/app\//u, "")
    .replace(/\/route\.(?:ts|tsx|js|jsx)$/u, "")
    .replace(/\/index$/u, "")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(`${label} must be a number between ${min} and ${max}.`);
  }
}

function validateFinding(finding: Finding, index: number) {
  for (const field of [
    "id",
    "domain",
    "severity",
    "filePath",
    "title",
    "expectedRule",
    "actualPattern",
    "suggestedFix",
    "humanReadableEscalation",
  ] as const) {
    if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
      fail(`findings[${index}].${field} must be a non-empty string.`);
    }
  }
  if (!DOMAINS.includes(finding.domain)) {
    fail(`findings[${index}].domain is invalid.`);
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    fail(`findings[${index}].severity is invalid.`);
  }
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    fail(`findings[${index}].evidence must be non-empty.`);
  }
  if (typeof finding.canAutofix !== "boolean") {
    fail(`findings[${index}].canAutofix must be boolean.`);
  }
  requireNumber(finding.autofixConfidence, `findings[${index}].autofixConfidence`, 0, 1);
  if (finding.canAutofix && finding.autofixConfidence < 0.95) {
    fail(`findings[${index}] marks autofixable below 0.95 confidence.`);
  }
}

function validateSecurityContract(contract: SecurityRouteContract, index: number) {
  if (!contract.routePattern.startsWith("/api/")) {
    fail(`SECURITY_ROUTE_CONTRACTS[${index}] must classify an /api route pattern.`);
  }
  if (!Array.isArray(contract.methods) || contract.methods.length === 0) {
    fail(`SECURITY_ROUTE_CONTRACTS[${index}] must declare methods.`);
  }
  if (contract.sensitiveWrites && contract.rateLimitPolicy === "none") {
    fail(`SECURITY_ROUTE_CONTRACTS[${index}] sensitive write cannot use rateLimitPolicy none.`);
  }
  if (contract.csrfRisk === "high" && !contract.trustedOriginRequired && contract.authRequired !== "webhook" && contract.authRequired !== "cron") {
    fail(`SECURITY_ROUTE_CONTRACTS[${index}] high CSRF risk must require trusted origin unless webhook/cron.`);
  }
}

const reportSource = readRequired(SPEED_SECURITY_REPORT_PATH);
let report: Report | null = null;
if (reportSource) {
  try {
    report = JSON.parse(reportSource) as Report;
  } catch (error) {
    fail(`${SPEED_SECURITY_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
  }
}

if (report) {
  requireNumber(report.overallScore, "overallScore", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.overallStatus)) {
    fail("overallStatus must be valid.");
  }
  if (!isRecord(report.domainScores)) {
    fail("domainScores must be present.");
  } else {
    for (const domain of DOMAINS) {
      if (!report.domainScores[domain]) {
        fail(`domainScores missing ${domain}.`);
      }
    }
  }
  if (!Array.isArray(report.findings)) {
    fail("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
  }
  if (report.criticalFindings?.length > 0 && report.overallStatus !== "fail") {
    fail("Critical findings must force report status to fail.");
  }
  if (!report.minimalVerificationCommands?.includes("npm run check:speed-security")) {
    fail("minimalVerificationCommands must include npm run check:speed-security.");
  }
  if (!report.forbiddenCommands?.includes("playwright")) {
    fail("forbiddenCommands must include Playwright.");
  }
  if (!report.appCheckReadiness || !Array.isArray(report.appCheckReadiness.protectedSurfaces)) {
    fail("appCheckReadiness must be present with protected surfaces.");
  }
  if (!report.routeCacheClassification?.routes?.length) {
    fail("routeCacheClassification.routes must be populated.");
  }
  if (!report.routeSecurityClassification?.routes?.length) {
    fail("routeSecurityClassification.routes must be populated.");
  }

  const apiRouteFiles = walkFiles("src/app/api").filter((filePath) => /\/route\.(?:ts|tsx|js|jsx)$/u.test(filePath));
  const expectedRoutes = new Set(apiRouteFiles.map(routePathFromFile));
  const classifiedSecurityRoutes = new Set(report.routeSecurityClassification.routes.map((route) => route.routePath));
  const classifiedCacheRoutes = new Set(report.routeCacheClassification.routes.map((route) => route.routePath));
  for (const routePath of expectedRoutes) {
    if (!classifiedSecurityRoutes.has(routePath)) {
      fail(`API route missing security classification: ${routePath}`);
    }
    if (!classifiedCacheRoutes.has(routePath)) {
      fail(`API route missing cache classification: ${routePath}`);
    }
  }

  for (const route of report.routeSecurityClassification.routes) {
    if (route.mutation && !route.trustedOriginChecked) {
      fail(`${route.routePath} mutation must be checked for trusted origin.`);
    }
    if (route.trustedOriginRequired && !route.trustedOriginPresent) {
      const hasFinding = report.findings.some((finding) =>
        finding.filePath === route.filePath && /trusted-origin|trusted origin/i.test(`${finding.title} ${finding.actualPattern}`));
      if (!hasFinding) {
        fail(`${route.routePath} missing trusted origin must have a finding.`);
      }
    }
    if (route.sensitiveWrites && !route.rateLimitPresent) {
      const hasFinding = report.findings.some((finding) =>
        finding.filePath === route.filePath && /rate limit/i.test(`${finding.title} ${finding.actualPattern}`));
      if (!hasFinding) {
        fail(`${route.routePath} sensitive route missing rate limit must have a finding.`);
      }
    }
    if (route.idempotencyRequired && !route.idempotencyPresent) {
      const hasFinding = report.findings.some((finding) =>
        finding.filePath === route.filePath && /idempotency/i.test(`${finding.title} ${finding.actualPattern}`));
      if (!hasFinding) {
        fail(`${route.routePath} missing idempotency must have a finding.`);
      }
    }
  }
}

for (const filePath of [
  "src/lib/server/security-hardening-contract.ts",
  "src/lib/server/route-cache-contract.ts",
  "scripts/agent/score-speed-security-hardening.ts",
  "scripts/agent/validate-speed-security-hardening.ts",
  "scripts/agent/repair-speed-security-hardening-safe.ts",
  "docs/agent-truth/speed-security-hardening.md",
]) {
  readRequired(filePath);
}

SECURITY_ROUTE_CONTRACTS.forEach(validateSecurityContract);
if (!APP_CHECK_READINESS_CONTRACT.protectedSurfaces.length) {
  fail("APP_CHECK_READINESS_CONTRACT must include protected surfaces.");
}

const packageJson = readRequired("package.json");
for (const expected of [
  '"score:speed-security": "tsx scripts/agent/score-speed-security-hardening.ts"',
  '"check:speed-security": "tsx scripts/agent/validate-speed-security-hardening.ts"',
  '"repair:speed-security": "tsx scripts/agent/repair-speed-security-hardening-safe.ts"',
]) {
  requireIncludes(packageJson, expected, "package.json scripts");
}

const firestoreRules = readRequired("firestore.rules");
if (!/allow\s+read,\s*write:\s*if\s+false/u.test(firestoreRules)) {
  fail("firestore.rules must include default deny.");
}
if (/allow\s+(?:read,\s*write|read|write):\s*if\s+true/u.test(firestoreRules)) {
  fail("firestore.rules must not include broad if true access.");
}

const scoreScript = readRequired("scripts/agent/score-speed-security-hardening.ts");
const repairScript = readRequired("scripts/agent/repair-speed-security-hardening-safe.ts");
for (const [label, source] of [
  ["score script", scoreScript],
  ["repair script", repairScript],
] as const) {
  if (/node:child_process|execSync|spawn\(|playwright\.test|cypress\.run|lighthouse\(/u.test(source)) {
    fail(`${label} must not invoke broad command runners or browser audit tools.`);
  }
}
requireIncludes(repairScript, "finding.autofixConfidence < 0.95", "repair:speed-security safe repair gate");
for (const forbidden of SPEED_SECURITY_FORBIDDEN_COMMANDS) {
  requireIncludes(scoreScript, forbidden, "speed/security forbidden command list");
}

for (const [label, filePath] of [
  ["speed/security doc", "docs/agent-truth/speed-security-hardening.md"],
  ["README", "README.md"],
  ["AGENTS", "AGENTS.md"],
  ["REPO_MEMORY_LEDGER", "REPO_MEMORY_LEDGER.md"],
  ["EVERY_FILE_FUNCTION_CHECKLIST", "EVERY_FILE_FUNCTION_CHECKLIST.md"],
  ["FULL_SCALE_CODEBASE_AUDIT", "FULL_SCALE_CODEBASE_AUDIT.md"],
  ["google cost bleed doc", "docs/agent-truth/google-cost-bleed.md"],
  ["public beta score doc", "docs/agent-truth/public-beta-score.md"],
] as const) {
  requireIncludes(readRequired(filePath), SPEED_SECURITY_DOCTRINE_NOTE, label);
}

if (failures.length > 0) {
  console.error("Speed/security hardening validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Speed/security hardening validation passed.");
