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

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const dailyCheckIn = readRequired("src/components/Dashboard/DailyCheckIn.tsx");
const dailyTasksModule = readRequired("src/components/Dashboard/DailyTasksModule.tsx");
const taskCatalog = readRequired("src/lib/tasks/task-catalog.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const checkInRoute = readRequired("src/app/api/checkin/route.ts");
const dailyTasksServer = readRequired("src/lib/server/daily-tasks.ts");
const eventFactNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const ingestTests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");
const eventFactTests = readRequired("tests/unit/event-fact-truth.spec.ts");

if (packageJson.scripts?.["check:daily-task-telemetry-truth"] !== "tsx scripts/agent/validate-daily-task-telemetry-truth.ts") {
  failures.push("package.json must expose check:daily-task-telemetry-truth.");
}

requireIncludes(dailyCheckIn, 'trackEvent("daily_checkin_claimed"', "DailyCheckIn");
requireIncludes(dailyCheckIn, 'task_id: "check_in_today"', "DailyCheckIn");
requireIncludes(dailyCheckIn, "reward_gd: reward", "DailyCheckIn");
requireIncludes(dailyCheckIn, 'sourceTruth: "client_supporting"', "DailyCheckIn");
requireIncludes(dailyCheckIn, "day_key: getCSTDateKey(claimedAt)", "DailyCheckIn");
requireExcludes(dailyCheckIn, 'trackEvent("daily_check_in_claim"', "DailyCheckIn");

requireIncludes(dailyTasksModule, 'trackEvent("daily_task_action_clicked"', "DailyTasksModule");
requireIncludes(dailyTasksModule, "reward_gd: task.reward", "DailyTasksModule");
requireIncludes(dailyTasksModule, "day_key: dailyTaskState?.lastResetMs ? getCSTDateKey(dailyTaskState.lastResetMs) : getCSTDateKey(Date.now())", "DailyTasksModule");
requireIncludes(dailyTasksModule, 'sourceTruth: "client_supporting"', "DailyTasksModule");

requireIncludes(taskCatalog, 'eventName: "daily_checkin_claimed"', "Task catalog daily check-in");
requireIncludes(telemetryCatalog, '{ eventName: "daily_checkin_claimed"', "Telemetry catalog daily check-in");
requireIncludes(telemetryCatalog, 'aliases: ["daily_check_in_claim", "daily_reward_claimed"]', "Telemetry catalog daily check-in aliases");
requireIncludes(telemetryCatalog, '{ eventName: "task_completed"', "Telemetry catalog task completed");
requireIncludes(telemetryCatalog, 'aliases: ["daily_task_completed"]', "Telemetry catalog task completed aliases");
requireIncludes(telemetryCatalog, 'rewardGd: "reward_gd"', "Telemetry catalog reward alias");
requireIncludes(telemetryCatalog, 'sourceTruth: "source_truth"', "Telemetry catalog sourceTruth alias");

requireIncludes(identifiedIngestRoute, 'canonicalEventName === "daily_checkin_claimed"', "Identified ingest daily check-in truth");
requireIncludes(identifiedIngestRoute, 'canonicalEventName === "task_completed"', "Identified ingest task truth");
requireIncludes(checkInRoute, '"daily_checkin_claimed"', "Check-in route canonical event");
requireIncludes(checkInRoute, 'sourceTruth: "canonical"', "Check-in route source truth");
requireIncludes(dailyTasksServer, 'incrementEventStat(transaction, "task_completed"', "Daily tasks server task completion stats");
requireIncludes(dailyTasksServer, 'sourceTruth: "canonical"', "Daily tasks server source truth");
requireIncludes(dailyTasksServer, 'day_key: getCSTDateKey(nowMs)', "Daily tasks server day-key tracking");

requireIncludes(eventFactNormalizer, 'daily_reward_claimed: { normalizedAction: "daily_checkin_claimed"', "Event fact normalizer daily check-in alias");
requireIncludes(eventFactNormalizer, 'daily_task_completed: { normalizedAction: "task_completed"', "Event fact normalizer task alias");
requireIncludes(eventFactNormalizer, 'fact.normalizedAction === "daily_checkin_claimed" || fact.normalizedAction === "task_completed"', "Event fact normalizer day-key dedupe");

requireIncludes(ingestTests, 'eventName: "daily_checkin_claimed"', "Ingest tests daily check-in canonicalization");
requireIncludes(ingestTests, 'eventName: "task_completed"', "Ingest tests task completion canonicalization");
requireIncludes(eventFactTests, 'eventName: "task_completed"', "Event fact tests task completion coverage");
requireIncludes(eventFactTests, 'day_key: "2026-05-04"', "Event fact tests day-key dedupe");

if (failures.length > 0) {
  console.error("Daily task telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Daily task telemetry truth validator passed.");
