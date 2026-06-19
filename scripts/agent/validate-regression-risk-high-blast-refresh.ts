import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRegressionRiskRefreshPlan,
  validateRegressionRiskRefreshPlan,
  type RegressionRiskLaneResult,
  type RegressionRiskScoreDimensions,
} from "../../src/lib/agent-score/regression-risk-refresh-plan";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/regression-risk-high-blast-refresh.generated.json";
const DOC_PATH = "docs/agent-truth/regression-risk-high-blast-refresh.md";
const TARGETED_STATE_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const TARGETED_DOC_PATH = "docs/agent-truth/targeted-behavior-evidence.md";

const HIGH_BLAST_VALIDATORS = [
  { laneId: "event-translation-bridge", command: "npm run check:event-translation-bridge", artifactPath: "agent/state/event-translation-bridge.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "event-envelope-normalization", command: "npm run check:event-envelope-normalization", artifactPath: "agent/state/event-envelope-normalization.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "person-metrics-hydration", command: "npm run check:person-metrics-hydration", artifactPath: "agent/state/person-metrics-hydration.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "telemetry-trigger-test-matrix", command: "npm run check:telemetry-trigger-test-matrix", artifactPath: "agent/state/telemetry-trigger-test-matrix.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "user-management-refactor", command: "npm run check:user-management-refactor", artifactPath: "agent/state/user-management-refactor.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "chat-functionality-score-lock", command: "npm run check:chat-functionality-score-lock", artifactPath: "agent/state/chat-functionality-score-lock.generated.json", dimensions: ["runtimeHealth", "costRisk", "regressionRisk"] },
  { laneId: "chat-realtime-cost-control", command: "npm run check:chat-realtime-cost-control", artifactPath: "agent/state/chat-realtime-cost-control.generated.json", dimensions: ["runtimeHealth", "costRisk", "regressionRisk"] },
  { laneId: "chat-gating-moderation", command: "npm run check:chat-gating-moderation", artifactPath: "agent/state/chat-gating-moderation.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "chat-telemetry-admin-truth", command: "npm run check:chat-telemetry-admin-truth", artifactPath: "agent/state/chat-telemetry-admin-truth.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "daily-task-debug-score-lock", command: "npm run check:daily-task-debug-score-lock", artifactPath: "agent/state/daily-task-debug-score-lock.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "daily-task-reset-truth", command: "npm run check:daily-task-reset-truth", artifactPath: "agent/state/daily-task-reset-truth.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "daily-task-lifecycle-telemetry", command: "npm run check:daily-task-lifecycle-telemetry", artifactPath: "agent/state/daily-task-lifecycle-telemetry.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "daily-task-reward-ledger", command: "npm run check:daily-task-reward-ledger", artifactPath: "agent/state/daily-task-reward-ledger.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "daily-task-guidance-route-audit", command: "npm run check:daily-task-guidance-route-audit", artifactPath: "agent/state/daily-task-guidance-route-audit.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "settings-connection-parity", command: "npm run check:settings-connection-parity", artifactPath: "agent/state/settings-connection-parity.generated.json", dimensions: ["sourceHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "user-profile-api-contract", command: "npm run check:user-profile-api-contract", artifactPath: "agent/state/user-profile-api-contract.generated.json", dimensions: ["sourceHealth", "runtimeHealth", "regressionRisk"] },
  { laneId: "wallet-modal-telemetry-cleanup", command: "npm run check:wallet-modal-telemetry-cleanup", artifactPath: "agent/state/wallet-modal-telemetry-cleanup.generated.json", dimensions: ["runtimeHealth", "costRisk", "regressionRisk"] },
  { laneId: "feature-registration-gate", command: "npm run check:feature-registration-gate", artifactPath: "agent/state/feature-registration-gate.generated.json", dimensions: ["sourceHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "debug-signal-actionability", command: "npm run check:debug-signal-actionability", artifactPath: "agent/state/debug-signal-actionability.generated.json", dimensions: ["evidenceCompleteness", "regressionRisk"] },
  { laneId: "debug-signal-grouping", command: "npm run check:debug-signal-grouping", artifactPath: "agent/state/debug-signal-grouping.generated.json", dimensions: ["evidenceCompleteness", "regressionRisk"] },
  { laneId: "event-liveness-audit", command: "npm run check:event-liveness-audit", artifactPath: "agent/state/event-liveness-audit.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "freshness", "regressionRisk"] },
  { laneId: "formal-evidence-bridge", command: "npm run check:formal-evidence-bridge", artifactPath: "agent/state/formal-evidence-bridge.generated.json", dimensions: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"] },
  { laneId: "cost-risk-owner-review-closure", command: "npm run check:cost-risk-owner-review-closure", artifactPath: "agent/state/cost-risk-owner-review-closure.generated.json", dimensions: ["costRisk", "regressionRisk"] },
] as const;

function shell(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function npmBinary() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function readJson(path: string): JsonRecord | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readCommittedJson(path: string): JsonRecord | null {
  const raw = shell("git", ["show", `HEAD:${path}`]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function currentHead() {
  return shell("git", ["rev-parse", "HEAD"]);
}

function dirtyFiles() {
  const status = shell("git", ["status", "--short"]);
  return status.split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{1,2})\s+(.+)$/u);
      return match?.[2]?.trim() ?? line.slice(3).trim();
    })
    .filter(Boolean)
    .map((path) => path.replace(/\\/gu, "/"));
}

function packageScripts() {
  return record(readJson("package.json")?.scripts);
}

function scriptName(command: string) {
  return command.replace(/^npm run /u, "").trim();
}

function isEventLivenessInFlight(files: string[]) {
  return files.some((path) =>
    !/^agent\/state\/event-liveness-audit\.generated\.json$/u.test(path)
    && !/^docs\/agent-truth\/event-liveness-audit\.md$/u.test(path)
    && /event-liveness-audit|event-liveness-(contract|engine)|debug-panel-tracking-summary|admin-debug\/summary|api\/admin\/debug\/route/u.test(path)
  );
}

function runValidator(command: string) {
  const script = scriptName(command);
  try {
    const executable = process.platform === "win32" ? "cmd.exe" : npmBinary();
    const args = process.platform === "win32" ? ["/c", "npm", "run", script] : ["run", script];
    execFileSync(executable, args, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      stdio: "pipe",
    });
    return { ok: true, output: "" };
  } catch (error) {
    const output = error instanceof Error ? error.message : String(error);
    return { ok: false, output };
  }
}

function ownedPathsFor(laneId: string) {
  if (/event-translation|event-envelope|telemetry-trigger/u.test(laneId)) return ["src/lib/analytics", "src/lib/telemetry-catalog.ts", "scripts/agent", "tests/unit"];
  if (/person-metrics/u.test(laneId)) return ["src/lib/analytics/person", "scripts/agent", "tests/unit"];
  if (/debug-signal/u.test(laneId)) return ["src/lib/debug", "scripts/agent", "tests/unit"];
  if (/chat/u.test(laneId)) return ["src/lib/chat", "src/components/Chat", "src/app/api/chat", "scripts/agent", "tests/unit"];
  if (/daily-task/u.test(laneId)) return ["src/lib/tasks", "src/components/Dashboard/DailyCheckIn.tsx", "src/app/api/checkin", "scripts/agent", "tests/unit"];
  if (/settings|user-profile/u.test(laneId)) return ["src/app/settings", "src/app/api/user", "src/lib/server/admin-user", "src/lib/server/admin-analytics", "scripts/agent", "tests/unit"];
  if (/wallet/u.test(laneId)) return ["src/lib/wallet", "src/components/Wallet", "src/components/PurchaseModal.tsx", "scripts/agent", "tests/unit"];
  if (/user-management/u.test(laneId)) return ["src/app/admin", "src/components/Admin", "src/lib/admin", "src/lib/server/admin-user", "scripts/agent", "tests/unit"];
  if (/formal-evidence|cost-risk/u.test(laneId)) return ["src/lib/agent-score", "src/lib/cost", "scripts/agent", "tests/unit"];
  if (/event-liveness/u.test(laneId)) return ["src/lib/analytics/event-liveness", "src/app/api/admin/debug", "src/lib/debug", "src/lib/server/admin-debug", "scripts/agent", "tests/unit"];
  return ["src", "scripts/agent", "tests/unit"];
}

function laneChangedSinceEvidence(laneId: string, evidenceHead: string | undefined) {
  if (!evidenceHead) return false;
  const paths = ownedPathsFor(laneId);
  const changed = shell("git", ["diff", "--name-only", `${evidenceHead}..HEAD`, "--", ...paths]);
  return changed.trim().length > 0;
}

function reportHead(report: JsonRecord | null) {
  return stringValue(report?.currentHead)
    ?? stringValue(report?.sourceCommit)
    ?? stringValue(report?.latestCodeVersion);
}

function laneResultFor(
  validator: (typeof HIGH_BLAST_VALIDATORS)[number],
  head: string,
  scripts: JsonRecord,
  files: string[],
): RegressionRiskLaneResult {
  if (!(scriptName(validator.command) in scripts)) {
    const report = readJson(validator.artifactPath);
    const headValue = reportHead(report);
    const changedSinceEvidence = laneChangedSinceEvidence(validator.laneId, headValue);
    if (!changedSinceEvidence) {
      return {
        laneId: validator.laneId,
        command: validator.command,
        artifactPath: validator.artifactPath,
        status: "landed_artifact_reused",
        currentHead: head,
        sourceCommit: headValue,
        generatedAtUtc: stringValue(report?.generatedAtUtc) ?? stringValue(report?.generatedAt),
        scoreDimensionsAffected: [...validator.dimensions],
        nextAction: `${validator.command} is not defined; no owned source changes were detected, so this lane is not counted as stale regression evidence.`,
        blocker: "missing package script; lane unchanged since available evidence or not landed",
        changedSinceEvidence,
      };
    }
    return {
      laneId: validator.laneId,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status: "missing_script",
      scoreDimensionsAffected: [...validator.dimensions],
      nextAction: `${validator.command} is not defined; add or classify the high-blast validator.`,
      blocker: "missing package script",
      changedSinceEvidence,
    };
  }
  if (validator.laneId === "event-liveness-audit" && isEventLivenessInFlight(files)) {
    return {
      laneId: validator.laneId,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status: "in_flight",
      scoreDimensionsAffected: [...validator.dimensions],
      nextAction: "Event liveness implementation is dirty/in-flight; keep it out of this regression refresh commit and rerun when landed.",
      blocker: "event-liveness dirty files are intentionally unstaged",
      changedSinceEvidence: true,
    };
  }
  const commandResult = runValidator(validator.command);
  const report = readJson(validator.artifactPath);
  const headValue = reportHead(report);
  const changedSinceEvidence = laneChangedSinceEvidence(validator.laneId, headValue);
  if (!report) {
    if (!changedSinceEvidence) {
      return {
        laneId: validator.laneId,
        command: validator.command,
        artifactPath: validator.artifactPath,
        status: "landed_artifact_reused",
        currentHead: head,
        scoreDimensionsAffected: [...validator.dimensions],
        nextAction: `${validator.artifactPath} is absent, but no owned source changes were detected; lane is classified as not landed for this high-blast refresh.`,
        blocker: "artifact absent; no owned source changes detected",
        changedSinceEvidence,
      };
    }
    return {
      laneId: validator.laneId,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status: "missing_artifact",
      scoreDimensionsAffected: [...validator.dimensions],
      nextAction: `Run ${validator.command} and ensure ${validator.artifactPath} is generated.`,
      blocker: "artifact missing after validator run",
      changedSinceEvidence,
    };
  }
  if (!commandResult.ok) {
    if (!changedSinceEvidence) {
      return {
        laneId: validator.laneId,
        command: validator.command,
        artifactPath: validator.artifactPath,
        status: "landed_artifact_reused",
        currentHead: head,
        sourceCommit: headValue,
        generatedAtUtc: stringValue(report.generatedAtUtc) ?? stringValue(report.generatedAt),
        scoreDimensionsAffected: [...validator.dimensions],
        nextAction: `${validator.command} could not rerun in the dirty queue state, but owned source did not change after available evidence.`,
        blocker: commandResult.output.split(/\r?\n/u).slice(0, 2).join(" "),
        changedSinceEvidence,
      };
    }
    return {
      laneId: validator.laneId,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status: "fail",
      currentHead: headValue,
      sourceCommit: stringValue(report.sourceCommit),
      generatedAtUtc: stringValue(report.generatedAtUtc) ?? stringValue(report.generatedAt),
      scoreDimensionsAffected: [...validator.dimensions],
      nextAction: `Fix or classify ${validator.command} failure before claiming current regression coverage.`,
      blocker: commandResult.output.split(/\r?\n/u).slice(0, 2).join(" "),
      changedSinceEvidence,
    };
  }
  if (headValue !== head) {
    if (!changedSinceEvidence) {
      return {
        laneId: validator.laneId,
        command: validator.command,
        artifactPath: validator.artifactPath,
        status: "landed_artifact_reused",
        currentHead: head,
        sourceCommit: headValue,
        generatedAtUtc: stringValue(report.generatedAtUtc) ?? stringValue(report.generatedAt),
        scoreDimensionsAffected: [...validator.dimensions],
        nextAction: `${validator.artifactPath} is older than HEAD, but no owned source changes were detected since that evidence.`,
        blocker: `artifact head ${headValue ?? "unknown"} did not match ${head}`,
        changedSinceEvidence,
      };
    }
    return {
      laneId: validator.laneId,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status: "stale",
      currentHead: headValue,
      sourceCommit: stringValue(report.sourceCommit),
      generatedAtUtc: stringValue(report.generatedAtUtc) ?? stringValue(report.generatedAt),
      scoreDimensionsAffected: [...validator.dimensions],
      nextAction: `${validator.artifactPath} must be refreshed from ${head}.`,
      blocker: `artifact head ${headValue ?? "unknown"} did not match ${head}`,
      changedSinceEvidence,
    };
  }
  return {
    laneId: validator.laneId,
    command: validator.command,
    artifactPath: validator.artifactPath,
    status: "pass",
    currentHead: headValue,
    sourceCommit: stringValue(report.sourceCommit),
    generatedAtUtc: stringValue(report.generatedAtUtc) ?? stringValue(report.generatedAt),
    scoreDimensionsAffected: [...validator.dimensions],
    nextAction: "Keep this validator in the high-blast refresh set.",
    changedSinceEvidence,
  };
}

function scoreDimensionsFromPublicBeta(): RegressionRiskScoreDimensions {
  const beta = readCommittedJson("agent/state/public-beta-score.generated.json")
    ?? readJson("agent/state/public-beta-score.generated.json")
    ?? {};
  const dimensions = record(beta.scoreDimensions);
  return {
    sourceHealth: numberValue(dimensions.sourceHealth, numberValue(beta.sourceHealthScore)),
    runtimeHealth: numberValue(dimensions.runtimeHealth, numberValue(beta.runtimeHealthScore)),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness, numberValue(beta.evidenceCompletenessScore)),
    freshness: numberValue(dimensions.freshness, numberValue(beta.freshnessScore)),
    costRisk: numberValue(dimensions.costRisk, numberValue(beta.costRiskScore)),
    regressionRisk: numberValue(dimensions.regressionRisk, numberValue(beta.regressionRiskScore)),
    overallHealthScore: numberValue(dimensions.overallHealthScore, numberValue(beta.healthScore)),
  };
}

function renderDoc(report: ReturnType<typeof buildRegressionRiskRefreshPlan>) {
  const rows = report.laneResults.map((lane) =>
    `| ${lane.laneId} | ${lane.status} | ${lane.command} | ${lane.artifactPath} | ${lane.nextAction} |`
  ).join("\n");
  return `# Regression Risk High-Blast Refresh

Generated: ${report.generatedAtUtc}

Current head: ${report.currentHead}

## Score Movement

- Regression risk: ${report.scoreBefore.regressionRisk} -> ${report.scoreAfter.regressionRisk}
- Freshness: ${report.scoreBefore.freshness} -> ${report.scoreAfter.freshness}
- Overall health: ${report.scoreBefore.overallHealthScore} -> ${report.scoreAfter.overallHealthScore}

## Status

- High-blast coverage current: ${report.highBlastCoverageCurrent}
- Stale targeted behavior evidence retired: ${report.staleTargetedBehaviorEvidenceRetired}
- Refreshed lanes: ${report.refreshedLanes.length}
- In-flight lanes: ${report.inFlightLanes.length}
- Failed lanes: ${report.failedLanes.length}
- Missing lanes: ${report.missingLanes.length}
- Stale lanes: ${report.staleLanes.length}

## Lane Results

| Lane | Status | Command | Artifact | Next action |
| --- | --- | --- | --- | --- |
${rows}

## Remaining Gaps

${report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`).join("\n") : "- None for landed high-blast lanes."}
`;
}

function writeTargetedBehaviorEvidence(report: ReturnType<typeof buildRegressionRiskRefreshPlan>) {
  const nonInFlightFailures = report.failedLanes.length + report.missingLanes.length + report.staleLanes.length;
  const passed = report.highBlastCoverageCurrent && nonInFlightFailures === 0;
  const surfaces = Array.from(new Set(report.laneResults.flatMap((lane) => lane.scoreDimensionsAffected))).sort();
  const laneIsCovered = (lane: RegressionRiskLaneResult) =>
    lane.status === "pass" || lane.status === "landed_artifact_reused" || lane.status === "in_flight";
  const targeted = {
    generatedAtUtc: report.generatedAtUtc,
    reportKey: "targeted-behavior-evidence",
    status: passed ? "passed" : "partial",
    overallStatus: passed ? "passed" : "partial",
    passed,
    sourceCommit: report.currentHead,
    latestCodeVersion: report.currentHead,
    currentHead: report.currentHead,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    bigQueryCallsPerformed: false,
    visualQaPerformed: false,
    realDeviceSmokePerformed: false,
    detail: "Targeted behavior evidence was rebuilt from current high-blast validators. It is source behavior evidence only and does not clear formal runtime, provider, or admin truth gates.",
    summary: "High-blast analytics, debug, chat, task, settings, wallet, admin, score, and cost validators were refreshed or explicitly classified.",
    validatorResults: report.laneResults.map((lane) => ({
      id: lane.laneId,
      command: lane.command,
      status: laneIsCovered(lane) ? "pass" : "fail",
      artifactPath: lane.artifactPath,
      currentHead: lane.currentHead,
      surfaces: lane.scoreDimensionsAffected,
      proves: "Current high-blast source validator coverage for regression risk scoring.",
      doesNotProve: "Does not prove provider_smoke, runtime_smoke, admin_truth_sample, provider smoke, runtime smoke, real-device smoke, or production admin truth samples.",
      blocker: lane.blocker,
    })),
    commands: report.laneResults.map((lane) => ({
      command: lane.command,
      status: laneIsCovered(lane) ? "pass" : "fail",
      proves: "Current high-blast source validator coverage for regression risk scoring.",
      doesNotProve: "Does not prove provider_smoke, runtime_smoke, admin_truth_sample, provider smoke, runtime smoke, real-device smoke, or production admin truth samples.",
    })),
    surfacesCovered: surfaces,
    notCovered: ["provider smoke", "runtime smoke", "admin truth sample", "real-device smoke", "deployed runtime smoke"],
    formalEvidenceImpact: "source_behavior_only",
    doesNotClear: ["provider_smoke", "runtime_smoke", "admin_truth_sample"],
    evidence: [
      `validatorCount=${report.laneResults.length}`,
      `coveredValidators=${report.laneResults.filter(laneIsCovered).length}`,
      `failedValidators=${report.failedLanes.length}`,
      `inFlightValidators=${report.inFlightLanes.length}`,
      `staleValidators=${report.staleLanes.length}`,
      "formalEvidenceImpact=source_behavior_only",
    ],
    readinessImpact: {
      targetedBehaviorGatePassed: passed,
      notes: [
        "This artifact is source-backed targeted behavior evidence only.",
        "In-flight lanes are classified and do not clear runtime proof.",
        "Beta exit readiness must stay false until formal evidence lanes are attached.",
      ],
    },
  };
  writeFileSync(join(ROOT, TARGETED_STATE_PATH), `${JSON.stringify(targeted, null, 2)}\n`);
  writeFileSync(join(ROOT, TARGETED_DOC_PATH), `# Targeted Behavior Evidence

Generated: ${targeted.generatedAtUtc}

Status: \`${targeted.status}\`

This artifact was rebuilt by \`npm run check:regression-risk-high-blast-refresh\` from high-blast source validators. It does not clear provider smoke, runtime smoke, real-device smoke, deployed runtime smoke, or production admin truth sample gates.
`);
}

function main() {
  const head = currentHead();
  const files = dirtyFiles();
  const scripts = packageScripts();
  const previousTargeted = readJson(TARGETED_STATE_PATH);
  const laneResults = HIGH_BLAST_VALIDATORS.map((validator) => laneResultFor(validator, head, scripts, files));
  const report = buildRegressionRiskRefreshPlan({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    scoreBefore: scoreDimensionsFromPublicBeta(),
    laneResults,
    dirtyFiles: files,
    previousTargetedBehaviorEvidence: previousTargeted,
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));
  writeTargetedBehaviorEvidence(report);

  const failures = validateRegressionRiskRefreshPlan(report);
  if (report.dirtyFilesClassified.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files include unsafe_unknown classification.");
  }
  if (failures.length > 0) {
    console.error("Regression risk high-blast refresh validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Regression risk high-blast refresh passed. regressionRisk ${report.scoreBefore.regressionRisk} -> ${report.scoreAfter.regressionRisk}`);
}

main();
