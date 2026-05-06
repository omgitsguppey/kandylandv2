import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
const dailyTasksServer = readRequired("src/lib/server/daily-tasks.ts");
const taskMaterializeRoute = readRequired("src/app/api/tasks/materialize/route.ts");
const rotateRoute = readRequired("src/app/api/tasks/rotate/route.ts");
const functionsTaskMaterializer = readRequired("functions/src/daily-task-materializer.ts");
const functionsIndex = readRequired("functions/src/index.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const debugTabMonitoring = readRequired("src/app/admin/debug/components/DebugTabMonitoring.tsx");
const adminDebugValidator = readRequired("scripts/agent/validate-admin-debug-control-tower.ts");
const releaseNotesScript = readRequired("scripts/release/update-public-changelog.ts");
const taskPipelineDoc = readRequired("docs/agent-truth/admin-analytics-daily-task-pipeline.md");

if (packageJson.scripts?.["check:daily-task-lifecycle"] !== "tsx scripts/agent/validate-daily-task-lifecycle.ts") {
  failures.push("package.json must expose check:daily-task-lifecycle.");
}

for (const expected of [
  "dailyTaskWindowId",
  "assignedAtUtc",
  "expiresAtUtc",
  "schemaVersion",
  "idempotencyKey",
  "assignmentSource",
  "daily_window_started",
  "daily_window_expired",
  "on_demand_backfill",
  "daily_task_materializer",
]) {
  requireIncludes(taskCatalog, expected, "Daily task catalog assignment/state contract");
}

for (const expected of [
  "getDailyTaskWindow",
  "buildDailyTaskIdempotencyKey",
  "materializeDailyTaskResetWindows",
  "DAILY_TASK_MATERIALIZER_MAX_USERS",
  "DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS",
  "cursorUserId",
  "nextCursorUserId",
  "TASK_MATERIALIZER_RUN_COLLECTION",
  "TASK_MATERIALIZER_HEARTBEAT_COLLECTION",
  "daily_task_assignment_backfilled_on_open",
  "daily_window_expired",
  "source: result.source",
  "reasonCode: result.reasonCode",
]) {
  requireIncludes(dailyTasksServer, expected, "Daily task server lifecycle must be window-based, idempotent, bounded, and auditable");
}

requireNotIncludes(dailyTasksServer, "daily_task_reset_due_inactivity", "Daily task server lifecycle");
requireIncludes(taskMaterializeRoute, "materializeDailyTaskResetWindows", "Task materializer route");
requireIncludes(taskMaterializeRoute, "auth: \"admin\"", "Task materializer route must be admin-only");
requireIncludes(taskMaterializeRoute, "TASK_MATERIALIZER_TOKEN", "Task materializer route must allow scheduler token auth");
requireIncludes(rotateRoute, "rotateUserTasks(uid)", "User rotate route remains on-demand fallback only");
requireIncludes(functionsTaskMaterializer, "onSchedule", "Functions daily task materializer");
requireIncludes(functionsTaskMaterializer, "schedule: \"5 0 * * *\"", "Functions daily task materializer reset schedule");
requireIncludes(functionsTaskMaterializer, "timeZone: \"America/Chicago\"", "Functions daily task materializer must match app/check-in reset timezone");
requireIncludes(functionsTaskMaterializer, "TASK_MATERIALIZER_ENDPOINT", "Functions daily task materializer endpoint config");
requireIncludes(functionsTaskMaterializer, "TASK_MATERIALIZER_TOKEN", "Functions daily task materializer token config");
requireIncludes(functionsTaskMaterializer, "DAILY_TASK_MATERIALIZER_MAX_USERS", "Functions daily task materializer batch guard");
requireIncludes(functionsTaskMaterializer, "DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS", "Functions daily task materializer runtime guard");
requireIncludes(functionsIndex, "materializeDailyTaskResetWindows", "Functions index must export daily task materializer schedule");

for (const expected of [
  "getDailyTaskWindow(nowMs)",
  "currentDailyTaskWindow.dailyTaskWindowId",
  "Expected ${DAILY_TASK_LIMIT} current-window tasks",
  "dailyTaskWindowId: toStringValue(data.dailyTaskWindowId)",
  "reasonCode: toStringValue(data.reasonCode)",
  "source: toStringValue(data.source)",
]) {
  requireIncludes(debugRoute, expected, "Admin debug route must expose current-window task assignment truth");
}

for (const expected of [
  "data-daily-task-activity-loaded-count",
  "data-daily-task-window-id",
  "data-daily-task-reason-code",
  "data-daily-task-source",
  "badgeLabel=\"LOADED\"",
  "Task event timing",
  "assignedAtUtc:",
  "updatedAtUtc:",
  "expiresAtUtc:",
]) {
  requireIncludes(debugTabMonitoring, expected, "Admin task activity panel must render loaded state, window, source, and reason truth");
}

for (const forbidden of [
  "<Pill label=\"Recent events\" value={(data?.recentTaskEvents || []).length} />",
  "<Pill label=\"User\" value={event.username} />",
  "<Pill label=\"Reward\" value={event.reward} />",
  "<Pill label=\"Progress\" value={`${event.progress}/${event.maxProgress}`} />",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Admin task activity panel must not render WAIT-style loaded task fields");
}

requireIncludes(adminDebugValidator, "data-daily-task-activity-loaded-count", "Admin debug validator must enforce task activity loaded fields");
requireIncludes(releaseNotesScript, "Improved daily task reset reliability so tasks are prepared on the daily schedule.", "Release notes script must include daily task lifecycle copy");
requireIncludes(taskPipelineDoc, "dailyTaskWindowId", "Daily task pipeline doctrine");
requireIncludes(taskPipelineDoc, "daily_window_expired", "Daily task pipeline doctrine");

if (failures.length > 0) {
  console.error("Daily task lifecycle validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Daily task lifecycle validator passed.");
