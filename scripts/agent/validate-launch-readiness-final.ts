import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];
const GENERATED_REPORT_STALE_MS = 24 * 60 * 60 * 1000;
const RUNTIME_ROOTS = ["src/app", "src/components", "src/lib/server", "functions/src"];
const RUNTIME_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function readRequired(relativePath: string) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireIncludes(file: string, content: string, token: string) {
  if (!content.includes(token)) {
    failures.push(`${file} is missing required token: ${token}`);
  }
}

function parseDate(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    failures.push(`${label} must be a valid generatedAt timestamp.`);
    return null;
  }
  return Date.parse(value);
}

function walkRuntimeFiles(relativePath: string, output: string[] = []) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) return output;
  for (const entry of readdirSync(absolutePath)) {
    const child = path.join(relativePath, entry).replace(/\\/gu, "/");
    const stats = statSync(path.join(root, child));
    if (stats.isDirectory()) {
      walkRuntimeFiles(child, output);
      continue;
    }
    if (RUNTIME_EXTENSIONS.some((extension) => child.endsWith(extension))) {
      output.push(child);
    }
  }
  return output;
}

function latestRuntimeModifiedMs() {
  try {
    const latestCommitDate = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...RUNTIME_ROOTS], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (latestCommitDate && !Number.isNaN(Date.parse(latestCommitDate))) {
      return Date.parse(latestCommitDate);
    }
  } catch {
    // Fall back to filesystem mtimes when git metadata is unavailable.
  }
  return RUNTIME_ROOTS
    .flatMap((runtimeRoot) => walkRuntimeFiles(runtimeRoot))
    .reduce((latest, filePath) => Math.max(latest, statSync(path.join(root, filePath)).mtimeMs), 0);
}

const reportPath = "agent/state/launch-readiness-report.generated.json";
const docPath = "docs/agent-truth/launch-readiness-final.md";
const reportText = readRequired(reportPath);
const docText = readRequired(docPath);
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const refreshRouteTest = readRequired("tests/unit/admin-analytics-refresh-route.spec.ts");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");

type LaunchGate = {
  gate?: string;
  status?: string;
};

type TestRun = {
  command?: string;
  status?: string;
};

type LaunchReadinessReport = {
  generatedAt?: string;
  reportMode?: string;
  launchStatus?: string;
  recommendedGoNoGo?: string;
  blockers?: unknown[];
  gates?: LaunchGate[];
  phaseReports?: string[];
  testsRun?: TestRun[];
};

