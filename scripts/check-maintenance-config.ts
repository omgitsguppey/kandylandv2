import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAINTENANCE_MODE_ENV,
  MAINTENANCE_SQL_POLICY,
  MAINTENANCE_SCHEDULES,
  isMaintenanceStateActive,
  resolveMaintenanceModeState,
} from "../shared/runtime/maintenance-mode-contract";

const ROOT = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireCondition(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

function requireText(source: string, expected: string, label: string) {
  requireCondition(source.includes(expected), `${label} must contain ${JSON.stringify(expected)}`);
}

const appHosting = read("apphosting.yaml");
const firebase = read("firebase.json");
const middleware = read("middleware.ts");
const appMaintenance = read("src/lib/maintenance-mode.ts");
const functionsMaintenance = read("functions/src/maintenance-mode.ts");
const maintenanceGuard = read("functions/src/maintenance-job-guard.ts");
const functionsEnvExample = read("functions/.env.example");
const maintenanceContract = read("docs/agent-truth/maintenance-mode-cost-contract.md");
const dataConnect = read("dataconnect/dataconnect.yaml");
const providerExpectationSource = read("config/maintenance-provider-expectations.json");

let providerExpectations: {
  projectId?: string;
  region?: string;
  maintenance?: {canonicalEnvironmentVariable?: string; appHostingMinInstances?: number; scheduledFunctionMinInstances?: number};
  schedulerJobs?: Array<{functionName?: string; expectedSchedule?: string; maintenanceAllowed?: boolean; jobName?: string}>;
  functionMinInstanceExpectations?: Array<{functionName?: string; expectedMinInstances?: number}>;
  scheduledFunctionRuntime?: {expectedMemory?: string; expectedMaxInstances?: number; expectedRetryCount?: number};
} = {};

try {
  providerExpectations = JSON.parse(providerExpectationSource) as typeof providerExpectations;
} catch {
  failures.push("config/maintenance-provider-expectations.json must be valid JSON");
}

requireText(appHosting, "minInstances: 0", "App Hosting configuration");
requireText(appHosting, `variable: ${MAINTENANCE_MODE_ENV}`, "App Hosting configuration");
requireText(appHosting, 'value: "1"', "App Hosting configuration");
requireText(firebase, '"source": "functions"', "Firebase Functions configuration");
requireText(read("functions/src/index.ts"), "minInstances: 0", "Functions global minimum-instance configuration");
requireText(middleware, "isMaintenanceModeEnabled", "middleware maintenance gate");
requireText(middleware, "MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH", "middleware analytics-refresh block");
requireText(appMaintenance, "../../shared/runtime/maintenance-mode-contract", "Next maintenance-state owner");
requireText(functionsMaintenance, "../../shared/runtime/maintenance-mode-contract.js", "Functions maintenance-state owner");
requireText(functionsMaintenance, "isMaintenanceStateActive(getMaintenanceModeState())", "Functions fail-closed maintenance decision");
requireText(functionsEnvExample, `${MAINTENANCE_MODE_ENV}=0`, "Functions environment example");
requireText(maintenanceGuard, "shouldSkipScheduledWork()", "scheduled-job maintenance guard");
requireCondition(!maintenanceGuard.includes("firebase-admin"), "scheduled-job maintenance guard must remain Firebase-free");
requireText(dataConnect, `instanceId: "${MAINTENANCE_SQL_POLICY.canonicalRepoMirrorInstance}"`, "canonical Data Connect mirror configuration");

const expectedStateCases: Array<[string | undefined, ReturnType<typeof resolveMaintenanceModeState>, boolean]> = [
  ["1", "on", true],
  ["true", "on", true],
  ["0", "off", false],
  ["false", "off", false],
  [undefined, "unknown", true],
  ["ambiguous", "unknown", true],
];
for (const [value, expectedState, expectedActive] of expectedStateCases) {
  const state = resolveMaintenanceModeState(value);
  requireCondition(state === expectedState, `maintenance parser state mismatch for ${String(value)}: ${state}`);
  requireCondition(isMaintenanceStateActive(state) === expectedActive, `maintenance fail-closed mismatch for ${String(value)}`);
}

for (const [key, schedule] of Object.entries(MAINTENANCE_SCHEDULES)) {
  const source = read(schedule.sourceFile);
  requireText(source, "onSchedule(", `${key} source`);
  requireText(source, `schedule: MAINTENANCE_SCHEDULES.${key}.schedule`, `${key} source schedule owner`);
  requireText(source, `maxInstances: MAINTENANCE_SCHEDULES.${key}.maxInstances`, `${key} source max-instance owner`);
  requireText(source, "runIfMaintenanceAllows", `${key} maintenance guard`);
  requireCondition(schedule.maintenanceAllowed === false, `${key} may not be enabled during maintenance`);
  if ("memory" in schedule) {
    requireText(source, `memory: MAINTENANCE_SCHEDULES.${key}.memory`, `${key} memory owner`);
  }
}

const schedulerJobs = providerExpectations.schedulerJobs ?? [];
const providerSchedulerByFunction = new Map(schedulerJobs.map((job) => [job.functionName, job]));
for (const [key, schedule] of Object.entries(MAINTENANCE_SCHEDULES)) {
  const providerJob = providerSchedulerByFunction.get(key);
  if (!providerJob) continue;
  requireCondition(providerJob.expectedSchedule === schedule.schedule, `${key} provider expectation must match the shared source cadence`);
  requireCondition(providerJob.maintenanceAllowed === false, `${key} provider expectation must be disabled during maintenance`);
  requireCondition(typeof providerJob.jobName === "string" && providerJob.jobName.length > 0, `${key} provider expectation must name the Scheduler job`);
}

requireCondition(providerExpectations.projectId === "kandydrops-by-ikandy", "provider expectation project must be KandyDrops");
requireCondition(providerExpectations.region === "us-central1", "provider expectation region must be us-central1");
requireCondition(providerExpectations.maintenance?.canonicalEnvironmentVariable === MAINTENANCE_MODE_ENV, "provider expectation must use the canonical maintenance variable");
requireCondition(providerExpectations.maintenance?.appHostingMinInstances === 0, "App Hosting maintenance minimum must be zero");
requireCondition(providerExpectations.maintenance?.scheduledFunctionMinInstances === 0, "scheduled Functions maintenance minimum must be zero");
requireCondition(providerExpectations.scheduledFunctionRuntime?.expectedMemory === "512MiB", "scheduled Function memory expectation must remain explicit at 512MiB");
requireCondition(providerExpectations.scheduledFunctionRuntime?.expectedMaxInstances === 1, "scheduled Function max instances must remain bounded at one");
requireCondition(providerExpectations.scheduledFunctionRuntime?.expectedRetryCount === 0, "maintenance-sensitive scheduled retries must be zero");
for (const expectation of providerExpectations.functionMinInstanceExpectations ?? []) {
  requireCondition(expectation.expectedMinInstances === 0, `${expectation.functionName ?? "function"} minimum instance expectation must be zero`);
}

for (const requiredPhrase of [
  "Cloud Scheduler jobs must be paused",
  "Source/config tests cannot prove provider state",
  "Cloud SQL compute",
  "Admin exceptions",
  "Rollback",
]) {
  requireText(maintenanceContract, requiredPhrase, "maintenance contract");
}

if (failures.length > 0) {
  console.error("Maintenance configuration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Maintenance configuration check passed (static/local only; no provider or Firestore calls made).");
}
