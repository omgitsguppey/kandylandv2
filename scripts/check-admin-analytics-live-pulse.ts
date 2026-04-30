import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "realtime lane",
  "B7WciP8I1Qbtk9CevdfpZTjferR2",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-live-pulse] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) {
    fail(`${file} is missing ${expected}`);
  }
}

function assertNotIncludes(file: string, source: string, unexpected: string) {
  if (source.includes(unexpected)) {
    fail(`${file} still contains ${unexpected}`);
  }
}

const component = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const realtimeHook = read("src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts");
const helper = read("src/lib/admin-analytics-live-pulse.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const doc = read("docs/agent-truth/admin-analytics-live-pulse.md");
const livePulseSection = component.slice(
  component.indexOf('title="Live Pulse"'),
  component.indexOf('title="Journey Funnel"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "livePulseModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__");
assertIncludes("AdminAnalyticsOperationsTab", component, "compactChartHeightClass");
assertIncludes("AdminAnalyticsOperationsTab", component, "Waiting for pulse data");
assertIncludes("AdminAnalyticsOperationsTab", component, "Graph source unavailable");
assertIncludes("AdminAnalyticsOperationsTab", component, "displayLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "actorBadgeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "routeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "actionLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "fullDebugId");
assertIncludes("AdminAnalyticsOperationsTab", component, "rounded-[0.9rem]");
assertNotIncludes("Live Pulse section", livePulseSection, "rounded-2xl border border-white/10 bg-white/[0.03] p-3");
assertNotIncludes("Live Pulse section", livePulseSection, "{item.username}");
assertNotIncludes("Live Pulse section", livePulseSection, "sessionKey.slice");
assertNotIncludes("Live Pulse section", livePulseSection, "h-64 w-full md:h-72");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Live Pulse copy", livePulseSection, phrase);
}

assertIncludes("live pulse helper", helper, "graphSourceMismatch");
assertIncludes("live pulse helper", helper, "graphDerivedFromPresence");
assertIncludes("live pulse helper", helper, "deriveGraphFromPresence");
assertIncludes("live pulse helper", helper, "rawIdentityIds");
assertIncludes("live pulse helper", helper, "fakeZeroPrevented");
assertIncludes("live pulse helper", helper, "hydrationBudgetExceeded");
assertIncludes("live pulse helper", helper, "onDisconnectRegistered");
assertIncludes("live pulse helper", helper, "reconnectReestablishesOnDisconnect");
assertIncludes("live pulse helper", helper, "includeMetadataChanges: true");
assertIncludes("live pulse helper", helper, 'compactChartHeightClass: "h-36 md:h-56"');
assertIncludes("live pulse helper", helper, "Guest session");
assertIncludes("live pulse helper", helper, "firestoreFromCache");
assertIncludes("live pulse helper", helper, "gaIntradayStatus");
assertIncludes("live pulse helper", helper, "backendSnapshotStatus");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsLivePulseModel");
assertIncludes("useAdminAnalyticsState", hook, "listenerDebugMeta: liveRealtime.listenerDebugMeta");
assertIncludes("useAdminAnalyticsRealtime", realtimeHook, "includeMetadataChanges: true");
assertIncludes("MetricCard primitive", primitives, "max-w-[5.75rem]");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsLivePulse");
assertIncludes("AdminDebugRoute", debugRoute, "rawIdentityIdsLocation");

assertIncludes("agent truth doc", doc, "Raw IDs must not be the primary visible label");
assertIncludes("agent truth doc", doc, "onDisconnect before writing online state");
assertIncludes("agent truth doc", doc, "derive a lightweight graph from presence timestamps");
assertIncludes("agent truth doc", doc, "compact on mobile");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Live Pulse contract check passed.");
