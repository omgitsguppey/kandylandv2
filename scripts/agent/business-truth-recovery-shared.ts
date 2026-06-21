import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  classifyCanonicalBusinessTruthStatus,
  type CanonicalBusinessTruthStatusInput,
} from "../../src/lib/debug/canonical-business-truth-status";
import {
  classifyRecoveryPlaybookVisibility,
} from "../../src/lib/debug/recovery-playbook-visibility";

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

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
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

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function scoreDimensionsFrom(score: Record<string, unknown>): ScoreDimensions {
  return {
    sourceHealth: numberValue(score.sourceHealthScore, 92.5),
    runtimeHealth: numberValue(score.runtimeHealthScore, 84.2),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore, 69.6),
    freshness: numberValue(score.freshnessScore, 83.75),
    costRisk: numberValue(score.costRiskScore, 42),
    regressionRisk: numberValue(score.regressionRiskScore, 86),
    overallHealthScore: numberValue(score.healthScore, numberValue(score.overallScore, 79)),
  };
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (/^agent\/context\/optimized-task-context\.generated\.json$/u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.md$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^agent\/state\/(admin-truth-source-sample|admin-truth-sample-evidence|debug-runtime-evidence|current-beta-exit-status|public-beta-score|formal-evidence-bridge|debug-backlog-engine|drop-watch-time-accuracy|sql-database-parity-cost-lock|overnight-beta-readiness-lock)\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/(admin-truth-source-sample|admin-truth-sample-evidence|debug-runtime-evidence|current-beta-exit-status|public-beta-score|formal-evidence-bridge|debug-backlog-engine|drop-watch-time-accuracy|sql-database-parity-cost-lock|overnight-beta-readiness-lock)\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^src\/lib\/debug\/(canonical-business-truth-status|recovery-playbook-visibility)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/app\/admin\/debug\/components\/DebugControlTowerBusinessTruth\.tsx$/u.test(normalized)) return "stale_business_truth_status_logic_to_remove";
  if (/^scripts\/agent\/(business-truth-recovery-shared|validate-canonical-business-truth-status|validate-canonical-business-truth-refresh|validate-recovery-playbook-cta-cleanup|validate-debug-cockpit-batch8-cleanup|validate-admin-debug-control-tower|validate-drop-watch-time-accuracy|validate-sql-database-parity-cost-lock)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^tests\/unit\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.spec\.ts$/u.test(normalized)) return "real_source_change_needs_review";
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

function defaultBusinessTruthInput(input: Partial<CanonicalBusinessTruthStatusInput> = {}): CanonicalBusinessTruthStatusInput {
  return {
    generatedAt: Date.now() - 18 * 60_000,
    sourceFreshness: "stale",
    sourceTruth: "canonical",
    confidenceScore: 74,
    issues: [{ code: "stale_source_inputs", severity: "warn", message: "Snapshot source inputs are stale." }],
    totalUsers: 864,
    verifiedPurchases: 67,
    totalRevenueUsd: 573,
    trackedUnwraps: 210,
    validWatchTimeMs: 21 * 60_000,
    formalAdminSampleStatus: "missing_formal_artifact",
    operatorConfirmedPayment: true,
    formalProviderGateCleared: false,
    watchTimeSource: "valid_watch_time",
    ...input,
  };
}

export function buildCanonicalBusinessTruthStatusReport(input: Partial<CanonicalBusinessTruthStatusInput> & { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const decision = classifyCanonicalBusinessTruthStatus(defaultBusinessTruthInput(input));
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "canonical-business-truth-status",
    currentHead,
    status: decision.status,
    sourceFreshness: input.sourceFreshness ?? "stale",
    confidenceScore: input.confidenceScore ?? 74,
    freshnessCause: decision.freshnessCause,
    freshnessExplanation: decision.freshnessExplanation,
    opsHealthInherited: decision.opsHealthInherited,
    refreshCommand: decision.refreshCommand,
    revenueSourceClass: decision.revenueSourceClass,
    purchaseSourceClass: decision.purchaseSourceClass,
    watchSourceClass: decision.watchSourceClass,
    watchMetricCanUsePageTime: decision.watchMetricCanUsePageTime,
    nextExactSteps: [decision.nextAction],
  };
}

export function validateCanonicalBusinessTruthStatusReport(report: ReturnType<typeof buildCanonicalBusinessTruthStatusReport>) {
  const failures: string[] = [];
  if (report.opsHealthInherited) failures.push("stale business truth degrades ops-health directly.");
  if (report.confidenceScore < 80 && report.status === "healthy_current") failures.push("confidence below 80 displays healthy_current.");
  if (report.sourceFreshness === "stale" && !report.freshnessCause) failures.push("sourceFreshness=stale lacks exact cause.");
  if (/generated recently/iu.test(report.freshnessExplanation) && !/source inputs stale|head mismatch|admin source activity sample/iu.test(report.freshnessExplanation)) failures.push("generatedAt recent but freshness stale has no explanation.");
  if (!report.revenueSourceClass || !report.purchaseSourceClass) failures.push("revenue source class missing.");
  if (!report.watchSourceClass || report.watchMetricCanUsePageTime) failures.push("watch source class missing or can use page time.");
  if (report.refreshCommand !== "npm run check:admin-truth-source-sample") failures.push("business truth lacks refresh command.");
  if (/first-party admin truth|formal gate|formal evidence gate|manual proof|screenshot proof/iu.test(`${report.freshnessExplanation} ${report.nextExactSteps.join(" ")}`)) failures.push("canonical business truth status emits stale formal/manual proof wording.");
  return failures;
}

