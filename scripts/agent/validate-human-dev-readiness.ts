import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const reportPath = "agent/state/human-dev-readiness.generated.json";

type CheckResult = {
  id: string;
  status: "pass" | "fail" | "warning";
  evidence: string[];
};

const failures: string[] = [];
const warnings: string[] = [];
const checks: CheckResult[] = [];

function repoPath(filePath: string) {
  return join(root, filePath);
}

function fileExists(filePath: string) {
  return existsSync(repoPath(filePath));
}

function read(filePath: string) {
  return fileExists(filePath) ? readFileSync(repoPath(filePath), "utf8") : "";
}

function addCheck(id: string, passed: boolean, evidence: string[], warning = false) {
  checks.push({ id, status: passed ? "pass" : warning ? "warning" : "fail", evidence });
  if (!passed && warning) warnings.push(`${id}: ${evidence.join("; ")}`);
  if (!passed && !warning) failures.push(`${id}: ${evidence.join("; ")}`);
}

function requireIncludes(source: string, needle: string, id: string, filePath: string) {
  addCheck(id, source.includes(needle), [`${filePath} ${source.includes(needle) ? "includes" : "must include"} ${needle}`]);
}

function normalizeLine(line: string) {
  return line.trim().replace(/\s+/gu, " ");
}

function hasCodeownerEntry(codeowners: string, pattern: string) {
  return codeowners
    .split(/\r?\n/u)
    .map(normalizeLine)
    .some((line) => line.startsWith(pattern) && / @[\w-]+/u.test(line));
}

function containsForbiddenBroadCommand(source: string) {
  const forbidden = [
    "npm run check\n",
    "npm run check ",
    "npm run check:ui:audits",
    "npm run check:ui:continuity",
    "npm run check:ui:lighthouse",
    "playwright test",
    "cypress run",
    "lighthouse",
    "firebase deploy",
    "gcloud ",
  ];
  return forbidden.find((needle) => source.includes(needle));
}

function parseEnvAssignments(source: string) {
  return source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return { key, value: rest.join("=") };
    });
}

const requiredFiles = [
  "CONTRIBUTING.md",
  "SECURITY.md",
  ".env.example",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/openssf-scorecard.yml",
  "docs/adr/0000-template.md",
  "docs/runbooks/incident-response.md",
  "docs/runbooks/payment-incident.md",
  "docs/runbooks/firestore-rules-incident.md",
  "docs/runbooks/analytics-truth-incident.md",
  "docs/agent-truth/human-dev-readiness.md",
  "docs/agent-truth/environment-contract.md",
  "docs/agent-truth/contractor-onboarding.md",
  "scripts/agent/validate-human-dev-readiness.ts",
];

for (const filePath of requiredFiles) {
  addCheck(`required-file:${filePath}`, fileExists(filePath), [`${filePath} exists`]);
}

const packageJson = read("package.json");
requireIncludes(
  packageJson,
  '"check:human-dev-readiness": "tsx scripts/agent/validate-human-dev-readiness.ts"',
  "package-script:check-human-dev-readiness",
  "package.json",
);

const codeowners = read(".github/CODEOWNERS");
const codeownerSurfaces: Array<[string, string[]]> = [
  ["repo governance files", ["/.github/", "/CONTRIBUTING.md", "/SECURITY.md", "/docs/doctrine/"]],
  ["wallet/payment/GumDrops", ["/src/app/api/paypal/", "/src/components/PurchaseModal.tsx", "/src/lib/gumdrop-ledger.ts"]],
  ["unlock/content protection/viewer", ["/src/app/api/drops/unlock/", "/src/app/dashboard/viewer/", "/src/lib/viewer-watch-session.ts"]],
  ["creator monetization", ["/src/app/api/creator/", "/src/lib/server/creator-experiences.ts"]],
  ["analytics/telemetry/behavioral intelligence", ["/src/app/api/analytics/", "/src/lib/analytics/", "/src/lib/behavioral/"]],
  ["support/moderation", ["/src/components/Support/", "/src/app/api/admin/support/", "/src/lib/moderation/"]],
  ["Firebase rules/storage rules", ["/firestore.rules", "/storage.rules"]],
  ["Data Connect/Cloud SQL", ["/dataconnect/", "/src/lib/server/api-cost-contract.ts"]],
  ["scripts/agent validators", ["/scripts/agent/", "/src/lib/agent-audit/"]],
  ["GitHub workflows", ["/.github/workflows/"]],
];

