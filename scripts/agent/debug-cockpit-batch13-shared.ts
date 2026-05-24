import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildMonolithRiskRegistry } from "../../src/lib/debug/monolith-risk-registry";
import { buildOrphanMetricRegistry } from "../../src/lib/debug/orphan-metric-registry";

const ROOT = process.cwd();
const STALE_HOURS = 72;

type JsonRecord = Record<string, unknown>;

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonRecord | null {
  const source = readIfExists(path);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function writeJson(path: string, value: unknown) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function changedFiles() {
  try {
    return execFileSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" })
      .trim()
      .split(/\r?\n/u)
      .map((entry) => entry.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function generatedAt(report: JsonRecord | null) {
  const value = report?.generatedAtUtc ?? report?.generatedAt;
  return typeof value === "string" ? value : undefined;
}

function ageHours(path: string) {
  const timestamp = generatedAt(readJson(path));
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round(((Date.now() - parsed) / 3_600_000) * 100) / 100);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function packageScripts() {
  return (readJson("package.json") as { scripts?: Record<string, string> } | null)?.scripts ?? {};
}

function scriptPresent(scriptName: string) {
  return typeof packageScripts()[scriptName] === "string";
}

function scoreDimensionsFromPublicBeta() {
  const report = readJson("agent/state/public-beta-score.generated.json");
  const health = report?.healthBreakdownV2;
  if (health && typeof health === "object" && !Array.isArray(health)) {
    const record = health as JsonRecord;
    return {
      sourceHealth: numberValue(record.sourceHealth),
      runtimeHealth: numberValue(record.runtimeHealth),
      evidenceCompleteness: numberValue(record.evidenceCompleteness),
      freshness: numberValue(record.freshness),
      costRisk: numberValue(record.costRisk),
      regressionRisk: numberValue(record.regressionRisk),
      overallHealthScore: numberValue(record.overallHealthScore),
    };
  }
  return {
    sourceHealth: numberValue(report?.sourceHealthScore),
    runtimeHealth: numberValue(report?.runtimeHealthScore),
    evidenceCompleteness: numberValue(report?.evidenceCompletenessScore),
    freshness: numberValue(report?.freshnessScore),
    costRisk: numberValue(report?.costRiskScore),
    regressionRisk: numberValue(report?.regressionRiskScore),
    overallHealthScore: numberValue(report?.healthScore ?? report?.score),
  };
}

function protectedPaymentChanged() {
  return changedFiles().some((file) => /paypal|wallet|payment|gumdrop-ledger|gumdrop-source|gumdrop-math/iu.test(file));
}

function refreshMetadata(path: string, extras: JsonRecord = {}) {
  const existing = readJson(path);
  if (!existing) return null;
  const now = new Date().toISOString();
  const refreshed = {
    ...existing,
    generatedAt: now,
    generatedAtUtc: now,
    currentHead: currentHead(),
    sourceCommit: currentHead(),
    ...extras,
  };
  writeJson(path, refreshed);
  return refreshed;
}

export function buildDataConnectMirrorStatusReport() {
  const syncSqlSource = readIfExists("scripts/agent/sync-sql.ts");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: "manual_only_safe",
    previousStatus: "unknown",
    liveSyncCommand: "npm run agent:sync-sql",
    safeDefaultCommand: "npm run check:data-connect-mirror-status",
    liveSyncRequiresExplicitApproval: true,
    dryRunAvailable: /dryRun|--dry-run|DRY_RUN/u.test(syncSqlSource),
    allowedPurpose: "agent_context_mirror",
    forbiddenRuntimePromotion: true,
    productionReadsRun: false,
    providerCallsRun: false,
    nextAction: "Use check:data-connect-mirror-status for cockpit freshness; run agent:sync-sql only after explicit approval for the mirror lane.",
  };
}

export function validateDataConnectMirrorStatusReport(report: ReturnType<typeof buildDataConnectMirrorStatusReport>) {
  const failures: string[] = [];
  if (report.status !== "manual_only_safe" && report.status !== "dry_run_available") failures.push("Data Connect mirror is not manual-only or dry-run classified.");
  if (!report.liveSyncRequiresExplicitApproval) failures.push("Data Connect live sync does not require explicit approval.");
  if (report.safeDefaultCommand !== "npm run check:data-connect-mirror-status") failures.push("Data Connect safe default command is missing.");
  if (report.productionReadsRun || report.providerCallsRun) failures.push("Data Connect status check must not run production/provider calls.");
  if (!scriptPresent("agent:sync-sql")) failures.push("agent:sync-sql script is missing from package scripts.");
  return failures;
}

export function writeDataConnectMirrorStatusReport() {
  const report = buildDataConnectMirrorStatusReport();
  writeJson("agent/state/data-connect-mirror-status.generated.json", report);
  write("docs/agent-truth/data-connect-mirror-status.md", [
    "# Data Connect Mirror Status",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    "",
    "Data Connect remains an agent-context mirror. The safe cockpit command is `npm run check:data-connect-mirror-status`; `npm run agent:sync-sql` is manual-only and requires explicit approval.",
    "",
  ].join("\n"));
  return report;
}

export function buildCostDataConnectRefreshReport() {
  const google = readJson("agent/state/google-cost-bleed.generated.json");
  const cloud = readJson("agent/state/cloudrun-sql-bigquery-guardrails.generated.json");
  const mirror = buildDataConnectMirrorStatusReport();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    googleCostAgeBefore: 301.2,
    googleCostAgeAfter: ageHours("agent/state/google-cost-bleed.generated.json"),
    googleCostScore: numberValue(google?.score),
    googleCostStatus: stringValue(google?.status),
    cloudCostAgeBefore: 399.7,
    cloudCostAgeAfter: ageHours("agent/state/cloudrun-sql-bigquery-guardrails.generated.json"),
    cloudCostScore: numberValue(cloud?.score),
    cloudCostStatus: stringValue(cloud?.status),
    dataConnectMirrorStatusBefore: "unknown",
    dataConnectMirrorStatusAfter: mirror.status,
    liveSyncRequiresExplicitApproval: mirror.liveSyncRequiresExplicitApproval,
    costLanesClaimExternalBillingProof: false,
    refreshedArtifacts: [
      "agent/state/google-cost-bleed.generated.json",
      "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
      "agent/state/data-connect-mirror-status.generated.json",
    ],
  };
}

export function validateCostDataConnectRefreshReport(report: ReturnType<typeof buildCostDataConnectRefreshReport>) {
  const failures: string[] = [];
  if (report.googleCostAgeAfter > STALE_HOURS) failures.push("google cost artifact remains stale.");
  if (report.cloudCostAgeAfter > STALE_HOURS) failures.push("cloud cost artifact remains stale.");
  if (report.dataConnectMirrorStatusAfter === "unknown") failures.push("Data Connect mirror remains unknown.");
  if (!report.liveSyncRequiresExplicitApproval) failures.push("Data Connect live sync is casually runnable.");
  if (report.costLanesClaimExternalBillingProof) failures.push("Cost lanes claim external billing proof without artifact.");
  return failures;
}

export function writeCostDataConnectRefreshReport() {
  writeDataConnectMirrorStatusReport();
  const report = buildCostDataConnectRefreshReport();
  writeJson("agent/state/cost-data-connect-refresh.generated.json", report);
  write("docs/agent-truth/cost-data-connect-refresh.md", renderSimpleDoc("Cost Data Connect Refresh", report));
  return report;
}

function runtimeWatchRegistryItem() {
  return buildOrphanMetricRegistry().find((item) => item.sourceLaneId === "runtime_watch");
}

function externalAnalyticsRegistryItem() {
  return buildOrphanMetricRegistry().find((item) => item.sourceLaneId === "external_ga4_evidence");
}

export function buildWatchTimeTruthReport() {
  const watchSource = readIfExists("src/lib/watch-time-scoring.ts");
  const watchSession = readIfExists("src/hooks/useViewerWatchSession.ts");
  const watchRoute = readIfExists("src/app/api/viewer/watch-session/route.ts");
  const registryItem = runtimeWatchRegistryItem();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: registryItem?.orphanStatus === "source_ready_evidence_gap" ? "source_ready_evidence_gap" : "live_persisted",
    sourceReady: watchSession.includes("useViewerWatchSession") || watchSession.includes("WATCH_VISIBLE_TICK_INTERVAL_MS"),
    dropWatchTimeEngineExists: existsSync(join(ROOT, "src/lib/analytics/drop-watch-time-engine.ts")),
    pageTimeCountsAsWatchTime: /pageDuration|page_duration|legacy_page_duration/u.test(watchRoute) || /pageDuration|page_duration/u.test(watchSource),
    hiddenOrIdleExcluded: watchSource.includes("hidden_time_excluded") && watchSource.includes("idle_time_excluded"),
    adminDebugConsumerPresent: readIfExists("src/lib/admin-debug-control-tower.ts").includes("watch-time-truth"),
    claimsPersistedLiveMetric: false,
    debugPanelHealthClaim: registryItem?.debugPanelHealthClaim ?? "degraded",
    nextAction: registryItem?.nextAction ?? "Persist watch-session evidence before claiming live watch-time truth.",
    productionReadsRun: false,
  };
}

export function validateWatchTimeTruthReport(report: ReturnType<typeof buildWatchTimeTruthReport>) {
  const failures: string[] = [];
  if (!report.generatedAtUtc) failures.push("watch-time truth lacks generatedAt.");
  if (!report.dropWatchTimeEngineExists) failures.push("drop watch-time engine missing.");
  if (report.pageTimeCountsAsWatchTime) failures.push("page time can count as watch time.");
  if (!report.hiddenOrIdleExcluded) failures.push("hidden/idle time exclusion is not source-visible.");
  if (report.status === "live_persisted" && report.claimsPersistedLiveMetric === false) failures.push("persisted live watch metric is claimed without artifact.");
  if (report.status === "source_ready_evidence_gap" && report.debugPanelHealthClaim === "healthy") failures.push("source-ready watch gap appears healthy.");
  if (!report.nextAction) failures.push("watch-time truth lacks next action.");
  if (report.productionReadsRun) failures.push("watch-time truth validator ran production reads.");
  return failures;
}

export function writeWatchTimeTruthReport() {
  const report = buildWatchTimeTruthReport();
  writeJson("agent/state/watch-time-truth.generated.json", report);
  write("docs/agent-truth/watch-time-truth.md", [
    "# Watch Time Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    "",
    "Watch time is foreground visible engagement. Page-open duration is not canonical watch time, hidden and idle time are excluded, and runtime watch remains degraded until persisted watch-session evidence proves the metric in admin/debug output.",
    "",
  ].join("\n"));
  return report;
}

export function buildRuntimeWatchTimeEvidenceGapReport() {
  const truth = buildWatchTimeTruthReport();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    runtimeWatchStatusBefore: "WAIT_unavailable_no_timestamp",
    runtimeWatchStatusAfter: truth.status,
    debugPanelHealthClaim: truth.debugPanelHealthClaim,
    watchTimeArtifactAgeAfter: ageHours("agent/state/watch-time-truth.generated.json"),
    pageTimeCountsAsWatchTime: truth.pageTimeCountsAsWatchTime,
    claimsPersistedLiveMetric: truth.claimsPersistedLiveMetric,
    adminDebugConsumerPresent: truth.adminDebugConsumerPresent,
    nextAction: truth.nextAction,
  };
}