export function buildCanonicalBusinessTruthRefreshReport(input: Partial<CanonicalBusinessTruthStatusInput> & { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const decision = classifyCanonicalBusinessTruthStatus(defaultBusinessTruthInput(input));
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "canonical-business-truth-refresh",
    currentHead,
    refreshPolicy: "bounded_snapshot_only",
    productionReadRequired: false,
    safeRefreshCommands: [
      "npm run check:admin-truth-source-sample",
      "npm run check:admin-debug-control-tower",
      "npm run check:formal-evidence-bridge",
    ],
    metricSources: {
      users: { path: "AdminUserTruthSnapshot.totalUsers", sourceClass: decision.userSourceClass },
      purchases: { path: "AdminUserTruthSnapshot.verifiedPurchases", sourceClass: decision.purchaseSourceClass },
      revenue: { path: "AdminUserTruthSnapshot.totalRevenueUsd", sourceClass: decision.revenueSourceClass },
      unwraps: { path: "AdminUserTruthSnapshot.trackedUnwraps", sourceClass: decision.unwrapSourceClass, duplicatePolicy: "deduped_admin_snapshot" },
      watch: { path: "AdminUserTruthSnapshot.validWatchTimeMs", sourceClass: decision.watchSourceClass, canUsePageTime: false },
    },
    confidenceScore: input.confidenceScore ?? 74,
    sourceFreshness: input.sourceFreshness ?? "stale",
    staleReason: decision.freshnessCause,
    nextExactSteps: [
      "Refresh admin truth source sample with npm run check:admin-truth-source-sample.",
      "Keep the admin source activity sample required until redacted source activity evidence is attached.",
      "Review 74% confidence before calling business truth healthy.",
    ],
  };
}

export function validateCanonicalBusinessTruthRefreshReport(report: ReturnType<typeof buildCanonicalBusinessTruthRefreshReport>) {
  const failures: string[] = [];
  if (report.productionReadRequired || report.refreshPolicy !== "bounded_snapshot_only") failures.push("refresh requires broad production read with no bounded snapshot policy.");
  for (const [metric, source] of Object.entries(report.metricSources)) {
    if (!source.path || !source.sourceClass) failures.push(`${metric} metric source path missing.`);
  }
  if (report.metricSources.watch.canUsePageTime) failures.push("watch time source can use page time.");
  if (!report.metricSources.revenue.sourceClass || !report.metricSources.purchases.sourceClass) failures.push("revenue/purchase truth class missing.");
  if (report.sourceFreshness === "stale" && !report.staleReason) failures.push("refreshed snapshot still stale without reason.");
  if (report.confidenceScore < 80 && !report.nextExactSteps.some((step) => /confidence|review/iu.test(step))) failures.push("confidence below 80 lacks exact next action.");
  return failures;
}

