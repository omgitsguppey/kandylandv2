import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Finding = {
  surface: string;
  message: string;
  file: string;
  line?: number;
};

const ROOT = process.cwd();
const BLOCKERS: Finding[] = [];
const WARNINGS: Finding[] = [];

function readText(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function getLineNumber(text: string, needle: string) {
  const index = text.indexOf(needle);
  if (index < 0) {
    return undefined;
  }
  return text.slice(0, index).split(/\r?\n/).length;
}

function countMatches(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  return Array.from(text.matchAll(globalPattern)).length;
}

function addBlocker(surface: string, message: string, file: string, line?: number) {
  BLOCKERS.push({ surface, message, file, line });
}

function addWarning(surface: string, message: string, file: string, line?: number) {
  WARNINGS.push({ surface, message, file, line });
}

function assert(condition: boolean, surface: string, message: string, file: string, line?: number) {
  if (!condition) {
    addBlocker(surface, message, file, line);
  }
}

const validatorsToRun = [
  "npm run check:daily-task-engine-rewrite",
  "npx vitest run tests/unit/daily-task-engine.spec.ts tests/unit/daily-tasks-idempotency.spec.ts tests/unit/task-timestamps.spec.ts tests/contracts/task-economy-contract.spec.ts tests/unit/gumdrop-ledger.spec.ts",
  "npm run typecheck",
];

const surfacesAffected = [
  "src/lib/server/daily-tasks.ts",
  "src/lib/server/daily-task-runtime.ts",
  "src/lib/tasks/daily-task-assignment-engine.ts",
  "src/lib/tasks/daily-task-window-contract.ts",
  "src/lib/tasks/daily-task-reward-contract.ts",
  "src/lib/tasks/task-catalog.ts",
  "src/components/Dashboard/DailyTasksModule.tsx",
  "src/lib/telemetry-catalog.ts",
  "src/lib/tasks/task-observability.ts",
];

const dailyTasksTs = readText("src/lib/server/daily-tasks.ts");
const taskCatalogTs = readText("src/lib/tasks/task-catalog.ts");
const engineTs = readText("src/lib/tasks/daily-task-assignment-engine.ts");
const runtimeTs = readText("src/lib/server/daily-task-runtime.ts");
const rewardContractTs = readText("src/lib/tasks/daily-task-reward-contract.ts");
const dailyTasksUiTs = readText("src/components/Dashboard/DailyTasksModule.tsx");
const telemetryCatalogTs = readText("src/lib/telemetry-catalog.ts");
const taskObservabilityTs = readText("src/lib/tasks/task-observability.ts");

// Legacy rotation branches must be blocked, not live.
assert(
  countMatches(dailyTasksTs, /shouldRotateIncompleteCycle\(/g) <= 1,
  "runtime",
  "early incomplete-cycle rotation still appears callable in the canonical runtime",
  "src/lib/server/daily-tasks.ts",
  getLineNumber(dailyTasksTs, "shouldRotateIncompleteCycle("),
);
assert(
  countMatches(dailyTasksTs, /shouldRotateCompletedCycle\(/g) <= 1,
  "runtime",
  "completed-cycle rotation still appears callable in the canonical runtime",
  "src/lib/server/daily-tasks.ts",
  getLineNumber(dailyTasksTs, "shouldRotateCompletedCycle("),
);
assert(
  !dailyTasksTs.includes("state.lastResetMs < startOfDay")
  && !dailyTasksTs.includes("nextRefreshMs <= state.lastResetMs")
  && !dailyTasksTs.includes("nextRefreshMs < startOfDay"),
  "runtime",
  "legacy refresh-metadata rotation heuristics are still present",
  "src/lib/server/daily-tasks.ts",
);

// Stable window math and repair behavior must be wired through the runtime.
assert(
  dailyTasksTs.includes("repairRequired: Boolean(refreshMetadataIssue)"),
  "runtime",
  "malformed refresh metadata is not routed into repair mode",
  "src/lib/server/daily-tasks.ts",
  getLineNumber(dailyTasksTs, "repairRequired: Boolean(refreshMetadataIssue)"),
);
assert(
  dailyTasksTs.includes("buildDailyTaskAssignmentPlan(") && dailyTasksTs.includes("daily_task_window_repaired"),
  "runtime",
  "stable assignment planning or repair telemetry is missing from the daily task runtime",
  "src/lib/server/daily-tasks.ts",
);
assert(
  engineTs.includes("buildDailyTaskRewardTotals") && engineTs.includes("validateDailyTaskRewardTotals"),
  "engine",
  "reward totals are not computed and validated in the new engine",
  "src/lib/tasks/daily-task-assignment-engine.ts",
);
assert(
  runtimeTs.includes("validateDailyTaskRewardTotals"),
  "engine",
  "daily-task runtime snapshot does not validate reward totals",
  "src/lib/server/daily-task-runtime.ts",
);

// Reward normalization must route through the VNext resolver only.
assert(
  taskCatalogTs.includes("normalizeDailyTaskRewardVNext") && taskCatalogTs.includes("return normalizeDailyTaskRewardVNext"),
  "rewards",
  "task catalog still owns a separate reward normalization branch",
  "src/lib/tasks/task-catalog.ts",
);
assert(
  !taskCatalogTs.includes("* DAILY_TASK_REWARD_MULTIPLIER")
  && !taskCatalogTs.includes("rewardVersion === DAILY_TASK_REWARD_VERSION")
  && !taskCatalogTs.includes("rawEquivalent *"),
  "rewards",
  "legacy reward multiplication still appears outside the new resolver",
  "src/lib/tasks/task-catalog.ts",
);
assert(
  rewardContractTs.includes("normalizeDailyTaskRewardVNext") && rewardContractTs.includes("sourceAwareCreditType: \"reward\""),
  "rewards",
  "reward contract is missing the canonical reward-source contract",
  "src/lib/tasks/daily-task-reward-contract.ts",
);

// Claim path must stay idempotent and source-aware.
assert(
  dailyTasksTs.includes("buildTaskRewardCreditIdempotencyKey") && dailyTasksTs.includes("task_reward:"),
  "claims",
  "task reward claims are missing the canonical idempotency key",
  "src/lib/server/daily-tasks.ts",
);
assert(
  dailyTasksTs.includes("creditSourceAwareGumdrops(sourceAwareBalanceCursor, task.reward, \"reward\")"),
  "claims",
  "task rewards are not credited to reward/free GumDrops only",
  "src/lib/server/daily-tasks.ts",
);
assert(
  dailyTasksTs.includes("daily_task_claim_duplicate_prevented") && dailyTasksTs.includes("duplicate_receipt"),
  "claims",
  "duplicate claim prevention is not surfaced in runtime telemetry",
  "src/lib/server/daily-tasks.ts",
);
assert(
  dailyTasksTs.includes("DAILY_CHECKIN_PINNED_REWARD_OUTSIDE_RANDOM_POOL") && dailyTasksTs.includes("check_in_today"),
  "claims",
  "pinned check-in reward still appears to be eligible for the random task pool",
  "src/lib/server/daily-tasks.ts",
);

// User-facing daily-task UI must explain the reset and repair path.
assert(
  dailyTasksUiTs.includes("Tasks reset at") && dailyTasksUiTs.includes("Reload tasks"),
  "ui",
  "daily task module does not expose reset timing or repair copy",
  "src/components/Dashboard/DailyTasksModule.tsx",
);
assert(
  dailyTasksUiTs.includes("windowState === \"repair_required\"") && dailyTasksUiTs.includes("Finish these before the daily reset."),
  "ui",
  "daily task module is missing the stable-window or repair-state copy",
  "src/components/Dashboard/DailyTasksModule.tsx",
);

// Telemetry must know about the new lifecycle events.
const requiredEvents = [
  "daily_task_window_assigned",
  "daily_task_window_repaired",
  "daily_task_progressed",
  "daily_task_completed",
  "daily_task_claimed",
  "daily_task_claim_duplicate_prevented",
  "daily_task_expired",
  "daily_task_reward_normalized",
  "daily_task_state_repair_required",
];
requiredEvents.forEach((eventName) => {
  assert(
    telemetryCatalogTs.includes(`eventName: "${eventName}"`),
    "telemetry",
    `telemetry catalog is missing ${eventName}`,
    "src/lib/telemetry-catalog.ts",
    getLineNumber(telemetryCatalogTs, `eventName: "${eventName}"`),
  );
  assert(
    taskObservabilityTs.includes(eventName),
    "telemetry",
    `task observability does not recognize ${eventName}`,
    "src/lib/tasks/task-observability.ts",
    getLineNumber(taskObservabilityTs, eventName),
  );
});

// Canonical runtime should not import the blocked legacy registry.
assert(
  !runtimeTs.includes("daily-task-legacy-registry") && !dailyTasksTs.includes("daily-task-legacy-registry"),
  "legacy",
  "canonical daily-task runtime imports the blocked legacy registry",
  "src/lib/server/daily-task-runtime.ts",
);

if (BLOCKERS.length > 0) {
  console.log("fail");
  console.log("critical blockers");
  BLOCKERS.forEach((finding) => {
    console.log(`- [${finding.surface}] ${finding.message} (${finding.file}${finding.line ? `:${finding.line}` : ""})`);
  });
  console.log("warnings");
  if (WARNINGS.length === 0) {
    console.log("- none");
  } else {
    WARNINGS.forEach((finding) => {
      console.log(`- [${finding.surface}] ${finding.message} (${finding.file}${finding.line ? `:${finding.line}` : ""})`);
    });
  }
  console.log("exact validators to run");
  validatorsToRun.forEach((validator) => console.log(`- ${validator}`));
  console.log("surfaces affected");
  surfacesAffected.forEach((surface) => console.log(`- ${surface}`));
  console.log("promo readiness verdict");
  console.log("blocked");
  process.exitCode = 1;
} else {
  console.log("pass");
  console.log("critical blockers");
  console.log("- none");
  console.log("warnings");
  if (WARNINGS.length === 0) {
    console.log("- none");
  } else {
    WARNINGS.forEach((finding) => {
      console.log(`- [${finding.surface}] ${finding.message} (${finding.file}${finding.line ? `:${finding.line}` : ""})`);
    });
  }
  console.log("exact validators to run");
  validatorsToRun.forEach((validator) => console.log(`- ${validator}`));
  console.log("surfaces affected");
  surfacesAffected.forEach((surface) => console.log(`- ${surface}`));
  console.log("promo readiness verdict");
  console.log("ready");
}
