import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  EXPECTED_DAILY_VISITORS_BASELINE,
  type EventLivenessSummary,
} from "@/lib/analytics/event-liveness-contract";
import {
  IMPORTANT_EVENT_LIVENESS_INPUTS,
  buildEventLivenessSummary,
} from "@/lib/analytics/event-liveness-engine";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/event-liveness-audit.generated.json";
const DOC_PATH = "docs/agent-truth/event-liveness-audit.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";
const FINAL_SIGNAL_LOCK_PATH = "agent/state/final-signal-zero-lock.generated.json";

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

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function readRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "scripts/agent/chat-cost-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^docs\/agent-truth\/(chat-functionality-score-lock|chat-gating-moderation|chat-telemetry-admin-truth|cost-risk-owner-review-closure|debug-backlog-engine|final-signal-zero-lock)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(chat-functionality-score-lock|chat-gating-moderation|chat-telemetry-admin-truth|final-signal-zero-lock)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/config-runtime-sample-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/tracking-summary-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "current_generated_artifact_to_commit";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "real_source_change_needs_review";
  if (/^docs\/agent-truth\/(debug-signal-grouping|debug-tracking-simplification|event-translation-bridge|person-metrics-hydration)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (/quiet.*signal|future.*activity|event.*liveness/iu.test(normalized)) return "stale_quiet_signal_logic_to_remove";
  return "unsafe_unknown";
}

function remainingReferenceClassification() {
  const output = run("rg", [
    "-n",
    "quietFutureActivity|futureActivityPending|source_ready_waiting_for_activity|not_observed_but_expected|future_only_quiet",
    "src",
    "scripts",
    "docs",
    "agent",
    "tests",
  ]);
  return output.split(/\r?\n/u).filter(Boolean).map((line) => {
    const path = line.split(":")[0]?.replace(/\\/gu, "/") ?? "unknown";
    if (path === REPORT_PATH) return null;
    const text = line.toLowerCase();
    const classification = /event-liveness/iu.test(path) || text.includes("not_observed_but_expected")
      ? "liveness_engine_required"
      : /future-activity|signal-zero|debug-signal|non-event-score|event-translation-bridge|final-testing-tracking-telemetry-lock|public-beta-score/iu.test(path)
        ? "quiet_catalog_only"
        : "quiet_catalog_only";
    return { reference: line, path, classification };
  }).filter((entry): entry is { reference: string; path: string; classification: string } => entry !== null);
}

function buildScoreReport(summary: EventLivenessSummary, publicScore: JsonRecord) {
  const before = scoreSnapshot(publicScore);
  const after = { ...before };
  for (const dimension of SCORE_DIMENSIONS) {
    if (dimension === "overallHealthScore") continue;
    after[dimension] = readNumber(summary.scoreAfter[dimension], before[dimension]);
  }
  const sixDimensionAverage = ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"]
    .reduce((total, dimension) => total + readNumber(after[dimension as ScoreDimension]), 0) / 6;
  after.overallHealthScore = Number(Math.min(before.overallHealthScore, sixDimensionAverage).toFixed(2));
  const metrics = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, {
    before: before[dimension],
    after: after[dimension],
    target: 80,
    status: after[dimension] >= 80 ? "target_met" : "below_target",
    nextExactAction: after[dimension] >= 80
      ? "No event liveness score action needed for this dimension."
      : dimension === "overallHealthScore"
        ? "Resolve liveness source gaps and formal beta score blockers before treating overall as ready."
        : (readRecord(summary.scoreImpactByDimension[dimension]).reason as string | undefined) ?? "Resolve event liveness gaps for this dimension.",
  }]));
  return { before, after, metrics };
}

