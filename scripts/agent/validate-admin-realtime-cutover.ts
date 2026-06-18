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

const policy = read("src/lib/admin/admin-realtime-policy.ts");
const overviewHook = read("src/hooks/useAdminOverviewRealtime.ts");
const usersHook = read("src/hooks/useAdminUsersRealtime.ts");
const usersRoute = read("src/app/api/admin/users/realtime/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const adminPage = read("src/app/admin/page.tsx");
const liveRuntime = read("src/lib/admin-analytics-live-runtime.ts");
const packageJson = read("package.json");

for (const required of [
  "ADMIN_OVERVIEW_REALTIME_POLICY",
  "ADMIN_USERS_REALTIME_POLICY",
  "ADMIN_ANALYTICS_REALTIME_POLICY",
  'purpose: "operational_pulse_only"',
  'businessTruthSource: "refresh_based_hot_cache"',
  "snapshotRefreshCadenceMs: ADMIN_HEARTBEAT_INTERVAL_MS",
  "heartbeatIntervalMs: ADMIN_HEARTBEAT_INTERVAL_MS",
  "costRisk:",
  "explicitCostJustification",
]) {
  assert(policy.includes(required), `Admin realtime policy must include ${required}.`);
}

assert(
  overviewHook.includes("refreshInterval: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs"),
  "Admin overview hook must use the snapshot refresh cadence from the canonical realtime policy.",
);
assert(
  overviewHook.includes("stats: serverData.stats")
    && overviewHook.includes("deltas: serverData.deltas")
    && overviewHook.includes("topDrops: serverData.topDrops"),
  "Admin overview hook must preserve canonical snapshot business totals during realtime merges.",
);
for (const forbiddenRealtimeMetric of [
  "grossRevenueCents:",
  "totalUnwraps:",
  "liveDrops:",
  "totalDrops:",
  "...realtimeData,",
]) {
  assert(
    !overviewHook.includes(forbiddenRealtimeMetric),
    `Admin overview hook must not recompute canonical business metrics from realtime (${forbiddenRealtimeMetric}).`,
  );
}
assert(
  overviewHook.includes("Refresh due")
    && overviewHook.includes("Verified snapshot shown")
    && overviewHook.includes("Showing hourly hot-cache snapshot"),
  "Admin overview hook must keep snapshot/cache totals visible when refresh lanes are delayed.",
);
assert(
  overviewHook.includes("metricScope: ADMIN_OVERVIEW_REALTIME_POLICY.metricScope")
    && overviewHook.includes("businessTruthSource: ADMIN_OVERVIEW_REALTIME_POLICY.businessTruthSource"),
  "Admin overview realtime debug metadata must expose operational-only policy fields.",
);

assert(
  usersHook.includes("payload.metricScope !== ADMIN_USERS_REALTIME_POLICY.metricScope"),
  "Admin users realtime hook must reject non-operational realtime payload scopes.",
);
assert(
  usersHook.includes("Snapshot refresh failed. Showing the last verified snapshot.")
    && usersHook.includes("Refresh due. Showing the last verified snapshot."),
  "Admin users realtime hook must preserve the last verified snapshot during realtime failures.",
);

for (const requiredRouteField of [
  "purpose: ADMIN_USERS_REALTIME_POLICY.purpose",
  "owner: ADMIN_USERS_REALTIME_POLICY.owner",
  "cadenceMs: ADMIN_USERS_REALTIME_POLICY.heartbeatIntervalMs",
  "cadenceMs: ADMIN_USERS_REALTIME_POLICY.snapshotRefreshCadenceMs",
  "costRisk: ADMIN_USERS_REALTIME_POLICY.costRisk",
  "metricScope: ADMIN_USERS_REALTIME_POLICY.metricScope",
]) {
  assert(usersRoute.includes(requiredRouteField), `Admin users realtime route must declare ${requiredRouteField}.`);
}

assert(
  usersPage.includes("snapshotRefreshState")
    && usersPage.includes("useAdminUsersRealtime(")
    && usersPage.includes('data-admin-users-snapshot-state')
    && usersPage.includes('data-admin-users-pulse-state'),
  "Admin users page must keep snapshot and operational pulse state separate.",
);
assert(
  adminPage.includes("buildAdminOverviewPageData")
    && (adminPage.includes("useAdminOverview()") || adminPage.includes("useAdminOverview({")),
  "Admin overview page must keep using canonical page data instead of inline realtime totals.",
);
assert(
  liveRuntime.includes("ADMIN_ANALYTICS_REALTIME_SCOPE = ADMIN_ANALYTICS_REALTIME_POLICY.metricScope")
    && liveRuntime.includes("Canonical business totals stay on refresh-based snapshots."),
  "Admin analytics live runtime must stay boxed as operational pulse only.",
);

assert(
  packageJson.includes('"check:admin-realtime-cutover": "tsx scripts/agent/validate-admin-realtime-cutover.ts"'),
  "package.json must expose check:admin-realtime-cutover.",
);

console.log("Admin realtime cutover validation passed.");
