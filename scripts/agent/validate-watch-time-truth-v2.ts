import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string, failures: string[]) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function requireAbsent(source: string, needle: string, label: string, failures: string[]) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const failures: string[] = [];

const watchTruth = read("src/lib/behavioral/watch-time-truth.ts");
const watchEstimation = read("src/lib/behavioral/watch-time-estimation.ts");
const watchScoring = read("src/lib/watch-time-scoring.ts");
const viewerWatchSession = read("src/lib/viewer-watch-session.ts");
const watchHook = read("src/hooks/useViewerWatchSession.ts");
const viewerTelemetryAdapter = read("src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts");
const watchRollupContract = read("src/lib/watch-time-rollup-contract.ts");
const watchRollup = read("src/lib/server/watch-time-rollup.ts");
const analyticsTruthRuntime = read("functions/src/analytics-truth-runtime.ts");
const adminUsersRoute = read("src/app/api/admin/users/route.ts");
const adminUserRoute = read("src/app/api/admin/user/[userId]/route.ts");
const behavioralRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const analyticsMetrics = read("src/lib/server/analytics-metrics.ts");
const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
const adminAnalyticsCommerceTab = read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const deterministicTruth = read("src/lib/deterministic-admin-truth.ts");
const docs = read("docs/agent-truth/watch-time-truth.md");

requireIncludes(watchTruth, "IMAGE_WATCH_THRESHOLDS_MS", "watch-time truth helper", failures);
requireIncludes(watchTruth, "VIDEO_WATCH_THRESHOLDS", "watch-time truth helper", failures);
requireIncludes(watchTruth, "computeLiteralValidWatchMs", "watch-time truth helper", failures);
requireIncludes(watchEstimation, "estimateMissingWatchTime", "watch-time estimation helper", failures);
requireIncludes(watchEstimation, "confidenceCapPercent", "watch-time estimation helper", failures);

requireIncludes(watchScoring, "computeLiteralValidWatchMs", "watch scoring", failures);
requireIncludes(watchScoring, "manualAdvanceAfterMs", "watch scoring", failures);
requireIncludes(watchScoring, "video_progress_20_percent", "watch scoring", failures);
requireIncludes(watchScoring, "image_manual_advance_completion", "watch scoring", failures);

requireIncludes(viewerWatchSession, "getViewerAssetLiteralWatchMs", "viewer watch session model", failures);
requireIncludes(viewerWatchSession, "shouldCompleteImageOnManualAdvance", "viewer watch session model", failures);
requireIncludes(watchHook, "contextRef.current.contentLoaded === true", "viewer watch hook", failures);
requireIncludes(watchHook, "? shouldCountPlaying", "viewer watch hook", failures);
requireIncludes(watchHook, ": shouldCountActive;", "viewer watch hook", failures);
requireIncludes(watchHook, "shouldCompleteImageOnManualAdvance", "viewer watch hook", failures);

requireAbsent(viewerTelemetryAdapter, "window.setTimeout(() =>", "viewer telemetry adapter", failures);
requireAbsent(viewerTelemetryAdapter, "assetStartedAtMs: startedAtMs", "viewer telemetry adapter", failures);

requireIncludes(watchRollupContract, "diagnosticEstimate", "watch rollup contract", failures);
requireIncludes(watchRollupContract, "legacyPageDurationMs", "watch rollup contract", failures);
requireIncludes(watchRollup, "estimateMissingWatchTime", "watch rollup helper", failures);
requireIncludes(watchRollup, "watch_time_missing_despite_views", "watch rollup helper", failures);
requireIncludes(watchRollup, "diagnosticEstimate", "watch rollup helper", failures);
requireIncludes(analyticsTruthRuntime, "estimated_drop_session_end", "analytics truth runtime", failures);
requireIncludes(analyticsTruthRuntime, "stale_open_session_timeout", "analytics truth runtime", failures);
requireIncludes(analyticsTruthRuntime, "Math.min(15000, Math.max(3000", "analytics truth runtime", failures);
requireIncludes(analyticsTruthRuntime, "const confidenceScore = clamp01(1 - capturePenalty - rawCoveragePenalty - (staleOpen ? 0.25 : 0))", "analytics truth runtime", failures);

requireIncludes(adminUsersRoute, "watchTimeDiagnosticEstimate", "admin users route", failures);
requireIncludes(adminUserRoute, "watchTimeDiagnosticEstimate", "admin user detail route", failures);
requireIncludes(behavioralRuntime, "watch_session_rollup", "behavioral intelligence runtime", failures);
requireIncludes(behavioralRuntime, "\"legacy_page_duration\"", "behavioral intelligence runtime", failures);
requireIncludes(analyticsMetrics, "watchScoreSource === \"watch_session_rollup\"", "analytics metrics", failures);
requireIncludes(analyticsMetrics, "\"legacy_page_duration\"", "analytics metrics", failures);
requireIncludes(adminDebugRoute, "EstimatedWatchRecoveryGroup", "admin debug telemetry truth route", failures);
requireIncludes(adminDebugRoute, "countsTowardVerifiedWatch: false", "admin debug telemetry truth route", failures);
requireIncludes(adminDebugRoute, "countsTowardEstimatedWatch: true", "admin debug telemetry truth route", failures);
requireIncludes(adminDebugRoute, "stale-open timeout fallback = min(15s, max(3s, round((totalVisibleSeconds - totalWatchSeconds) * 250ms))).", "admin debug telemetry truth route", failures);

requireIncludes(adminAnalyticsCommerceTab, "label=\"Total Watch\"", "library viewer drilldown watch card", failures);
requireIncludes(adminAnalyticsCommerceTab, "Verified ${formatDuration(verifiedWatchSeconds)}; estimated ${formatDuration(estimatedWatchSeconds)}", "library viewer drilldown watch card", failures);
requireIncludes(adminAnalyticsCommerceTab, "data-library-viewer-source-truth", "library viewer drilldown source attrs", failures);
requireIncludes(adminAnalyticsCommerceTab, "watch_session_rollup", "library viewer drilldown verified source split", failures);
requireIncludes(adminAnalyticsCommerceTab, "legacy_page_duration", "library viewer drilldown estimated fallback split", failures);
requireIncludes(adminAnalyticsCommerceTab, "Monitor live - no recent viewer sessions.", "library viewer drilldown quiet live-pulse copy", failures);
requireIncludes(adminAnalyticsCommerceTab, "unknown capture transport", "library viewer drilldown capture transport warning", failures);
for (const expected of [
  "resolveWatchTruth",
  "verifiedWatchSeconds",
  "estimatedWatchSeconds",
  "fallbackWatchSeconds",
  "qualityReasons",
]) {
  requireIncludes(deterministicTruth, expected, "deterministic watch truth helper", failures);
}

requireIncludes(docs, "diagnostics-only estimate", "watch-time doctrine doc", failures);
requireIncludes(docs, "Admin Watch Truth Resolver", "watch-time doctrine doc", failures);
requireIncludes(docs, "legacy_page_duration", "watch-time doctrine doc", failures);
requireIncludes(docs, "video watch time equals actual foreground visible playback time", "watch-time doctrine doc", failures);
requireIncludes(docs, "image watch time equals foreground visible image-in-view time", "watch-time doctrine doc", failures);

if (failures.length > 0) {
  console.error("Watch time truth v2 validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Watch time truth v2 validation passed.");
