import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

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
  const allowedLaunchStatuses = ["launchable", "launchable with warnings", "not launchable"];
  if (!report.launchStatus || !allowedLaunchStatuses.includes(report.launchStatus)) {
    failures.push("launchStatus must be launchable, launchable with warnings, or not launchable.");
  }

  if (report.launchStatus !== "not launchable" && Array.isArray(report.blockers) && report.blockers.length > 0) {
    failures.push("Report cannot be launchable while blockers are present.");
  }

  if (report.recommendedGoNoGo !== "go") {
    failures.push("Launch readiness recommendation must be go after all critical gates pass.");
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
    } else if (!entry.status || !["passed", "passed_with_warning"].includes(entry.status)) {
      failures.push(`Launch gate is not passed: ${gate}`);
    }
  }

  for (const phaseReport of [
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
  ]) {
    if (!existsSync(path.join(root, phaseReport))) {
      failures.push(`Missing phase validation report: ${phaseReport}`);
    }
    if (!report.phaseReports?.includes(phaseReport)) {
      failures.push(`Readiness report does not list phase report: ${phaseReport}`);
    }
  }

  for (const command of [
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
  ]) {
    const entry = report.testsRun?.find((candidate) => candidate.command === command);
    if (!entry) {
      failures.push(`Readiness report is missing test command: ${command}`);
    } else if (!String(entry.status).startsWith("passed")) {
      failures.push(`Readiness report command did not pass: ${command}`);
    }
  }
}

for (const token of [
  "Status: launchable with warnings",
  "Blockers",
  "High Risks",
  "Medium Risks",
  "Deferred Post-Launch",
  "Tests Run",
  "Tests Skipped",
  "Known Limitations",
  "Required Next Action",
]) {
  requireIncludes(docPath, docText, token);
}

requireIncludes("src/app/api/admin/analytics/refresh/route.ts", refreshRoute, "requireTrustedOrigin: true");
requireIncludes("tests/unit/admin-analytics-refresh-route.spec.ts", refreshRouteTest, "requireTrustedOrigin: true");
requireIncludes(reportPath, reportText, "PR-208");
requireIncludes(docPath, docText, "PR #208");
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
