import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type SourceRuntimeValidatorResult = {
  command: string;
  status: "pass" | "fail" | "unavailable";
  artifactPath: string;
  detail?: string;
};

export type SourceBackedRuntimeConfidenceReport = {
  generatedAtUtc: string;
  reportKey: "source-backed-runtime-confidence";
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_runtime_confidence" | "partial_source_runtime_confidence" | "failed";
  passed: boolean;
  runtimeContractsPresent: boolean;
  deployedSmokePresent: boolean;
  watchTimeRuntimeSourceReady: boolean;
  telemetryPipelineSourceReady: boolean;
  walletLoadingSourceReady: boolean;
  creatorDropStatusRuntimeSourceReady: boolean;
  operatorRevenueSmokeSourceSignal: boolean;
  runtimeConfidenceScore: number;
  launchGateImpact: "does_not_clear_runtime_smoke" | string;
  formalEvidenceImpact: "source_runtime_confidence_only";
  doesNotClear: string[];
  scoringModelSupportsRuntimePartialCredit: boolean;
  validatorResults: SourceRuntimeValidatorResult[];
  evidence: string[];
  nextAction: string;
  summary: {
    runtimeContractsPresent: boolean;
    deployedSmokePresent: boolean;
    runtimeConfidenceScore: number;
    launchGateImpact: string;
    formalRuntimeSmokeStillRequired: boolean;
  };
};

export type BuildSourceBackedRuntimeConfidenceInputs = {
  generatedAtUtc: string;
  currentHead: string;
  runtimeContractsPresent: boolean;
  deployedSmokePresent: boolean;
  watchTimeRuntimeSourceReady: boolean;
  telemetryPipelineSourceReady: boolean;
  walletLoadingSourceReady: boolean;
  creatorDropStatusRuntimeSourceReady: boolean;
  operatorRevenueSmokeSourceSignal: boolean;
  validatorResults: SourceRuntimeValidatorResult[];
  scoringModelSupportsRuntimePartialCredit?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT_PATH = "agent/state/source-backed-runtime-confidence.generated.json";
const DOC_PATH = "docs/agent-truth/source-backed-runtime-confidence.md";
const FORMAL_GATES_NOT_CLEARED = ["runtime_smoke", "provider_smoke", "manual_screenshot", "admin_truth_sample"];

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
}

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function currentReport(relativePath: string, head: string) {
  const report = readJson(relativePath);
  return Boolean(report && report.currentHead === head);
}

function validatorResult(command: string, artifactPath: string, head: string): SourceRuntimeValidatorResult {
  if (!existsSync(join(ROOT, artifactPath))) {
    return { command, status: "unavailable", artifactPath, detail: "Artifact missing." };
  }
  const report = readJson(artifactPath);
  if (report?.currentHead !== head) {
    return { command, status: "fail", artifactPath, detail: "Artifact was not generated from the latest code version." };
  }
  return { command, status: "pass", artifactPath, detail: "Artifact is current for the latest code version." };
}

function deployedRuntimeSmokePresent(head: string) {
  const smoke = readJson("agent/state/runtime-smoke-evidence.generated.json");
  if (!smoke) return false;
  if (smoke.currentHead !== head && smoke.sourceCommit !== head) return false;
  const status = String(smoke.status ?? smoke.overallStatus ?? "");
  return smoke.passed === true && /passed|runtime_smoke_passed/u.test(status);
}

function sourceCodeWiresRuntimeConfidence() {
  const core = readFileSync(join(ROOT, "src/lib/agent-score/core.ts"), "utf8");
  const scorer = readFileSync(join(ROOT, "scripts/agent/score-public-beta-readiness.ts"), "utf8");
  return core.includes("sourceBackedRuntimeConfidenceEvidence")
    && core.includes("runtimeProviderRuntimeCredit")
    && scorer.includes("SOURCE_BACKED_RUNTIME_CONFIDENCE_PATH");
}

