import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

const snapshotContract = read("src/lib/admin-user-metrics-contract.ts");
const snapshotHelper = read("src/lib/server/admin-user-metrics-snapshot.ts");
const behaviorContract = read("src/lib/user-behavior-rollup-contract.ts");
const behaviorHelper = read("src/lib/server/user-behavior-rollup.ts");
const truthState = read("src/lib/admin-truth-state.ts");
const truthBadge = read("src/components/Admin/AdminTruthBadge.tsx");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const overviewRoute = read("src/app/api/admin/overview/route.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const historicalEngagementHelper = read("src/lib/server/admin-analytics-historical-engagement.ts");
const returnCadenceHelper = read("src/lib/admin-analytics-return-cadence.ts");
const audienceTab = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const analyticsTypes = read("src/types/admin-analytics.ts");
const adminUsersDoctrine = read("docs/doctrine/surfaces/admin-users-doctrine.md");
const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
const debugTabActions = read("src/app/admin/debug/components/DebugTabActions.tsx");
const watchTruthValidator = read("scripts/agent/validate-watch-time-rollup-truth.ts");
const behaviorValidator = read("scripts/agent/validate-behavioral-intelligence-confidence.ts");
const actionValidator = read("scripts/agent/validate-user-action-ledger-events.ts");
const statsGridValidator = read("scripts/agent/validate-admin-users-stats-grid.ts");
const loadingLanesValidator = read("scripts/agent/validate-admin-users-loading-lanes.ts");

const failures: string[] = [];

[
  "totalUsers",
  "activeUsers",
  "verifiedUsers",
  "sevenDayReturners",
  "pushEnabledUsers",
  "trackedUnwraps",
  "trackedPurchases",
  "watchTimeMs",
  "onboardedUsers",
  "totalRevenueUsd",
  "payingUsers",
  "generatedAt",
  "source",
  "freshnessState",
  "watchTimeSource",
  "watchTimeIssues",
  "watchTimeDiagnosticEstimate",
].forEach((field) => {
  assert(snapshotContract.includes(field), `Admin user metrics snapshot contract missing ${field}.`, failures);
});

assert(snapshotHelper.includes("buildAdminUserMetricsSnapshot"), "Canonical admin user metrics snapshot builder is missing.", failures);
assert(snapshotHelper.includes("readAdminUserMetricsSnapshot"), "Canonical admin user metrics snapshot reader is missing.", failures);
assert(usersRoute.includes("buildAdminUserMetricsSnapshot"), "User Management summary route must use the canonical admin user metrics snapshot builder.", failures);
assert(
  overviewRoute.includes("readAdminUserMetricsSnapshot") || overviewRoute.includes("readAdminUserTruthSnapshot"),
  "Admin overview must read the canonical admin user metrics snapshot.",
  failures,
);
assert(usersPage.includes('data-admin-users-stats-layout="compact-grid"'), "User Management stats grid must keep the compact layout marker.", failures);
assert(statsGridValidator.includes('data-admin-users-stats-layout="compact-grid"'), "Stats-grid validator must enforce the compact layout marker.", failures);
assert(loadingLanesValidator.includes('authFetch("/api/admin/users?mode=summary")'), "Loading-lanes validator must enforce the separate summary lane.", failures);

assert(!usersPage.includes('value: summary ? `${summary.totalWatchHours ?? 0}h` : "[unavailable]"'), "User Management Watch card must not fall back to a huge [unavailable] value.", failures);
assert(!usersPage.includes('formatSummaryCount = (value?: number) => summary ? (value ?? 0).toLocaleString() : "[unavailable]"'), "Summary metric cards must not hide the compact grid behind [unavailable] placeholders.", failures);
assert(usersPage.includes("data-admin-users-metric-state"), "User Management metric cards must expose data-admin-users-metric-state.", failures);
assert(usersPage.includes("data-admin-users-metric-source"), "User Management metric cards must expose data-admin-users-metric-source.", failures);
assert(usersPage.includes("data-admin-users-kpi-id"), "User Management KPI cards must expose data-admin-users-kpi-id.", failures);
assert(usersPage.includes("data-admin-users-kpi-source-truth"), "User Management KPI cards must expose data-admin-users-kpi-source-truth.", failures);
assert(usersPage.includes("data-admin-users-kpi-freshness"), "User Management KPI cards must expose data-admin-users-kpi-freshness.", failures);
assert(usersPage.includes("data-admin-users-kpi-scope"), "User Management KPI cards must expose data-admin-users-kpi-scope.", failures);
assert(usersPage.includes("data-admin-users-kpi-reason"), "User Management KPI cards must expose data-admin-users-kpi-reason.", failures);
assert(usersPage.includes("data-admin-users-kpi-generated-at-utc"), "User Management KPI cards must expose data-admin-users-kpi-generated-at-utc.", failures);
assert(usersPage.includes("(summary?.kpiCards ?? []).map"), "User Management must render KPI cards from the canonical summary contract.", failures);
assert(!usersPage.includes("tracked purchases"), "User Management must not show purchase counts inside the Unwraps card.", failures);
assert(usersPage.includes("Top behavior users"), "User Management must render the behavior leaderboard title.", failures);
assert(usersPage.includes("Ranked by engagement, value, recency, and confidence."), "User Management must explain leaderboard ranking semantics.", failures);
assert(usersPage.includes("setBehaviorLeaderboardPage"), "User Management behavior leaderboard must support pagination.", failures);
assert(usersPage.includes("setBehaviorLeaderboardFilter"), "User Management behavior leaderboard must support filters.", failures);
assert(usersPage.includes("mode=behavior_leaderboard"), "User Management must fetch a dedicated behavior leaderboard lane.", failures);
assert(usersPage.includes("data-admin-behavior-row-user-id"), "Behavior leaderboard rows must expose row identity markers.", failures);
assert(usersPage.includes("data-admin-behavior-row-identity-state"), "Behavior leaderboard rows must expose identity fallback state.", failures);
assert(usersPage.includes("Page ${behaviorLeaderboard.page} of ${behaviorLeaderboard.totalPages}"), "Behavior leaderboard must render pagination status.", failures);
assert(!usersPage.includes("Open a user before loading behavior rollups."), "Behavior leaderboard empty state must not require opening a user first.", failures);
assert(usersPage.includes("Run behavior materializer or inspect event facts."), "Behavior leaderboard empty state must point to source truth instead of selected-user detail.", failures);
assert(adminUsersDoctrine.includes("must not require a selected user"), "Admin Users doctrine must forbid selected-user-only behavior hydration.", failures);
assert(adminUsersDoctrine.includes("WAIT means actively loading only"), "Admin Users doctrine must inherit deterministic WAIT semantics.", failures);

assert(behaviorContract.includes("confidence") && behaviorContract.includes("source") && behaviorContract.includes("issues"), "Per-user behavior rollup contract is incomplete.", failures);
assert(behaviorHelper.includes("watch_time_missing_despite_views"), "Per-user behavior rollup helper must flag missing watch time despite views.", failures);
assert(usersRoute.includes("buildUserBehaviorRollup"), "User Management route must build per-user behavior rollups.", failures);
assert(userDetailRoute.includes("buildUserBehaviorRollup"), "User detail route must build per-user behavior rollups.", failures);
assert(usersPage.includes("behaviorRollup"), "User Management must render the per-user behavior rollup.", failures);
assert(userDetailPage.includes("behaviorRollup"), "User detail must render the per-user behavior rollup.", failures);
assert(adminDebugRoute.includes("TaskIssueAttribution"), "Admin debug task issue attribution model is missing.", failures);
assert(adminDebugRoute.includes("expectedSource") && adminDebugRoute.includes("foundSource"), "Task issue attribution must show expected and found source truth.", failures);
assert(adminDebugRoute.includes("issueType") && adminDebugRoute.includes("sourceFreshness"), "Task issue attribution must classify issue type and freshness.", failures);
assert(adminDebugRoute.includes("eligibleForTasks"), "Task issue attribution must expose task eligibility.", failures);
assert(adminDebugRoute.includes('foundSource: "task_assignments"'), "Task issue attribution must verify user task assignments before treating sample telemetry as canonical.", failures);
assert(debugTabActions.includes("Expected source") && debugTabActions.includes("Found source"), "Task Issues Attribution UI must render source provenance.", failures);
assert(debugTabActions.includes("Issue type") && debugTabActions.includes("Freshness"), "Task Issues Attribution UI must render issue type and freshness.", failures);

assert(watchTruthValidator.includes("watch_session_rollup"), "Watch-time truth validator must enforce watch-session-first sourcing.", failures);
assert(watchTruthValidator.includes("legacy_page_duration"), "Watch-time truth validator must enforce labeled legacy page-duration fallback.", failures);
assert(userDetailRoute.includes("buildWatchTimeRollupFromRecords"), "User detail route must use canonical watch-time rollups.", failures);
assert(usersRoute.includes("buildWatchTimeRollupFromRecords"), "User Management route must use canonical watch-time rollups.", failures);
assert(snapshotHelper.includes("analytics_watch_sessions"), "Admin user metrics snapshot must read watch-session rollups.", failures);
assert(snapshotHelper.includes("watchTimeSource: watchRollup.source"), "Admin user metrics snapshot must persist watch source truth.", failures);
assert(snapshotHelper.includes("watchTimeDiagnosticEstimate: watchRollup.diagnosticEstimate"), "Admin user metrics snapshot must persist watch diagnostic estimates.", failures);
assert(usersRoute.includes("buildAdminUsersKpiCards"), "User Management route must build explicit KPI cards.", failures);
assert(usersRoute.includes("kpiCards: buildAdminUsersKpiCards"), "User Management summary must return KPI cards.", failures);
assert(usersRoute.includes("buildBehaviorLeaderboardPanel"), "User Management route must build a dedicated behavior leaderboard.", failures);
assert(usersRoute.includes('mode === "behavior_leaderboard"'), "User Management route must expose a behavior_leaderboard mode.", failures);
assert(usersRoute.includes("pageSize: leaderboardPageSize"), "Behavior leaderboard route must page rows on the server.", failures);
assert(usersRoute.includes("filter: leaderboardFilter"), "Behavior leaderboard route must filter rows on the server.", failures);
assert(usersRoute.includes("user.role !== \"user\""), "Behavior leaderboard must exclude admin and creator accounts from user ranking.", failures);
assert(usersRoute.includes("computeBehaviorLeaderboardFallbackScore"), "Behavior leaderboard must provide deterministic fallback scoring when engagement scores are missing.", failures);
assert(usersRoute.includes("sourceTruth"), "Behavior leaderboard rows must expose source truth.", failures);
assert(usersRoute.includes("freshnessState"), "Behavior leaderboard rows must expose freshness state.", failures);
assert(usersRoute.includes('label: "Purchases"'), "User Management summary must expose a dedicated Purchases KPI.", failures);
assert(usersRoute.includes('label: "Paying users"'), "User Management summary must name the paying-users KPI explicitly.", failures);
assert(usersRoute.includes("status-active accounts"), "User Management total-users KPI must distinguish account status from active-now presence.", failures);
assert(usersRoute.includes("watchTimeDiagnosticEstimate"), "User Management summary must carry watch diagnostic estimates into KPI truth.", failures);
assert(usersRoute.includes("verified watch unavailable"), "User Management watch KPI must explain missing verified watch totals.", failures);
assert(usersRoute.includes('/ ${formatCount(totalUsers)} users'), "Returned and onboarded KPIs must show denominators.", failures);

assert(behaviorValidator.includes("Insufficient signal"), "Behavioral confidence validator must enforce compact insufficient-signal state.", failures);
assert(
  behaviorValidator.includes(".slice(0, recommendationState.explanationEligible ? limit : Math.min(limit, 3))"),
  "Behavioral confidence validator must enforce capped fallback recommendations.",
  failures,
);
assert(userDetailPage.includes("Insufficient signal"), "User detail page must show the compact insufficient-signal state.", failures);
assert(userDetailPage.includes("fallback recommendation"), "User detail page must clearly label fallback recommendations.", failures);

assert(actionValidator.includes("normalizeBehavioralEventFact"), "Action-ledger validator must enforce normalized user actions.", failures);
assert(actionValidator.includes("dedupeNormalizedUserActions"), "Action-ledger validator must enforce deduped action rows.", failures);
assert(userDetailPage.includes("data-user-action-name"), "Action Ledger UI must keep normalized action markers.", failures);

[
  '"live"',
  '"refreshing"',
  '"stale"',
  '"degraded"',
  '"failed"',
  '"unavailable"',
  '"delayed"',
  '"review"',
].forEach((state) => {
  assert(truthState.includes(state), `Admin truth-state doctrine missing ${state}.`, failures);
});

assert(truthBadge.includes("data-admin-truth-state"), "AdminTruthBadge must expose data-admin-truth-state.", failures);
assert(usersPage.includes("AdminTruthBadge"), "User Management must use AdminTruthBadge.", failures);
assert(userDetailPage.includes("AdminTruthBadge"), "User detail must use AdminTruthBadge.", failures);
assert(!usersPage.includes("AdminStatusBadge"), "User Management must not regress to legacy AdminStatusBadge truth chips.", failures);
assert(!userDetailPage.includes("AdminStatusBadge"), "User detail must not regress to legacy AdminStatusBadge truth chips.", failures);

assert(!usersPage.includes("setInterval("), "User Management must not add polling via setInterval.", failures);
assert(!userDetailPage.includes("setInterval("), "User detail must not add polling via setInterval.", failures);
assert(usersPage.includes('authFetch("/api/admin/users?mode=summary")'), "User Management must load summary from the bounded summary lane.", failures);
assert(usersPage.includes('authFetch("/api/admin/users/realtime"'), "Realtime can remain for upgrades, but it must stay separate from the summary lane.", failures);
assert(usersPage.includes("const getKpiCardTruthState"), "User Management must map KPI freshness into explicit admin truth states.", failures);

assert(analyticsTypes.includes("export type ReturnCadenceState"), "Admin analytics types must expose the canonical return cadence state.", failures);
assert(analyticsTypes.includes("\"mixed_fallback\""), "Return cadence state must model mixed authenticated activity fallback.", failures);
assert(historicalEngagementHelper.includes("returnCadenceState"), "Historical engagement analytics must build return cadence state.", failures);
assert(historicalEngagementHelper.includes("analyticsEventFacts"), "Return cadence must read identified event facts.", failures);
assert(historicalEngagementHelper.includes("sessionFacts"), "Return cadence must read authenticated session facts.", failures);
assert(historicalEngagementHelper.includes("taskLifecycleLogs"), "Return cadence must read task lifecycle activity for fallback.", failures);
assert(historicalEngagementHelper.includes("transactionFacts"), "Return cadence must read purchase and unlock facts for fallback.", failures);
assert(historicalEngagementHelper.includes("sourceTruth === \"missing\""), "Return cadence helper must distinguish missing source from verified zero.", failures);
assert(returnCadenceHelper.includes("buildAdminAnalyticsReturnCadenceModel"), "Return cadence UI helper must build a typed model.", failures);
assert(returnCadenceHelper.includes("Return cadence is using identified activity fallback because the cadence snapshot has not hydrated."), "Return cadence helper must explain fallback usage.", failures);
assert(audienceTab.includes("data-return-cadence-source-truth"), "Return cadence panel must expose source-truth debug attrs.", failures);
assert(audienceTab.includes("data-return-cadence-tracked-users"), "Return cadence panel must expose tracked-user debug attrs.", failures);
assert(audienceTab.includes("Tracked Auth Users"), "Return cadence panel must render tracked authenticated users explicitly.", failures);
assert(audienceTab.includes("No verified zero should be displayed"), "Return cadence panel must prevent false zero copy.", failures);
assert(audienceTab.includes("Users active on 2+ distinct days"), "Return cadence panel must explain unique returners with a 2+ day denominator.", failures);
assert(!audienceTab.includes("0 tracked users"), "Return cadence panel must not hard-code fake zero tracked users.", failures);
assert(analyticsTypes.includes("export type RegionDemandPanelState"), "Admin analytics types must expose the canonical region demand panel state.", failures);
assert(analyticsTypes.includes("adminInternalCount"), "Region demand state must separate internal/admin counts from raw counts.", failures);
assert(audienceTab.includes("data-regions-source-truth"), "Regions panel must expose source-truth debug attrs.", failures);
assert(audienceTab.includes("data-regions-filter-mode"), "Regions panel must expose filter-mode debug attrs.", failures);
assert(audienceTab.includes("Raw geography with internal/admin traffic separated from external demand."), "Regions panel must not label raw geography as pure demand.", failures);
assert(audienceTab.includes("Internal/admin:"), "Regions panel must render internal/admin excluded counts.", failures);
assert(audienceTab.includes("Unknown location"), "Regions panel must bucket unknown geography as data quality, not demand.", failures);

if (failures.length > 0) {
  console.error("Admin user behavior truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin user behavior truth validation passed.");
