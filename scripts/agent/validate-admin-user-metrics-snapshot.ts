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
const overviewRoute = read("src/app/api/admin/overview/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
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
assert(overviewRoute.includes("readAdminUserMetricsSnapshot"), "Admin overview route must read the canonical user metrics snapshot.");
assert(overviewRoute.includes("userMetricsSnapshot"), "Admin overview stats must include the canonical snapshot.");
assert(types.includes("metricsSnapshot?: AdminUserMetricsSnapshot"), "UsersSummary must expose snapshot metadata.");
assert(usersPage.includes("data-admin-metric-source") && usersPage.includes("data-admin-metric-freshness"), "Admin users page must expose metric source/freshness metadata.");
assert(statsBar.includes("data-admin-metric-source") && statsBar.includes("data-admin-metric-freshness"), "Admin stats bar must expose metric source/freshness metadata.");

console.log("Admin user metrics snapshot contract is wired.");
