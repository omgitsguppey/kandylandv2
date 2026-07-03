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
const userBehaviorRollup = readFileSync(join(repoRoot, "src/lib/server/user-behavior-rollup.ts"), "utf8");
const adminUsersRoute = readFileSync(join(repoRoot, "src/app/api/admin/users/route.ts"), "utf8");
const adminUserRoute = readFileSync(join(repoRoot, "src/app/api/admin/user/[userId]/route.ts"), "utf8");
const adminUserPage = readFileSync(join(repoRoot, "src/app/admin/user/[userId]/page.tsx"), "utf8");
const behaviorRuntime = readFileSync(join(repoRoot, "functions/src/behavioral-intelligence-runtime.ts"), "utf8");
const analyticsMetrics = readFileSync(join(repoRoot, "src/lib/server/analytics-metrics.ts"), "utf8");
const adminMetricsTest = readFileSync(join(repoRoot, "tests/unit/admin-user-metrics.spec.ts"), "utf8");
const watchRollupTest = readFileSync(join(repoRoot, "tests/unit/watch-time-rollup.spec.ts"), "utf8");
const docs = readFileSync(join(repoRoot, "docs/agent-truth/watch-time-rollup-truth.md"), "utf8");

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
requireIncludes(rollupContract, "watch_score_source_missing", "Watch rollup contract must expose missing watch-score-source diagnostic.");
requireIncludes(rollupContract, "legacy_page_duration", "Watch rollup contract must label legacy fallback explicitly.");
requireIncludes(rollupContract, "isVerifiedWatchTimeRollupSource", "Watch rollup contract must own verified source classification.");
requireIncludes(rollupContract, "isLegacyWatchTimeRollupSource", "Watch rollup contract must own legacy source classification.");
requireIncludes(rollupContract, "buildWatchTimeRollupBehaviorInput", "Watch rollup contract must own behavior input projection.");
requireIncludes(rollupHelper, "validWatchMs", "Watch rollup helper must aggregate validWatchMs.");
requireIncludes(rollupHelper, "watchScoreSource", "Watch rollup helper must inspect watch score source.");
requireIncludes(rollupHelper, "watch_score_source_missing", "Watch rollup helper must reject unlabeled valid watch samples.");
requireIncludes(rollupHelper, "watch_time_missing_despite_views", "Watch rollup helper must flag views without valid watch sessions.");
requireIncludes(rollupHelper, "input.allowLegacyFallback === true", "Legacy page duration must require an explicit allowLegacyFallback guard.");
requireIncludes(rollupHelper, "diagnosticEstimate", "Watch rollup helper must return diagnostic estimates separately.");