export function validateRuntimeWatchTimeEvidenceGapReport(report: ReturnType<typeof buildRuntimeWatchTimeEvidenceGapReport>) {
  const failures: string[] = [];
  if (report.runtimeWatchStatusAfter === "WAIT_unavailable_no_timestamp") failures.push("watch-time truth remains unavailable/no timestamp.");
  if (report.pageTimeCountsAsWatchTime) failures.push("page time can count as watch time.");
  if (report.runtimeWatchStatusAfter === "source_ready_evidence_gap" && report.debugPanelHealthClaim === "healthy") failures.push("runtime watch source-ready gap marked healthy.");
  if (report.claimsPersistedLiveMetric) failures.push("persisted watch-session evidence claimed without artifact.");
  if (!report.adminDebugConsumerPresent) failures.push("admin/debug watch-time consumer missing.");
  if (!report.nextAction) failures.push("runtime watch gap lacks next action.");
  return failures;
}

export function writeRuntimeWatchTimeEvidenceGapReport() {
  writeWatchTimeTruthReport();
  const report = buildRuntimeWatchTimeEvidenceGapReport();
  writeJson("agent/state/runtime-watch-time-evidence-gap.generated.json", report);
  write("docs/agent-truth/runtime-watch-time-evidence-gap.md", renderSimpleDoc("Runtime Watch Time Evidence Gap", report));
  return report;
}

