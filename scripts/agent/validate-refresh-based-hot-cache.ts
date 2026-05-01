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

const contract = readRequired("src/lib/cache/refresh-cache-contract.ts");
const snapshotContract = readRequired("src/lib/analytics/admin-metric-snapshot.ts");
const snapshotStore = readRequired("src/lib/server/admin-analytics-snapshots.ts");
const loadingHelper = readRequired("src/lib/analytics/admin-analytics-loading-state.ts");
const displayState = readRequired("src/lib/analytics/admin-analytics-display-state.ts");
const stateHook = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const snapshotHook = readRequired("src/hooks/useAdminAnalyticsSnapshot.ts");
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const realtimeRoute = readRequired("src/app/api/admin/analytics/realtime/route.ts");
const historicalRoute = readRequired("src/app/api/admin/analytics/historical/route.ts");
const routeCache = readRequired("src/lib/server/ephemeral-route-cache.ts");
const analyticsData = readRequired("src/lib/server/admin-analytics-data.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const audit = readRequired("agent/state/refresh-cache-loading-audit.generated.json");
const doctrine = readRequired("docs/agent-truth/refresh-based-hot-cache.md");
const hotCacheDoc = readRequired("docs/agent-truth/admin-analytics-hot-cache.md");
const truthDoc = readRequired("docs/agent-truth/analytics-truth-layer-v2.md");
const sourceHierarchyDoc = readRequired("docs/agent-truth/analytics-source-hierarchy.md");
const packageJson = readRequired("package.json");

for (const state of [
  "verified",
  "refreshing",
  "refresh_failed",
  "stale_but_verified",
  "unavailable",
  "pending_first_snapshot",
  "server_confirmed",
  "cache_confirmed",
  "estimated",
  "mixed",
  "legacy_mapped",
]) {
  requireIncludes(contract, `"${state}"`, "Refresh cache states");
}

for (const field of [
  "cacheKey",
  "moduleKey",
  "surfaceKey",
  "rangeKey",
  "lastVerifiedAt",
  "lastRefreshRequestedAt",
  "lastRefreshStartedAt",
  "lastRefreshCompletedAt",
  "lastRefreshFailedAt",
  "refreshVersion",
  "sourceVersion",
  "invalidationReason",
  "sourceMode",
  "truthState",
  "confidence",
  "parityWarnings",
  "estimatedFlags",
  "legacyFlags",
]) {
  requireIncludes(contract, field, "Refresh cache contract");
  requireIncludes(snapshotContract + snapshotStore + debugRoute, field, "Admin snapshot refresh metadata");
}

for (const helper of [
  "requestRefresh",
  "dedupeRefresh",
  "markRefreshStarted",
  "markRefreshCompleted",
  "markRefreshFailed",
  "getLastVerifiedOrNull",
  "getDisplaySnapshot",
  "getRefreshStatus",
  "shouldShowWaiting",
  "shouldShowStale",
  "shouldShowUnavailable",
]) {
  requireIncludes(contract, helper, "Refresh cache policy helper");
}

requireIncludes(snapshotContract, "getAdminMetricDisplaySnapshot", "Admin metric display snapshot helper");
requireIncludes(snapshotContract, "resolveAdminMetricRefreshCacheDisplayState", "Admin metric refresh display helper");
requireIncludes(snapshotContract, "return isAdminMetricSnapshotFresh(snapshot, nowMs) ? \"verified_cache\" : \"stale_cache\"", "Age changes source label only");
requireIncludes(snapshotStore, "normalizeAdminMetricSnapshotRefreshFields", "Snapshot storage normalization");
requireIncludes(snapshotStore, "refreshVersion: (existing?.refreshVersion ?? result.refreshVersion ?? 0) + 1", "Refresh version completion rule");
requireIncludes(snapshotStore, "displayAllowedBecause", "Admin Debug display allowed reason");
requireIncludes(snapshotStore, "blocksOnTimeExpiry: false", "No time-expiry display block");
requireIncludes(snapshotHook, "setSnapshot((current) => result.snapshot ?? current)", "Client refresh must preserve snapshot");
requireIncludes(refreshRoute, "{ status: snapshot ? 200 : 500 }", "Refresh failure preserves stale snapshot response");
requireIncludes(displayState, "Realtime delayed. Showing last verified snapshot.", "Realtime failure keeps snapshot visible");
requireIncludes(displayState, "No verified snapshot yet.", "No-snapshot copy");
requireIncludes(loadingHelper, "No verified snapshot yet", "Reasoned waiting copy");
requireIncludes(stateHook, "snapshotRevenueValue", "Top card snapshot-first revenue");
requireIncludes(stateHook, "snapshotPurchasesValue", "Top card snapshot-first purchases");
requireIncludes(stateHook, "snapshotMobileShareValue", "Top card snapshot-first mobile share");
requireIncludes(stateHook, "snapshotLiveActiveValue", "Top card snapshot-first live active");
requireIncludes(stateHook, "blocksOnTimeExpiry: false", "Admin overview debug time-expiry flag");
requireIncludes(stateHook, "estimatedGuestTraffic", "Guest estimate debug flag");
requireIncludes(stateHook, "anonymousBatchStatus", "Anonymous batch debug flag");
requireIncludes(routeCache, "retainedBeyondStaleTtl", "Route cache must retain stale verified payloads");
requireIncludes(routeCache, "staleButVerified: true", "Route cache stale-but-verified metadata");
requireNotIncludes(routeCache, "staleRouteCache.delete(input.key);\n  }\n\n  const loaded", "Route cache must not delete stale verified payloads before refresh");
requireIncludes(historicalRoute, "staleButVerified", "Historical route exposes stale-but-verified metadata");
requireIncludes(analyticsData, "safeQueryWithDiagnostics", "Historical loader uses partial-safe query wrappers");
requireIncludes(analyticsData, "safeRunReport", "Historical loader uses partial-safe GA wrappers");
requireIncludes(realtimeRoute, "readThroughEphemeralRouteCache", "Realtime route uses hot route cache");

for (const debugField of [
  "cacheKey",
  "refreshVersion",
  "sourceVersion",
  "lastRefreshRequestedAt",
  "displaySource",
  "displayAllowedBecause",
  "displayBlockedBecause",
  "refreshDedupeHit",
  "staleButVerified",
  "invalidationReason",
  "estimatedGuestTraffic",
  "anonymousBatchStatus",
  "blocksOnRealtime",
  "blocksOnRefresh",
  "blocksOnTimeExpiry",
  "fakeWaitingPrevented",
  "fakeZeroPrevented",
  "routerRefreshUsed",
  "revalidationUsed",
  "parityWarnings",
]) {
  requireIncludes(debugRoute, debugField, "Admin Debug refresh cache fields");
}

requireIncludes(stateHook, "guestTraffic?.truthLabel === \"estimated\"", "Guest estimate display path");
requireIncludes(stateHook, "Estimated from GA totals minus identified first-party traffic", "Guest estimate formula copy");
requireIncludes(stateHook, "Anonymous quality metrics are unavailable", "Anonymous batch caveat");
requireIncludes(audit, "\"refresh-cache.contract\"", "Refresh cache audit");
requireIncludes(audit, "\"blocksOnTimeLimitExpiration\": false", "Audit time-limit field");
requireIncludes(doctrine, "Time-limit expiration is deprecated as display gating", "Refresh cache doctrine");
requireIncludes(doctrine, "`router.refresh()` re-renders route segments but is not cache invalidation", "Router refresh doctrine");
requireIncludes(hotCacheDoc, "Refresh-Based Lifecycle Rule", "Hot-cache doc refresh lifecycle");
requireIncludes(truthDoc, "Refresh-Based Cache Update", "Truth layer doc refresh update");
requireIncludes(sourceHierarchyDoc, "stale_but_verified", "Source hierarchy stale-but-verified update");
requireIncludes(packageJson, "check:refresh-based-hot-cache", "Package scripts");

const adminAnalyticsFiles = [
  "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
  "src/hooks/useAdminAnalyticsSnapshot.ts",
  "src/hooks/useAdminAnalyticsSnapshotRegistry.ts",
  "src/app/api/admin/analytics/refresh/route.ts",
  "src/app/api/admin/analytics/historical/route.ts",
  "src/app/api/admin/analytics/realtime/route.ts",
].map(readRequired).join("\n");

requireNotIncludes(adminAnalyticsFiles, "router.refresh(", "Admin analytics must not use router.refresh as invalidation");
requireNotIncludes(adminAnalyticsFiles, "Waiting for analytics", "Generic Admin Analytics waiting copy");

if (failures.length > 0) {
  console.error("Refresh-based hot-cache validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Refresh-based hot-cache validation passed.");
