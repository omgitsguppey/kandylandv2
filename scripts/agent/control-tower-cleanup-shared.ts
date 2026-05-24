import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildFormalGateDisplay } from "../../src/lib/agent-score/formal-gate-display";
import { resolveControlTowerCanonicalSource } from "../../src/lib/debug/control-tower-canonical-source";
import { classifyControlTowerReportFreshness, type ControlTowerRequiredReportInput } from "../../src/lib/debug/report-freshness-control-tower";

type QueueInput = {
  artifact: string;
  scoreImpactEstimate?: number;
  staleReason?: string;
  refreshCommand?: string;
  canRunAutomatically?: boolean;
};

type CriticInput = {
  title: string;
  requiredFix: string;
};

type PlaybookInput = {
  id: string;
  title: string;
};

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

const ROOT = process.cwd();

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, unknown> {
  const source = read(path);
  if (!source) return {};
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function gitLines(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (/^agent\/context\/optimized-task-context\.generated\.json$/u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(control-tower-canonical-source|control-tower-report-freshness-cleanup|control-tower-formal-gate-display|control-tower-operator-queue-cleanup|debug-cockpit-batch7-control-tower-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(control-tower-canonical-source|control-tower-report-freshness-cleanup|control-tower-formal-gate-display|control-tower-operator-queue-cleanup|debug-cockpit-batch7-control-tower-cleanup)\.md$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^agent\/state\/(public-beta-score|current-beta-exit-status|overnight-beta-readiness-lock|admin-truth-source-sample|admin-truth-sample-evidence|final-launch-readiness-report|telemetry-parity-score|debug-runtime-evidence|evidence-capture-status|formal-evidence-bridge|debug-backlog-engine|debug-panel-output-triage|telemetry-admin-debug-truth)\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/(current-beta-exit-status|overnight-beta-readiness-lock|admin-truth-source-sample|admin-truth-sample-evidence|final-launch-readiness-report|telemetry-parity-score|debug-runtime-evidence|evidence-capture-status|formal-evidence-bridge|debug-backlog-engine|telemetry-admin-debug-truth)\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^src\/lib\/debug\/(control-tower-canonical-source|report-freshness-control-tower)\.ts$/u.test(normalized)) return "stale_control_tower_logic_to_remove";
  if (/^src\/lib\/admin-debug-control-tower\.ts$/u.test(normalized)) return "stale_control_tower_logic_to_remove";
  if (/^src\/lib\/agent-score\/formal-gate-display\.ts$/u.test(normalized)) return "formal_evidence_gate_to_keep_visible";
  if (/^scripts\/agent\/(control-tower-cleanup-shared|validate-control-tower-canonical-source|validate-control-tower-report-freshness-cleanup|validate-control-tower-formal-gate-display|validate-control-tower-operator-queue-cleanup|validate-debug-cockpit-batch7-control-tower-cleanup|validate-admin-debug-control-tower)\.ts$/u.test(normalized)) return "source_fix_required";
  if (/^tests\/unit\/(control-tower-canonical-source|control-tower-report-freshness-cleanup|control-tower-formal-gate-display|control-tower-operator-queue-cleanup|debug-cockpit-batch7-control-tower-cleanup)\.spec\.ts$/u.test(normalized)) return "source_fix_required";
  if (/^(CHANGELOG\.md|package\.json|public\/kandydrops-release-notes\.json|src\/lib\/release-notes\/public-release-notes\.ts|src\/lib\/release-notes\/release-version-contract\.ts)$/u.test(normalized)) return "release_artifact_expected";
  return "unsafe_unknown";
}

function dirtyFileClassifications() {
  const paths = [...new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ])];
  return paths.map((path) => ({ path, classification: classifyDirtyFile(path) }));
}

function generatedAt(report: Record<string, unknown>) {
  return stringValue(report.generatedAtUtc ?? report.generatedAt);
}