requireIncludes(userMetricsSnapshot, "analytics_watch_sessions", "Global admin user metrics snapshot must read watch-session rollups.");
requireIncludes(userMetricsSnapshot, "watchRollup.watchTimeMs", "Global Watch Time must come from canonical watch rollup.");
requireIncludes(userMetricsSnapshot, "diagnostic context only", "Admin user metrics must label analytics watchSecondsTotal as diagnostic context.");
requireIncludes(adminUsersRoute, "buildWatchTimeRollupFromRecords", "Admin users route must use canonical watch rollup.");
requireIncludes(adminUserRoute, "buildWatchTimeRollupFromRecords", "Admin user detail route must use canonical watch rollup.");
requireIncludes(adminUsersRoute, "watchTimeRollup.watchTimeMs", "User Management detail lane must derive watch time from watch sessions.");
requireIncludes(adminUserRoute, "watchTimeRollup.watchTimeMs", "User detail watch time must derive from watch sessions.");
requireIncludes(behaviorRuntime, "readNumber(session.validWatchMs)", "Behavioral intelligence must use valid watch-session time.");
requireIncludes(behaviorRuntime, "watchScoreSource === \"watch_session_rollup\"", "Behavioral intelligence must not treat legacy page duration as primary watch time.");
requireIncludes(analyticsMetrics, "fact.validWatchMs", "Analytics metrics must use valid watch time.");
requireIncludes(analyticsMetrics, "legacy_page_duration", "Analytics metrics must label legacy page duration fallback.");
requireIncludes(adminUsersRoute, "legacy page-duration fallback", "Admin users route copy must distinguish legacy page-duration fallback.");
requireIncludes(adminUsersRoute, "isVerifiedWatchTimeRollupSource", "Admin users route must use canonical watch source classification.");
requireIncludes(adminUsersRoute, "isLegacyWatchTimeRollupSource", "Admin users route must use canonical legacy watch classification.");
requireIncludes(adminUserRoute, "buildWatchTimeRollupBehaviorInput", "Admin user detail must use canonical watch behavior projection.");
requireIncludes(adminUserRoute, "isLegacyWatchTimeRollupSource", "Admin user detail must use canonical legacy watch classification.");
requireIncludes(adminMetricsTest, "watchTimeSource: \"unavailable\"", "Admin metrics tests must keep watchSecondsTotal non-canonical without watch sessions.");
requireIncludes(adminMetricsTest, "watchSessionsByUser", "Admin metrics tests must include a valid watch-session source sample.");
requireIncludes(adminMetricsTest, "validWatchMs: 90_000", "Admin metrics tests must prove valid watch sessions award canonical watch time.");
requireIncludes(watchRollupTest, "diagnostic estimates separate", "Watch rollup tests must prove diagnostic estimates do not increase watchTimeMs.");
requireIncludes(watchRollupTest, "allowLegacyFallback: true", "Watch rollup tests must prove legacy fallback requires explicit opt-in.");
requireIncludes(userBehaviorRollup, "Legacy page duration is diagnostic only and is not counted as canonical watch time.", "Behavior rollup must label legacy page duration as diagnostic only.");
requireIncludes(userBehaviorRollup, "canonicalWatchTimeSource: \"watch_session_rollup\"", "Behavior rollup must preserve watch-session rollup as the canonical watch-time source.");
requireIncludes(readFileSync(join(repoRoot, "tests/unit/user-behavior-rollup.spec.ts"), "utf8"), "keeps legacy page duration diagnostic instead of behavior watch time", "Behavior rollup tests must prove legacy page duration does not become watch time.");
requireIncludes(docs, "analytics_watch_sessions.validWatchMs", "Watch-time doctrine must name the canonical watch-session field.");
requireIncludes(docs, "`watchSecondsTotal` is diagnostic", "Watch-time doctrine must demote watchSecondsTotal to diagnostic context.");

if (adminUserRoute.includes("Math.max(rollupWatchSeconds, completedSessionWatchSeconds, sessionFactWatchSeconds)")) {
  failures.push("Admin user detail must not use legacy/page-duration watch seconds as primary watch time.");
}

if (userMetricsSnapshot.includes("allowLegacyFallback: true")) {
  failures.push("Admin user metrics snapshot must not enable legacy watch fallback by default.");
}

if (userBehaviorRollup.includes("readNumber(input.watchTimeMs) || readNumber(input.watchSecondsTotal)")) {
  failures.push("Behavior rollup must not convert unlabeled watchSecondsTotal into canonical watchTimeMs.");
}

if (userBehaviorRollup.includes("labeledLegacyWatchTimeMs") || userBehaviorRollup.includes("explicitWatchTimeMs > 0 ? explicitWatchTimeMs")) {
  failures.push("Behavior rollup must not fall back from watchTimeMs to labeled legacy page duration for canonical watchTimeMs.");
}

if (adminMetricsTest.includes("watchTimeMs: 90_000,")) {
  failures.push("Admin metrics tests must not encode watchSecondsTotal as a watchTimeMs object-literal expectation.");
}

if (rollupHelper.includes("watchTimeMs += diagnosticEstimate") || rollupHelper.includes("watchTimeMs = diagnosticEstimate")) {
  failures.push("Diagnostic watch estimates must not be added to canonical watchTimeMs.");
}

if (rollupHelper.includes('watchScoreSource && watchScoreSource !== "watch_session_rollup"')) {
  failures.push("Watch rollup helper must not allow missing watchScoreSource to count as canonical watch time.");
}

if (behaviorRuntime.includes('readString(session.watchScoreSource) || "watch_session_rollup"')) {
  failures.push("Behavioral intelligence runtime must not default missing watchScoreSource to canonical watch-session rollup.");
}

if (adminUserPage.includes("behaviorRollup?.watchTimeMs ?? ((analytics?.watchSecondsTotal ?? 0) * 1000)")) {
  failures.push("Admin user detail page must not display analytics watchSecondsTotal as canonical watch time.");
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