function sourceFlags(head: string) {
  const runtimeWatch = readJson("agent/state/runtime-watch-time-v2.generated.json");
  const runtimeWatchSummary = record(runtimeWatch?.summary);
  const finalTelemetry = readJson("agent/state/final-telemetry-closure-lock.generated.json");
  const finalTelemetrySummary = record(finalTelemetry?.summary);
  const telemetryAdmin = readJson("agent/state/telemetry-admin-debug-truth.generated.json");
  const telemetryAdminSummary = record(telemetryAdmin?.summary);
  const wallet = readJson("agent/state/user-loading-wallet-mobile-refinement.generated.json");
  const walletSummary = record(wallet?.summary);
  const drops = readJson("agent/state/creator-drop-status-metrics.generated.json");
  const dropsSummary = record(drops?.summary);
  const operator = readJson("agent/state/operator-revenue-smoke.generated.json");
  const operatorSummary = record(operator?.summary);

  const watchTimeRuntimeSourceReady = currentReport("agent/state/runtime-watch-time-v2.generated.json", head)
    && runtimeWatchSummary.canonicalModelCreated === true
    && runtimeWatchSummary.clientTrackerCreated === true
    && runtimeWatchSummary.serverDeltaRulesModeled === true;
  const telemetryPipelineSourceReady = currentReport("agent/state/final-telemetry-closure-lock.generated.json", head)
    && finalTelemetrySummary.ingestClosed === true
    && finalTelemetrySummary.firestoreWritePathClosed === true
    && finalTelemetrySummary.betaEvidenceReady === false
    && currentReport("agent/state/telemetry-admin-debug-truth.generated.json", head)
    && telemetryAdminSummary.defaultBroadReadsBlocked === true;
  const walletLoadingSourceReady = currentReport("agent/state/user-loading-wallet-mobile-refinement.generated.json", head)
    && walletSummary.walletRuntimeLogicUnchanged === true
    && walletSummary.walletLoadingStable === true
    && walletSummary.walletMobileDensityCompact === true;
  const creatorDropStatusRuntimeSourceReady = currentReport("agent/state/creator-drop-status-metrics.generated.json", head)
    && dropsSummary.statusResolverReady === true
    && dropsSummary.metricsResolverReady === true
    && dropsSummary.metricsUnavailableNotZero === true;
  const operatorRevenueSmokeSourceSignal = currentReport("agent/state/operator-revenue-smoke.generated.json", head)
    && operatorSummary.revenueSmokeStatus === "operator_confirmed_revenue_smoke"
    && operatorSummary.formalProviderSmokePassed === false;

  return {
    watchTimeRuntimeSourceReady,
    telemetryPipelineSourceReady,
    walletLoadingSourceReady,
    creatorDropStatusRuntimeSourceReady,
    operatorRevenueSmokeSourceSignal,
  };
}