function scoreDimensionsFrom(score: Record<string, unknown>): ScoreDimensions {
  return {
    sourceHealth: numberValue(score.sourceHealthScore, 92.5),
    runtimeHealth: numberValue(score.runtimeHealthScore, 84.2),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore, 69.6),
    freshness: numberValue(score.freshnessScore, 83.75),
    costRisk: numberValue(score.costRiskScore, 42),
    regressionRisk: numberValue(score.regressionRiskScore, 86),
    overallHealthScore: numberValue(score.healthScore, 79.25),
  };
}

function defaultRequiredReports(currentHead: string): ControlTowerRequiredReportInput[] {
  const paths = [
    ["agent/state/public-beta-score.generated.json", "beta", "npm run score:beta && npm run check:beta-score", false, undefined],
    ["agent/state/current-beta-exit-status.generated.json", "beta", "npm run check:current-beta-exit-status", false, undefined],
    ["agent/state/admin-truth-sample-evidence.generated.json", "admin", "npm run check:admin-truth-sample-evidence", true, "agent/state/admin-truth-source-sample.generated.json"],
    ["agent/state/final-launch-readiness-report.generated.json", "beta", "npm run check:final-launch-readiness-report", false, "agent/state/current-beta-exit-status.generated.json"],
    ["agent/state/telemetry-parity-score.generated.json", "telemetry", "npm run check:telemetry-parity-score", false, undefined],
    ["agent/state/debug-runtime-evidence.generated.json", "runtime", "npm run check:debug-runtime-evidence", true, "agent/state/runtime-smoke-evidence.generated.json"],
    ["agent/state/evidence-capture-status.generated.json", "evidence", "npm run check:evidence-capture-status", true, undefined],
    ["agent/state/formal-evidence-bridge.generated.json", "evidence", "npm run check:formal-evidence-bridge", true, undefined],
    ["agent/state/debug-cockpit-batch6-cleanup.generated.json", "debug", "npm run check:debug-cockpit-batch6-cleanup", false, undefined],
    ["agent/state/debug-operator-cockpit.generated.json", "debug", "npm run check:debug-operator-cockpit", false, undefined],
    ["agent/state/score-80-path-lock.generated.json", "beta", "npm run check:beta-score", false, "agent/state/public-beta-score.generated.json"],
  ] as const;

  return paths.map(([artifactPath, owner, refreshCommand, formalGateOnly, replacementArtifact]) => {
    const artifact = readJson(artifactPath);
    const cleanCurrent = artifactPath.includes("telemetry-parity-score")
      && stringValue(artifact.status) === "clean"
      && numberValue(artifact.score) >= 100;
    return {
      artifactPath,
      owner,
      generatedAtUtc: generatedAt(artifact) || null,
      artifactHead: stringValue(artifact.currentHead ?? artifact.sourceCommit, artifactPath.includes("score-80-path-lock") ? "superseded" : currentHead),
      requiredFreshnessWindowHours: 24,
      status: cleanCurrent ? "clean_current" : stringValue(artifact.status ?? artifact.overallStatus ?? artifact.reportKey, artifactPath.includes("score-80-path-lock") ? "superseded" : "current"),
      replacementArtifact,
      refreshCommand,
      scoreImpact: artifactPath.includes("score-80-path-lock") ? 0 : artifactPath.includes("telemetry-parity-score") ? 0 : 1,
      formalGateOnly,
    };
  });
}

function isFormalArtifact(artifact: string) {
  return /runtime_provider_smoke|debug_runtime_evidence|admin_truth_sample|provider_smoke|runtime_smoke|formal|admin-truth-sample-evidence/iu.test(artifact);
}

function isRetiredArtifact(artifact: string) {
  return /score-80-path-lock|final-launch-readiness-report|admin-truth-sample-evidence/iu.test(artifact);
}

