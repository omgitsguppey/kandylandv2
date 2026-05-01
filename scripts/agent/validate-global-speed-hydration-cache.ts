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

const audit = readRequired("agent/state/global-speed-hydration-cache-audit.generated.json");
const globalLoadingDoc = readRequired("docs/agent-truth/global-loading-performance.md");
const refreshDoc = readRequired("docs/agent-truth/refresh-based-hot-cache.md");
const routeCache = readRequired("src/lib/server/ephemeral-route-cache.ts");
const refreshContract = readRequired("src/lib/cache/refresh-cache-contract.ts");
const userActivityRoute = readRequired("src/app/api/user/activity/route.ts");
const recentActivityFeed = readRequired("src/components/Dashboard/RecentActivityFeed.tsx");
const dashboardPage = readRequired("src/app/dashboard/page.tsx");
const dropsPage = readRequired("src/app/drops/page.tsx");
const experiencesPage = readRequired("src/app/experiences/page.tsx");
const useDrops = readRequired("src/hooks/useDrops.ts");
const useNotifications = readRequired("src/hooks/useNotifications.ts");
const notificationRoute = readRequired("src/app/api/notifications/route.ts");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const packageJson = readRequired("package.json");

for (const routeKey of [
  "\"admin.analytics\"",
  "\"admin.overview\"",
  "\"user.dashboard\"",
  "\"drops.page\"",
  "\"wallet.packages\"",
  "\"chat.messages\"",
  "\"experiences.page\"",
  "\"notifications\"",
  "\"app.shell\"",
  "\"api.user.activity\"",
  "\"service-worker\"",
]) {
  requireIncludes(audit, routeKey, "Global speed hydration cache audit");
}

for (const auditNeedle of [
  "\"blocksOnRealtime\"",
  "\"blocksOnRefresh\"",
  "\"blocksOnTimeLimitExpiration\"",
  "\"clearsDataOnRefresh\"",
  "\"clearsDataOnStale\"",
  "\"genericWaitingRisk\"",
  "\"fakeZeroRisk\"",
  "\"usesRouterRefreshAsInvalidation\"",
  "\"privatePublicCacheMode\"",
  "\"fixed\"",
]) {
  requireIncludes(audit, auditNeedle, "Global speed hydration cache audit");
}

for (const doctrineNeedle of [
  "Age changes the label, not the existence of the data",
  "Verified data stays visible until replaced",
  "refresh failure keeps the previous verified payload visible",
  "One slow module cannot block unrelated modules",
  "Waiting must say why",
  "Private/admin data must not be publicly CDN cached",
]) {
  requireIncludes(globalLoadingDoc + refreshDoc, doctrineNeedle, "Global refresh doctrine docs");
}

requireIncludes(refreshContract, "dedupeRefresh", "Refresh cache contract");
requireIncludes(refreshContract, "markRefreshFailed", "Refresh cache contract");
requireIncludes(routeCache, "staleInflightLoads", "Route cache refresh dedupe");
requireIncludes(routeCache, "staleButVerified: true", "Route cache stale display preservation");
requireIncludes(routeCache, "retainedBeyondStaleTtl", "Route cache time-age display preservation");

requireIncludes(userActivityRoute, "readThroughStaleWhileRevalidateEphemeralRouteCache", "User activity route cache policy");
requireIncludes(userActivityRoute, "USER_ACTIVITY_CACHE_STALE_TTL_MS", "User activity route stale policy");
requireIncludes(userActivityRoute, "staleButVerified", "User activity route metadata");
requireIncludes(userActivityRoute, "blocksOnTimeExpiry: false", "User activity route debug metadata");
requireIncludes(userActivityRoute, "PRIVATE_REVALIDATE_CACHE_CONTROL", "User activity route private cache-control");
requireIncludes(userActivityRoute, "Promise.all", "User activity route parallel fetch");
requireNotIncludes(userActivityRoute, "import { readThroughEphemeralRouteCache", "User activity route display cache");

requireIncludes(recentActivityFeed, "summaryInFlightRef", "Recent activity refresh dedupe");
requireIncludes(recentActivityFeed, "historyInFlightRef", "Recent activity refresh dedupe");
requireIncludes(recentActivityFeed, "loadingHistory && !historyActivities.length", "Recent activity preserves history while refreshing");
requireIncludes(dashboardPage, "Promise.all", "Dashboard initial server fetches");
requireIncludes(dropsPage, "Promise.all", "Drops initial server fetches");
requireIncludes(experiencesPage, "Promise.all", "Experiences initial server fetches");
requireIncludes(useDrops, "fallbackData", "Drops server-seeded first render");
requireIncludes(useDrops, "refreshDrops(isConstrained ? 6_000 : 1_500)", "Drops refresh storm throttle");
requireIncludes(useDrops, "revalidateOnMount: !hasServerSeed", "Drops avoids duplicate first refresh");
requireIncludes(useNotifications, "consecutiveFailuresRef", "Notifications failure does not blank state");
requireIncludes(useNotifications, "setLoadError(message)", "Notifications exposes failure reason");
requireIncludes(notificationRoute, "PRIVATE_REVALIDATE_CACHE_CONTROL", "Notifications route private cache-control");
requireIncludes(chatExperience, "background?: boolean", "Chat background refresh contract");
requireIncludes(chatExperience, "keepCurrentDetailVisible", "Chat keeps matching thread detail during refresh");
requireIncludes(chatExperience, "Promise.allSettled", "Chat partial bulk write behavior");
requireIncludes(mobileShell, "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT", "Mobile safe-area contract");
requireIncludes(packageJson, "check:global-speed-hydration-cache", "Package scripts");

for (const scopedSource of [
  userActivityRoute,
  recentActivityFeed,
  useDrops,
  useNotifications,
  chatExperience,
].join("\n").split("\n")) {
  if (scopedSource.includes("Waiting for analytics") || scopedSource.includes("Waiting\"")) {
    failures.push("Scoped user/admin loading code must not include generic Waiting copy.");
    break;
  }
}

if (failures.length > 0) {
  console.error("Global speed hydration cache validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Global speed hydration cache validation passed.");
