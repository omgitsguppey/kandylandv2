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
const pipelineComponent = read("src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx");
const model = read("src/lib/admin-task-pipeline.ts");
const leaderboardHelper = read("src/lib/admin-task-leaderboard.ts");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const page = read("src/app/admin/analytics/page.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const doc = read("docs/agent-truth/admin-analytics-daily-task-pipeline.md");

const sectionStart = pipelineComponent.indexOf('title="Daily Task Pipeline"');
const section = pipelineComponent.slice(sectionStart);

assertIncludes("AdminDailyTaskPipelineModule", section, "model.lifecycleMetrics");
assertIncludes("AdminDailyTaskPipelineModule", section, "model.guidanceMetrics");
assertIncludes("AdminDailyTaskPipelineModule", section, "Completion speed");
assertIncludes("AdminDailyTaskPipelineModule", section, "model.speedBuckets");
assertIncludes("AdminTaskAndNotificationModules", section, "timingCoveragePercent");
assertIncludes("AdminTaskAndNotificationModules", section, "timingRecommendation");
assertIncludes("AdminTaskAndNotificationModules", section, "Task leaderboard");
assertIncludes("AdminDailyTaskPipelineModule", pipelineComponent, "props.model.taskLeaderboardRows");
assertIncludes("AdminTaskAndNotificationModules", section, "Prev");
assertIncludes("AdminTaskAndNotificationModules", section, "Next");
assertIncludes("AdminTaskAndNotificationModules", section, "completed / assigned");
assertIncludes("AdminTaskAndNotificationModules", section, "reward unverified");
assertIncludes("AdminTaskAndNotificationModules", section, "leaderboardPipelineDelta");
assertIncludes("AdminTaskAndNotificationModules", section, "Start rate uses");
assertIncludes("AdminTaskAndNotificationModules", section, "stuckAssignedCount");
assertIncludes("AdminTaskAndNotificationModules", section, "orphanCompletedCount");
assertIncludes("AdminTaskAndNotificationModules", section, "Completed / started");
assertIncludes("AdminTaskAndNotificationModules", section, "Completed / assigned");
assertIncludes("AdminTaskAndNotificationModules", section, "Failed / assigned");
assertIncludes("AdminTaskAndNotificationModules", section, "Fail after start");
assertIncludes("AdminTaskAndNotificationModules", section, "Reward parity warnings");
assertIncludes("AdminTaskAndNotificationModules", section, "Task guidance telemetry is missing; guidance impact cannot be evaluated.");
assertIncludes("AdminTaskAndNotificationModules", section, "Pipeline delta is leaderboard completed total minus pipeline completed total");
assertNotIncludes("AdminTaskAndNotificationModules", section, "Fail: <span className=\"text-white\">");
assertNotIncludes("AdminTaskAndNotificationModules", section, "completion and fail rates use started tasks");
assertIncludes("AdminDailyTaskPipelineModule", pipelineComponent, "__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__");
assertNotIncludes("Daily Task Pipeline section", section, "<BarChart");
assertNotIncludes("Daily Task Pipeline section", section, "Guides shown\" count");
assertNotIncludes("Daily Task Pipeline section", section, "h-64 w-full");
assertNotIncludes("AdminTaskAndNotificationModules", component, 'title="Task Completion Speed"');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'title="Task Leaderboard"');
assertNotIncludes("AdminDailyTaskPipelineModule", pipelineComponent, 'title="Task Completion Speed"');
assertNotIncludes("AdminDailyTaskPipelineModule", pipelineComponent, 'title="Task Leaderboard"');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'renderSectionRangeControl("taskCompletionSpeed")');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'renderSectionRangeControl("taskLeaderboard")');
assertNotIncludes("AdminDailyTaskPipelineModule", pipelineComponent, 'renderSectionRangeControl("taskCompletionSpeed")');
assertNotIncludes("AdminDailyTaskPipelineModule", pipelineComponent, 'renderSectionRangeControl("taskLeaderboard")');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'name="Completions"');
assertNotIncludes("AdminTaskAndNotificationModules", component, 'fill="#22d3ee"');
assertNotIncludes("AdminTaskAndNotificationModules", component, "rounded-[1.5rem] border border-white/10 bg-black/30 p-4");
assertNotIncludes("admin analytics page", page, "taskCompletionSpeedBuckets");
assertNotIncludes("admin analytics page", page, "taskLeaderboardItems");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedRange");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedOverride");
assertNotIncludes("useAdminAnalyticsState", hook, "taskCompletionSpeedBuckets");
assertNotIncludes("useAdminAnalyticsState", hook, "taskLeaderboardRange");
assertNotIncludes("useAdminAnalyticsState", hook, "taskLeaderboardOverride");
assertNotIncludes("useAdminAnalyticsState", hook, "taskLeaderboardItems");

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
  "generatedAtUtc",
  "lastValidatedAtUtc",
  "snapshotState",
  "started / assigned",
  "completed / started",
  "failed / assigned",
  "rates",
  "completionFromAssignedPct",
  "failureFromAssignedPct",
  "failureAfterStartPct",
  "orphanStartedCount",
  "orphanCompletedCount",
  "stuckAssignedBreakdown",
  "guidanceTelemetryState",
  "guidanceTelemetryExplanation",
  "assignmentStateMissingCount",
  "telemetryStateMismatchCount",
  "stateTelemetryMissingCount",
  "perTaskBreakdown",
  "taskLeaderboardConsolidated",
  "standaloneTaskLeaderboardRemoved",
  "leaderboardMode",
  "taskCatalogSource",
  "taskLeaderboardRows",
  "taskLeaderboardPageSize",
  "topCompletedTask",
  "topRewardTask",
  "topFailingTask",
  "worstCompletionRateTask",
  "largestAssignedNotStartedTask",
  "rewardMismatchCount",
  "lifecycleMismatchCount",
  "timingPartialCount",
  "leaderboardPipelineDelta",
  "speedTimingDelta",
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
  "checks",
  "timingRecommendation",
  "fakeZeroPrevented",
]) {
  assertIncludes("admin-task-pipeline model", model, required);
}

