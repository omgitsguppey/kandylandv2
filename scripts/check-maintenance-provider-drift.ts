import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MAINTENANCE_MODE_ENV, MAINTENANCE_SQL_POLICY } from "../shared/runtime/maintenance-mode-contract";

type JsonRecord = Record<string, unknown>;

const args = process.argv.slice(2);
if (!args.includes("--live")) {
  console.error("Refusing provider access. Run `npm run check:maintenance-config:live` explicitly when a read-only live check is authorized.");
  process.exitCode = 1;
}

if (process.exitCode !== 1) {
  const expected = JSON.parse(readFileSync(join(process.cwd(), "config/maintenance-provider-expectations.json"), "utf8")) as JsonRecord;
  const projectId = String(expected.projectId ?? "kandydrops-by-ikandy");
  const region = String(expected.region ?? "us-central1");
  const modeArgument = args.find((argument) => argument.startsWith("--mode="))?.slice("--mode=".length) ?? "maintenance";
  const expectedState = modeArgument === "normal" ? "ENABLED" : modeArgument === "maintenance" ? "PAUSED" : null;
  const gcloud = process.platform === "win32" ? "gcloud.cmd" : "gcloud";
  const failures: string[] = [];

  if (!expectedState) {
    failures.push("--mode must be maintenance or normal");
  }

  function runJson(commandArgs: string[], label: string): JsonRecord | JsonRecord[] | null {
    try {
      const output = execFileSync(gcloud, commandArgs, {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return JSON.parse(output) as JsonRecord | JsonRecord[];
    } catch (error) {
      const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
      failures.push(`${label} read failed: ${detail}`);
      return null;
    }
  }

  const schedulerJobs = runJson([
    "scheduler", "jobs", "list", "--project", projectId, "--location", region, "--format=json",
  ], "Cloud Scheduler") as JsonRecord[] | null;
  const schedulerExpectations = (expected.schedulerJobs as JsonRecord[] | undefined) ?? [];
  for (const expectation of schedulerExpectations) {
    const jobName = String(expectation.jobName ?? "");
    const actual = schedulerJobs?.find((job) => String(job.name ?? "").endsWith(`/jobs/${jobName}`) || String(job.name ?? "") === jobName);
    if (!actual) {
      failures.push(`Cloud Scheduler job missing: ${jobName}`);
      continue;
    }
    if (String(actual.schedule ?? "") !== String(expectation.expectedSchedule ?? "")) {
      failures.push(`${jobName} cadence drift: provider=${String(actual.schedule)} source=${String(expectation.expectedSchedule)}`);
    }
    if (expectedState && String(actual.state ?? "") !== expectedState) {
      failures.push(`${jobName} state drift: provider=${String(actual.state)} expected=${expectedState}`);
    }
  }

  const functions = runJson([
    "functions", "list", "--v2", "--project", projectId, "--regions", region, "--format=json",
  ], "Firebase Functions") as JsonRecord[] | null;
  const functionExpectations = (expected.functionMinInstanceExpectations as JsonRecord[] | undefined) ?? [];
  for (const expectation of functionExpectations) {
    const functionName = String(expectation.functionName ?? "");
    if (functionName === "ssrkandydropsbyikandy") continue;
    const actual = functions?.find((fn) => String(fn.name ?? "").split("/").pop() === functionName || String(fn.name ?? "") === functionName);
    if (!actual) {
      failures.push(`Firebase Function missing from provider inventory: ${functionName}`);
      continue;
    }
    const serviceConfig = (actual.serviceConfig as JsonRecord | undefined) ?? {};
    const minInstances = Number(serviceConfig.minInstanceCount ?? 0);
    if (minInstances !== Number(expectation.expectedMinInstances ?? 0)) {
      failures.push(`${functionName} minimum-instance drift: provider=${minInstances} expected=${String(expectation.expectedMinInstances)}`);
    }
  }

  const appHosting = runJson([
    "run", "services", "describe", "kandydrops", "--project", projectId, "--region", region, "--format=json",
  ], "App Hosting Cloud Run service") as JsonRecord | null;
  if (appHosting) {
    const spec = (appHosting.spec as JsonRecord | undefined) ?? {};
    const template = (spec.template as JsonRecord | undefined) ?? {};
    const metadata = (template.metadata as JsonRecord | undefined) ?? {};
    const annotations = (metadata.annotations as JsonRecord | undefined) ?? {};
    if (String(annotations["autoscaling.knative.dev/minScale"] ?? "0") !== "0") {
      failures.push(`App Hosting minimum-instance drift: provider=${String(annotations["autoscaling.knative.dev/minScale"])} expected=0`);
    }
    const containers = (template.spec as JsonRecord | undefined)?.containers;
    const firstContainer = Array.isArray(containers) ? containers[0] as JsonRecord : undefined;
    const env = Array.isArray(firstContainer?.env) ? firstContainer.env as JsonRecord[] : [];
    const maintenanceValue = env.find((entry) => entry.name === MAINTENANCE_MODE_ENV)?.value;
    if (expectedState === "PAUSED" && maintenanceValue !== "1") {
      failures.push(`App Hosting maintenance flag drift: provider=${String(maintenanceValue)} expected=1`);
    }
    if (expectedState === "ENABLED" && maintenanceValue !== "0") {
      failures.push(`App Hosting maintenance flag drift: provider=${String(maintenanceValue)} expected=0`);
    }
  }

  for (const instanceId of [MAINTENANCE_SQL_POLICY.canonicalRepoMirrorInstance, MAINTENANCE_SQL_POLICY.candidateRedundantInstance]) {
    const sql = runJson([
      "sql", "instances", "describe", instanceId, "--project", projectId, "--format=json",
    ], `Cloud SQL ${instanceId}`) as JsonRecord | null;
    if (!sql) continue;
    const settings = (sql.settings as JsonRecord | undefined) ?? {};
    const activationPolicy = String(settings.activationPolicy ?? "");
    const expectedPolicy = expectedState === "PAUSED" ? "NEVER" : "ALWAYS";
    if (activationPolicy !== expectedPolicy) {
      failures.push(`${instanceId} activation-policy drift: provider=${activationPolicy} expected=${expectedPolicy}`);
    }
  }

  if (failures.length > 0) {
    console.error("Live maintenance provider drift check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Live maintenance provider drift check passed for ${projectId} in ${region} (${modeArgument} mode).`);
  }
}
