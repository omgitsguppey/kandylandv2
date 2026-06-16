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
const contracts = read("src/lib/admin-analytics-contracts.ts");
const adminUserTruthSnapshot = read("src/lib/server/admin-user-truth-snapshot.ts");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const realtimeHook = read("src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts");
const helper = read("src/lib/admin-analytics-live-pulse.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const doc = read("docs/agent-truth/admin-analytics-live-pulse.md");
const livePulseSection = component.slice(
  component.indexOf('title="Activity Snapshot"'),
  component.indexOf('title="Journey Funnel"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, 'title="Activity Snapshot"');
assertNotIncludes("AdminAnalyticsOperationsTab", component, 'title="Live Pulse"');
assertIncludes("AdminAnalyticsOperationsTab", component, "livePulseModel");
assertIncludes("admin user truth snapshot", adminUserTruthSnapshot, "buildAdminUserTruthSnapshot");
assertIncludes("AdminAnalyticsOperationsTab", component, "resolveAdminAnalyticsLivePulseBadgeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "formatAdminAnalyticsJourneyDenominatorMode");
assertNotIncludes("AdminAnalyticsOperationsTab", component, "const livePulseBadgeLabel = livePulseModel.mode");
assertNotIncludes("AdminAnalyticsOperationsTab", component, "function formatJourneyDenominatorMode");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__");
assertIncludes("AdminAnalyticsOperationsTab", component, "compactChartHeightClass");
assertIncludes("AdminAnalyticsOperationsTab", component, "Graph awaiting first snapshot.");
assertIncludes("AdminAnalyticsOperationsTab", component, "Graph waiting for a realtime upgrade.");
assertIncludes("AdminAnalyticsOperationsTab", component, "Surface detail has no verified realtime upgrade yet.");
assertIncludes("AdminAnalyticsOperationsTab", component, "displayLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "topWarningDetail");
assertIncludes("AdminAnalyticsOperationsTab", component, "guestEstimateState");
assertIncludes("AdminAnalyticsOperationsTab", component, "guestSnapshotTruthState");
assertIncludes("AdminAnalyticsOperationsTab", component, "guestSnapshotSourceLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "guestSnapshotReason");
assertIncludes("AdminAnalyticsOperationsTab", component, "graphSourceLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "graphLegendLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "purposeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "shortUserId");
assertIncludes("AdminAnalyticsOperationsTab", component, "sourceTruth");
assertIncludes("AdminAnalyticsOperationsTab", component, "mobilePrimaryIdentitySummary");
assertIncludes("AdminAnalyticsOperationsTab", component, "data-admin-analytics-mobile-can-show-identity-details");
assertIncludes("AdminAnalyticsOperationsTab", component, "hidden space-y-1.5 md:block");
assertIncludes("AdminAnalyticsOperationsTab", component, "actorBadgeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "routeLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "actionLabel");
assertIncludes("AdminAnalyticsOperationsTab", component, "fullDebugId");
assertIncludes("AdminAnalyticsOperationsTab", component, "rounded-[0.9rem]");
assertNotIncludes("Live Pulse section", livePulseSection, "rounded-2xl border border-white/10 bg-white/[0.03] p-3");
assertNotIncludes("Live Pulse section", livePulseSection, "{item.username}");
assertNotIncludes("Live Pulse section", livePulseSection, "sessionKey.slice");
assertNotIncludes("Live Pulse section", livePulseSection, "h-64 w-full md:h-72");
assertNotIncludes("Live Pulse section", livePulseSection, "Waiting for pulse data");
assertNotIncludes("Live Pulse section", livePulseSection, "Graph waiting for live data.");
assertNotIncludes("Live Pulse section", livePulseSection, "Graph source unavailable");
assertNotIncludes("Live Pulse section", livePulseSection, "Surface detail waiting for live data.");
assertNotIncludes("Live Pulse section", livePulseSection, "Realtime surfaces are waiting for presence rows.");
assertNotIncludes("Live Pulse section", livePulseSection, 'title="Live Pulse"');
assertNotIncludes("Live Pulse section", livePulseSection, "Realtime surfaces");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Live Pulse copy", livePulseSection, phrase);
}

assertIncludes("admin analytics contracts", contracts, "\"live_pulse\"");
assertIncludes("admin analytics contracts", contracts, "\"journey_funnel\"");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsLivePulseBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "formatAdminAnalyticsJourneyDenominatorMode");

assertIncludes("live pulse helper", helper, "graphSourceMismatch");
assertIncludes("live pulse helper", helper, "graphDerivedFromPresence");
assertIncludes("live pulse helper", helper, "deriveGraphFromPresence");
assertIncludes("live pulse helper", helper, "rawIdentityIds");
assertIncludes("live pulse helper", helper, "fakeZeroPrevented");
assertIncludes("live pulse helper", helper, "hydrationBudgetExceeded");
assertIncludes("live pulse helper", helper, "onDisconnectRegistered");
assertIncludes("live pulse helper", helper, "reconnectReestablishesOnDisconnect");
assertIncludes("live pulse helper", helper, "includeMetadataChanges: true");
assertIncludes("live pulse helper", helper, 'compactChartHeightClass: "h-28 md:h-56"');
assertIncludes("live pulse helper", helper, "mobilePrimaryIdentitySummary");
assertIncludes("live pulse helper", helper, "mobileCanShowIdentityDetails");
assertIncludes("live pulse helper", helper, "mobileSurfaceRowsLimit");
assertIncludes("live pulse helper", helper, "Guest session");
assertIncludes("live pulse helper", helper, "generatedAtUtc");
assertIncludes("live pulse helper", helper, "delayed_snapshot");
assertIncludes("live pulse helper", helper, "guestEstimateState");
assertIncludes("live pulse helper", helper, "guestEstimateConfidence");
assertIncludes("live pulse helper", helper, "guestMixLabel");
assertIncludes("live pulse helper", helper, "resolveGuestSnapshotDisplay");
assertIncludes("live pulse helper", helper, "guestSamplesAvailable");
assertIncludes("live pulse helper", helper, "sourceSampleCounts.analytics_guest_batches");
assertIncludes("live pulse helper", helper, "Guest unavailable");
assertIncludes("live pulse helper", helper, "Guest snapshot stale");
assertIncludes("live pulse helper", helper, "Identity linked");
assertIncludes("live pulse helper", helper, "graphSourceLabel");
assertIncludes("live pulse helper", helper, "graphLegendLabel");
assertIncludes("live pulse helper", helper, "sourceTruth");
assertIncludes("live pulse helper", helper, "firestoreFromCache");
assertIncludes("live pulse helper", helper, "gaIntradayStatus");
assertIncludes("live pulse helper", helper, "backendSnapshotStatus");
assertIncludes("live pulse helper", helper, "displayStatePolicyApplied: true");
assertIncludes("live pulse helper", helper, "realtimeBlocksFirstRender: false");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsLivePulseModel");
assertIncludes("useAdminAnalyticsState", hook, "listenerDebugMeta: liveRealtime.listenerDebugMeta");
assertIncludes("useAdminAnalyticsState", hook, "resolveAdminAnalyticsDisplayState");
assertIncludes("useAdminAnalyticsState", hook, "guestEstimateSourceLabel");
assertIncludes("useAdminAnalyticsState", hook, "guestEstimateConfidence");
assertIncludes("useAdminAnalyticsState", hook, "ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST");
assertIncludes("useAdminAnalyticsState", hook, "rawDisplayFallbackDisabled: true");
assertIncludes("useAdminAnalyticsState", hook, "sourceUse: \"snapshot_first_route\"");
assertNotIncludes("useAdminAnalyticsState", hook, "from \"./useAdminAnalyticsRealtime\"");
assertNotIncludes("useAdminAnalyticsState", hook, "useAdminAnalyticsRealtime(");
assertIncludes("useAdminAnalyticsRealtime", realtimeHook, "includeMetadataChanges: true");
assertIncludes("MetricCard primitive", primitives, "max-w-[5.75rem]");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsLivePulse");
assertIncludes("AdminDebugRoute", debugRoute, "rawIdentityIdsLocation");
assertIncludes("AdminDebugRoute", debugRoute, "guestSnapshotTruthState");
assertIncludes("AdminDebugRoute", debugRoute, "guestSnapshotSourceLabel");
assertIncludes("AdminDebugRoute", debugRoute, "guestSnapshotReason");
assertIncludes("agent truth doc", doc, "Backend or polled data remains snapshot/stale truth");
assertIncludes("agent truth doc", doc, "event/action");

assertIncludes("agent truth doc", doc, "Raw IDs must not be the primary visible label");
assertIncludes("agent truth doc", doc, "onDisconnect before writing online state");
assertIncludes("agent truth doc", doc, "derive a lightweight graph from presence timestamps");
assertIncludes("agent truth doc", doc, "compact on mobile");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Live Pulse contract check passed.");
