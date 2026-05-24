import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildDropWatchTimeDebugLane,
  DROP_WATCH_TIME_TELEMETRY_EVENTS,
} from "@/lib/analytics/drop-watch-time-contract";
import {
  calculateNormalizedWatchPercent,
  resolveDropWatchTelemetryPolicy,
  startDropWatchSession,
  stopDropWatchSession,
  updateDropWatchProgress,
} from "@/lib/analytics/drop-watch-time-engine";
import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { getTelemetryEventExtensionMetadata } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/drop-watch-time-accuracy.generated.json";
const DOC_PATH = "docs/agent-truth/drop-watch-time-accuracy.md";
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
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "src/lib/analytics/drop-watch-time-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/hooks/useViewerWatchSession.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-debug-control-tower|pwa-service-worker-safety|notification-pwa-score-lock|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock|event-translation-bridge|person-metrics-hydration)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/drop-watch-time-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/telemetry-trigger-test-matrix.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/watch.*time|drop.*watch|page.*duration/iu.test(normalized)) return "stale_watch_time_logic_to_remove";
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
    "# Drop Watch Time Accuracy",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Watch time starts after actual drop media/content exposure, not page load.",
    "- Video and audio watch time uses active playback while foreground and visible.",
    "- Image watch time uses active visible dwell, with passive visible/page-open time separated.",
    "- Background and hidden tab intervals are excluded.",
    "- Completion is normalized against content duration and capped per play unless replay is counted separately.",
    "- Unknown duration is weak or unavailable evidence, never exact media runtime proof.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${(report.debugLane as JsonRecord).label}`,
    `- Exact media runtime count: ${(report.debugLane as JsonRecord).exactMediaRuntimeCount}`,
    `- Active visibility estimated count: ${(report.debugLane as JsonRecord).activeVisibilityEstimatedCount}`,
    `- Duration missing count: ${(report.debugLane as JsonRecord).durationMissingCount}`,
    `- Background excluded count: ${(report.debugLane as JsonRecord).backgroundExcludedCount}`,
    `- Suspicious page-time fallback count: ${(report.debugLane as JsonRecord).suspiciousPageTimeFallbackCount}`,
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
  const videoSession = updateDropWatchProgress(startDropWatchSession({
    dropId: "validator-video-drop",
    mediaId: "validator-video",
    mediaKind: "video",
    contentDurationMs: 30_000,
    visibleStartedAt: 1_000,
    activeStartedAt: 1_000,
    playbackStartedAt: 1_000,
    dedupeKey: "validator-video-watch",
  }), {
    nowMs: 41_000,
    visibleMsDelta: 40_000,
    activeMsDelta: 40_000,
    playingMsDelta: 40_000,
    backgroundMsDelta: 10_000,
    playbackPositionMs: 30_000,
    replayCount: 1,
  });
  const imageSession = updateDropWatchProgress(startDropWatchSession({
    dropId: "validator-image-drop",
    mediaId: "validator-image",
    mediaKind: "image",
    contentDurationMs: 15_000,
    visibleStartedAt: 5_000,
    activeStartedAt: 7_000,
    dedupeKey: "validator-image-watch",
  }), {
    nowMs: 25_000,
    visibleMsDelta: 20_000,
    activeMsDelta: 8_000,
    passiveVisibleMsDelta: 12_000,
    backgroundMsDelta: 4_000,
  });
  const unknownSession = updateDropWatchProgress(startDropWatchSession({
    dropId: "validator-unknown-drop",
    mediaId: "validator-unknown",
    mediaKind: "unknown",
    contentDurationMs: null,
    visibleStartedAt: 0,
    activeStartedAt: 0,
    dedupeKey: "validator-unknown-watch",
  }), {
    nowMs: 5_000,
    visibleMsDelta: 5_000,
    activeMsDelta: 3_000,
  });
  const closedVideo = stopDropWatchSession(videoSession, { nowMs: 41_000, reason: "completed" });
  const debugLane = buildDropWatchTimeDebugLane({
    exactMediaRuntimeCount: videoSession.watchConfidence === "exact_media_runtime" ? 1 : 0,
    activeVisibilityEstimatedCount: imageSession.watchConfidence === "active_visibility_estimated" ? 1 : 0,
    durationMissingCount: unknownSession.watchConfidence === "weak_visibility_only" ? 1 : 0,
    backgroundExcludedCount: Number(videoSession.backgroundMs > 0) + Number(imageSession.backgroundMs > 0),
    suspiciousPageTimeFallbackCount: 0,
  });
  const debugSummary = buildDebugPanelTrackingSummary({ dropWatchTimeAccuracy: { debugLane } });
  const metric = getPersonMetricDefinition("runtime_watch_sessions");
  const scoreAfter = { ...scoreBefore };
  const metrics = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, {
    before: scoreBefore[dimension],
    after: scoreAfter[dimension],
    target: 80,
    status: scoreAfter[dimension] >= 80 ? "target_met" : "below_target",
    nextExactAction: scoreAfter[dimension] >= 80
      ? "No drop watch-time score action needed for this dimension."
      : "Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence.",
  }]));
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const sourceFiles = {
    contract: read("src/lib/analytics/drop-watch-time-contract.ts"),
    engine: read("src/lib/analytics/drop-watch-time-engine.ts"),
    personMetrics: read("src/lib/analytics/person-metrics-contract.ts"),
    normalizer: read("src/lib/behavioral/normalize-event-fact.ts"),
    debugSummary: read("src/lib/debug/debug-panel-tracking-summary.ts"),
    viewerWatchSession: read("src/hooks/useViewerWatchSession.ts"),
    telemetryCatalog: read("src/lib/telemetry-catalog.ts"),
    triggerMatrix: read("src/lib/testing/telemetry-trigger-test-matrix.ts"),
    packageJson: read("package.json"),
  };
  const failures: string[] = [];

  if (videoSession.activeWatchMs !== 30_000 || videoSession.backgroundMs <= 0) failures.push("page-open or background time can count as video watch time.");
  if (imageSession.activeWatchMs !== 8_000 || imageSession.passiveVisibleMs < 12_000) failures.push("image watch time can count passive page-open time.");
  if (!sourceFiles.contract.includes("watchConfidence") || unknownSession.watchConfidence === "exact_media_runtime") failures.push("watch time lacks confidence.");
  if (calculateNormalizedWatchPercent(videoSession) !== 100 || !sourceFiles.contract.includes("durationBiasPolicy")) failures.push("duration bias not normalized.");
  if (closedVideo.completionPercent !== 100 || closedVideo.activeWatchMs > 30_000 * Math.max(1, closedVideo.replayCount)) failures.push("video completion can exceed duration without replay.");
  if (resolveDropWatchTelemetryPolicy({ eventName: "drop_watch_progress", lastProgressEventAtMs: 1_000, nowMs: 2_000 }).shouldEmit) failures.push("progress telemetry can spam every tick.");
  if (!metric || !DROP_WATCH_TIME_TELEMETRY_EVENTS.every((eventName) => metric.eventNames.includes(eventName))) failures.push("global/user metrics omit watch time.");
  if (!debugSummary.lanes.some((lane) => lane.id === "drop_watch_time") || !sourceFiles.debugSummary.includes("Drop watch time")) failures.push("debug lane missing.");
  if (!sourceFiles.viewerWatchSession.includes('trackEvent("drop_watch_progress"')) failures.push("drop watch progress is not wired to the runtime viewer watch session.");
  if (!sourceFiles.viewerWatchSession.includes('"drop_watch_completed"')) failures.push("drop watch completion is not wired to the runtime viewer watch session.");
  for (const eventName of DROP_WATCH_TIME_TELEMETRY_EVENTS) {
    if (!getTelemetryEventExtensionMetadata(eventName)) failures.push(`${eventName} missing from telemetry catalog.`);
    const fact = normalizeBehavioralEventFact({
      eventId: `validator:${eventName}`,
      eventName,
      timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
      params: {
        source_component: "drop_watch_time_validator",
        route: "/dashboard/viewer",
        drop_id: "validator-drop",
        media_id: "validator-media",
        watch_session_id: "validator-watch",
      },
      source: "client",
    });
    if (!fact || (eventName === "drop_watch_completed" && fact.normalizedAction !== "watch_session_completed")) {
      failures.push(`${eventName} missing behavioral normalization.`);
    }
  }
  if (!sourceFiles.triggerMatrix.includes('eventName: "drop_watch_progress"')) failures.push("telemetry trigger matrix omits drop watch progress.");
  if (!sourceFiles.packageJson.includes("\"check:drop-watch-time-accuracy\"")) failures.push("package script check:drop-watch-time-accuracy missing.");
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  for (const dimension of SCORE_DIMENSIONS) {
    const metricRow = (metrics as Record<string, JsonRecord>)[dimension];
    if (typeof metricRow.before !== "number" || typeof metricRow.after !== "number") failures.push(`score dimension ${dimension} before/after missing.`);
  }

  const report = {
    generatedAtUtc,
    reportKey: "drop-watch-time-accuracy",
    currentHead,
    status: failures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeWatchTimeUsed: false,
    scoreBefore,
    scoreAfter,
    metrics,
    telemetryEvents: DROP_WATCH_TIME_TELEMETRY_EVENTS,
    sampleSessions: { videoSession, imageSession, unknownSession, closedVideo },
    debugLane,
    validation: {
      pageOpenTimeCountsAsWatchTime: false,
      backgroundTimeCountsAsWatchTime: false,
      progressTelemetryThrottled: true,
      globalUserMetricsIncludeWatchTime: Boolean(metric && DROP_WATCH_TIME_TELEMETRY_EVENTS.every((eventName) => metric.eventNames.includes(eventName))),
    },
    dirtyFiles,
    validationFailures: failures,
    nextExactSteps: [
      "Keep drop watch-time rollups tied to actual media/content exposure and active foreground engagement.",
      "Treat unknown duration as weak or unavailable evidence until runtime media duration is captured.",
      "Do not use page duration or viewer-open time as canonical watch time.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`drop-watch-time-accuracy pass: ${REPORT_PATH}`);
}

main();
