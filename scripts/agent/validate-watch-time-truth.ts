import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function readRequired(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    throw new Error(`${label} must include ${needle}`);
  }
}

function requireAbsent(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    throw new Error(`${label} must not include ${needle}`);
  }
}

const scoring = readRequired("src/lib/watch-time-scoring.ts");
const watchSession = readRequired("src/hooks/useViewerWatchSession.ts");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const watchRoute = readRequired("src/app/api/viewer/watch-session/route.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const behavioralRuntime = readRequired("functions/src/behavioral-intelligence-runtime.ts");
const scoringTests = readRequired("tests/unit/watch-time-scoring.spec.ts");
const routeTests = readRequired("tests/unit/viewer-watch-session-route.spec.ts");

[
  "watch_session_started",
  "watch_session_visible_tick",
  "watch_session_progress",
  "watch_session_paused",
  "watch_session_resumed",
  "watch_session_hidden",
  "watch_session_ended",
  "watch_score_computed",
].forEach((eventName) => requireIncludes(telemetryCatalog, eventName, "telemetry catalog"));

requireIncludes(scoring, "computeWatchScore", "watch scoring helper");
requireIncludes(scoring, "hidden_time_excluded", "watch scoring helper");
requireIncludes(scoring, "idle_time_excluded", "watch scoring helper");
requireIncludes(scoring, "video_progress_50_percent", "watch scoring helper");
requireIncludes(scoring, "image_minimum_visible_time_met", "watch scoring helper");
requireIncludes(scoring, "sumNonOverlappingWatchIntervals", "watch scoring helper");

requireIncludes(viewerClient, "data-watch-session-visibility-owner=\"intersection-observer\"", "viewer client");
requireIncludes(watchSession, "IntersectionObserver", "viewer watch hook");
requireIncludes(watchSession, "MINIMUM_VIEWPORT_VISIBLE_PERCENT = 50", "viewer watch hook");
requireIncludes(watchSession, "ACTIVE_IDLE_THRESHOLD_MS = 30_000", "viewer watch hook");
requireIncludes(watchSession, "IDLE_TIMEOUT_MS = 120_000", "viewer watch hook");
requireIncludes(watchSession, "document.visibilityState", "viewer watch hook");
requireIncludes(watchSession, "contentVisiblePercentRef", "viewer watch hook");
requireIncludes(watchSession, "WATCH_VISIBLE_TICK_INTERVAL_MS = 5_000", "viewer watch hook");
requireIncludes(watchSession, "window.setInterval(() =>", "viewer watch hook");
requireAbsent(watchSession, "}, 1_000)", "viewer watch hook");

requireIncludes(watchRoute, "profileAllowsIdentifiedAnalytics", "viewer watch route");
requireIncludes(watchRoute, "identified_analytics_consent_denied", "viewer watch route");
requireIncludes(watchRoute, "scoreViewerWatchSession", "viewer watch route");
requireIncludes(watchRoute, "validWatchMs", "viewer watch route");
requireIncludes(watchRoute, "watchScoreSource: \"watch_session_rollup\"", "viewer watch route");
requireAbsent(watchRoute, "contentUrls:", "viewer watch route stored payload");
requireAbsent(watchRoute, "contentUrl:", "viewer watch route stored payload");

requireIncludes(behavioralRuntime, "validWatchMs", "behavioral intelligence runtime");
requireIncludes(behavioralRuntime, "watch_session_rollup", "behavioral intelligence runtime");
requireIncludes(behavioralRuntime, "legacy_page_duration", "behavioral intelligence runtime");
requireIncludes(behavioralRuntime, "watchScoreConfidence", "behavioral intelligence runtime");

[
  "0ms",
  "500ms",
  "2500ms image",
  "6000ms image",
  "15000ms image",
  "video 10s",
  "50% progress",
  "90% progress",
  "hidden time",
  "idle time",
  "overlapping sessions",
].forEach((label) => requireIncludes(scoringTests, label, "watch scoring tests"));

[
  "accepts a valid watch session",
  "rejects oversized watch payloads",
  "does not store internal content URLs",
  "dedupes repeated watch observations",
  "respects identified analytics consent denial",
].forEach((label) => requireIncludes(routeTests, label, "watch route tests"));

const generatedAtUtc = new Date().toISOString();
const report = {
  generatedAt: generatedAtUtc,
  generatedAtUtc,
  status: "source_ready_evidence_gap",
  sourceStatus: "current_static_validator",
  dropWatchTimeEngineExists: true,
  pageTimeCountsAsWatchTime: false,
  hiddenOrIdleExcluded: true,
  claimsPersistedLiveMetric: false,
  productionReadsRun: false,
  nextAction: "Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.",
};
const reportPath = path.join(repoRoot, "agent/state/watch-time-truth.generated.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log("Watch time truth validator passed.");
