import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const audit = readRequired("agent/state/global-loading-performance-audit.generated.json");
const doctrine = readRequired("docs/agent-truth/global-loading-performance.md");
const helper = readRequired("src/lib/analytics/admin-analytics-loading-state.ts");
const stateHook = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const snapshotHook = readRequired("src/hooks/useAdminAnalyticsSnapshot.ts");
const registry = readRequired("src/hooks/useAdminAnalyticsSnapshotRegistry.ts");
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const realtimeRoute = readRequired("src/app/api/admin/analytics/realtime/route.ts");
const historicalRoute = readRequired("src/app/api/admin/analytics/historical/route.ts");
const loadingBoundary = readRequired("src/app/admin/analytics/loading.tsx");
const packageJson = readRequired("package.json");

for (const auditNeedle of [
  "\"admin.analytics.page\"",
  "\"admin.analytics.state-hook\"",
  "\"verifiedSnapshotFirst\": true",
  "\"blocksOnRealtime\": false",
  "\"blocksOnRefresh\": false",
  "\"cacheControlStatus\"",
  "\"fakeWaitingRisk\"",
]) {
  requireIncludes(audit, auditNeedle, "Global loading audit");
}

for (const doctrineNeedle of [
  "verified hot cache first",
  "Waiting for first snapshot",
  "No verified snapshot yet",
  "Source unavailable",
  "Generic `Waiting` or `Waiting for analytics` is forbidden",
  "Manual refresh and background refresh must never clear visible verified snapshots",
  "Private admin analytics routes must not be publicly CDN cached",
  "SnapshotMetadata.fromCache",
]) {
  requireIncludes(doctrine, doctrineNeedle, "Global loading doctrine");
}

for (const helperNeedle of [
  "readAdminSnapshotNumberValue",
  "normalizeAdminSnapshotRatio",
  "resolveAdminSnapshotSurfaceState",
  "resolveAdminAnalyticsWaitingCopy",
  "Waiting for first snapshot",
  "No verified snapshot yet",
  "Source unavailable",
]) {
  requireIncludes(helper, helperNeedle, "Shared loading helper");
}

for (const hookNeedle of [
  "snapshotRevenueValue",
  "snapshotPurchasesValue",
  "snapshotMobileShareValue",
  "snapshotLiveActiveValue",
  "hasOverviewSnapshotFirstValue",
  "snapshotUsedOnFirstRender",
  "waitingShownBecause",
  "waitingAllowed",
  "blocksOnRealtime",
  "blocksOnRefresh",
  "fallbackSnapshotUsed",
  "fakeWaitingPrevented",
  "waterfallDetected",
  "slowSource",
  "cacheControlMode",
]) {
  requireIncludes(stateHook, hookNeedle, "Admin Analytics state hook");
}

requireNotIncludes(stateHook, "\"Waiting\"", "Admin Analytics state hook top-card copy");
requireNotIncludes(stateHook, "Waiting for analytics", "Admin Analytics state hook");
requireIncludes(stateHook, "Waiting for first analytics snapshot", "Admin Analytics source label");
requireIncludes(snapshotHook, "setSnapshot((current) => result.snapshot ?? current)", "Snapshot refresh preservation");
requireIncludes(registry, "snapshot: AdminMetricSnapshot | null", "Snapshot registry state");
requireIncludes(registry, "snapshot: input.result.snapshot", "Snapshot registry state");
requireIncludes(refreshRoute, "\"Cache-Control\": \"private, no-store\"", "Manual refresh cache-control");
requireIncludes(refreshRoute, "{ status: snapshot ? 200 : 500 }", "Manual refresh stale snapshot preservation");
requireIncludes(realtimeRoute, "Promise.all", "Realtime route partial parallel behavior");
requireIncludes(historicalRoute, "readThroughStaleWhileRevalidateEphemeralRouteCache", "Historical route stale-while-revalidate");
requireIncludes(loadingBoundary, "Loading admin analytics snapshot cards", "Admin Analytics loading boundary");
requireIncludes(packageJson, "check:global-loading-performance", "Package scripts");

if (failures.length > 0) {
  console.error("Global loading performance validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Global loading performance validation passed.");