let report: LaunchReadinessReport | null = null;
try {
  report = JSON.parse(reportText) as LaunchReadinessReport;
} catch (error) {
  failures.push(`${reportPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (report) {
  const generatedAtMs = parseDate(report.generatedAt, "report.generatedAt");
  const reportMode = report.reportMode ?? "launch_signoff";
  if (!["launch_signoff", "evidence_refresh"].includes(reportMode)) {
    failures.push("reportMode must be launch_signoff or evidence_refresh.");
  }
  const allowedLaunchStatuses = [
    "launchable",
    "launchable with warnings",
    "not launchable",
    "ready",
    "ready with smoke required",
    "needs review",
    "blocked",
    "unknown evidence",
    "stale evidence",
    "runtime unverified",
    "visual qa required",
  ];
  if (!report.launchStatus || !allowedLaunchStatuses.includes(report.launchStatus)) {
    failures.push("launchStatus must be an allowed launch or evidence-aware readiness status.");
  }

  if (generatedAtMs && Date.now() - generatedAtMs > GENERATED_REPORT_STALE_MS && !["not launchable", "stale evidence", "needs review"].includes(String(report.launchStatus))) {
    failures.push("Stale launch readiness reports must not remain launchable; regenerate affected gates or mark not launchable/Needs review.");
  }

  if (report.launchStatus !== "not launchable" && Array.isArray(report.blockers) && report.blockers.length > 0) {
    failures.push("Report cannot be launchable while blockers are present.");
  }

  if (reportMode !== "evidence_refresh" && report.recommendedGoNoGo !== "go") {
    failures.push("Launch readiness recommendation must be go after all critical gates pass.");
  }
  if (report.launchStatus === "launchable" && report.gates?.some((gate) => gate.status === "passed_with_warning")) {
    failures.push("Warnings must reduce launch readiness confidence; launchable is not allowed while warning gates remain.");
  }
  if (generatedAtMs && latestRuntimeModifiedMs() > generatedAtMs) {
    failures.push("Launch readiness report is older than later runtime file changes and cannot be treated as current.");
  }

  for (const gate of [
    "user critical path",
    "payment unlock entitlement security",
    "notifications",
    "admin analytics debug truth",
    "performance loading cache",
    "mobile layout safe area",
    "human-readable copy",
    "firebase app hosting functions rules",
    "tests ci",
    "open pr recent commit risk",
  ]) {
    const entry = report.gates?.find((candidate) => candidate.gate === gate);
    if (!entry) {
      failures.push(`Missing launch gate in report: ${gate}`);
    } else if (!entry.status || !["passed", "passed_with_warning", "warning", "not_run", "blocked"].includes(entry.status)) {
      failures.push(`Launch gate is not passed: ${gate}`);
    }
  }

  const requiredPhaseReports = reportMode === "evidence_refresh" ? [] : [
    "agent/state/user-critical-path-audit.generated.json",
    "agent/state/user-critical-path-fix-report.generated.json",
    "agent/state/payment-unlock-security-audit.generated.json",
    "agent/state/notification-return-loop-audit.generated.json",
    "agent/state/admin-analytics-finalization.generated.json",
    "agent/state/global-speed-hydration-cache-audit.generated.json",
    "agent/state/global-loading-performance-audit.generated.json",
    "agent/state/mobile-layout-safe-area-audit.generated.json",
    "agent/state/refresh-cache-loading-audit.generated.json",
    "agent/state/launch-finalization-baseline.generated.json",
    "agent/state/launch-pr-triage.generated.json",
  ];
  for (const phaseReport of requiredPhaseReports) {
    if (!existsSync(path.join(root, phaseReport))) {
      failures.push(`Missing phase validation report: ${phaseReport}`);
    }
    if (!report.phaseReports?.includes(phaseReport)) {
      failures.push(`Readiness report does not list phase report: ${phaseReport}`);
    }
  }

  const requiredCommands = reportMode === "evidence_refresh"
    ? [
      "npm run score:beta",
      "npm run check:beta-score",
      "npm run check:launch-readiness-final",
      "npm run check:final-launch-readiness-report",
      "npm run typecheck",
    ]
    : [
    "npm run check:user-critical-path-launch",
    "npm run check:payment-unlock-security",
    "npm run check:notification-return-loop",
    "npm run check:admin-analytics-finalization",
    "npm run check:global-speed-hydration-cache",
    "npm run check:mobile-shell-safe-area",
    "npm run check:human-readable-admin-copy",
    "npm run check:firebase:rules",
    "npm run check:functions",
    "npm run check:launch-readiness-final",
    "npm run check",
    "npx vitest run --maxWorkers=1",
    "npm run check:ui:audits",
  ];
  for (const command of requiredCommands) {
    const entry = report.testsRun?.find((candidate) => candidate.command === command);
    if (!entry) {
      failures.push(`Readiness report is missing test command: ${command}`);
    } else if (reportMode !== "evidence_refresh" && !String(entry.status).startsWith("passed")) {
      failures.push(`Readiness report command did not pass: ${command}`);
    }
  }
}

const docTokens = report?.reportMode === "evidence_refresh"
  ? [
    "Status: evidence refresh",
    "Unknown evidence",
    "Visual QA required",
    "Ready with smoke required",
    "Required Next Action",
  ]
  : [
    "Status: launchable with warnings",
    "Blockers",
    "High Risks",
    "Medium Risks",
    "Deferred Post-Launch",
    "Tests Run",
    "Tests Skipped",
    "Known Limitations",
    "Required Next Action",
  ];
for (const token of docTokens) {
  requireIncludes(docPath, docText, token);
}

requireIncludes("src/app/api/admin/analytics/refresh/route.ts", refreshRoute, "requireTrustedOrigin: true");
requireIncludes("tests/unit/admin-analytics-refresh-route.spec.ts", refreshRouteTest, "requireTrustedOrigin: true");
if (report?.reportMode !== "evidence_refresh") {
  requireIncludes(reportPath, reportText, "PR-208");
  requireIncludes(docPath, docText, "PR #208");
}
requireIncludes("FULL_SCALE_CODEBASE_AUDIT.md", fullAudit, "Launch Readiness Final Gate");
requireIncludes("FULL_SCALE_CODEBASE_AUDIT.md", fullAudit, "Scope completed:");
requireIncludes("REPO_MEMORY_LEDGER.md", repoLedger, "Launch readiness final gate is launchable with warnings");
requireIncludes("REPO_MEMORY_LEDGER.md", repoLedger, "check:launch-readiness-final");

if (failures.length > 0) {
  console.error("Launch readiness final validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch readiness final validation passed.");