function score(flags: {
  runtimeContractsPresent: boolean;
  watchTimeRuntimeSourceReady: boolean;
  telemetryPipelineSourceReady: boolean;
  walletLoadingSourceReady: boolean;
  creatorDropStatusRuntimeSourceReady: boolean;
  operatorRevenueSmokeSourceSignal: boolean;
}) {
  return [
    flags.runtimeContractsPresent ? 15 : 0,
    flags.watchTimeRuntimeSourceReady ? 20 : 0,
    flags.telemetryPipelineSourceReady ? 25 : 0,
    flags.walletLoadingSourceReady ? 15 : 0,
    flags.creatorDropStatusRuntimeSourceReady ? 15 : 0,
    flags.operatorRevenueSmokeSourceSignal ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

export function buildSourceBackedRuntimeConfidenceReport(
  inputs: BuildSourceBackedRuntimeConfidenceInputs,
): SourceBackedRuntimeConfidenceReport {
  const runtimeConfidenceScore = score(inputs);
  const passed = inputs.validatorResults.length > 0
    && inputs.validatorResults.every((result) => result.status === "pass")
    && runtimeConfidenceScore > 0
    && inputs.deployedSmokePresent === false;
  const status = passed
    ? "source_ready_runtime_confidence"
    : runtimeConfidenceScore > 0
      ? "partial_source_runtime_confidence"
      : "failed";
  const evidence = [
    `runtimeContractsPresent=${inputs.runtimeContractsPresent}`,
    `deployedSmokePresent=${inputs.deployedSmokePresent}`,
    `watchTimeRuntimeSourceReady=${inputs.watchTimeRuntimeSourceReady}`,
    `telemetryPipelineSourceReady=${inputs.telemetryPipelineSourceReady}`,
    `walletLoadingSourceReady=${inputs.walletLoadingSourceReady}`,
    `creatorDropStatusRuntimeSourceReady=${inputs.creatorDropStatusRuntimeSourceReady}`,
    `operatorRevenueSmokeSourceSignal=${inputs.operatorRevenueSmokeSourceSignal}`,
    `runtimeConfidenceScore=${runtimeConfidenceScore}`,
    "launchGateImpact=does_not_clear_runtime_smoke",
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "source-backed-runtime-confidence",
    currentHead: inputs.currentHead,
    sourceCommit: inputs.currentHead,
    status,
    passed,
    runtimeContractsPresent: inputs.runtimeContractsPresent,
    deployedSmokePresent: inputs.deployedSmokePresent,
    watchTimeRuntimeSourceReady: inputs.watchTimeRuntimeSourceReady,
    telemetryPipelineSourceReady: inputs.telemetryPipelineSourceReady,
    walletLoadingSourceReady: inputs.walletLoadingSourceReady,
    creatorDropStatusRuntimeSourceReady: inputs.creatorDropStatusRuntimeSourceReady,
    operatorRevenueSmokeSourceSignal: inputs.operatorRevenueSmokeSourceSignal,
    runtimeConfidenceScore,
    launchGateImpact: "does_not_clear_runtime_smoke",
    formalEvidenceImpact: "source_runtime_confidence_only",
    doesNotClear: FORMAL_GATES_NOT_CLEARED,
    scoringModelSupportsRuntimePartialCredit: inputs.scoringModelSupportsRuntimePartialCredit ?? false,
    validatorResults: inputs.validatorResults,
    evidence,
    nextAction: "Attach deployed runtime smoke before clearing runtime evidence gates.",
    summary: {
      runtimeContractsPresent: inputs.runtimeContractsPresent,
      deployedSmokePresent: inputs.deployedSmokePresent,
      runtimeConfidenceScore,
      launchGateImpact: "does_not_clear_runtime_smoke",
      formalRuntimeSmokeStillRequired: true,
    },
  };
}

export function validateSourceBackedRuntimeConfidenceReport(report: SourceBackedRuntimeConfidenceReport) {
  const failures: string[] = [];
  if (report.reportKey !== "source-backed-runtime-confidence") failures.push("reportKey must be source-backed-runtime-confidence.");
  if (!report.currentHead || report.sourceCommit !== report.currentHead) failures.push("artifact must be tied to current source commit.");
  if (report.launchGateImpact !== "does_not_clear_runtime_smoke") failures.push("source-backed runtime confidence must not clear runtime smoke.");
  if (report.deployedSmokePresent !== false) failures.push("deployed runtime smoke must remain false unless a formal artifact exists.");
  if (report.doesNotClear.includes("runtime_smoke") === false) failures.push("doesNotClear must include runtime_smoke.");
  if (report.doesNotClear.includes("provider_smoke") === false) failures.push("runtime confidence must not be counted as provider smoke.");
  if (!Array.isArray(report.validatorResults) || report.validatorResults.length === 0) failures.push("source-backed runtime confidence has no validators.");
  if (report.validatorResults.some((result) => result.status !== "pass")) failures.push("source-backed runtime confidence validator result is not passing.");
  if (report.runtimeConfidenceScore <= 0) failures.push("runtime confidence score must be positive when source-backed contracts are present.");
  if (!report.scoringModelSupportsRuntimePartialCredit) {
    failures.push("runtimeHealth remains hard zero despite source-backed runtime contract evidence.");
  }
  return failures;
}

function renderDoc(report: SourceBackedRuntimeConfidenceReport) {
  const validators = report.validatorResults
    .map((result) => `| ${result.command} | ${result.status} | ${result.artifactPath} | ${result.detail ?? ""} |`)
    .join("\n");
  return `# Source-Backed Runtime Confidence

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Status: \`${report.status}\`
- Runtime confidence score: ${report.runtimeConfidenceScore}
- Runtime contracts present: ${report.runtimeContractsPresent}
- Deployed smoke present: ${report.deployedSmokePresent}
- Launch gate impact: \`${report.launchGateImpact}\`
- Formal runtime smoke still required: ${report.summary.formalRuntimeSmokeStillRequired}

## Source-Ready Runtime Lanes

- Watch time runtime source ready: ${report.watchTimeRuntimeSourceReady}
- Telemetry pipeline source ready: ${report.telemetryPipelineSourceReady}
- Wallet loading source ready: ${report.walletLoadingSourceReady}
- Creator drop status runtime source ready: ${report.creatorDropStatusRuntimeSourceReady}
- Operator revenue smoke source signal: ${report.operatorRevenueSmokeSourceSignal}

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
${validators}

## Evidence Boundary

This is source-backed runtime confidence only. It is not deployed runtime smoke, provider smoke, manual screenshot evidence, or admin truth sample evidence. It does not clear: ${report.doesNotClear.map((gate) => `\`${gate}\``).join(", ")}.
`;
}

function main() {
  const head = currentHead();
  const flags = sourceFlags(head);
  const runtimeContractsPresent = flags.watchTimeRuntimeSourceReady
    && flags.telemetryPipelineSourceReady
    && flags.walletLoadingSourceReady
    && flags.creatorDropStatusRuntimeSourceReady;
  const report = buildSourceBackedRuntimeConfidenceReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    runtimeContractsPresent,
    deployedSmokePresent: deployedRuntimeSmokePresent(head),
    watchTimeRuntimeSourceReady: flags.watchTimeRuntimeSourceReady,
    telemetryPipelineSourceReady: flags.telemetryPipelineSourceReady,
    walletLoadingSourceReady: flags.walletLoadingSourceReady,
    creatorDropStatusRuntimeSourceReady: flags.creatorDropStatusRuntimeSourceReady,
    operatorRevenueSmokeSourceSignal: flags.operatorRevenueSmokeSourceSignal,
    scoringModelSupportsRuntimePartialCredit: sourceCodeWiresRuntimeConfidence(),
    validatorResults: [
      validatorResult("npm run check:runtime-watch-time-v2", "agent/state/runtime-watch-time-v2.generated.json", head),
      validatorResult("npm run check:final-telemetry-closure-lock", "agent/state/final-telemetry-closure-lock.generated.json", head),
      validatorResult("npm run check:telemetry-admin-debug-truth", "agent/state/telemetry-admin-debug-truth.generated.json", head),
      validatorResult("npm run check:mobile-loading-hydration-stability", "agent/state/mobile-loading-hydration-stability.generated.json", head),
      validatorResult("npm run check:user-loading-wallet-mobile-refinement", "agent/state/user-loading-wallet-mobile-refinement.generated.json", head),
      validatorResult("npm run check:creator-drop-status-metrics", "agent/state/creator-drop-status-metrics.generated.json", head),
      validatorResult("npm run check:operator-revenue-smoke", "agent/state/operator-revenue-smoke.generated.json", head),
    ],
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateSourceBackedRuntimeConfidenceReport(report);
  if (failures.length > 0) {
    console.error("Source-backed runtime confidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Source-backed runtime confidence passed. score=${report.runtimeConfidenceScore} deployedSmoke=${report.deployedSmokePresent}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