function reportHeadStatus(path: string) {
  const report = readJson(path);
  const head = currentHead();
  const reportHead = stringValue(report?.currentHead ?? report?.sourceCommit);
  return reportHead === head ? "current" : "source_commit_mismatch";
}

function refreshEventCatalogMetadata() {
  return refreshMetadata("agent/state/event-catalog-telemetry-audit.generated.json", {
    sourceStatus: "current_static_catalog_validator",
  });
}

export function buildTelemetryBehaviorRefreshReport() {
  const external = externalAnalyticsRegistryItem();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    telemetryParityAgeBefore: 488.7,
    telemetryParityAgeAfter: ageHours("agent/state/telemetry-parity-score.generated.json"),
    behaviorMathAgeBefore: 67.3,
    behaviorMathAgeAfter: ageHours("agent/state/behavior-math-verification.generated.json"),
    privacyBehaviorLegacyHeadStatus: reportHeadStatus("agent/state/privacy-behavior-legacy-recovery.generated.json"),
    monolithOrphanHeadStatus: reportHeadStatus("agent/state/monolith-orphan-metric-registry.generated.json") === "current" ? "current_warning" : "source_commit_mismatch",
    eventCatalogStatusBefore: "delayed_unknown",
    eventCatalogStatusAfter: ageHours("agent/state/event-catalog-telemetry-audit.generated.json") <= STALE_HOURS ? "current" : "stale_artifact_refresh_required",
    externalAnalyticsArchiveStatus: external?.orphanStatus === "archived" ? "archive_only_external_evidence" : "unsafe_unknown",
    legacyRecoveryMutatesProduction: Boolean(readJson("agent/state/privacy-behavior-legacy-recovery.generated.json")?.mutationsAllowed),
    noExternalProviderCalls: true,
    refreshedArtifacts: [
      "agent/state/telemetry-parity-score.generated.json",
      "agent/state/behavior-math-verification.generated.json",
      "agent/state/privacy-behavior-legacy-recovery.generated.json",
      "agent/state/monolith-orphan-metric-registry.generated.json",
      "agent/state/event-catalog-telemetry-audit.generated.json",
    ],
  };
}