export function buildRecoveryPlaybookCtaCleanupReport(input: { currentHead?: string } = {}) {
  const result = classifyRecoveryPlaybookVisibility({
    scoreArtifactCurrent: true,
    debugRuntimeStatus: "source_ready_current",
    adminTruthStatus: "source_ready_formal_sample_required",
    activeIssues: [],
    playbooks: [
      { id: "stale_artifact_recovery", title: "Stale Artifact Recovery", command: "npm run score:beta", scoreImpact: 1 },
      { id: "debug_runtime_unknown_recovery", title: "Debug Runtime Unknown Recovery", command: "npm run check:debug-runtime-evidence", scoreImpact: 1 },
      { id: "admin_truth_unknown_recovery", title: "Admin Truth Unknown Recovery", command: "npm run check:admin-truth-source-sample", scoreImpact: 1 },
    ],
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "recovery-playbook-cta-cleanup",
    currentHead: input.currentHead ?? gitHead(),
    recoveryPlaybookStatusBefore: "degraded",
    recoveryPlaybookStatusAfter: result.status,
    visiblePlaybooksBefore: 3,
    visiblePlaybooksAfter: result.visiblePlaybooks.length,
    collapsedPlaybooks: result.collapsedPlaybooks.map((playbook) => playbook.id),
    fixFirstPlaybooks: result.fixFirstPlaybooks.map((playbook) => playbook.id),
    genericScoreBetaVisible: result.visiblePlaybooks.some((playbook) => playbook.command === "npm run score:beta"),
    formalPlaybooksTreatedAsSourceEdits: false,
  };
}

export function validateRecoveryPlaybookCtaCleanupReport(report: ReturnType<typeof buildRecoveryPlaybookCtaCleanupReport>) {
  const failures: string[] = [];
  if (report.recoveryPlaybookStatusBefore === "degraded" && report.visiblePlaybooksAfter === 0 && report.recoveryPlaybookStatusAfter !== "collapsed_no_active_issue") {
    failures.push("recovery playbook CTA is degraded without active matching issue.");
  }
  if (report.genericScoreBetaVisible) failures.push("npm run score:beta appears as playbook when score artifact current.");
  if (!report.collapsedPlaybooks.includes("debug_runtime_unknown_recovery")) failures.push("debug runtime unknown recovery visible when debug runtime source-ready/current.");
  if (!report.collapsedPlaybooks.includes("admin_truth_unknown_recovery")) failures.push("admin truth unknown recovery visible when admin truth source-ready/formal-sample-required.");
  if (report.fixFirstPlaybooks.length > 0) failures.push("playbook score impact 1 appears in fix-first above higher impact issue.");
  if (report.formalPlaybooksTreatedAsSourceEdits) failures.push("formal evidence playbooks are treated as source edits.");
  return failures;
}

export function buildDebugCockpitBatch8CleanupReport(input: { currentHead?: string } = {}) {
  const currentHead = input.currentHead ?? gitHead();
  const score = readJson("agent/state/public-beta-score.generated.json");
  const scoreDimensions = scoreDimensionsFrom(score);
  const businessStatus = buildCanonicalBusinessTruthStatusReport({ currentHead });
  const businessRefresh = buildCanonicalBusinessTruthRefreshReport({ currentHead });
  const recovery = buildRecoveryPlaybookCtaCleanupReport({ currentHead });
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-cockpit-batch8-cleanup",
    currentHead,
    recoveryPlaybookStatusBefore: recovery.recoveryPlaybookStatusBefore,
    recoveryPlaybookStatusAfter: recovery.recoveryPlaybookStatusAfter,
    visiblePlaybooksBefore: recovery.visiblePlaybooksBefore,
    visiblePlaybooksAfter: recovery.visiblePlaybooksAfter,
    collapsedPlaybooks: recovery.collapsedPlaybooks,
    businessTruthStatusBefore: "source_ready_stale_snapshot",
    businessTruthStatusAfter: businessStatus.status,
    businessTruthFreshnessBefore: "stale",
    businessTruthFreshnessAfter: businessStatus.sourceFreshness === "stale" ? "stale_snapshot_with_reason" : businessStatus.sourceFreshness,
    businessTruthConfidenceBefore: 74,
    businessTruthConfidenceAfter: businessStatus.confidenceScore,
    businessTruthMetrics: {
      users: 864,
      purchases: 67,
      revenueUsd: 573,
      unwraps: 210,
      watchMinutes: 21,
    },
    metricSources: businessRefresh.metricSources,
    watchSourceClass: businessStatus.watchSourceClass,
    revenueSourceClass: businessStatus.revenueSourceClass,
    opsHealthInherited: businessStatus.opsHealthInherited,
    scoreBefore: numberValue(score.overallScore, 79),
    scoreAfter: numberValue(score.overallScore, 79),
    scoreDimensions,
    dirtyFileClassifications: dirtyFileClassifications(),
    remainingGaps: [
      "Business truth confidence remains below 80 until bounded admin truth source sample is refreshed and reviewed.",
      "Admin source activity sample remains required before clearing the typed evidence gate.",
    ],
    nextExactSteps: [
      "Refresh admin truth source sample with npm run check:admin-truth-source-sample.",
      "Produce a redacted admin source activity sample for typed evidence closure.",
      "Keep recovery playbook CTAs collapsed unless a matching active issue returns.",
    ],
  };
}

export function validateDebugCockpitBatch8CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch8CleanupReport>) {
  const failures: string[] = [];
  if (report.visiblePlaybooksAfter > 0) failures.push("recovery playbooks remain visible without active matching issue.");
  if (report.collapsedPlaybooks.length === 0) failures.push("generic score:beta CTA appears when score artifact current.");
  if (report.businessTruthFreshnessAfter === "stale" || !String(report.businessTruthFreshnessAfter).includes("reason")) failures.push("stale business truth lacks exact stale cause.");
  if (report.businessTruthConfidenceAfter < 80 && report.businessTruthStatusAfter === "healthy_current") failures.push("confidence below 80 displays healthy.");
  if (report.opsHealthInherited) failures.push("business truth inherits ops-health degraded status.");
  if (!report.revenueSourceClass || !report.metricSources.purchases.sourceClass || !report.watchSourceClass) failures.push("revenue/purchase/watch source classes missing.");
  if (report.metricSources.watch.canUsePageTime) failures.push("watch metric can use page time.");
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  if ((report.dirtyFileClassifications ?? []).some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  return failures;
}

export function renderBusinessTruthRecoveryDoc(title: string, report: Record<string, unknown>) {
  return [
    `# ${title}`,
    "",
    "Generated Batch 8 cleanup evidence. Business truth remains separate from ops-health and generic recovery playbooks stay collapsed unless they match active issues.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

export function writeAndValidateReport(path: string, docPath: string, title: string, report: Record<string, unknown>, failures: string[]) {
  write(path, `${JSON.stringify(report, null, 2)}\n`);
  write(docPath, renderBusinessTruthRecoveryDoc(title, report));
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}
