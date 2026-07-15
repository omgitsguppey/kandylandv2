import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildDailyTaskGuidanceAuditReport,
  validateDailyTaskGuidanceRows,
  type DailyTaskGuidanceAuditReport,
} from "@/lib/tasks/daily-task-guidance-contract";
import {
  withGeneratedReportEnvelope,
  type GeneratedReportEnvelope,
} from "./generated-report-envelope";

const REPORT_PATH = "agent/state/daily-task-guidance-route-audit.generated.json";
const DOC_PATH = "docs/agent-truth/daily-task-guidance-route-audit.md";

export type DailyTaskGuidanceSourceProjection = {
  sourceStatus: "pass" | "fail";
  sourceValidationFailures: string[];
  isolationFailures: string[];
};

export type DailyTaskGuidanceValidatorReport = DailyTaskGuidanceAuditReport
  & GeneratedReportEnvelope
  & DailyTaskGuidanceSourceProjection
  & {
    reportKey: "daily-task-guidance-route-audit";
    status: "pass" | "fail";
    passed: boolean;
    sourceCommit: string;
  };

export function isDailyTaskGuidanceIsolationFailure(failure: string) {
  return failure === "dirty files are unclassified."
    || failure.startsWith("protected chat/nav/payment/GumDrop paid math files changed:")
    || failure.startsWith("dirty files unclassified:");
}

export function projectDailyTaskGuidanceSourceStatus(report: {
  status?: unknown;
  validationFailures?: unknown;
}): DailyTaskGuidanceSourceProjection {
  if (!Array.isArray(report.validationFailures) || !report.validationFailures.every((failure) => typeof failure === "string")) {
    return {
      sourceStatus: "fail",
      sourceValidationFailures: ["guidance route validation failures are missing or malformed."],
      isolationFailures: [],
    };
  }
  const validationFailures = report.validationFailures as string[];
  const isolationFailures = validationFailures.filter(isDailyTaskGuidanceIsolationFailure);
  const sourceValidationFailures = validationFailures.filter((failure) => !isDailyTaskGuidanceIsolationFailure(failure));
  if (report.status !== "pass" && report.status !== "fail") {
    sourceValidationFailures.push("guidance route validator status is missing or malformed.");
  } else if (report.status === "pass" && validationFailures.length > 0) {
    sourceValidationFailures.push("guidance route validator reports pass with validation failures.");
  } else if (report.status === "fail" && validationFailures.length === 0) {
    sourceValidationFailures.push("guidance route validator reports fail without a validation failure.");
  }
  return {
    sourceStatus: sourceValidationFailures.length === 0 ? "pass" : "fail",
    sourceValidationFailures: [...new Set(sourceValidationFailures)],
    isolationFailures,
  };
}

