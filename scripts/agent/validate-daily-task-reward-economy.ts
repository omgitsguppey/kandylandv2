import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BUILT_IN_DAILY_TASKS,
  DAILY_TASK_GLOBAL_MAX_REWARD_GD,
  DAILY_TASK_GLOBAL_MIN_REWARD_GD,
} from "../../src/lib/tasks/task-catalog";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const taskCatalogSource = readRequired("src/lib/tasks/task-catalog.ts");
const dailyTasksServer = readRequired("src/lib/server/daily-tasks.ts");
const taskAnalyticsWriter = readRequired("functions/src/analytics-task-events.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const debugTabMonitoring = readRequired("src/app/admin/debug/components/DebugTabMonitoring.tsx");
const pipelineModule = readRequired("src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx");
const telemetryValidator = readRequired("scripts/agent/validate-daily-task-telemetry-truth.ts");
const adminTowerValidator = readRequired("scripts/agent/validate-admin-debug-control-tower.ts");
const pipelineDoc = readRequired("docs/agent-truth/admin-analytics-daily-task-pipeline.md");

if (packageJson.scripts?.["check:daily-task-reward-economy"] !== "tsx scripts/agent/validate-daily-task-reward-economy.ts") {
  fail("package.json must expose check:daily-task-reward-economy.");
}

const outOfBoundsCatalogTasks = BUILT_IN_DAILY_TASKS.filter((task) => (
  task.reward < DAILY_TASK_GLOBAL_MIN_REWARD_GD || task.reward > DAILY_TASK_GLOBAL_MAX_REWARD_GD
));
if (outOfBoundsCatalogTasks.length > 0) {
  fail(`Built-in daily task rewards must stay within ${DAILY_TASK_GLOBAL_MIN_REWARD_GD}-${DAILY_TASK_GLOBAL_MAX_REWARD_GD} GD. Offenders: ${outOfBoundsCatalogTasks.map((task) => `${task.id}:${task.reward}`).join(", ")}`);
}

for (const expected of [
  "TaskRewardTier",
  "TaskRewardContract",
  "rewardSource: \"daily_task\"",
  "payoutPolicy: \"on_completion_only\"",
  "repeatPolicy",
  "economyRisk",
  "DAILY_TASK_GLOBAL_MIN_REWARD_GD = 10",
  "DAILY_TASK_GLOBAL_MAX_REWARD_GD = 1000",
]) {
  requireIncludes(taskCatalogSource, expected, "Task catalog reward contract");
}

for (const expected of [
  "potentialRewardGd",
  "creditedRewardGd",
  "forfeitedPotentialRewardGd",
  "expiredPotentialRewardGd",
  "reminderPotentialRewardGd",
  "rewardCreditIdempotencyKey",
  "task_reward:",
  "historical_reward_out_of_bounds",
  "buildTaskRewardCreditIdempotencyKey",
]) {
  requireIncludes(dailyTasksServer, expected, "Daily task server reward lifecycle truth");
}

for (const expected of [
  "paidRewardTotalGd",
  "potentialRewardTotalGd",
  "forfeitedPotentialRewardGd",
  "outOfBoundsEventCount",
  "taskPaidRewardTotalGd",
  "taskPotentialRewardTotalGd",
  "taskForfeitedPotentialRewardGd",
  "taskRewardOutOfBoundsEventCount",
]) {
  requireIncludes(taskAnalyticsWriter, expected, "Task analytics writer reward rollup truth");
}

requireNotIncludes(taskAnalyticsWriter, "rewardTotal: buildIncrementUpdate(reward)", "Task analytics writer");
requireNotIncludes(taskAnalyticsWriter, "taskRewardTotal: buildIncrementUpdate(reward)", "Task analytics writer");

for (const expected of [
  "paidRewardTotalGd",
  "potentialRewardTotalGd",
  "forfeitedPotentialRewardGd",
  "outOfBoundsEventCount",
  "rewardAuditFlag",
  "completed > 0 ? paidRewardTotalGd : 0",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug route daily task reward truth");
}

for (const expected of [
  "Paid reward",
  "Potential reward",
  "Forfeited potential",
  "Paid rewards",
  "Potential assigned",
  "Forfeited potential",
  "GD",
  "rewardCreditIdempotencyKey",
  "rewardAuditFlag",
]) {
  requireIncludes(debugTabMonitoring, expected, "Debug task monitoring panel reward truth");
}

requireNotIncludes(debugTabMonitoring, "Reward total", "Debug task monitoring panel");
requireNotIncludes(debugTabMonitoring, "<Pill label=\"Rewards\" value={day.rewardTotal} />", "Debug task monitoring panel");
requireIncludes(pipelineModule, "Reward parity warnings", "Daily task pipeline module reward check label");
requireNotIncludes(pipelineModule, "Reward checks:", "Daily task pipeline module reward checks label must be unambiguous");

for (const expected of [
  "potentialRewardGd",
  "creditedRewardGd",
  "forfeitedPotentialRewardGd",
  "historical_reward_out_of_bounds",
]) {
  requireIncludes(telemetryValidator, expected, "Daily task telemetry validator");
}

for (const expected of [
  "Paid rewards",
  "Potential assigned",
  "Forfeited potential",
]) {
  requireIncludes(adminTowerValidator, expected, "Admin debug control tower validator");
}

requireIncludes(pipelineDoc, "Reward totals are not final business truth", "Admin analytics daily task pipeline doc");
requireIncludes(pipelineDoc, "Paid rewards must come from completed/credited task rewards only.", "Admin analytics daily task pipeline doc");
requireIncludes(pipelineDoc, "Assigned, failed, expired, and reminder events are potential or forfeited reward signals, not paid reward truth.", "Admin analytics daily task pipeline doc");

if (failures.length > 0) {
  console.error("Daily task reward economy validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Daily task reward economy validator passed.");