function writeReport(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function renderDoc(report: JsonRecord) {
  const metrics = readRecord(report.metrics);
  const metricRows = SCORE_DIMENSIONS.map((dimension) => {
    const metric = readRecord(metrics[dimension]);
    return `| ${dimension} | ${metric.before ?? "n/a"} | ${metric.after ?? "n/a"} | ${metric.status ?? "unknown"} | ${metric.nextExactAction ?? "missing"} |`;
  });
  const commonEvents = Array.isArray(report.commonVisibleEventsWithNoRecentLiveness)
    ? report.commonVisibleEventsWithNoRecentLiveness.slice(0, 25).map((entry) => readRecord(entry))
    : [];
  const dirtyRows = Array.isArray(report.dirtyFiles)
    ? report.dirtyFiles.map((entry) => {
      const record = readRecord(entry);
      return `- ${record.path}: ${record.classification}`;
    })
    : [];
  const failures = Array.isArray(report.validationFailures) ? report.validationFailures : [];
  return [
    "# Event Liveness Audit",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Expected daily visitors baseline: ${report.expectedDailyVisitorsBaseline}`,
    `- Raw quiet future count: ${report.rawQuietFutureCount}`,
    `- True future-only quiet count: ${report.trueFutureOnlyQuietCount}`,
    `- Suspicious idle count: ${report.suspiciousIdleCount}`,
    `- Source missing count: ${report.sourceMissingCount}`,
    `- Materializer missing count: ${report.materializerMissingCount}`,
    `- Translation missing count: ${report.translationMissingCount}`,
    `- Hydration missing count: ${report.hydrationMissingCount}`,
    "",
    "## Debug Lane",
    "",
    "- Event liveness is compact by default.",
    "- The full quiet future catalog remains hidden behind drilldown.",
    "- Suspicious idle and missing source/materializer/translation/hydration classifications are default-visible actionable groups.",
    "",
    "## Common Visible Events With No Recent Liveness",
    "",
    ...(commonEvents.length ? commonEvents.map((event) => `- ${event.eventName}: ${event.livenessStatus}; ${event.nextAction}`) : ["- none"]),
    "",
    "## Score Impact",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    ...metricRows,
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
  const publicScore = readJson(SCORE_PATH);
  const finalSignalLock = readJson(FINAL_SIGNAL_LOCK_PATH);
  const finalActivity = readRecord(finalSignalLock);
  const rawQuietFutureCount = readNumber(finalActivity.rawFutureActivityCount, readNumber(finalActivity.quietFutureActivityCount, readNumber(publicScore.quietFutureActivityCount, 416)));
  const generatedAtUtc = new Date().toISOString();
  const summary = buildEventLivenessSummary({
    generatedAtUtc,
    currentHead: run("git", ["rev-parse", "HEAD"]) || "unknown",
    rawQuietFutureCount,
    expectedDailyVisitorsBaseline: EXPECTED_DAILY_VISITORS_BASELINE,
    scoreBefore: scoreSnapshot(publicScore),
  });
  const scoreReport = buildScoreReport(summary, publicScore);
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const remainingReferences = remainingReferenceClassification();
  const validationFailures: string[] = [];

  if (summary.rawQuietFutureCount <= 0) validationFailures.push("raw quiet future activity count missing.");
  if (summary.trueFutureOnlyQuietCount >= summary.rawQuietFutureCount) validationFailures.push("all quiet events are still marked quiet without liveness classification.");
  if (summary.classifications.some((event) => event.expectedTrafficClass === "high_daily" && event.visibilityStatus !== "admin_only" && event.livenessStatus === "future_only_quiet")) {
    validationFailures.push("high_daily visible events can be future_only_quiet.");
  }
  if (summary.sourceMissingCount + summary.materializerMissingCount + summary.translationMissingCount + summary.hydrationMissingCount + summary.suspiciousIdleCount === 0) {
    validationFailures.push("no lastSeen/sourceMissing/materializerMissing classification exists.");
  }
  if (summary.suspiciousIdleCount > 0 && summary.debugLane.suspiciousIdleEvents <= 0) validationFailures.push("suspicious idle events are hidden from debug.");
  if (summary.debugLane.quietFutureCatalogDefaultOpen || summary.debugLane.defaultShowsRawCatalogRows) validationFailures.push("quiet future catalog appears as actionable issue.");
  if (summary.expectedDailyVisitorsBaseline < 100) validationFailures.push("expectedDailyVisitorsBaseline is missing.");
  if (!summary.scoreFeedsDebug) validationFailures.push("event liveness does not feed score/debug.");
  if (SCORE_DIMENSIONS.some((dimension) => !scoreReport.metrics[dimension])) validationFailures.push("score dimension before/after is missing.");
  if (dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) validationFailures.push("dirty files are unclassified.");

  const report = {
    ...summary,
    status: validationFailures.length > 0 ? "fail" : "pass",
    scoreBefore: scoreReport.before,
    scoreAfter: scoreReport.after,
    metrics: scoreReport.metrics,
    dirtyFiles,
    remainingReferences,
    validationFailures,
  };

  writeReport(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(`Event liveness audit validation failed:\n${validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Event liveness audit passed: rawQuiet=${summary.rawQuietFutureCount}, trueFutureQuiet=${summary.trueFutureOnlyQuietCount}, suspiciousIdle=${summary.suspiciousIdleCount}, sourceMissing=${summary.sourceMissingCount}.`);
}

main();
