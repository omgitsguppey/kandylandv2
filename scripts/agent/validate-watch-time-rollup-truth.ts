import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const watchSession = readFileSync(join(repoRoot, "src/lib/viewer-watch-session.ts"), "utf8");
const hook = readFileSync(join(repoRoot, "src/hooks/useViewerWatchSession.ts"), "utf8");
const route = readFileSync(join(repoRoot, "src/app/api/viewer/watch-session/route.ts"), "utf8");
const scoring = readFileSync(join(repoRoot, "src/lib/watch-time-scoring.ts"), "utf8");
const rollupContract = readFileSync(join(repoRoot, "src/lib/watch-time-rollup-contract.ts"), "utf8");
const rollupHelper = readFileSync(join(repoRoot, "src/lib/server/watch-time-rollup.ts"), "utf8");
const userMetricsSnapshot = readFileSync(join(repoRoot, "src/lib/server/admin-user-metrics-snapshot.ts"), "utf8");
const adminUsersRoute = readFileSync(join(repoRoot, "src/app/api/admin/users/route.ts"), "utf8");
const adminUserRoute = readFileSync(join(repoRoot, "src/app/api/admin/user/[userId]/route.ts"), "utf8");
const behaviorRuntime = readFileSync(join(repoRoot, "functions/src/behavioral-intelligence-runtime.ts"), "utf8");
const analyticsMetrics = readFileSync(join(repoRoot, "src/lib/server/analytics-metrics.ts"), "utf8");

const failures: string[] = [];

function requireIncludes(source: string, needle: string, message: string) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

requireIncludes(hook, "IntersectionObserver", "Viewer watch hook must gate watch sessions on content visibility.");
requireIncludes(hook, "ACTIVE_IDLE_THRESHOLD_MS", "Viewer watch hook must exclude idle time.");
requireIncludes(hook, "document.visibilityState", "Viewer watch hook must observe document visibility.");
requireIncludes(hook, "hiddenDurationMs", "Viewer watch hook must track hidden/background time.");
requireIncludes(scoring, "hidden_time_excluded", "Watch scoring must exclude hidden time.");
requireIncludes(scoring, "idle_time_excluded", "Watch scoring must exclude idle time.");
requireIncludes(watchSession, "validWatchMs", "Viewer watch session model must carry valid watch time.");
requireIncludes(route, 'watchScoreSource: "watch_session_rollup"', "Viewer watch route must write canonical watch-session source.");
requireIncludes(route, "validWatchMs: sessionWatchScore.validWatchMs", "Viewer watch route must persist scored valid watch time.");

requireIncludes(rollupContract, "watch_time_missing_despite_views", "Watch rollup contract must expose missing watch-session diagnostic.");
requireIncludes(rollupContract, "legacy_page_duration", "Watch rollup contract must label legacy fallback explicitly.");
requireIncludes(rollupHelper, "validWatchMs", "Watch rollup helper must aggregate validWatchMs.");
requireIncludes(rollupHelper, "watchScoreSource", "Watch rollup helper must inspect watch score source.");
requireIncludes(rollupHelper, "watch_time_missing_despite_views", "Watch rollup helper must flag views without valid watch sessions.");

requireIncludes(userMetricsSnapshot, "analytics_watch_sessions", "Global admin user metrics snapshot must read watch-session rollups.");
requireIncludes(userMetricsSnapshot, "watchRollup.watchTimeMs", "Global Watch Time must come from canonical watch rollup.");
requireIncludes(adminUsersRoute, "buildWatchTimeRollupFromRecords", "Admin users route must use canonical watch rollup.");
requireIncludes(adminUserRoute, "buildWatchTimeRollupFromRecords", "Admin user detail route must use canonical watch rollup.");
requireIncludes(adminUsersRoute, "watchTimeRollup.watchTimeMs", "User Management detail lane must derive watch time from watch sessions.");
requireIncludes(adminUserRoute, "watchTimeRollup.watchTimeMs", "User detail watch time must derive from watch sessions.");
requireIncludes(behaviorRuntime, "readNumber(session.validWatchMs)", "Behavioral intelligence must use valid watch-session time.");
requireIncludes(behaviorRuntime, "watchScoreSource === \"watch_session_rollup\"", "Behavioral intelligence must not treat legacy page duration as primary watch time.");
requireIncludes(analyticsMetrics, "fact.validWatchMs", "Analytics metrics must use valid watch time.");
requireIncludes(analyticsMetrics, "legacy_page_duration", "Analytics metrics must label legacy page duration fallback.");

if (adminUserRoute.includes("Math.max(rollupWatchSeconds, completedSessionWatchSeconds, sessionFactWatchSeconds)")) {
  failures.push("Admin user detail must not use legacy/page-duration watch seconds as primary watch time.");
}

if (adminUsersRoute.includes("current.watchSecondsTotal += watchSeconds;") && !adminUsersRoute.includes("const watchSeconds = 0;")) {
  failures.push("Admin users fallback facts must not accumulate page-duration watch seconds as primary watch time.");
}

if (failures.length > 0) {
  console.error("Watch time rollup truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Watch time rollup truth validation passed.");
