import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-daily-task-pipeline] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) fail(`${file} is missing ${expected}`);
}

function assertNotIncludes(file: string, source: string, unexpected: string) {
  if (source.includes(unexpected)) fail(`${file} still contains ${unexpected}`);
}

const component = read("src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx");
const model = read("src/lib/admin-task-pipeline.ts");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const page = read("src/app/admin/analytics/page.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const doc = read("docs/agent-truth/admin-analytics-daily-task-pipeline.md");

const section = component.slice(
  component.indexOf('title="Daily Task Pipeline"'),
  component.indexOf('title="Task Completion Speed"'),
);

assertIncludes("AdminTaskAndNotificationModules", section, "dailyTaskPipelineModel.lifecycleMetrics");
assertIncludes("AdminTaskAndNotificationModules", section, "dailyTaskPipelineModel.guidanceMetrics");
assertIncludes("AdminTaskAndNotificationModules", section, "Start rate uses");
assertIncludes("AdminTaskAndNotificationModules", section, "stuckAssignedCount");
assertIncludes("AdminTaskAndNotificationModules", section, "orphanCompletedCount");
assertIncludes("AdminTaskAndNotificationModules", component, "__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__");
assertNotIncludes("Daily Task Pipeline section", section, "<BarChart");
assertNotIncludes("Daily Task Pipeline section", section, "Guides shown\" count");
assertNotIncludes("Daily Task Pipeline section", section, "h-64 w-full");

for (const required of [
  "pipelineMode",
  "canonicalTaskSource",
  "telemetryTaskSource",
  "lifecycleLogSource",
  "userTaskStateSource",
  "assignedCount",
  "startedCount",
  "completedCount",
  "failedCount",
  "remindersCount",
  "guideShownCount",
  "guideTapCount",
  "started / assigned",
  "completed / started",
  "failed / started",
  "orphanStartedCount",
  "orphanCompletedCount",
  "assignmentStateMissingCount",
  "telemetryStateMismatchCount",
  "stateTelemetryMissingCount",
  "perTaskBreakdown",
  "fakeZeroPrevented",
]) {
  assertIncludes("admin-task-pipeline model", model, required);
}

assertIncludes("useAdminAnalyticsState", hook, "buildAdminTaskPipelineModel({");
assertIncludes("useAdminAnalyticsState", hook, "taskLeaderboard: dailyTaskPipelineData?.taskLeaderboard ?? taskLeaderboard");
assertIncludes("admin analytics page", page, "dailyTaskPipelineModel={state.dailyTaskPipelineModel}");
assertIncludes("historical route", historicalRoute, "taskLeaderboard: payload.taskLeaderboard");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsDailyTaskPipeline");
assertIncludes("AdminDebugRoute", debugRoute, "pipelineMode");
assertIncludes("AdminDebugRoute", debugRoute, "strictPipelineRule");
assertIncludes("AdminDebugRoute", debugRoute, "telemetryStateMismatchCount");

assertIncludes("agent truth doc", doc, "Lifecycle states are assigned, started, completed, failed");
assertIncludes("agent truth doc", doc, "Guidance signals");
assertIncludes("agent truth doc", doc, "`started / assigned`");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce the unhelpful vertical bar chart");

if (process.exitCode) process.exit(process.exitCode);

console.log("Admin Analytics Daily Task Pipeline contract check passed.");