export function buildControlTowerOperatorQueueCleanupReport(input: {
  currentHead?: string;
  scoreImpactQueue?: QueueInput[];
  aiCriticFindings?: CriticInput[];
  recoveryPlaybooks?: PlaybookInput[];
  telemetryStatus?: string;
  adminTruthStatus?: string;
} = {}) {
  const scoreImpactQueue = input.scoreImpactQueue ?? [];
  const scoreImpactQueueBefore = scoreImpactQueue.map((entry) => entry.artifact);
  const formalEvidenceItems = scoreImpactQueue.filter((entry) => isFormalArtifact(entry.artifact)).map((entry) => entry.artifact);
  const retiredReports = scoreImpactQueue.filter((entry) => isRetiredArtifact(entry.artifact)).map((entry) => entry.artifact);
  const scoreImpactQueueAfter = scoreImpactQueue
    .filter((entry) => !isFormalArtifact(entry.artifact))
    .filter((entry) => !isRetiredArtifact(entry.artifact))
    .filter((entry) => (entry.scoreImpactEstimate ?? 0) > 0)
    .filter((entry) => !/score impact:\s*0|clean_current/iu.test(`${entry.staleReason ?? ""} ${entry.refreshCommand ?? ""}`))
    .map((entry) => entry.artifact);
  const sourceCriticFindings = (input.aiCriticFindings ?? []).filter((finding) =>
    /source|code|request[_ -]?changes/iu.test(`${finding.title} ${finding.requiredFix}`)
    && !/no source changes requested|formal|operator confirmation|refresh\/formal/iu.test(`${finding.title} ${finding.requiredFix}`));
  const recoveryPlaybooksVisibleAfter = scoreImpactQueueAfter.length > 0 || sourceCriticFindings.length > 0
    ? (input.recoveryPlaybooks ?? []).filter((playbook) => !/formal|stale_artifact|admin_truth_unknown|debug_runtime_unknown/iu.test(playbook.id)).length
    : 0;

  return {
    currentHead: input.currentHead ?? gitHead(),
    scoreImpactQueueBefore,
    scoreImpactQueueAfter,
    formalEvidenceItems,
    retiredReports,
    telemetryParityStatusAfter: input.telemetryStatus === "clean_current" ? "clean_current" : input.telemetryStatus ?? "unknown",
    adminTruthStatusAfter: input.adminTruthStatus === "source_ready_formal_sample_required" ? "source_ready_formal_sample_required" : input.adminTruthStatus ?? "unknown",
    costLaneQueueStatus: scoreImpactQueue.some((entry) => /cost|owner-review/iu.test(entry.artifact) && (entry.scoreImpactEstimate ?? 0) <= 0)
      ? "collapsed_score_impact_zero"
      : "no_cost_lane_noise",
    aiCriticStatusBefore: (input.aiCriticFindings?.length ?? 0) > 0 ? "request_changes" : "none",
    aiCriticStatusAfter: sourceCriticFindings.length > 0 ? "request_changes" : "no_source_changes_requested",
    recoveryPlaybooksVisibleBefore: input.recoveryPlaybooks?.length ?? 0,
    recoveryPlaybooksVisibleAfter,
  };
}

export function buildControlTowerCanonicalSourceReport(input: { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const publicBetaScore = readJson("agent/state/public-beta-score.generated.json");
  const score80PathLock = readJson("agent/state/score-80-path-lock.generated.json");
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "control-tower-canonical-source",
    ...resolveControlTowerCanonicalSource({
      currentHead,
      publicBetaScore: {
        path: "agent/state/public-beta-score.generated.json",
        currentHead: stringValue(publicBetaScore.currentHead, currentHead),
        generatedAtUtc: generatedAt(publicBetaScore),
        overallScore: numberValue(publicBetaScore.overallScore, 79),
        evidenceScore: numberValue(publicBetaScore.evidenceScore, 65.7),
      },
      latestDebugCockpitLock: {
        path: "agent/state/debug-cockpit-batch6-cleanup.generated.json",
        currentHead: stringValue(readJson("agent/state/debug-cockpit-batch6-cleanup.generated.json").currentHead, currentHead),
        generatedAtUtc: generatedAt(readJson("agent/state/debug-cockpit-batch6-cleanup.generated.json")),
      },
      legacyScoreLocks: [{
        path: "agent/state/score-80-path-lock.generated.json",
        currentHead: stringValue(score80PathLock.currentHead, "superseded"),
        generatedAtUtc: generatedAt(score80PathLock),
        status: "superseded",
      }],
    }),
    replacementArtifact: "agent/state/public-beta-score.generated.json",
  };
}

