import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BUILT_IN_DAILY_TASKS } from "../../src/lib/tasks/task-catalog";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const taskCatalog = readRequired("src/lib/tasks/task-catalog.ts");
const taskObservability = readRequired("src/lib/tasks/task-observability.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const debugAdvancedTruth = readRequired("src/app/admin/debug/components/DebugAdvancedTruth.tsx");
const adminTowerValidator = readRequired("scripts/agent/validate-admin-debug-control-tower.ts");
const telemetryValidator = readRequired("scripts/agent/validate-daily-task-telemetry-truth.ts");
const rewardValidator = readRequired("scripts/agent/validate-daily-task-reward-economy.ts");
const lifecycleValidator = readRequired("scripts/agent/validate-daily-task-lifecycle.ts");

if (packageJson.scripts?.["check:task-catalog-coverage"] !== "tsx scripts/agent/validate-task-catalog-coverage.ts") {
  failures.push("package.json must expose check:task-catalog-coverage.");
}

for (const task of BUILT_IN_DAILY_TASKS) {
  if (task.reward < 10 || task.reward > 1000) {
    failures.push(`Built-in task reward must stay within 10-1000 GD: ${task.id}=${task.reward}`);
  }
}

for (const expected of [
  "TaskCatalogCoverageItem",
  "TaskCatalogCoverageSummary",
  "coverageState",
  "assignable",
  "trackable",
  "completable",
  "rewardSafe",
  "dedupeSafe",
  "actionReachable",
  "missingEvidence",
  "requiredValidators",
  "\"ready\"",
  "\"partial\"",
  "\"tracking_gap\"",
  "\"assignment_gap\"",
  "\"completion_gap\"",
  "\"reward_risk\"",
  "\"unsupported\"",
  "buildTaskCatalogCoverage",
  "summarizeTaskCatalogCoverage",
  "LEGACY_TASK_TRIGGER_EVENTS",
  "COUNT_KEYED_EVENT_NAMES",
  "FEEDBACK_SHARED_TRIGGER_EVENT",
  "PURCHASE_SHARED_TRIGGER_EVENT",
  "Shared trigger requires criteria to avoid ambiguous completion.",
  "Legacy unlock trigger relies on canonical drop_unlocked alias proof.",
  "Max > 1 task lacks distinct or count-safe keying.",
]) {
  requireIncludes(taskObservability, expected, "Task observability coverage contract");
}

for (const forbidden of [
  "validatedTasks: canonicalTasks.length + telemetryOnlyTasks.length",
]) {
  requireNotIncludes(adminDebugRoute, forbidden, "Admin debug route must not equate trigger-backed tasks with validated end-to-end readiness");
}

for (const expected of [
  "taskCoverageSummary",
  "readyTasks",
  "partialTasks",
  "rewardRiskTasks",
  "assignmentGapTasks",
  "trackingGapTasks",
  "completionGapTasks",
  "legacyTasks",
  "buildTaskCatalogCoverage(BUILT_IN_DAILY_TASKS, runtimeTaskAudit)",
  "summarizeTaskCatalogCoverage(coverage)",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug route must expose end-to-end task coverage truth");
}

for (const expected of [
  "Built-in\" value={data?.taskCoverageSummary?.builtIn",
  "Ready\" value={data?.taskCoverageSummary?.ready",
  "Partial\" value={data?.taskCoverageSummary?.partial",
  "Unsupported\" value={data?.taskCoverageSummary?.unsupported",
  "Reward risk\" value={data?.taskCoverageSummary?.rewardRisk",
  "Tracking gap\" value={data?.taskCoverageSummary?.trackingGap",
  "Completion gap\" value={data?.taskCoverageSummary?.completionGap",
  "Source mix:",
  "Readiness\" value={task.coverageState}",
  "label=\"Reward\" value={`${task.rewardGd} GD`}",
  "label=\"Max\" value={task.maxRequired}",
  "label=\"Group\" value={task.group}",
  "label=\"Action\" value={`${task.actionType}`}",
  "label=\"Mode\" value={task.mode}",
  "label=\"Keying\" value={task.keying || \"any\"}",
  "label=\"Criteria\" value={(task.criteria || []).length > 0 ? \"filtered\" : \"none\"}",
  "Missing evidence",
  "Validator\" value={validator}",
  "Raw trigger details",
  "badgeLabel=\"LOADED\"",
]) {
  requireIncludes(debugAdvancedTruth, expected, "Task coverage panel must render end-to-end readiness and loaded field truth");
}

for (const forbidden of [
  "subtitle=\"Built-in task definitions, trigger source, and action path.\"",
  "<Pill label=\"Built-in\" value={data?.stats?.builtInTasks ?? 0} />",
  "<Pill label=\"Canonical\" value={data?.stats?.canonicalTasks ?? 0} tone=\"good\" />",
  "<Pill label=\"Telemetry\" value={data?.stats?.telemetryValidatedTasks ?? 0} tone=\"good\" />",
  "<Pill label=\"Reward\" value={task.reward} />",
  "<Pill label=\"Max\" value={task.maxProgress} />",
  "<Pill label=\"Group\" value={task.group} />",
  "<Pill label=\"Action\" value={task.actionMode === \"runtime\" ? `${task.actionType} (runtime)` : `${task.actionType} (route)`} />",
]) {
  requireNotIncludes(debugAdvancedTruth, forbidden, "Task coverage panel must not render shallow trigger-only or WAIT-style field truth");
}

for (const expected of [
  "check:task-catalog-coverage",
  "Task catalog coverage",
  "Readiness",
  "Reward risk",
  "Tracking gap",
  "Completion gap",
]) {
  requireIncludes(adminTowerValidator, expected, "Admin debug control tower validator must enforce task coverage readiness truth");
}

for (const validatorSource of [telemetryValidator, rewardValidator, lifecycleValidator]) {
  requireIncludes(validatorSource, "check:daily-task", "Existing daily task validators must remain present beside task coverage validation");
}

for (const taskId of ["submit_feedback", "feature_request_feedback", "bug_report_feedback", "high_rating_feedback"]) {
  requireIncludes(taskCatalog, taskId, "Task catalog feedback tasks");
}

if (failures.length > 0) {
  console.error("Task catalog coverage validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Task catalog coverage validator passed.");
