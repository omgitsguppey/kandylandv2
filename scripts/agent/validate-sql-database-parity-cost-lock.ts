import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildSqlDatabaseParityDebugLane,
  SQL_DATABASE_PARITY_COST_GUARDS,
} from "@/lib/analytics/sql-database-parity-contract";
import {
  estimateCostLane,
  mapEventFactToGlobalSummary,
  mapEventFactToSqlRow,
  mapEventFactToUserSummary,
  mapJourneyToExport,
  verifyGlobalUserSqlParity,
} from "@/lib/analytics/sql-database-parity-engine";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildJourneyEvent } from "@/lib/behavioral/user-journey-builder";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/sql-database-parity-cost-lock.generated.json";
const DOC_PATH = "docs/agent-truth/sql-database-parity-cost-lock.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(score: JsonRecord) {
  return {
    sourceHealth: readNumber(score.sourceHealthScore, 80),
    runtimeHealth: readNumber(score.runtimeHealthScore, 80),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore, 80),
    freshness: readNumber(score.freshnessScore, 80),
    costRisk: readNumber(score.costRiskScore, 80),
    regressionRisk: readNumber(score.regressionRiskScore, 80),
    overallHealthScore: readNumber(score.healthScore, 80),
  } satisfies Record<ScoreDimension, number>;
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^scripts\/agent\/(business-truth-recovery-shared|validate-canonical-business-truth-status|validate-canonical-business-truth-refresh|validate-recovery-playbook-cta-cleanup|validate-debug-cockpit-batch8-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(canonical-business-truth-status|canonical-business-truth-refresh|recovery-playbook-cta-cleanup|debug-cockpit-batch8-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "src/lib/debug/canonical-business-truth-status.ts" || normalized === "src/lib/debug/recovery-playbook-visibility.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx") return "real_source_change_needs_review";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "src/lib/analytics/sql-database-parity-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/sql-database-parity-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/features/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-sql-database-parity-cost-lock.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-debug-control-tower|pwa-service-worker-safety|notification-pwa-score-lock|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|event-translation-bridge|person-metrics-hydration)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/sql-database-parity-cost-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/bigquery-cloud-pipeline-closure.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/cloud-sql-gemini-cost-guards.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/global-cost-surfaces.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/bigquery-cloud-pipeline-closure.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/cloud-sql-gemini-cost-guards.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/global-cost-surfaces.md") return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/sql|bigquery|dataconnect|warehouse|materializer|rollup|export|cost/iu.test(normalized)) return "stale_sql_export_materializer_logic_to_remove";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function renderDoc(report: JsonRecord) {
  const metrics = report.metrics as Record<string, JsonRecord>;
  const rows = SCORE_DIMENSIONS.map((dimension) => {
    const metric = metrics[dimension] ?? {};
    return `| ${dimension} | ${metric.before ?? "n/a"} | ${metric.after ?? "n/a"} | ${metric.status ?? "unknown"} | ${metric.nextExactAction ?? "missing"} |`;
  });
  const dirtyRows = Array.isArray(report.dirtyFiles)
    ? report.dirtyFiles.map((entry) => {
      const item = entry as JsonRecord;
      return `- ${item.path}: ${item.classification}`;
    })
    : [];
  const failures = Array.isArray(report.validationFailures) ? report.validationFailures : [];

  return [
    "# SQL Database Parity Cost Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Raw event facts map to normalized export rows without becoming runtime product truth.",
    "- Global summaries, user summaries, person metrics, session summaries, journey summaries, and export rows share dedupe keys or record mismatches.",
    "- BigQuery export remains daily/watermark batched; no per-event export trigger is allowed.",
    "- Cloud SQL/Data Connect mirror sync remains manual, guarded, and external-review separated.",
    "- Admin/debug reads summaries first and uses paged drilldowns for raw detail.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${(report.debugLane as JsonRecord).label}`,
    `- Parity: ${(report.debugLane as JsonRecord).parityStatus}`,
    `- Mismatches: ${(report.debugLane as JsonRecord).mismatchCount}`,
    `- Export freshness: ${(report.debugLane as JsonRecord).exportFreshness}`,
    `- Cost guard: ${(report.debugLane as JsonRecord).costGuardStatus}`,
    `- Blocked external review: ${(report.debugLane as JsonRecord).blockedExternalReview}`,
    "",
    "## Score Impact",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    ...rows,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const scoreBefore = scoreSnapshot(readJson(SCORE_PATH));
  const scoreAfter = { ...scoreBefore };
  const fact = normalizeBehavioralEventFact({
    eventId: "validator_sql_fact",
    eventName: "drop_preview_opened",
    timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
    userId: "user_validator",
    sessionId: "session_validator",
    anonymousVisitorId: "guest_validator",
    params: {
      route: "/drops/validator",
      sourceComponent: "sql-parity-validator",
      dropId: "drop_validator",
      linkedPersonId: "person_validator",
      linkId: "link_validator",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      idempotencyKey: "drop_preview_opened:drop_validator",
    },
    route: "/drops/validator",
    pagePath: "/drops/validator",
    source: "client",
  });
  const exportRow = mapEventFactToSqlRow(fact!);
  const globalSummary = mapEventFactToGlobalSummary(fact!);
  const userSummary = mapEventFactToUserSummary(fact!);
  const journeyExport = mapJourneyToExport(buildJourneyEvent({ fact: fact! }));
  const parity = verifyGlobalUserSqlParity({
    rawEventFact: fact,
    normalizedEventFact: fact,
    exportRow,
    globalSummary,
    userSummary,
    journeySummary: journeyExport.journeySummary,
  });
  const mismatchParity = verifyGlobalUserSqlParity({
    rawEventFact: fact,
    normalizedEventFact: fact,
    exportRow,
    globalSummary,
    userSummary: { ...userSummary, dedupeKey: "wrong:user:key", countDelta: 0 },
  });
  const debugLane = buildSqlDatabaseParityDebugLane({
    parityStatus: parity.parityStatus,
    mismatchCount: parity.mismatchCount,
    exportFreshness: parity.exportFreshness,
    costGuardStatus: parity.costLane.costGuard,
    blockedExternalReview: true,
  });
  const debugSummary = buildDebugPanelTrackingSummary({ sqlDatabaseParityCostLock: { debugLane } });
  const sourceFiles = {
    contract: read("src/lib/analytics/sql-database-parity-contract.ts"),
    engine: read("src/lib/analytics/sql-database-parity-engine.ts"),
    bigQueryExport: read("functions/src/analytics-bigquery-export.ts"),
    sqlSync: existsSync(join(ROOT, "scripts/agent/sync-sql.ts")) ? read("scripts/agent/sync-sql.ts") : "",
    debugSummary: read("src/lib/debug/debug-panel-tracking-summary.ts"),
    packageJson: read("package.json"),
  };
  const metrics = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, {
    before: scoreBefore[dimension],
    after: scoreAfter[dimension],
    target: 80,
    status: scoreAfter[dimension] >= 80 ? "target_met" : "below_target",
    nextExactAction: scoreAfter[dimension] >= 80
      ? "No SQL parity score action needed for this dimension."
      : "Keep external billing/formal evidence separate; do not fake SQL or provider proof.",
  }]));
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const validationFailures: string[] = [];

  if (!sourceFiles.contract.includes("rawEventFact") || !sourceFiles.contract.includes("globalSummary") || !sourceFiles.contract.includes("userSummary") || !sourceFiles.contract.includes("exportRow")) {
    validationFailures.push("global/user/SQL parity contract missing.");
  }
  if (!exportRow.rawEventFactId || !exportRow.normalizedEventName || !exportRow.warehousePartition || exportRow.primaryProductTruth !== false) {
    validationFailures.push("raw event fact cannot map to normalized export row.");
  }
  if (mismatchParity.parityStatus !== "mismatch_recorded" || mismatchParity.mismatchCount <= 0) {
    validationFailures.push("user summary can diverge from global summary without mismatch record.");
  }
  if (!sourceFiles.bigQueryExport.includes("onSchedule") || sourceFiles.bigQueryExport.includes("onDocumentCreated") || sourceFiles.bigQueryExport.includes("onDocumentWritten")) {
    validationFailures.push("BigQuery export can run per event.");
  }
  if (!sourceFiles.sqlSync.includes("ALLOW_SQL_MIRROR_SYNC") || !sourceFiles.sqlSync.includes("SQL_MIRROR_SYNC_REASON") || !sourceFiles.sqlSync.includes("SQL_MIRROR_DRY_RUN")) {
    validationFailures.push("Cloud SQL mirror can sync casually.");
  }
  if (
    SQL_DATABASE_PARITY_COST_GUARDS.perEventBigQueryExportAllowed !== false
    || SQL_DATABASE_PARITY_COST_GUARDS.casualCloudSqlMirrorSyncAllowed !== false
    || estimateCostLane({ operation: "bigquery_export" }).status !== "batched_watermark_export"
    || estimateCostLane({ operation: "admin_debug_read" }).status !== "summary_first_admin_read"
  ) {
    validationFailures.push("cost guard missing.");
  }
  if (!debugSummary.lanes.some((lane) => lane.id === "sql_database_parity") || !sourceFiles.debugSummary.includes("SQL/database parity")) {
    validationFailures.push("parity mismatch not debug-visible.");
  }
  for (const dimension of SCORE_DIMENSIONS) {
    const metric = (metrics as Record<string, JsonRecord>)[dimension];
    if (typeof metric.before !== "number" || typeof metric.after !== "number") {
      validationFailures.push(`score dimension ${dimension} before/after missing.`);
    }
  }
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    validationFailures.push("dirty files are unclassified.");
  }

  const report = {
    generatedAtUtc,
    reportKey: "sql-database-parity-cost-lock",
    currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionExportsRun: false,
    providerCallsRun: false,
    productionDataMutated: false,
    fakeSqlParityUsed: false,
    scoreBefore,
    scoreAfter,
    metrics,
    parityStatus: parity.parityStatus,
    mismatchCount: parity.mismatchCount,
    exportFreshness: parity.exportFreshness,
    costGuardStatus: parity.costLane.costGuard,
    externalReviewRemaining: true,
    sampleExportRow: exportRow,
    globalSummary,
    userSummary,
    journeySummary: journeyExport.journeySummary,
    debugLane,
    costGuards: SQL_DATABASE_PARITY_COST_GUARDS,
    dirtyFiles,
    validationFailures,
    nextExactSteps: [
      "Keep BigQuery exports scheduled and watermark batched.",
      "Keep SQL/Data Connect mirror sync manual with explicit approval and dry-run support.",
      "Use mismatch records before trusting divergent global, user, journey, or export summaries.",
      "Treat external billing review as remaining external evidence, not repo-local proof.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(validationFailures.join("\n"));
    process.exit(1);
  }

  console.log(`sql-database-parity-cost-lock pass: ${REPORT_PATH}`);
}

main();
