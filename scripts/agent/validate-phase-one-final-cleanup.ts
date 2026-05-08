import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { nowIso, writeJsonFile } from "./shared";

type ValidatorRun = {
  script: string;
  command: string;
  status: "pass" | "fail" | "missing_validator";
  exitCode: number | null;
  output: string[];
};

const REPORT_PATH = "agent/state/phase-one-final-cleanup.generated.json";

const validators = [
  "check:codebase-junk-cleanup",
  "check:client-loading-speed",
  "check:server-loading-speed",
  "check:user-creator-feature-parity",
  "check:event-timeline-management",
  "check:google-cloud-cost-data-handoff",
  "check:beta-versioning-final",
  "check:user-tracking-index-cutover",
  "check:guest-user-analytics",
  "check:4xx-cost",
  "check:billing-spikes",
  "check:fan-pass-unlock-entitlement",
  "check:ai-drop-creation-compact",
  "check:daily-task-engine-rewrite",
  "check:batch-upload-stability",
  "check:chat-paid-gumdrops-guidance",
  "check:ios-pwa-chat-refinements",
] as const;

function packageScripts() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  return packageJson.scripts ?? {};
}

function run(script: string, scripts: Record<string, string>): ValidatorRun {
  if (!scripts[script]) {
    return {
      script,
      command: `npm run ${script}`,
      status: "missing_validator",
      exitCode: null,
      output: [`Missing package script: ${script}`],
    };
  }

  const command = `npm run ${script}`;
  const result = spawnSync(command, {
    cwd: process.cwd(),
    shell: true,
    encoding: "utf8",
  });

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  const output = [stdout, stderr]
    .flatMap((chunk) => chunk.split(/\r?\n/u))
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    script,
    command,
    status: result.status === 0 ? "pass" : "fail",
    exitCode: typeof result.status === "number" ? result.status : null,
    output,
  };
}

function main() {
  const scripts = packageScripts();
  const results = validators.map((script) => run(script, scripts));
  const blockers = results
    .filter((result) => result.status !== "pass")
    .map((result) => `${result.script}: ${result.output.find((line) => line && !line.startsWith(">")) ?? "failed"}`);

  const report = {
    generatedAt: nowIso(),
    status: blockers.length > 0 ? "fail" : "pass",
    passFail: blockers.length > 0 ? "fail" : "pass",
    criticalBlockers: blockers,
    warnings: [] as string[],
    exactValidatorsToRun: results.map((result) => result.command),
    surfacesAffected: [
      "user surfaces",
      "creator surfaces",
      "telemetry timeline",
      "cost/data handoff",
      "legacy/junk cleanup",
    ],
    removedFiles: [] as string[],
    deprecatedFiles: [] as string[],
    blockedLegacyPaths: [] as string[],
    normalizedDuplicateLogic: [] as string[],
    speedImprovements: [] as string[],
    userCreatorDisconnectedSurfaces: [] as string[],
    telemetryGapsFixed: [] as string[],
    parityGapsFixed: [] as string[],
    googleCloudCostRisks: [] as string[],
    dataLossRisks: [] as string[],
    sqlDataConnectStatus: "sidecar_only_unless_approved",
    bigQueryStatus: "analytics_evidence_not_runtime_truth",
    gaOptionalEvidenceStatus: "optional_external_evidence_only",
    behavioralProfileStatus: "normalized_first_party_facts_required",
    promoReadinessVerdict: blockers.length > 0 ? "blocked" : "ready",
    validatorResults: results,
  };

  writeJsonFile(REPORT_PATH, report);

  if (blockers.length > 0) {
    console.error(`Phase one final cleanup validation failed (${blockers.length} blockers).`);
    process.exit(1);
  }

  console.log("Phase one final cleanup validation passed.");
}

main();
