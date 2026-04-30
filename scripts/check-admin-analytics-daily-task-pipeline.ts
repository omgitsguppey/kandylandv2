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

const sectionStart = component.indexOf('title="Daily Task Pipeline"');
const sectionEnd = component.indexOf('title="Task Leaderboard"');
const section = component.slice(sectionStart, sectionEnd);

assertIncludes("AdminTaskAndNotificationModules", section, "dailyTaskPipelineModel.lifecycleMetrics");
assertIncludes("AdminTaskAndNotificationModules", section, "dailyTaskPipelineModel.guidanceMetrics");
assertIncludes("AdminTaskAndNotificationModules", section, "Completion speed");
assertIncludes("AdminTaskAndNotificationModules", section, "dailyTaskPipelineModel.speedBuckets");
assertIncludes("AdminTaskAndNotificationModules", section, "timingCoveragePercent");
assertIncludes("AdminTaskAndNotificationModules", section, "timingRecommendation");
assertIncludes("AdminTaskAndNotificationModules", section, "Start rate uses");
assertIncludes("AdminTaskAndNotificationModules", section, "stuckAssignedCount");
assertIncludes("AdminTaskAndNotificationModules", section, "orphanCompletedCount");
assertIncludes("AdminTaskAndNotificationModules", component, "__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__");
assertNotIncludes("Daily Task Pipeline section", section, "<BarChart");
assertNotIncludes("Daily Task Pipeline section", section, "Guides shown\" count");
assertNotIncludes("Daily Task Pipeline section", section, "h-64 w-full");
assertNotIncludes("AdminTaskAndNotificationModules", component, 'title="Task Completion Speed"');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'renderSectionRangeControl("taskCompletionSpeed")');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'name="Completions"');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'fill="#22d3ee"');
assertNotIncludes("admin analytics page", page, "taskCompletionSpeedBuckets");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedRange");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedOverride");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedBuckets");

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
  "completionSpeedConsolidated",
  "standaloneTaskCompletionSpeedRemoved",
  "speedSource",
  "totalCompletedCount",
  "timedCompletionCount",
  "timingCoveragePercent",
  "avgCompletionSeconds",
  "medianCompletionSeconds",
  "speedBuckets",
  "fastestBucket",
  "slowestBucket",
  "slowTaskCount",
  "slowThresholdSeconds",
  "missingStartTimestampCount",
  "missingCompletionTimestampCount",
  "durationRejectedCount",
  "speedBucketReconciliationDelta",
  "sourceReconciliation",
  "timingRecommendation",
  "fakeZeroPrevented",
]) {
  assertIncludes("admin-task-pipeline model", model, required);
}

assertIncludes("useAdminAnalyticsState", hook, "buildAdminTaskPipelineModel({");
assertIncludes("useAdminAnalyticsState", hook, "taskDurationBuckets: dailyTaskPipelineDurationBuckets");
assertIncludes("useAdminAnalyticsState", hook, "taskLeaderboard: dailyTaskPipelineData?.taskLeaderboard ?? taskLeaderboard");
assertIncludes("admin analytics page", page, "dailyTaskPipelineModel={state.dailyTaskPipelineModel}");
assertIncludes("historical route", historicalRoute, "taskDurationBuckets: payload.taskDurationBuckets");
assertIncludes("historical route", historicalRoute, "taskLeaderboard: payload.taskLeaderboard");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsDailyTaskPipeline");
assertIncludes("AdminDebugRoute", debugRoute, "pipelineMode");
assertIncludes("AdminDebugRoute", debugRoute, "strictPipelineRule");
assertIncludes("AdminDebugRoute", debugRoute, "telemetryStateMismatchCount");
assertIncludes("AdminDebugRoute", debugRoute, "completionSpeedConsolidated");
assertIncludes("AdminDebugRoute", debugRoute, "standaloneTaskCompletionSpeedRemoved");
assertIncludes("AdminDebugRoute", debugRoute, "speedBuckets");
assertIncludes("AdminDebugRoute", debugRoute, "completionSpeedRule");

assertIncludes("agent truth doc", doc, "Lifecycle states are assigned, started, completed, failed");
assertIncludes("agent truth doc", doc, "Guidance signals");
assertIncludes("agent truth doc", doc, "Task Completion Speed belongs inside Daily Task Pipeline");
assertIncludes("agent truth doc", doc, "standalone Task Completion Speed module is forbidden");
assertIncludes("agent truth doc", doc, "Speed buckets count timed completions only");
assertIncludes("agent truth doc", doc, "Bright cyan is not the semantic color");
assertIncludes("agent truth doc", doc, "`started / assigned`");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce the unhelpful vertical bar chart");

if (process.exitCode) process.exit(process.exitCode);

console.log("Admin Analytics Daily Task Pipeline contract check passed.");
