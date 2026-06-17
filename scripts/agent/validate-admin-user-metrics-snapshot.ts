import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const contract = read("src/lib/admin-user-metrics-contract.ts");
const snapshotHelper = read("src/lib/server/admin-user-metrics-snapshot.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const usersRealtimeRoute = read("src/app/api/admin/users/realtime/route.ts");
const adminRealtimePolicy = read("src/lib/admin/admin-realtime-policy.ts");
const overviewRoute = read("src/app/api/admin/overview/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const usersRealtimeHook = read("src/hooks/useAdminUsersRealtime.ts");
const overviewRealtimeHook = read("src/hooks/useAdminOverviewRealtime.ts");
const statsBar = read("src/components/Admin/AdminStatsBar.tsx");
const types = read("src/types/admin-analytics.ts");

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
  assert(contract.includes(field), `Snapshot contract missing ${field}.`);
});

assert(contract.includes('"hot_cache"') && contract.includes('"materialized"') && contract.includes('"live_fallback"'), "Snapshot source union is incomplete.");
assert(contract.includes('"live"') && contract.includes('"stale"') && contract.includes('"degraded"') && contract.includes('"unavailable"'), "Snapshot freshness union is incomplete.");
assert(snapshotHelper.includes("buildAdminUserMetricsSnapshot"), "Snapshot builder is missing.");
assert(snapshotHelper.includes("readAdminUserMetricsSnapshot"), "Snapshot reader is missing.");
assert(usersRoute.includes("buildAdminUserMetricsSnapshot"), "Admin users route must build the canonical user metrics snapshot.");
assert(usersRoute.includes("metricsSnapshot: userMetricsSnapshot"), "Admin users summary must include the canonical snapshot.");
assert(
  overviewRoute.includes("readAdminUserMetricsSnapshot")
    || overviewRoute.includes("readAdminUserTruthSnapshot")
    || (overviewRoute.includes('ADMIN_USERS_SNAPSHOT_ID = "admin_users_snapshot"') && overviewRoute.includes("readCachedUserTruthSnapshot")),
  "Admin overview route must read the canonical user metrics snapshot.",
);
assert(overviewRoute.includes("userMetricsSnapshot") || overviewRoute.includes("userTruthSnapshot"), "Admin overview stats must include the canonical snapshot.");
assert(types.includes("metricsSnapshot?: AdminUserMetricsSnapshot"), "UsersSummary must expose snapshot metadata.");
assert(usersPage.includes("data-admin-metric-source") && usersPage.includes("data-admin-metric-freshness"), "Admin users page must expose metric source/freshness metadata.");
assert(statsBar.includes("data-admin-metric-freshness"), "Admin stats bar must expose metric freshness metadata.");
assert(!statsBar.includes("data-admin-metric-source"), "Admin stats bar must not expose stale metric source debug metadata.");
assert(usersPage.includes("useAdminUsersRealtime("), "Admin users page must use the shared realtime pulse hook.");
assert(!usersPage.includes('authFetch("/api/admin/users/realtime"'), "Admin users page must not stream business metrics directly from the realtime route.");
assert(usersPage.includes("snapshotRefreshState"), "Admin users page must keep a snapshot refresh state separate from the realtime pulse.");
assert(usersPage.includes("data-admin-users-snapshot-state") && usersPage.includes("data-admin-users-pulse-state"), "Admin users page must expose snapshot and pulse state separately.");
assert(usersRealtimeHook.includes("Showing last verified snapshot"), "Admin users realtime hook must preserve the last verified snapshot during pulse reconnects.");
assert(
  usersRealtimeHook.includes("Realtime pulse failed. Showing the last verified snapshot.")
  && usersRealtimeHook.includes("Realtime pulse is delayed. Showing the last verified snapshot."),
  "Admin users realtime hook must not overwrite snapshot-backed truth with ERROR when the pulse fails.",
);
assert(
  usersRealtimeRoute.includes("metricScope: ADMIN_USERS_REALTIME_POLICY.metricScope")
    && adminRealtimePolicy.includes('metricScope: "operational_pulse_only"'),
  "Admin users realtime route must declare its invalidate-only operational scope.",
);
assert(!overviewRealtimeHook.includes("buildRealtimeOnlyOverview"), "Admin overview hook must not synthesize business totals from realtime-only state.");
assert(!overviewRealtimeHook.includes("...(realtimeData.stats || {})"), "Admin overview hook must not let realtime state overwrite canonical business totals.");

console.log("Admin user metrics snapshot contract is wired.");
