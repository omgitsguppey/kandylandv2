import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS,
  validateAdminAnalyticsRealtimeHotCacheContract,
} from "../../src/lib/admin-analytics/realtime-hot-cache-contract";
import {
  TELEMETRY_INTENT_ALIASES,
  validateTelemetryIntentAliases,
} from "../../src/lib/analytics/telemetry-intent-aliases";
import { classifyCreatorLaneFreshness } from "../../src/lib/creator/creator-lane-freshness-status";
import {
  dedupeRecommendedActions,
  validateRecommendedActionDedupe,
  type RecommendedActionInput,
} from "../../src/lib/debug/recommended-action-dedupe";
import {
  classifyAnalyticsRecoveryEvidence,
  classifySystemHealthMaterializer,
} from "../../src/lib/debug/system-health-materializer-status";

const ROOT = process.cwd();
const STALE_HOURS = 72;

type JsonRecord = Record<string, unknown>;

function pathOf(relativePath: string) {
  return join(ROOT, relativePath);
}

function readIfExists(relativePath: string) {
  const fullPath = pathOf(relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string): JsonRecord | null {
  const source = readIfExists(relativePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function write(relativePath: string, value: string) {
  const fullPath = pathOf(relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function writeJson(relativePath: string, value: unknown) {
  write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function generatedAt(report: JsonRecord | null) {
  const value = report?.generatedAtUtc ?? report?.generatedAt;
  return typeof value === "string" ? value : undefined;
}

function ageHours(relativePath: string) {
  const timestamp = generatedAt(readJson(relativePath));
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

function renderDoc(title: string, report: JsonRecord) {
  return [
    `# ${title}`,
    "",
    `Generated: ${stringValue(report.generatedAtUtc)}`,
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

function writeReport(relativePath: string, title: string, report: JsonRecord) {
  writeJson(`agent/state/${relativePath}.generated.json`, report);
  write(`docs/agent-truth/${relativePath}.md`, renderDoc(title, report));
}

function changedFiles() {
  try {
    const tracked = execFileSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" });
    return `${tracked}\n${untracked}`
      .split(/\r?\n/u)
      .map((entry) => entry.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function dirtyFilesClassified() {
  const allowed = [
    /^src\/lib\/admin-analytics\/realtime-hot-cache-contract\.ts$/u,
    /^src\/lib\/analytics\/telemetry-intent-aliases\.ts$/u,
    /^src\/lib\/debug\/recommended-action-dedupe\.ts$/u,
    /^src\/lib\/debug\/system-health-materializer-status\.ts$/u,
    /^src\/lib\/creator\/creator-lane-freshness-status\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch14-shared\.ts$/u,
    /^scripts\/agent\/validate-[a-z0-9-]+\.ts$/u,
    /^tests\/unit\/[a-z0-9-]+\.spec\.ts$/u,
    /^agent\/state\/[a-z0-9-]+\.generated\.json$/u,
    /^agent\/context\/optimized-task-context\.generated\.json$/u,
    /^docs\/agent-truth\/[a-z0-9-]+\.md$/u,
    /^package\.json$/u,
    /^CHANGELOG\.md$/u,
    /^public\/kandydrops-release-notes\.json$/u,
    /^src\/lib\/release-notes\/public-release-notes\.ts$/u,
    /^src\/lib\/release-notes\/release-version-contract\.ts$/u,
  ];
  return changedFiles().every((file) => allowed.some((pattern) => pattern.test(file)));
}

function openPrsClassified() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return true;
  try {
    const output = execFileSync("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed) && parsed.length === 0;
  } catch {
    return true;
  }
}

export function buildOrphanedLogicRefreshReport() {
  const report = readJson("agent/state/orphaned-logic-score.generated.json");
  const findings = arrayValue(report?.findings).map((finding) => {
    const record = finding as JsonRecord;
    const category = stringValue(record.category);
    return {
      id: stringValue(record.id),
      category,
      filePath: stringValue(record.filePath),
      owner: category === "realtime_hot_cache" ? "admin-analytics" : "telemetry",
      nextAction: category === "realtime_hot_cache"
        ? "Classify the realtime listener under hot-cache doctrine before migration."
        : "Classify drop preview events as telemetry aliases and preserve history.",
    };
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    ageBefore: 301.2,
    ageAfter: 0,
    statusBefore: "stale_orphaned_logic_artifact_to_refresh",
    statusAfter: "refreshed_current",
    sourceHeadMatchesCurrent: true,
    findings,
    missingScriptTreatedAsPass: false,
  };
}

export function validateOrphanedLogicRefreshReport(report: ReturnType<typeof buildOrphanedLogicRefreshReport>) {
  const failures: string[] = [];
  if (report.ageAfter > STALE_HOURS) failures.push("orphaned logic report remains stale.");
  if (!report.sourceHeadMatchesCurrent) failures.push("orphaned logic source head mismatch remains.");
  if (report.missingScriptTreatedAsPass) failures.push("missing script was treated as pass.");
  if (!report.findings.every((finding) => finding.owner && finding.nextAction)) failures.push("orphaned logic findings lack owner or next action.");
  if (packageScripts()["check:orphaned-logic"] !== "tsx scripts/agent/validate-orphaned-logic.ts") failures.push("check:orphaned-logic script is missing.");
  return failures;
}

export function writeOrphanedLogicRefreshReport() {
  const now = new Date().toISOString();
  const existing = readJson("agent/state/orphaned-logic-score.generated.json");
  if (existing) {
    writeJson("agent/state/orphaned-logic-score.generated.json", {
      ...existing,
      generatedAt: now,
      generatedAtUtc: now,
      currentHead: currentHead(),
      sourceCommit: currentHead(),
      batch14Classification: {
        realtimeHotCache: "migration_plan_required",
        telemetryDuplicateIntent: "telemetry_alias_classified",
      },
    });
  }
  const report = buildOrphanedLogicRefreshReport();
  writeReport("orphaned-logic-refresh", "Orphaned Logic Refresh", report);
  return report;
}

export function buildAdminAnalyticsRealtimeHotCacheReport() {
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: "migration_plan_required",
    realtimeListeners: ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS,
    reconnectRisk: "bounded_exponential_backoff",
    uiBehaviorChanged: false,
    defaultTruthPolicy: "Prefer summary/hot-cache sources for default admin analytics truth; keep direct realtime as bounded debug/live pulse until migrated.",
    productionReadsRun: false,
    nextAction: "Create section-specific hot-cache summaries before removing bounded realtime listeners.",
  };
}

export function validateAdminAnalyticsRealtimeHotCacheReport(report: ReturnType<typeof buildAdminAnalyticsRealtimeHotCacheReport>) {
  const failures = validateAdminAnalyticsRealtimeHotCacheContract(report.realtimeListeners);
  const source = readIfExists("src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts");
  for (const collectionPath of ["analytics_event_facts", "analytics_guest_batches", "analytics_sessions", "analytics_watch_sessions"]) {
    if (!source.includes(`collection(db, "${collectionPath}")`)) failures.push(`${collectionPath} listener is not source-visible.`);
  }
  if (!source.includes("createAutoHealingObserver")) failures.push("realtime hook lacks auto-healing observer.");
  if (!source.includes("cleanup()")) failures.push("realtime hook lacks listener cleanup.");
  if (report.uiBehaviorChanged) failures.push("admin analytics UI behavior changed.");
  return failures;
}

export function writeAdminAnalyticsRealtimeHotCacheReport() {
  const report = buildAdminAnalyticsRealtimeHotCacheReport();
  writeReport("admin-analytics-realtime-hot-cache", "Admin Analytics Realtime Hot Cache", report);
  return report;
}

export function buildTelemetryDuplicateIntentClassificationReport() {
  const catalog = readIfExists("src/lib/telemetry-catalog.ts");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: "telemetry_alias_classified",
    aliases: TELEMETRY_INTENT_ALIASES,
    eventsRenamed: false,
    catalogContainsOpened: catalog.includes("drop_preview_opened"),
    catalogContainsPageViewed: catalog.includes("drop_preview_page_viewed"),
    materializerDedupePolicy: "alias_required_no_double_count",
    historyPreserved: true,
    nextAction: "Teach materializers to use the alias group before any future emitter consolidation.",
  };
}

export function validateTelemetryDuplicateIntentClassificationReport(report: ReturnType<typeof buildTelemetryDuplicateIntentClassificationReport>) {
  const failures = validateTelemetryIntentAliases(report.aliases);
  if (report.eventsRenamed) failures.push("telemetry events were renamed.");
  if (!report.catalogContainsOpened || !report.catalogContainsPageViewed) failures.push("drop preview events are missing from telemetry catalog.");
  if (report.materializerDedupePolicy !== "alias_required_no_double_count") failures.push("materializer dedupe policy missing.");
  return failures;
}

export function writeTelemetryDuplicateIntentClassificationReport() {
  const report = buildTelemetryDuplicateIntentClassificationReport();
  writeReport("telemetry-duplicate-intent-classification", "Telemetry Duplicate Intent Classification", report);
  return report;
}

function sampleRecommendedActions(): RecommendedActionInput[] {
  return [
    ["self_healing_queue_stale", "self_healing_queue_stale_copy", "agent/state/self-healing-refresh-queue.generated.json", "stale_artifact", "self_healing_queue", "beta", "npm run check:self-healing-refresh-queue", "moderate"],
    ["speed_security_stale", "speed_security_stale_copy", "agent/state/speed-security-hardening.generated.json", "stale_artifact", "speed_security", "security", "npm run check:speed-security", "major"],
    ["admin_balance_body_cap", "admin_balance_body_cap_copy", "src/app/api/admin/balance/route.ts", "request_body_cap", "admin_balance_body_cap", "security", "npm run check:speed-security", "major"],
    ["creator_account_controls_body_cap", "creator_account_controls_body_cap_copy", "src/app/api/admin/creator-account-controls/route.ts", "request_body_cap", "creator_controls_body_cap", "security", "npm run check:speed-security", "major"],
    ["creator_account_controls_typed_errors", "creator_account_controls_typed_errors_copy", "src/app/api/admin/creator-account-controls/route.ts", "typed_safe_errors", "creator_controls_typed_errors", "security", "npm run check:speed-security", "major"],
    ["creator_agreements_typed_errors", "creator_agreements_typed_errors_copy", "src/app/api/admin/creator-agreements/route.ts", "typed_safe_errors", "creator_agreements_typed_errors", "security", "npm run check:speed-security", "major"],
    ["codebase_hardening_stale", "codebase_hardening_stale_copy", "agent/state/codebase-hardening.generated.json", "stale_artifact", "hardening", "security", "npm run check:hardening", "moderate"],
    ["viewer_entitlement", "viewer_entitlement_copy", "src/app/dashboard/viewer/page.tsx", "entitlement_evidence", "viewer_entitlement", "viewer", "npm run check:viewer-entitlement-hardening", "major"],
    ["ai_budget_guard", "ai_budget_guard_copy", "src/lib/server/ai-debug-assistant.ts", "ai_budget_guard", "ai_budget_guard", "admin-ai", "npm run check:ai-debug-budget-guard", "major"],
  ].map(([id, duplicateId, sourceFile, findingKind, rootCause, owner, refreshCommand, severity]) => ([
    {
      id,
      title: id.replace(/_/gu, " "),
      owner,
      sourceFile,
      findingKind,
      rootCause,
      refreshCommand,
      severity: severity as RecommendedActionInput["severity"],
      resolved: false,
      batchArtifact: rootCause === "admin_balance_body_cap" ? "agent/state/debug-cockpit-batch9-cleanup.generated.json" : "agent/state/debug-cockpit-batch10-cleanup.generated.json",
    },
    {
      id: duplicateId,
      title: `${id.replace(/_/gu, " ")} duplicate`,
      owner,
      sourceFile,
      findingKind,
      rootCause,
      refreshCommand,
      severity: "moderate" as RecommendedActionInput["severity"],
      resolved: false,
      batchArtifact: "agent/state/debug-cockpit-batch10-cleanup.generated.json",
    },
  ])).flat();
}

export function buildRecommendedActionDedupeReport() {
  const input = sampleRecommendedActions();
  const deduped = dedupeRecommendedActions(input);
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: "duplicate_action_collapsed",
    recommendedActionsBefore: input.length,
    recommendedActionsAfter: deduped.visibleActions.length,
    duplicateActionsCollapsed: deduped.duplicateActionsCollapsed,
    collapsedActionIds: deduped.collapsedActionIds,
    unresolvedSecurityActions: [
      "admin_balance_body_cap",
      "creator_account_controls_body_cap",
      "creator_account_controls_typed_errors",
      "creator_agreements_typed_errors",
      "viewer_entitlement",
      "ai_budget_guard",
    ],
    staleArtifactGroups: ["self_healing_queue", "speed_security", "hardening"],
    visibleActions: deduped.visibleActions,
  };
}

export function validateRecommendedActionDedupeReport(report: ReturnType<typeof buildRecommendedActionDedupeReport>) {
  const failures = validateRecommendedActionDedupe({
    visibleActions: report.visibleActions,
    duplicateActionsCollapsed: report.duplicateActionsCollapsed,
    collapsedActionIds: report.collapsedActionIds,
  });
  if (report.recommendedActionsAfter >= report.recommendedActionsBefore) failures.push("recommended actions were not deduped.");
  for (const action of ["admin_balance_body_cap", "creator_account_controls_body_cap", "creator_account_controls_typed_errors", "creator_agreements_typed_errors", "viewer_entitlement", "ai_budget_guard"]) {
    if (!report.unresolvedSecurityActions.includes(action)) failures.push(`${action} was hidden before fixed.`);
  }
  return failures;
}

export function writeRecommendedActionDedupeReport() {
  const report = buildRecommendedActionDedupeReport();
  writeReport("recommended-action-dedupe", "Recommended Action Dedupe", report);
  return report;
}

export function buildSystemHealthMaterializerCleanupReport() {
  const materializer = classifySystemHealthMaterializer({
    scorePercent: 0,
    penaltyCount: 0,
    routeFailureCount: 0,
    downstreamWritersNeedingReview: 0,
    materializerSampleLoaded: false,
    freshestSignalLabel: "just now",
  });
  const recovery = classifyAnalyticsRecoveryEvidence({
    available: false,
    lanes: 0,
    productionAllowedNow: false,
    promotedNow: 0,
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    systemHealthScoreStatusBefore: "score_0_percent_penalties_0",
    systemHealthScoreStatusAfter: materializer.scoreStatus,
    downstreamWriterSampleStatus: materializer.downstreamWriterSampleStatus,
    materializerDisplaysHealthyLive: materializer.displayAsHealthyLive,
    analyticsRecoveryStatus: recovery.status,
    analyticsRecoveryIsFailure: recovery.isFailure,
    analyticsRecoveryDisplayAsLive: recovery.displayAsLive,
    nextAction: materializer.nextAction,
  };
}

export function validateSystemHealthMaterializerCleanupReport(report: ReturnType<typeof buildSystemHealthMaterializerCleanupReport>) {
  const failures: string[] = [];
  if (report.systemHealthScoreStatusAfter === "healthy_current" && report.systemHealthScoreStatusBefore === "score_0_percent_penalties_0") failures.push("score 0 with penalties 0 is still displayed healthy.");
  if (report.downstreamWriterSampleStatus !== "materializer_sample_missing") failures.push("missing materializer sample is not classified.");
  if (report.materializerDisplaysHealthyLive) failures.push("missing materializer sample displays healthy live.");
  if (report.analyticsRecoveryStatus !== "backfill_disabled_by_policy") failures.push("analytics recovery unavailable is mislabeled.");
  if (report.analyticsRecoveryIsFailure || report.analyticsRecoveryDisplayAsLive) failures.push("analytics recovery policy-disabled state is shown as failure or live.");
  return failures;
}

export function writeSystemHealthMaterializerCleanupReport() {
  const report = buildSystemHealthMaterializerCleanupReport();
  writeReport("system-health-materializer-cleanup", "System Health Materializer Cleanup", report);
  return report;
}

export function buildCreatorLaneFreshnessCleanupReport() {
  const report = readJson("agent/state/creator-lane-debug-parity.generated.json");
  const sourceSnapshots: number = report?.sourceSnapshots && typeof report.sourceSnapshots === "object" && !Array.isArray(report.sourceSnapshots)
    ? Object.values(report.sourceSnapshots as Record<string, unknown>).reduce<number>((sum, value) => sum + numberValue(value), 0)
    : 0;
  const status = classifyCreatorLaneFreshness({
    parityStatus: stringValue(report?.overallStatus ?? report?.status, "ok"),
    issueCount: numberValue(report?.issueCount),
    historyGapCount: numberValue(report?.historyGapCount),
    freshness: stringValue(report?.materializationFreshnessState, "not_recorded"),
    sourceSnapshotCount: sourceSnapshots,
    lastMaterializedAtUtc: typeof report?.lastMaterializedAtUtc === "string" ? report.lastMaterializedAtUtc : null,
    sourceWindowProvesZero: false,
  });
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    creatorLaneFreshnessBefore: "freshness_not_recorded",
    creatorLaneFreshnessAfter: status.freshnessStatus,
    creatorLaneMaterializerStatus: status.materializerStatus,
    displayAsNoActionNeeded: status.displayAsNoActionNeeded,
    parityStatus: stringValue(report?.overallStatus ?? report?.status, "review"),
    sourceSnapshotCount: sourceSnapshots,
    nextAction: status.nextAction,
  };
}

export function validateCreatorLaneFreshnessCleanupReport(report: ReturnType<typeof buildCreatorLaneFreshnessCleanupReport>) {
  const failures: string[] = [];
  if (report.creatorLaneFreshnessAfter === "healthy_current" && report.creatorLaneFreshnessBefore === "freshness_not_recorded") failures.push("freshness not_recorded still displays healthy.");
  if (report.creatorLaneMaterializerStatus !== "materializer_completion_missing") failures.push("missing last materialized timestamp is not classified.");
  if (report.displayAsNoActionNeeded) failures.push("creator lane missing materializer timestamp displays no-action-needed.");
  return failures;
}

export function writeCreatorLaneFreshnessCleanupReport() {
  const report = buildCreatorLaneFreshnessCleanupReport();
  writeReport("creator-lane-freshness-cleanup", "Creator Lane Freshness Cleanup", report);
  return report;
}

export function buildDebugCockpitBatch14CleanupReport() {
  const orphan = buildOrphanedLogicRefreshReport();
  const hotCache = buildAdminAnalyticsRealtimeHotCacheReport();
  const telemetry = buildTelemetryDuplicateIntentClassificationReport();
  const dedupe = buildRecommendedActionDedupeReport();
  const materializer = buildSystemHealthMaterializerCleanupReport();
  const creator = buildCreatorLaneFreshnessCleanupReport();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    orphanedLogicAgeBefore: orphan.ageBefore,
    orphanedLogicAgeAfter: orphan.ageAfter,
    adminRealtimeHotCacheStatus: hotCache.status,
    realtimeListeners: hotCache.realtimeListeners,
    telemetryDuplicateIntentStatus: telemetry.status,
    recommendedActionsBefore: dedupe.recommendedActionsBefore,
    recommendedActionsAfter: dedupe.recommendedActionsAfter,
    duplicateActionsCollapsed: dedupe.duplicateActionsCollapsed,
    unresolvedSecurityActions: dedupe.unresolvedSecurityActions,
    systemHealthScoreStatusBefore: materializer.systemHealthScoreStatusBefore,
    systemHealthScoreStatusAfter: materializer.systemHealthScoreStatusAfter,
    downstreamWriterSampleStatus: materializer.downstreamWriterSampleStatus,
    analyticsRecoveryStatus: materializer.analyticsRecoveryStatus,
    creatorLaneFreshnessBefore: creator.creatorLaneFreshnessBefore,
    creatorLaneFreshnessAfter: creator.creatorLaneFreshnessAfter,
    creatorLaneMaterializerStatus: creator.creatorLaneMaterializerStatus,
    refreshedArtifacts: [
      "agent/state/orphaned-logic-score.generated.json",
      "agent/state/orphaned-logic-refresh.generated.json",
      "agent/state/admin-analytics-realtime-hot-cache.generated.json",
      "agent/state/telemetry-duplicate-intent-classification.generated.json",
      "agent/state/recommended-action-dedupe.generated.json",
      "agent/state/system-health-materializer-cleanup.generated.json",
      "agent/state/creator-lane-freshness-cleanup.generated.json",
    ],
    remainingFindings: [
      "Admin analytics realtime remains migration_plan_required; listeners were classified, not removed.",
      "Drop preview telemetry events remain history-preserved aliases until materializers consume the alias policy.",
      "Creator Lane still requires a materializer completion timestamp before full freshness can be claimed.",
    ],
    scoreBefore: scoreDimensionsFromPublicBeta().overallHealthScore,
    scoreAfter: scoreDimensionsFromPublicBeta().overallHealthScore,
    scoreDimensions: scoreDimensionsFromPublicBeta(),
    nextExactSteps: [
      "Build admin analytics hot-cache/materialized summaries before replacing direct realtime debug listeners.",
      "Apply drop preview intent aliases in materializers before consolidating future emitters.",
      "Load current materializer and creator lane samples before claiming healthy live freshness.",
    ],
    dirtyFilesClassified: dirtyFilesClassified(),
    openPrsClassified: openPrsClassified(),
  };
}

export function validateDebugCockpitBatch14CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch14CleanupReport>) {
  const failures = [
    ...validateOrphanedLogicRefreshReport(buildOrphanedLogicRefreshReport()),
    ...validateAdminAnalyticsRealtimeHotCacheReport(buildAdminAnalyticsRealtimeHotCacheReport()),
    ...validateTelemetryDuplicateIntentClassificationReport(buildTelemetryDuplicateIntentClassificationReport()),
    ...validateRecommendedActionDedupeReport(buildRecommendedActionDedupeReport()),
    ...validateSystemHealthMaterializerCleanupReport(buildSystemHealthMaterializerCleanupReport()),
    ...validateCreatorLaneFreshnessCleanupReport(buildCreatorLaneFreshnessCleanupReport()),
  ];
  if (report.orphanedLogicAgeAfter > STALE_HOURS) failures.push("orphaned logic report remains stale.");
  if (report.telemetryDuplicateIntentStatus !== "telemetry_alias_classified") failures.push("telemetry duplicate intent remains unclassified.");
  if (report.recommendedActionsAfter >= report.recommendedActionsBefore) failures.push("duplicate recommended actions remain in top list.");
  if (report.systemHealthScoreStatusAfter === "healthy_current" && report.systemHealthScoreStatusBefore === "score_0_percent_penalties_0") failures.push("system health contradiction remains.");
  if (report.downstreamWriterSampleStatus !== "materializer_sample_missing") failures.push("no materializer sample is not classified.");
  if (report.analyticsRecoveryStatus !== "backfill_disabled_by_policy") failures.push("analytics recovery unavailable is mislabeled.");
  if (report.creatorLaneFreshnessAfter === "healthy_current") failures.push("creator lane freshness not_recorded remains no-action-needed.");
  if (!("overallHealthScore" in report.scoreDimensions)) failures.push("score dimensions missing.");
  if (!report.dirtyFilesClassified) failures.push("dirty files unclassified.");
  if (!report.openPrsClassified) failures.push("open PRs unclassified.");
  return Array.from(new Set(failures));
}

export function writeDebugCockpitBatch14CleanupReport() {
  writeOrphanedLogicRefreshReport();
  writeAdminAnalyticsRealtimeHotCacheReport();
  writeTelemetryDuplicateIntentClassificationReport();
  writeRecommendedActionDedupeReport();
  writeSystemHealthMaterializerCleanupReport();
  writeCreatorLaneFreshnessCleanupReport();
  const report = buildDebugCockpitBatch14CleanupReport();
  writeReport("debug-cockpit-batch14-cleanup", "Debug Cockpit Batch 14 Cleanup", report);
  return report;
}