for (const [surface, patterns] of codeownerSurfaces) {
  const missing = patterns.filter((pattern) => !hasCodeownerEntry(codeowners, pattern));
  addCheck(`codeowners:${surface}`, missing.length === 0, missing.length === 0 ? [`${surface} has CODEOWNERS entries`] : [`missing CODEOWNERS entries: ${missing.join(", ")}`]);
}

const prTemplate = read(".github/pull_request_template.md");
for (const required of [
  "Summary",
  "Touched Surfaces",
  "Source-Of-Truth Impact",
  "Telemetry Impact",
  "Security / Payment / Unlock Impact",
  "Validators Run",
  "Commands Intentionally Not Run",
  "Rollback Plan",
  "Dependency Changes",
  "Environment Changes",
  "Known Risks",
]) {
  requireIncludes(prTemplate, required, `pr-template:${required}`, ".github/pull_request_template.md");
}

const ciWorkflow = read(".github/workflows/ci.yml");
for (const required of [
  "npm ci",
  "npm run plan:affected-audits",
  "npm run check:affected-audit-router",
  "npm run check:human-dev-readiness",
  "npm run typecheck",
  "permissions:",
  "contents: read",
]) {
  requireIncludes(ciWorkflow, required, `ci-workflow:${required}`, ".github/workflows/ci.yml");
}
const ciForbidden = containsForbiddenBroadCommand(ciWorkflow);
addCheck("ci-workflow:no-broad-audits", !ciForbidden, ciForbidden ? [`CI workflow contains forbidden broad command ${ciForbidden}`] : ["CI workflow stays lightweight"]);

const dependencyReview = read(".github/workflows/dependency-review.yml");
for (const required of [
  "actions/dependency-review-action@v4",
  "contents: read",
  "pull-requests: read",
  "package.json",
  "functions/package.json",
]) {
  requireIncludes(dependencyReview, required, `dependency-review:${required}`, ".github/workflows/dependency-review.yml");
}

const scorecard = read(".github/workflows/openssf-scorecard.yml");
for (const required of [
  "permissions: read-all",
  "ossf/scorecard-action@",
  "continue-on-error: true",
  "publish_results: false",
]) {
  requireIncludes(scorecard, required, `scorecard:${required}`, ".github/workflows/openssf-scorecard.yml");
}

const dependabot = read(".github/dependabot.yml");
for (const required of [
  'package-ecosystem: "npm"',
  'directory: "/"',
  'directory: "/functions"',
  'package-ecosystem: "github-actions"',
  "groups:",
  "minor",
  "patch",
]) {
  requireIncludes(dependabot, required, `dependabot:${required}`, ".github/dependabot.yml");
}
addCheck("dependabot:no-auto-merge", !/auto-merge|automerge/iu.test(dependabot), ["Dependabot config does not enable auto-merge"]);

const envExample = read(".env.example");
const envAssignments = parseEnvAssignments(envExample);
const envValueLeaks = envAssignments.filter(({ value }) => value.trim().length > 0);
addCheck(
  "env-example:no-values",
  envValueLeaks.length === 0,
  envValueLeaks.length === 0
    ? [".env.example uses blank values only"]
    : [`variables with non-empty values: ${envValueLeaks.map((entry) => entry.key).join(", ")}`],
);
for (const group of [
  "Firebase public config",
  "Firebase admin/server config",
  "PayPal sandbox/live",
  "PostHog/analytics",
  "Google/BigQuery/Data Connect",
  "App URLs",
  "Feature flags",
  "AI flags",
]) {
  requireIncludes(envExample, group, `env-example:${group}`, ".env.example");
}