for (const required of [
  "completionRateFormula",
  "startedCompletionRate",
  "startedCompletionRateFormula",
  "rewardFormula",
  "rewardReconciliationDelta",
  "rewardVerified",
  "failed_exceeds_started",
  "catalog_reward_unavailable",
  "timing_partial",
]) {
  assertIncludes("admin-task-leaderboard helper", leaderboardHelper, required);
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
assertIncludes("AdminDebugRoute", debugRoute, "taskLeaderboardConsolidated");
assertIncludes("AdminDebugRoute", debugRoute, "standaloneTaskLeaderboardRemoved");
assertIncludes("AdminDebugRoute", debugRoute, "leaderboardPipelineDelta");
assertIncludes("AdminDebugRoute", debugRoute, "taskLeaderboardRule");

assertIncludes("agent truth doc", doc, "Lifecycle states are assigned, started, completed, failed");
assertIncludes("agent truth doc", doc, "Guidance signals");
assertIncludes("agent truth doc", doc, "Task Completion Speed belongs inside Daily Task Pipeline");
assertIncludes("agent truth doc", doc, "standalone Task Completion Speed module is forbidden");
assertIncludes("agent truth doc", doc, "Speed buckets count timed completions only");
assertIncludes("agent truth doc", doc, "Bright cyan is not the semantic color");
assertIncludes("agent truth doc", doc, "Task Leaderboard also belongs inside Daily Task Pipeline");
assertIncludes("agent truth doc", doc, "standalone Task Leaderboard module is forbidden");
assertIncludes("agent truth doc", doc, "Reward totals are not final business truth");
assertIncludes("agent truth doc", doc, "inline paginated leaderboard rows");
assertIncludes("agent truth doc", doc, "`started / assigned`");
assertIncludes("agent truth doc", doc, "`completed / assigned`");
assertIncludes("agent truth doc", doc, "`failed / assigned`");
assertIncludes("agent truth doc", doc, "Fail-after-start is unavailable unless failures can be separated from unstarted expirations.");
assertIncludes("agent truth doc", doc, "Task guidance telemetry is missing; guidance impact cannot be evaluated.");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce the unhelpful vertical bar chart");

if (process.exitCode) process.exit(process.exitCode);

console.log("Admin Analytics Daily Task Pipeline contract check passed.");