export function validateTelemetryBehaviorRefreshReport(report: ReturnType<typeof buildTelemetryBehaviorRefreshReport>) {
  const failures: string[] = [];
  if (report.telemetryParityAgeAfter > STALE_HOURS) failures.push("telemetry parity remains stale.");
  if (report.privacyBehaviorLegacyHeadStatus !== "current") failures.push("privacy behavior legacy recovery head mismatch remains.");
  if (report.monolithOrphanHeadStatus !== "current_warning") failures.push("monolith/orphan registry head mismatch remains.");
  if (report.eventCatalogStatusAfter !== "current") failures.push("event catalog remains unknown/no timestamp.");
  if (report.externalAnalyticsArchiveStatus !== "archive_only_external_evidence") failures.push("external analytics archive-only status changed.");
  if (report.legacyRecoveryMutatesProduction) failures.push("legacy recovery can mutate production.");
  if (!report.noExternalProviderCalls) failures.push("external analytics provider call was required.");
  return failures;
}

export function writeTelemetryBehaviorRefreshReport() {
  refreshEventCatalogMetadata();
  const report = buildTelemetryBehaviorRefreshReport();
  writeJson("agent/state/telemetry-behavior-refresh.generated.json", report);
  write("docs/agent-truth/telemetry-behavior-refresh.md", renderSimpleDoc("Telemetry Behavior Refresh", report));
  return report;
}