const security = read("SECURITY.md");
for (const required of [
  "Supported Branch",
  "Reporting Vulnerabilities",
  "Do not open public issues",
  "Response Window",
  "Secrets Policy",
  "Emergency contact",
]) {
  requireIncludes(security, required, `security:${required}`, "SECURITY.md");
}

const contributing = read("CONTRIBUTING.md");
for (const required of [
  "Branch",
  "PRs small",
  "Required Reading",
  "Forbidden by default",
  "Dependency Policy",
  "Screenshots",
  "Sensitive Surfaces",
  "Uncertainty",
]) {
  requireIncludes(contributing, required, `contributing:${required}`, "CONTRIBUTING.md");
}

const runbookSections = ["Symptoms", "Immediate Containment", "Rollback", "Validation", "Owner", "Logs", "Follow-Up"];
for (const filePath of [
  "docs/runbooks/incident-response.md",
  "docs/runbooks/payment-incident.md",
  "docs/runbooks/firestore-rules-incident.md",
  "docs/runbooks/analytics-truth-incident.md",
]) {
  const source = read(filePath);
  for (const section of runbookSections) {
    requireIncludes(source, section, `runbook:${filePath}:${section}`, filePath);
  }
}

const adr = read("docs/adr/0000-template.md");
for (const required of ["Context", "Decision", "Alternatives", "Consequences", "Validation", "Rollback", "Source Files", "Affected Surfaces"]) {
  requireIncludes(adr, required, `adr-template:${required}`, "docs/adr/0000-template.md");
}

for (const filePath of [
  "docs/agent-truth/human-dev-readiness.md",
  "docs/agent-truth/environment-contract.md",
  "docs/agent-truth/contractor-onboarding.md",
]) {
  const source = read(filePath);
  requireIncludes(source, "KandyDrops", `docs:${filePath}:KandyDrops`, filePath);
}
requireIncludes(read("docs/agent-truth/human-dev-readiness.md"), "product analytics, operational telemetry, security evidence, audit evidence, and business metrics", "docs:observability-boundaries", "docs/agent-truth/human-dev-readiness.md");
requireIncludes(read("docs/agent-truth/environment-contract.md"), ".env.example", "docs:environment-contract", "docs/agent-truth/environment-contract.md");
requireIncludes(read("docs/agent-truth/contractor-onboarding.md"), "Contractor Onboarding", "docs:contractor-onboarding", "docs/agent-truth/contractor-onboarding.md");

const workflowFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/openssf-scorecard.yml",
];
for (const filePath of workflowFiles) {
  const source = read(filePath);
  addCheck(`workflow-permissions:${filePath}`, /permissions:\s*(?:read-all|\r?\n(?:\s+[a-z-]+:\s+read\r?\n?)+)/u.test(source), [`${filePath} declares least read permissions`]);
  addCheck(`workflow-no-pull-request-target:${filePath}`, !source.includes("pull_request_target"), [`${filePath} does not use pull_request_target`]);
  addCheck(`workflow-no-secrets:${filePath}`, !/secrets\./u.test(source), [`${filePath} does not consume repository secrets`]);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length > 0 ? "fail" : warnings.length > 0 ? "warning" : "pass",
  summary: {
    checks: checks.length,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: warnings.length,
    failures: failures.length,
  },
  requiredFiles,
  codeownerSurfaces: Object.fromEntries(codeownerSurfaces.map(([surface, patterns]) => [surface, patterns])),
  workflowFiles,
  envVariables: envAssignments.map((entry) => entry.key),
  checksByStatus: {
    pass: checks.filter((check) => check.status === "pass").map((check) => check.id),
    warning: checks.filter((check) => check.status === "warning").map((check) => check.id),
    fail: checks.filter((check) => check.status === "fail").map((check) => check.id),
  },
  failedChecks: checks.filter((check) => check.status === "fail"),
  warningChecks: checks.filter((check) => check.status === "warning"),
  failures,
  warnings,
};

mkdirSync(dirname(repoPath(reportPath)), { recursive: true });
writeFileSync(repoPath(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error("Human developer readiness validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Human developer readiness validation ${report.status}. Report written to ${reportPath}.`);