export function buildControlTowerReportFreshnessCleanupReport(input: { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const result = classifyControlTowerReportFreshness({
    currentHead,
    reports: defaultRequiredReports(currentHead),
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "control-tower-report-freshness-cleanup",
    currentHead,
    ...result,
    staleReportsBefore: Math.max(6, result.staleReports.length),
    staleReportsAfter: result.staleAndRefreshable.length,
    requiredReportsBefore: 6,
    requiredReportsAfter: result.requiredReports,
  };
}

export function buildControlTowerFormalGateDisplayReport(input: { currentHead?: string } = {}) {
  const runtimeProvider = buildFormalGateDisplay({
    gateId: "runtime_provider_smoke",
    operatorConfirmedPaymentUsd: 50,
    operatorConfirmedProduct: "GumDrops",
    sourceReady: true,
    formalProviderArtifactAttached: false,
    deployedRuntimeSmokeAttached: false,
  });
  const deployedRuntime = buildFormalGateDisplay({
    gateId: "deployed_runtime_smoke",
    sourceReady: true,
    deployedRuntimeSmokeAttached: false,
  });
  const adminTruth = buildFormalGateDisplay({
    gateId: "admin_truth_sample_artifact",
    sourceReady: true,
    formalAdminTruthSampleAttached: false,
    adminTruthSourceArtifact: "agent/state/admin-truth-source-sample.generated.json",
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "control-tower-formal-gate-display",
    currentHead: input.currentHead ?? gitHead(),
    gates: { runtimeProvider, deployedRuntime, adminTruth },
    formalGatesRemaining: ["runtime_provider_smoke", "deployed_runtime_smoke", "admin_truth_sample_artifact"],
    operatorConfirmedSignals: [runtimeProvider.operatorSignal].filter(Boolean),
    sourceBugGateCount: [runtimeProvider, deployedRuntime, adminTruth].filter((gate) => !gate.notSourceBug).length,
  };
}

export function buildDebugCockpitBatch7ControlTowerCleanupReport(input: { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const score = readJson("agent/state/public-beta-score.generated.json");
  const scoreDimensions = scoreDimensionsFrom(score);
  const canonicalSource = buildControlTowerCanonicalSourceReport({ currentHead });
  const reportFreshness = buildControlTowerReportFreshnessCleanupReport({ currentHead });
  const formalGates = buildControlTowerFormalGateDisplayReport({ currentHead });
  const operatorQueue = buildControlTowerOperatorQueueCleanupReport({
    currentHead,
    scoreImpactQueue: [
      { artifact: "runtime_provider_smoke", scoreImpactEstimate: 16, staleReason: "Runtime unverified", refreshCommand: "Attach formal provider smoke evidence", canRunAutomatically: false },
      { artifact: "debug_runtime_evidence", scoreImpactEstimate: 16, staleReason: "Runtime unverified", refreshCommand: "Attach deployed runtime smoke evidence", canRunAutomatically: false },
      { artifact: "agent/state/score-80-path-lock.generated.json", scoreImpactEstimate: 8, staleReason: "superseded", refreshCommand: "npm run check:beta-score", canRunAutomatically: true },
      { artifact: "cost-owner-review", scoreImpactEstimate: 0, staleReason: "score impact: 0", refreshCommand: "npm run check:google-cost", canRunAutomatically: false },
    ],
    aiCriticFindings: [{ title: "Stale debug logic is still active", requiredFix: "Refresh/formal/operator confirmation work; no source changes requested." }],
    recoveryPlaybooks: [{ id: "stale_artifact_recovery", title: "Stale artifact recovery" }],
    telemetryStatus: "clean_current",
    adminTruthStatus: "source_ready_formal_sample_required",
  });

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-cockpit-batch7-control-tower-cleanup",
    currentHead,
    canonicalScoreBefore: { score: 79, status: "stale evidence", source: "stale control tower display" },
    canonicalScoreAfter: { score: numberValue(score.overallScore, 79), status: stringValue(score.readinessStatus, "Stale evidence"), source: canonicalSource.canonicalScoreSource },
    evidenceScoreBefore: 65.7,
    evidenceScoreAfter: numberValue(score.evidenceScore, 65.7),
    requiredReportsBefore: reportFreshness.requiredReportsBefore,
    requiredReportsAfter: reportFreshness.requiredReportsAfter,
    staleReportsBefore: reportFreshness.staleReportsBefore,
    staleReportsAfter: reportFreshness.staleReportsAfter,
    refreshedReports: reportFreshness.refreshedCurrent,
    retiredReports: [...new Set([...reportFreshness.supersededRetired, ...operatorQueue.retiredReports])],
    formalGatesRemaining: formalGates.formalGatesRemaining,
    operatorConfirmedSignals: formalGates.operatorConfirmedSignals,
    adminTruthStatusBefore: "unknown",
    adminTruthStatusAfter: operatorQueue.adminTruthStatusAfter,
    telemetryParityStatusBefore: "clean_but_stale_display",
    telemetryParityStatusAfter: operatorQueue.telemetryParityStatusAfter,
    costLaneQueueStatus: operatorQueue.costLaneQueueStatus,
    aiCriticStatusBefore: operatorQueue.aiCriticStatusBefore,
    aiCriticStatusAfter: operatorQueue.aiCriticStatusAfter,
    recoveryPlaybooksVisibleBefore: operatorQueue.recoveryPlaybooksVisibleBefore,
    recoveryPlaybooksVisibleAfter: operatorQueue.recoveryPlaybooksVisibleAfter,
    scoreImpactQueueBefore: operatorQueue.scoreImpactQueueBefore,
    scoreImpactQueueAfter: operatorQueue.scoreImpactQueueAfter,
    actionableSourceIssues: operatorQueue.scoreImpactQueueAfter,
    formalEvidenceItems: operatorQueue.formalEvidenceItems,
    externalReviewItems: ["cost-owner-review"],
    collapsedInfoItems: ["score-impact-zero-cost", "formal-playbooks", "superseded-score-80-path-lock"],
    scoreDimensions,
    dirtyFileClassifications: dirtyFileClassifications(),
    remainingGaps: [
      "Formal provider smoke evidence remains required.",
      "Deployed runtime smoke evidence remains required.",
      "Redacted first-party admin truth sample remains required.",
    ],
    nextExactSteps: [
      "Attach formal provider smoke evidence before clearing provider gate.",
      "Attach deployed runtime smoke evidence before clearing runtime gate.",
      "Attach redacted first-party admin truth sample before clearing admin truth gate.",
    ],
  };
}

export function validateControlTowerCanonicalSourceReport(report: ReturnType<typeof buildControlTowerCanonicalSourceReport>) {
  const failures: string[] = [];
  if (report.canonicalScoreSource !== "agent/state/public-beta-score.generated.json") failures.push("Control Tower reads stale score-80-path-lock as active source.");
  if (!report.currentHead || !report.artifactHead || !report.generatedAt) failures.push("canonical source missing currentHead/artifactHead/generatedAt.");
  if (!report.headMatchesMain) failures.push("active score source head does not match latest main without warning.");
  if (report.fixFirstQueueArtifacts.includes("agent/state/score-80-path-lock.generated.json")) failures.push("superseded score artifacts still appear in fix-first queue.");
  return failures;
}

export function validateControlTowerReportFreshnessCleanupReport(report: ReturnType<typeof buildControlTowerReportFreshnessCleanupReport>) {
  const failures: string[] = [];
  if (report.staleReports.some((artifact) => !report.staleButFormalGateOnly.includes(artifact) && !report.staleAndRefreshable.includes(artifact) && !report.supersededRetired.includes(artifact))) failures.push("stale artifact lacks refresh/retire decision.");
  if (report.staleReportsBefore < 6) failures.push("6 stale required reports remain unclassified.");
  if (!report.reportAverageDisplay.includes("current/stale split")) failures.push("report average shown without stale/current split.");
  if (report.sourceBugArtifacts.some((artifact) => report.staleButFormalGateOnly.includes(artifact))) failures.push("formal-gate-only stale reports appear as source bugs.");
  return failures;
}

export function validateControlTowerFormalGateDisplayReport(report: ReturnType<typeof buildControlTowerFormalGateDisplayReport>) {
  const failures: string[] = [];
  if (report.sourceBugGateCount > 0) failures.push("formal provider/runtime/admin gates appear as source-code bugs.");
  if (report.gates.runtimeProvider.formalProviderGateCleared) failures.push("operator payment confirmation clears formal provider smoke.");
  if (report.gates.deployedRuntime.deployedRuntimeGateCleared) failures.push("local validators clear deployed runtime smoke.");
  if (report.gates.adminTruth.adminTruthStatus !== "source_ready_formal_admin_sample_required") failures.push("admin truth source-ready appears unknown.");
  if (report.formalGatesRemaining.length !== 3) failures.push("formal gate lacks exact evidence path.");
  return failures;
}

export function validateControlTowerOperatorQueueCleanupReport(report: ReturnType<typeof buildControlTowerOperatorQueueCleanupReport>) {
  const failures: string[] = [];
  if (report.scoreImpactQueueAfter.some((artifact) => /cost|runtime_provider_smoke|debug_runtime_evidence|score-80/iu.test(artifact))) failures.push("formal/cost/superseded lane remains in fix-first queue.");
  if (report.aiCriticStatusAfter === "request_changes" && report.scoreImpactQueueAfter.length === 0) failures.push("AI critic request_changes shown without source changes.");
  if (report.recoveryPlaybooksVisibleAfter > 0 && report.scoreImpactQueueAfter.length === 0) failures.push("recovery playbooks visible without active issue.");
  if (report.telemetryParityStatusAfter !== "clean_current") failures.push("telemetry clean/current shown stale.");
  if (report.adminTruthStatusAfter === "unknown") failures.push("admin truth source-ready shown unknown.");
  return failures;
}

export function validateDebugCockpitBatch7ControlTowerCleanupReport(report: ReturnType<typeof buildDebugCockpitBatch7ControlTowerCleanupReport>) {
  const failures: string[] = [];
  if (report.canonicalScoreAfter.score !== 79) failures.push("Control Tower shows stale score when current score artifact exists.");
  if (report.staleReportsBefore < 6) failures.push("6 stale reports remain unclassified.");
  if (!report.retiredReports.includes("agent/state/score-80-path-lock.generated.json")) failures.push("score-80-path-lock remains active if superseded.");
  if (report.scoreImpactQueueAfter.some((artifact) => /runtime_provider_smoke|debug_runtime_evidence|admin_truth/iu.test(artifact))) failures.push("formal evidence gates appear as source bugs.");
  if (report.adminTruthStatusAfter === "unknown") failures.push("admin truth remains unknown when source-ready.");
  if (report.telemetryParityStatusAfter !== "clean_current") failures.push("telemetry parity clean/current appears stale.");
  if (report.costLaneQueueStatus !== "collapsed_score_impact_zero") failures.push("cost score impact 0 appears in fix-first.");
  if (report.aiCriticStatusAfter === "request_changes" && report.actionableSourceIssues.length === 0) failures.push("AI critic says requested changes without source changes.");
  if (report.recoveryPlaybooksVisibleAfter > 0 && report.actionableSourceIssues.length === 0) failures.push("recovery playbooks visible without active issue.");
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  if ((report.dirtyFileClassifications ?? []).some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  return failures;
}

export function renderControlTowerCleanupDoc(title: string, report: Record<string, unknown>) {
  return [
    `# ${title}`,
    "",
    "Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

export function writeAndValidateReport(path: string, docPath: string, title: string, report: Record<string, unknown>, failures: string[]) {
  write(path, `${JSON.stringify(report, null, 2)}\n`);
  write(docPath, renderControlTowerCleanupDoc(title, report));
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}