function readText(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function writeText(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

export function classifyDailyTaskGuidanceDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/task-guidance-batch31-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/daily-task-guidance-route-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (/^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "src/lib/tasks/daily-task-guidance-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/task-guidance-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/task-guidance-history-recovery.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/task-onboarding-parity-semantics.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/task-guidance.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyTasksModule.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/TaskGuidanceBanner.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-tasks.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-validation.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "documentation_artifact_expected";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  return "unsafe_unknown";
}

function buildDoc(report: DailyTaskGuidanceValidatorReport) {
  const rows = report.rows.map((row) =>
    `| ${row.taskId} | ${row.currentSiteStatus} | ${row.targetRoute} | ${row.targetFeatureId} | ${row.completionSignal} | ${row.missingEvidence.join("; ") || "none"} |`,
  ).join("\n");
  const scoreRows = Object.entries(report.scoreImpact)
    .map(([dimension, effect]) => `| ${dimension} | ${effect} |`)
    .join("\n");
  const oldLogicRows = report.oldLogicClassification
    .map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`)
    .join("\n");

  return `# Daily Task Guidance Route Audit

Generated: ${report.generatedAtUtc}
Current HEAD: ${report.currentHead ?? "unknown"}
Status: ${report.status}
Source status: ${report.sourceStatus}

## Summary

- Total tasks: ${report.summary.totalTasks}
- Active tasks: ${report.summary.activeTasks}
- Hidden/deprecated tasks: ${report.summary.hiddenDeprecatedTasks}
- Broken routes: ${report.summary.brokenRoutes}
- Missing completion signals: ${report.summary.missingCompletionSignals}
- Missing telemetry: ${report.summary.missingTelemetry}
- Wrong surface tasks: ${report.summary.wrongSurfaceTasks}

## Debug Lane

- Lane: ${report.debugLane.lane}
- Status: ${report.debugLane.status}
- Raw details collapsed by default: ${report.debugLane.rawDetailsCollapsedByDefault}

## Task Rows

| Task | Status | Route | Feature | Completion signal | Missing evidence |
| --- | --- | --- | --- | --- | --- |
${rows}

## Score Impact

| Dimension | Effect |
| --- | --- |
${scoreRows}

## Old Logic Classification

${oldLogicRows}

## Validation Failures

${report.validationFailures.map((failure) => `- ${failure}`).join("\n") || "- none"}
`;
}

export function validateDailyTaskGuidanceRouteAuditReport(
  report: DailyTaskGuidanceAuditReport,
  input: { dirtyFiles?: string[] } = {},
) {
  const failures = [...validateDailyTaskGuidanceRows(report.rows)];

  if (!report.dirtyFilesClassified) failures.push("dirty files are unclassified.");
  if (!report.debugLane || report.debugLane.lane !== "Task guidance health") failures.push("debug task guidance health lane missing.");
  if (report.rows.some((row) => row.currentSiteStatus === "active" && row.guidancePrompt.length === 0)) {
    failures.push("active task guidance prompt missing.");
  }
  if (report.rows.some((row) => row.currentSiteStatus === "active" && row.steps.length === 0)) {
    failures.push("active task steps missing.");
  }
  if (report.rows.some((row) => row.currentSiteStatus === "active" && !row.featureRegistered)) {
    failures.push("active task feature registration missing.");
  }
  if (report.rows.some((row) => row.currentSiteStatus === "active" && !row.personMetricExists)) {
    failures.push("active task person metric missing.");
  }
  if (report.rows.some((row) => row.currentSiteStatus === "active" && !row.rewardRuleExists)) {
    failures.push("active task reward rule missing.");
  }
  if (report.rows.some((row) => row.currentSiteStatus !== "active" && row.fallbackIfRouteMissing === "none_required")) {
    failures.push("unavailable task can be claimed.");
  }

  const scoreImpact = report.scoreImpact as Record<string, string>;
  for (const dimension of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk", "overallHealthScore"]) {
    if (!scoreImpact[dimension]) failures.push(`score dimension impact missing: ${dimension}`);
  }

  const catalog = readText("src/lib/tasks/task-catalog.ts");
  if (/follow required|must follow|follow .*required/iu.test(catalog)) {
    failures.push("task guidance references outdated follow-required language.");
  }

  const packageJson = readText("package.json");
  if (!packageJson.includes("\"check:daily-task-guidance-route-audit\"")) {
    failures.push("package script check:daily-task-guidance-route-audit missing.");
  }

  const debugSummary = readText("src/lib/debug/debug-panel-tracking-summary.ts");
  if (!debugSummary.includes("daily_task_guidance_health") || !debugSummary.includes("Task guidance health")) {
    failures.push("debug task guidance health lane missing.");
  }

  const dirtyFiles = input.dirtyFiles ?? [
    ...gitOutput("git diff --name-only").split(/\r?\n/u).filter(Boolean),
    ...gitOutput("git ls-files --others --exclude-standard").split(/\r?\n/u).filter(Boolean),
  ];
  const protectedFilesChanged = dirtyFiles
    .filter((path) =>
      /^src\/app\/dashboard\/chat/u.test(path)
      || /^src\/components\/Chat/u.test(path)
      || /^src\/components\/Navigation/u.test(path)
      || /^src\/components\/Navbar/u.test(path)
      || /^src\/app\/api\/paypal/u.test(path)
      || /^src\/components\/PurchaseModal\.tsx$/u.test(path)
      || /^src\/lib\/gumdrop/u.test(path)
    );
  if (protectedFilesChanged.length > 0) {
    failures.push(`protected chat/nav/payment/GumDrop paid math files changed: ${protectedFilesChanged.join(", ")}`);
  }

  const unsafeDirtyFiles = dirtyFiles.filter((path) => classifyDailyTaskGuidanceDirtyFile(path) === "unsafe_unknown");
  if (unsafeDirtyFiles.length > 0) {
    failures.push(`dirty files unclassified: ${unsafeDirtyFiles.join(", ")}`);
  }

  return [...new Set(failures)];
}

export function buildDailyTaskGuidanceValidatorReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: string[];
} = {}): DailyTaskGuidanceValidatorReport {
  const currentHead = input.currentHead ?? (gitOutput("git rev-parse HEAD") || "unknown");
  const dirtyFiles = input.dirtyFiles ?? [
    ...gitOutput("git diff --name-only").split(/\r?\n/u).filter(Boolean),
    ...gitOutput("git ls-files --others --exclude-standard").split(/\r?\n/u).filter(Boolean),
  ];
  const dirtyFilesClassified = dirtyFiles.every((path) => classifyDailyTaskGuidanceDirtyFile(path) !== "unsafe_unknown");
  const report = buildDailyTaskGuidanceAuditReport({
    generatedAtUtc: input.generatedAtUtc,
    currentHead,
    dirtyFilesClassified,
  });
  const validationFailures = validateDailyTaskGuidanceRouteAuditReport(report, { dirtyFiles });
  if (!/^[0-9a-f]{40}$/iu.test(currentHead)) {
    validationFailures.push("daily task guidance report provenance is not a full Git commit.");
  }
  const status = validationFailures.length === 0 ? "pass" as const : "fail" as const;
  const sourceProjection = projectDailyTaskGuidanceSourceStatus({ status, validationFailures });
  return {
    ...withGeneratedReportEnvelope(report, {
      reportKey: "daily-task-guidance-route-audit",
      status,
      generatedAtUtc: report.generatedAtUtc,
      currentHead,
      evidenceClass: "source_snapshot",
      canClearSourceGate: status === "pass",
      nextExactSteps: [
        "Keep guidance route source checks current; collect deployed runtime evidence separately.",
      ],
      validationFailures,
      doesNotProve: [
        "Does not prove deployed guidance behavior.",
        "Does not prove production task completion activity.",
        "Does not prove provider or payment behavior.",
      ],
    }),
    reportKey: "daily-task-guidance-route-audit" as const,
    status,
    passed: status === "pass",
    sourceCommit: currentHead,
    validationFailures,
    ...sourceProjection,
  };
}

function main() {
  const finalReport = buildDailyTaskGuidanceValidatorReport();

  writeText(REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
  writeText(DOC_PATH, buildDoc(finalReport));

  if (finalReport.validationFailures.length > 0) {
    console.error("Daily task guidance route audit validation failed:");
    for (const failure of finalReport.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Daily task guidance route audit validation passed for ${finalReport.rows.length} tasks.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