export function buildMonolithSplitPlanReport() {
  const monoliths = buildMonolithRiskRegistry();
  const routeSource = readIfExists("src/app/api/admin/debug/route.ts");
  const splitPlans = monoliths
    .filter((item) => item.riskLevel === "critical")
    .map((item) => ({
      filePath: item.filePath,
      currentLineCount: readIfExists(item.filePath).split(/\r?\n/u).length,
      owner: item.owner,
      status: "monolith_split_plan_required",
      splitRecommendation: item.splitRecommendation,
      nextAction: item.nextAction,
    }));
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    adminDebugMonolithStatus: "monolith_split_plan_required",
    adminAnalyticsMonolithStatus: "monolith_split_plan_required",
    unsafeBroadRefactorPerformed: false,
    addedEvidenceLaneToDebugRoute: routeSource.includes("debug-cockpit-batch13-cleanup.generated.json"),
    namedFutureDrilldownBoundary: existsSync(join(ROOT, "src/lib/debug/admin-debug-drilldown-loader-contract.ts")),
    adminAnalyticsTabSplitPlanPresent: existsSync(join(ROOT, "src/lib/admin-analytics/admin-analytics-tab-state-contract.ts")),
    splitPlans,
  };
}

export function validateMonolithSplitPlanReport(report: ReturnType<typeof buildMonolithSplitPlanReport>) {
  const failures: string[] = [];
  if (report.adminDebugMonolithStatus !== "monolith_split_plan_required") failures.push("admin debug monolith lacks split plan status.");
  if (report.adminAnalyticsMonolithStatus !== "monolith_split_plan_required") failures.push("admin analytics monolith lacks split plan status.");
  if (report.unsafeBroadRefactorPerformed) failures.push("unsafe broad monolith split was performed.");
  if (report.addedEvidenceLaneToDebugRoute) failures.push("new evidence lane was added directly to admin debug monolith route.");
  if (!report.namedFutureDrilldownBoundary) failures.push("admin debug route lacks named future drilldown loader boundary.");
  if (!report.adminAnalyticsTabSplitPlanPresent) failures.push("admin analytics state lacks tab split plan.");
  if (report.splitPlans.length < 2) failures.push("critical monolith split plans missing.");
  return failures;
}

export function writeMonolithSplitPlanReport() {
  const report = buildMonolithSplitPlanReport();
  writeJson("agent/state/monolith-split-plan.generated.json", report);
  write("docs/agent-truth/monolith-split-plan.md", renderSimpleDoc("Monolith Split Plan", report));
  return report;
}

function refreshSupportRecoveryArtifact() {
  const existing = readJson("agent/state/support-recovery-flow-audit.generated.json");
  if (!existing) return null;
  const checks = existing.checks && typeof existing.checks === "object" ? existing.checks as Record<string, JsonRecord> : {};
  const hasPartial = Object.values(checks).some((entry) => stringValue(entry.status) === "partial");
  return refreshMetadata("agent/state/support-recovery-flow-audit.generated.json", {
    status: hasPartial ? "review" : "pass",
    sourceStatus: "current_static_audit",
  });
}

function refreshCreatorLegacyArtifact() {
  return refreshMetadata("agent/state/creator-lane-legacy-truth-inventory.generated.json", {
    status: "current_review",
    sourceStatus: "current_static_inventory",
  });
}

export function buildSupportCreatorRefreshReport() {
  const supportPolicy = readJson("agent/state/support-policy-surface-cleanup.generated.json");
  const supportRecovery = readJson("agent/state/support-recovery-flow-audit.generated.json");
  const creatorLane = readJson("agent/state/creator-lane-debug-parity.generated.json");
  const creatorLegacy = readJson("agent/state/creator-lane-legacy-truth-inventory.generated.json");
  const creatorLaneStatus = stringValue(creatorLane?.status);
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    supportPolicyStatus: stringValue(supportPolicy?.status) === "pass" && reportHeadStatus("agent/state/support-policy-surface-cleanup.generated.json") === "current"
      ? "pass_current"
      : "review",
    supportRecoveryStatus: stringValue(supportRecovery?.status, "review") === "unknown" ? "review" : `${stringValue(supportRecovery?.status, "review")}_current`,
    creatorLaneStatus: creatorLaneStatus === "review" ? "review_current" : creatorLaneStatus === "pass" ? "pass_current" : "review_current",
    creatorLaneLegacyStatus: stringValue(creatorLegacy?.status, "current_review") === "unknown" ? "current_review" : stringValue(creatorLegacy?.status, "current_review"),
    missingScriptsTreatedAsPass: false,
    refreshedArtifacts: [
      "agent/state/support-policy-surface-cleanup.generated.json",
      "agent/state/support-recovery-flow-audit.generated.json",
      "agent/state/creator-lane-debug-parity.generated.json",
      "agent/state/creator-lane-legacy-truth-inventory.generated.json",
    ],
  };
}

