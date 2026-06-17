import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AUTH_READINESS_REPORT_PATH,
  BLOCKED_MUTATION_COMMANDS,
  REQUIRED_AUTH_SURFACES,
  type AuthSurfaceStatus,
  type CodexAuthReadinessReport,
} from "../../src/lib/config-hardening/devops/auth-surface-contract";

const root = process.cwd();
const failures: string[] = [];
const warnings: string[] = [];

function repoPath(filePath: string) {
  return path.join(root, filePath);
}

function exists(filePath: string) {
  return existsSync(repoPath(filePath));
}

function read(filePath: string) {
  return exists(filePath) ? readFileSync(repoPath(filePath), "utf8") : "";
}

function requireFile(filePath: string) {
  if (!exists(filePath)) failures.push(`Missing required file: ${filePath}`);
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function parseReport() {
  const source = read(AUTH_READINESS_REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as CodexAuthReadinessReport;
  } catch (error) {
    failures.push(`${AUTH_READINESS_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function containsSecretValue(source: string) {
  const secretPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /AIza[0-9A-Za-z_-]{20,}/u,
    /ghp_[0-9A-Za-z_]{20,}/u,
    /github_pat_[0-9A-Za-z_]{20,}/u,
    /PAYPAL_[A-Z_]*SECRET["']?\s*[:=]\s*["'][^"']{8,}/iu,
    /CLIENT_SECRET["']?\s*[:=]\s*["'][^"']{8,}/iu,
  ];
  return secretPatterns.find((pattern) => pattern.test(source));
}

function hasMutationCommand(commands: string[]) {
  return commands.find((command) =>
    BLOCKED_MUTATION_COMMANDS.some((blocked) => command.toLowerCase().includes(blocked.toLowerCase())),
  );
}

function validateSurface(surface: AuthSurfaceStatus) {
  for (const key of ["surface", "tool", "status", "recommendedNextStep"] as const) {
    if (typeof surface[key] !== "string" || surface[key].trim().length === 0) {
      failures.push(`surface ${surface.surface || "(unknown)"} must include ${key}.`);
    }
  }
  if (!["ok", "missing_auth", "tool_missing", "wrong_project", "insufficient_scope", "manual_required", "unknown"].includes(surface.status)) {
    failures.push(`${surface.surface} has invalid status ${surface.status}.`);
  }
  for (const key of ["authenticated", "canRead", "canWrite", "canMutateProduction"] as const) {
    if (typeof surface[key] !== "boolean") failures.push(`${surface.surface}.${key} must be boolean.`);
  }
  if (surface.canMutateProduction) failures.push(`${surface.surface} must not report production mutation capability from read-only auth checks.`);
  if (!Array.isArray(surface.safeReadCommands)) failures.push(`${surface.surface}.safeReadCommands must be an array.`);
  if (!Array.isArray(surface.blockedCommands)) failures.push(`${surface.surface}.blockedCommands must be an array.`);
  const unsafeReadCommand = hasMutationCommand(surface.safeReadCommands);
  if (unsafeReadCommand) failures.push(`${surface.surface}.safeReadCommands contains blocked mutation command: ${unsafeReadCommand}`);
  if (surface.blockedCommands.length === 0) failures.push(`${surface.surface}.blockedCommands must list forbidden mutations.`);
}

for (const filePath of [
  "src/lib/config-hardening/devops/auth-surface-contract.ts",
  "scripts/agent/verify-codex-native-auth.ts",
  "scripts/agent/plan-cloud-auth-bootstrap.ts",
  "scripts/agent/validate-codex-auth-readiness.ts",
  AUTH_READINESS_REPORT_PATH,
  "docs/agent-truth/codex-native-auth-readiness.md",
  "docs/runbooks/cloud-auth-bootstrap.md",
  ".github/workflows/cloud-readiness-smoke.yml",
]) {
  requireFile(filePath);
}

const packageJson = read("package.json");
for (const expected of [
  '"check:codex-auth": "tsx scripts/agent/verify-codex-native-auth.ts"',
  '"plan:cloud-auth-bootstrap": "tsx scripts/agent/plan-cloud-auth-bootstrap.ts"',
  '"check:codex-auth-readiness": "tsx scripts/agent/validate-codex-auth-readiness.ts"',
]) {
  requireIncludes(packageJson, expected, "package.json");
}

const reportSource = read(AUTH_READINESS_REPORT_PATH);
const secretLeak = containsSecretValue(reportSource);
if (secretLeak) failures.push(`${AUTH_READINESS_REPORT_PATH} appears to contain a secret-like value matching ${secretLeak}.`);
const report = parseReport();
if (report) {
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("report.generatedAt must be an ISO timestamp.");
  }
  if (!Array.isArray(report.surfaces)) failures.push("report.surfaces must be an array.");
  if (!Array.isArray(report.recommendedAutomationPlan) || report.recommendedAutomationPlan.length === 0) {
    failures.push("report.recommendedAutomationPlan must include the WIF bootstrap plan.");
  }
  if (!report.recommendedAutomationPlan.some((item) => item.includes("Workload Identity Federation"))) {
    failures.push("WIF plan must explicitly mention Workload Identity Federation.");
  }
  for (const key of ["canCodexRunCloudReadChecks", "canCodexSetupWif", "manualBootstrapNeeded"] as const) {
    if (typeof report[key] !== "boolean") failures.push(`report.${key} must be boolean.`);
  }
  for (const key of ["missingTools", "missingAuth", "insufficientScopes", "safeNextCommands", "blockedMutationCommands"] as const) {
    if (!Array.isArray(report[key])) failures.push(`report.${key} must be an array.`);
  }

  const surfaceLabels = new Set(report.surfaces.map((surface) => surface.surface));
  for (const required of REQUIRED_AUTH_SURFACES) {
    if (!surfaceLabels.has(required.label)) {
      failures.push(`report.surfaces must include ${required.label}.`);
    }
  }
  report.surfaces.forEach(validateSurface);
  const unsafeSafeCommand = hasMutationCommand(report.safeNextCommands);
  if (unsafeSafeCommand) failures.push(`report.safeNextCommands contains blocked mutation command: ${unsafeSafeCommand}`);
  for (const blocked of BLOCKED_MUTATION_COMMANDS) {
    if (!report.blockedMutationCommands.includes(blocked)) {
      failures.push(`report.blockedMutationCommands must include ${blocked}.`);
    }
  }
  for (const surface of report.surfaces) {
    if (surface.status !== "ok" && surface.recommendedNextStep.trim().length < 18) {
      failures.push(`${surface.surface} missing-auth/manual status must include an exact recommended next step.`);
    }
  }
}

const workflow = read(".github/workflows/cloud-readiness-smoke.yml");
requireIncludes(workflow, "workflow_dispatch:", "cloud-readiness-smoke workflow");
requireIncludes(workflow, "contents: read", "cloud-readiness-smoke workflow permissions");
requireIncludes(workflow, "id-token: write", "cloud-readiness-smoke workflow permissions");
requireIncludes(workflow, "google-github-actions/auth@", "cloud-readiness-smoke workflow");
requireIncludes(workflow, "cloud-readiness-smoke.json", "cloud-readiness-smoke workflow artifact");
if (/^\s*push:/mu.test(workflow) || /^\s*pull_request:/mu.test(workflow) || /^\s*schedule:/mu.test(workflow)) {
  failures.push("cloud-readiness-smoke workflow must be manual workflow_dispatch only.");
}
const workflowUnsafe = hasMutationCommand(workflow.split(/\r?\n/u));
if (workflowUnsafe) failures.push(`cloud-readiness-smoke workflow contains blocked mutation command: ${workflowUnsafe}`);
if (/credentials_json|SERVICE_ACCOUNT_KEY|GOOGLE_APPLICATION_CREDENTIALS_JSON/iu.test(workflow)) {
  failures.push("cloud-readiness-smoke workflow must not require service account key JSON.");
}

const verifyScript = read("scripts/agent/verify-codex-native-auth.ts");
const forbiddenExecutionPatterns = [
  /runCommand\("firebase",\s*\[\s*"deploy"/u,
  /runCommand\("gcloud",\s*\[\s*"sql",\s*"instances",\s*"delete"/u,
  /runCommand\("gcloud",\s*\[\s*"sql",\s*"instances",\s*"stop"/u,
  /runCommand\("gcloud",\s*\[\s*"app",\s*"versions",\s*"delete"/u,
  /runCommand\("bq",\s*\[\s*"query"/u,
  /runCommand\("bq",\s*\[\s*"load"/u,
];
for (const pattern of forbiddenExecutionPatterns) {
  if (pattern.test(verifyScript)) {
    failures.push(`verify script contains forbidden command execution pattern: ${pattern}.`);
  }
}

const docs = read("docs/agent-truth/codex-native-auth-readiness.md");
const runbook = read("docs/runbooks/cloud-auth-bootstrap.md");
for (const expected of [
  "Codex must verify authentication before attempting cloud or billing checks.",
  "Read-only checks are allowed after auth verification.",
  "Mutations require explicit instruction.",
]) {
  requireIncludes(docs, expected, "codex auth readiness docs");
}
for (const expected of [
  "Workload Identity Federation",
  "service account JSON keys are not the default",
  "Manual bootstrap",
  "Rollback",
]) {
  requireIncludes(runbook, expected, "cloud auth bootstrap runbook");
}

const readme = read("README.md");
const agents = read("AGENTS.md");
for (const source of [
  ["README.md", readme],
  ["AGENTS.md", agents],
] as const) {
  requireIncludes(source[1], "Codex must verify authentication before attempting cloud or billing checks.", source[0]);
}

if (warnings.length > 0) {
  console.warn("Codex auth readiness warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error("Codex auth readiness validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Codex auth readiness validation passed.");
