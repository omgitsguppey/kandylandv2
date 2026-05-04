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
].forEach((field) => {
  assert(snapshotContract.includes(field), `Admin user metrics snapshot contract missing ${field}.`, failures);
});

assert(snapshotHelper.includes("buildAdminUserMetricsSnapshot"), "Canonical admin user metrics snapshot builder is missing.", failures);
assert(snapshotHelper.includes("readAdminUserMetricsSnapshot"), "Canonical admin user metrics snapshot reader is missing.", failures);
assert(usersRoute.includes("buildAdminUserMetricsSnapshot"), "User Management summary route must use the canonical admin user metrics snapshot builder.", failures);
assert(overviewRoute.includes("readAdminUserMetricsSnapshot"), "Admin overview must read the canonical admin user metrics snapshot.", failures);
assert(usersPage.includes('data-admin-users-stats-layout="compact-grid"'), "User Management stats grid must keep the compact layout marker.", failures);
assert(statsGridValidator.includes('data-admin-users-stats-layout="compact-grid"'), "Stats-grid validator must enforce the compact layout marker.", failures);
assert(loadingLanesValidator.includes('authFetch("/api/admin/users?mode=summary")'), "Loading-lanes validator must enforce the separate summary lane.", failures);

assert(!usersPage.includes('value: summary ? `${summary.totalWatchHours ?? 0}h` : "[unavailable]"'), "User Management Watch card must not fall back to a huge [unavailable] value.", failures);
assert(!usersPage.includes('formatSummaryCount = (value?: number) => summary ? (value ?? 0).toLocaleString() : "[unavailable]"'), "Summary metric cards must not hide the compact grid behind [unavailable] placeholders.", failures);
assert(usersPage.includes("data-admin-users-metric-state"), "User Management metric cards must expose data-admin-users-metric-state.", failures);
assert(usersPage.includes("data-admin-users-metric-source"), "User Management metric cards must expose data-admin-users-metric-source.", failures);

assert(behaviorContract.includes("confidence") && behaviorContract.includes("source") && behaviorContract.includes("issues"), "Per-user behavior rollup contract is incomplete.", failures);
assert(behaviorHelper.includes("watch_time_missing_despite_views"), "Per-user behavior rollup helper must flag missing watch time despite views.", failures);
assert(usersRoute.includes("buildUserBehaviorRollup"), "User Management route must build per-user behavior rollups.", failures);
assert(userDetailRoute.includes("buildUserBehaviorRollup"), "User detail route must build per-user behavior rollups.", failures);
assert(usersPage.includes("behaviorRollup"), "User Management must render the per-user behavior rollup.", failures);
assert(userDetailPage.includes("behaviorRollup"), "User detail must render the per-user behavior rollup.", failures);

assert(watchTruthValidator.includes("watch_session_rollup"), "Watch-time truth validator must enforce watch-session-first sourcing.", failures);
assert(watchTruthValidator.includes("legacy_page_duration"), "Watch-time truth validator must enforce labeled legacy page-duration fallback.", failures);
assert(userDetailRoute.includes("buildWatchTimeRollupFromRecords"), "User detail route must use canonical watch-time rollups.", failures);
assert(usersRoute.includes("buildWatchTimeRollupFromRecords"), "User Management route must use canonical watch-time rollups.", failures);
assert(snapshotHelper.includes("analytics_watch_sessions"), "Admin user metrics snapshot must read watch-session rollups.", failures);

assert(behaviorValidator.includes("Insufficient signal"), "Behavioral confidence validator must enforce compact insufficient-signal state.", failures);
assert(
  behaviorValidator.includes(".slice(0, recommendationState.explanationEligible ? limit : Math.min(limit, 3))"),
  "Behavioral confidence validator must enforce capped fallback recommendations.",
  failures,
);
assert(userDetailPage.includes("Insufficient signal"), "User detail page must show the compact insufficient-signal state.", failures);
assert(userDetailPage.includes("fallback recommendation"), "User detail page must clearly label fallback recommendations.", failures);

assert(actionValidator.includes("normalizeUserAction"), "Action-ledger validator must enforce normalized user actions.", failures);
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
assert(usersPage.includes("const summaryTransportState"), "User Management must separate static snapshot truth from transport truth.", failures);

if (failures.length > 0) {
  console.error("Admin user behavior truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin user behavior truth validation passed.");