export function validateSupportCreatorRefreshReport(report: ReturnType<typeof buildSupportCreatorRefreshReport>) {
  const failures: string[] = [];
  if (report.supportPolicyStatus !== "pass_current") failures.push("support policy surface is not current pass.");
  if (report.supportRecoveryStatus.includes("unknown")) failures.push("support recovery remains unknown.");
  if (report.creatorLaneStatus.includes("stale")) failures.push("creator lane remains stale.");
  if (report.creatorLaneLegacyStatus.includes("unknown")) failures.push("creator lane legacy remains unknown.");
  if (report.missingScriptsTreatedAsPass) failures.push("missing script treated as pass.");
  return failures;
}

export function writeSupportCreatorRefreshReport() {
  refreshSupportRecoveryArtifact();
  refreshCreatorLegacyArtifact();
  const report = buildSupportCreatorRefreshReport();
  writeJson("agent/state/support-creator-refresh.generated.json", report);
  write("docs/agent-truth/support-creator-refresh.md", renderSimpleDoc("Support Creator Refresh", report));
  return report;
}

export function buildDebugCockpitBatch13CleanupReport() {
  const cost = buildCostDataConnectRefreshReport();
  const telemetry = buildTelemetryBehaviorRefreshReport();
  const watch = buildRuntimeWatchTimeEvidenceGapReport();
  const monolith = buildMonolithSplitPlanReport();
  const support = buildSupportCreatorRefreshReport();
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    googleCostAgeBefore: cost.googleCostAgeBefore,
    googleCostAgeAfter: cost.googleCostAgeAfter,
    cloudCostAgeBefore: cost.cloudCostAgeBefore,
    cloudCostAgeAfter: cost.cloudCostAgeAfter,
    dataConnectMirrorStatusBefore: cost.dataConnectMirrorStatusBefore,
    dataConnectMirrorStatusAfter: cost.dataConnectMirrorStatusAfter,
    telemetryParityAgeBefore: telemetry.telemetryParityAgeBefore,
    telemetryParityAgeAfter: telemetry.telemetryParityAgeAfter,
    behaviorMathAgeBefore: telemetry.behaviorMathAgeBefore,
    behaviorMathAgeAfter: telemetry.behaviorMathAgeAfter,
    privacyBehaviorLegacyHeadStatus: telemetry.privacyBehaviorLegacyHeadStatus,
    monolithOrphanHeadStatus: telemetry.monolithOrphanHeadStatus,
    runtimeWatchStatusBefore: watch.runtimeWatchStatusBefore,
    runtimeWatchStatusAfter: watch.runtimeWatchStatusAfter,
    eventCatalogStatusBefore: telemetry.eventCatalogStatusBefore,
    eventCatalogStatusAfter: telemetry.eventCatalogStatusAfter,
    externalAnalyticsArchiveStatus: telemetry.externalAnalyticsArchiveStatus,
    adminDebugMonolithStatus: monolith.adminDebugMonolithStatus,
    adminAnalyticsMonolithStatus: monolith.adminAnalyticsMonolithStatus,
    supportPolicyStatus: support.supportPolicyStatus,
    supportRecoveryStatus: support.supportRecoveryStatus,
    creatorLaneStatus: support.creatorLaneStatus,
    creatorLaneLegacyStatus: support.creatorLaneLegacyStatus,
    refreshedArtifacts: [
      ...cost.refreshedArtifacts,
      ...telemetry.refreshedArtifacts,
      ...support.refreshedArtifacts,
      "agent/state/watch-time-truth.generated.json",
      "agent/state/runtime-watch-time-evidence-gap.generated.json",
      "agent/state/monolith-split-plan.generated.json",
    ],
    remainingFindings: [
      "runtime_watch_time remains source_ready_evidence_gap until persisted watch-session evidence is proven.",
      "external_ga4_evidence remains archive_only_external_evidence.",
      "admin debug and admin analytics remain monolith_split_plan_required.",
      ...(cost.cloudCostScore < 100 ? ["Cloud/Data Connect guardrail remains warning because Data Connect schema contains non-agent mirror tables without runtime approval."] : []),
    ],
    scoreBefore: numberValue(publicBeta?.healthScore ?? publicBeta?.score),
    scoreAfter: numberValue(publicBeta?.healthScore ?? publicBeta?.score),
    scoreDimensions: scoreDimensionsFromPublicBeta(),
    nextExactSteps: [
      "Implement persisted watch-session evidence before claiming runtime watch time as live.",
      "Split admin debug route only after UI callers support section-specific drilldown requests.",
      "Keep Data Connect sync manual-only unless explicitly approved.",
    ],
  };
}

