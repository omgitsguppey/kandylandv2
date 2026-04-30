import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "GA totals minus identified first-party traffic",
  "anonymous first-party batches are absent",
  "polled route snapshot",
  "failed closed",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-audience-snapshot] ${message}`);
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

const component = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const helper = read("src/lib/admin-analytics-audience-snapshot.ts");
const route = read("src/app/api/admin/analytics/historical/route.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const doc = read("docs/agent-truth/admin-analytics-audience-snapshot.md");
const allVisibleSources = [component, helper].join("\n");

assertIncludes("AdminAnalyticsAudienceTab", component, "label=\"GA Users\"");
assertIncludes("AdminAnalyticsAudienceTab", component, "label=\"Guest Visits\"");
assertNotIncludes("AdminAnalyticsAudienceTab", component, "label=\"Active Users\"");
assertIncludes("AdminAnalyticsAudienceTab", component, "statusBadgeLabel={guestBadgeLabel}");
assertIncludes("AdminAnalyticsAudienceTab", component, "guestBadgeLabel");
assertIncludes("AdminAnalyticsAudienceTab", component, "EST");
assertIncludes("AdminAnalyticsAudienceTab", component, "stroke=\"#ffffff\"");
assertIncludes("AdminAnalyticsAudienceTab", component, "stroke=\"#b28cff\"");
assertIncludes("AdminAnalyticsAudienceTab", component, "fontSize={10}");
assertIncludes("AdminAnalyticsAudienceTab", component, "audienceSnapshotModel.chartHeightClass");
assertIncludes("AdminAnalyticsAudienceTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__");
assertIncludes("AdminAnalyticsAudienceTab", component, "Identified first-party");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Audience Snapshot copy", allVisibleSources, phrase);
}

assertIncludes("audience snapshot helper", helper, "totalUsers");
assertIncludes("audience snapshot helper", helper, "totalUsersSource");
assertIncludes("audience snapshot helper", helper, "identifiedUsers");
assertIncludes("audience snapshot helper", helper, "estimated_guest_traffic");
assertIncludes("audience snapshot helper", helper, "guestEstimateFormula");
assertIncludes("audience snapshot helper", helper, "guestEstimateFormulaUsed");
assertIncludes("audience snapshot helper", helper, "guestEstimateClamped");
assertIncludes("audience snapshot helper", helper, "fakeZeroPrevented");
assertIncludes("audience snapshot helper", helper, "selectedRange");
assertIncludes("audience snapshot helper", helper, "gaDailyTableAvailability");
assertIncludes("audience snapshot helper", helper, "gaIntradayTableAvailability");
assertIncludes("audience snapshot helper", helper, "chartHeightClass: \"h-44 md:h-64\"");
assertIncludes("audience snapshot helper", helper, "badgeOverflowProtectionEnabled: true");
assertIncludes("audience snapshot helper", helper, "Waiting");
assertIncludes("audience snapshot helper", helper, "Unavailable");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsAudienceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "audienceSnapshotModel");
assertIncludes("historical analytics route", route, "guestTraffic: payload.guestTraffic");
assertIncludes("MetricCard primitive", primitives, "statusBadgeLabel?: string");
assertIncludes("MetricCard primitive", primitives, "max-w-[5.75rem]");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsAudienceSnapshot");
assertIncludes("AdminDebugRoute", debugRoute, "guestEstimateFormulaSource");

assertIncludes("agent truth doc", doc, "identified first-party");
assertIncludes("agent truth doc", doc, "Guest Estimate Rule");
assertIncludes("agent truth doc", doc, "The Audience Snapshot primary line is white");
assertIncludes("agent truth doc", doc, "Future agents must not display authenticated-only");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Audience Snapshot contract check passed.");