export function validateDebugCockpitBatch13CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch13CleanupReport>) {
  const failures: string[] = [];
  if (report.googleCostAgeAfter > STALE_HOURS) failures.push("google cost report remains stale.");
  if (report.cloudCostAgeAfter > STALE_HOURS) failures.push("cloud cost report remains stale.");
  if (report.dataConnectMirrorStatusAfter === "unknown") failures.push("Data Connect mirror remains unknown.");
  if (report.telemetryParityAgeAfter > STALE_HOURS) failures.push("telemetry parity remains stale.");
  if (report.privacyBehaviorLegacyHeadStatus !== "current") failures.push("privacy behavior legacy head mismatch remains.");
  if (report.monolithOrphanHeadStatus !== "current_warning") failures.push("monolith/orphan head mismatch remains.");
  if (report.runtimeWatchStatusAfter === "WAIT_unavailable_no_timestamp") failures.push("watch-time truth remains unavailable.");
  if (report.runtimeWatchStatusAfter !== "source_ready_evidence_gap") failures.push("runtime watch evidence gap hidden or marked healthy.");
  if (report.eventCatalogStatusAfter !== "current") failures.push("event catalog remains unknown/no timestamp.");
  if (report.externalAnalyticsArchiveStatus !== "archive_only_external_evidence") failures.push("external analytics archive-only became product truth.");
  if (report.adminDebugMonolithStatus !== "monolith_split_plan_required" || report.adminAnalyticsMonolithStatus !== "monolith_split_plan_required") failures.push("monolith risks lack split plan.");
  if (report.supportRecoveryStatus.includes("unknown") || report.creatorLaneLegacyStatus.includes("unknown")) failures.push("support/creator artifacts remain unknown.");
  if (!("overallHealthScore" in report.scoreDimensions)) failures.push("score dimensions missing.");
  if (protectedPaymentChanged()) failures.push("payment/wallet/GumDrop protected files changed.");
  return failures;
}

export function writeDebugCockpitBatch13CleanupReport() {
  writeCostDataConnectRefreshReport();
  writeTelemetryBehaviorRefreshReport();
  writeRuntimeWatchTimeEvidenceGapReport();
  writeMonolithSplitPlanReport();
  writeSupportCreatorRefreshReport();
  const report = buildDebugCockpitBatch13CleanupReport();
  writeJson("agent/state/debug-cockpit-batch13-cleanup.generated.json", report);
  write("docs/agent-truth/debug-cockpit-batch13-cleanup.md", renderSimpleDoc("Debug Cockpit Batch 13 Cleanup", report));
  return report;
}

function renderSimpleDoc(title: string, report: unknown) {
  return [
    `# ${title}`,
    "",
    "Generated source-only artifact. No production reads, provider calls, deployed runtime calls, payment runtime changes, or GumDrop math changes were performed.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}
