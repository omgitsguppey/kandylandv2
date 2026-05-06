import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const EXPECTED_OPERATOR_BADGES = ["LIVE", "SNAP", "REVIEW", "DELAYED", "WAIT", "ERROR"];
const BANNED_VISIBLE_COPY = [
  "identified event realtime lane",
  "guest batch realtime lane",
  "viewer watch-session realtime lane",
  "failed closed",
  "polled route snapshot",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-overview] ${message}`);
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

const page = read("src/app/admin/analytics/page.tsx");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const statusBadge = read("src/components/Admin/AdminStatusBadge.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const analyticsTypes = read("src/types/admin-analytics.ts");
const navigationDestinationsHelper = read("src/lib/admin-analytics-navigation-destinations.ts");
const audienceTab = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const doc = read("docs/agent-truth/admin-analytics-overview.md");
const adminOverviewPage = read("src/app/admin/page.tsx");
const adminStatsBar = read("src/components/Admin/AdminStatsBar.tsx");
const adminOverviewRoute = read("src/app/api/admin/overview/route.ts");
const adminOverviewContract = read("src/lib/admin-overview.ts");
const adminOverviewDoc = read("docs/agent-truth/admin-overview.md");

assertIncludes("AdminAnalyticsPrimitives", primitives, "ANALYTICS_METRIC_BADGE_LABELS");
for (const badge of EXPECTED_OPERATOR_BADGES) {
  assertIncludes("AdminAnalyticsPrimitives", primitives, badge);
}
assertIncludes("AdminAnalyticsPrimitives", primitives, "grid grid-cols-[minmax(0,1fr)_auto]");
assertIncludes("AdminAnalyticsPrimitives", primitives, "min-w-0");
assertIncludes("AdminAnalyticsPrimitives", primitives, "max-w-[5.75rem]");
assertIncludes("AdminAnalyticsPrimitives", primitives, "truncate whitespace-nowrap");
assertIncludes("AdminStatusBadge", statusBadge, "aria-label");
assertIncludes("AdminStatusBadge", statusBadge, "label?: string");

assertIncludes("AdminAnalyticsPage", page, "visibleDegradedCopy");
assertIncludes("AdminAnalyticsPage", page, "title={backgroundAnalyticsIssues.join(\" | \")}");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewCards.mobileShare.displayValue");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewCards.revenue.displayValue");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewCards.purchases.displayValue");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewCards.mobileShare.statusBadgeLabel}");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewCards.revenue.statusBadgeLabel}");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewCards.purchases.statusBadgeLabel}");
assertNotIncludes("AdminAnalyticsPage", page, "backgroundAnalyticsIssues.join(\" · \")");
assertNotIncludes("AdminAnalyticsPage", page, "mobile users in range");
assertNotIncludes("AdminAnalyticsPage", page, "checkout starts ·");
for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("AdminAnalyticsPage", page.toLowerCase(), phrase);
}

const degradedCopyMatch = hook.match(/Live updates are delayed\. Showing last verified data\./);
if (!degradedCopyMatch) {
  fail("short degraded copy is missing from the analytics state hook");
}
const degradedCopy = degradedCopyMatch?.[0] ?? "";
if (degradedCopy.length > 160) {
  fail(`visible degraded copy exceeds 160 characters: ${degradedCopy.length}`);
}
for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("useAdminAnalyticsState visible copy", degradedCopy.toLowerCase(), phrase);
}

assertIncludes("useAdminAnalyticsState", hook, "readStoredHistoricalOverviewSnapshot");
assertIncludes("useAdminAnalyticsState", hook, "writeStoredHistoricalOverviewSnapshot");
assertIncludes("useAdminAnalyticsState", hook, "ADMIN_ANALYTICS_OVERVIEW_HYDRATION_BUDGET_MS = 3_000");
assertIncludes("useAdminAnalyticsState", hook, "historicalOverviewWaitingLabel");
assertIncludes("useAdminAnalyticsState", hook, "Waiting");
assertIncludes("useAdminAnalyticsState", hook, "Unavailable");
assertIncludes("useAdminAnalyticsState", hook, "fakeZeroPrevented");
assertIncludes("useAdminAnalyticsState", hook, "exceededHydrationBudget");
assertIncludes("useAdminAnalyticsState", hook, "firstTruthyValueMs");
assertIncludes("useAdminAnalyticsState", hook, "usedFallbackSnapshot");
assertIncludes("useAdminAnalyticsState", hook, "visibleDegradedCopy");
assertIncludes("useAdminAnalyticsState", hook, "fullDegradedReasons");
assertIncludes("useAdminAnalyticsState", hook, "realtimeLaneFailures");
assertIncludes("useAdminAnalyticsState", hook, "analyticsOverviewCards");
assertIncludes("useAdminAnalyticsState", hook, "No device sample");
assertIncludes("useAdminAnalyticsState", hook, "Checkout starts unavailable");
assertIncludes("useAdminAnalyticsState", hook, "Fallback source: server-confirmed transactions");
assertIncludes("useAdminAnalyticsState", hook, "Fallback source: completed transactions");
assertIncludes("useAdminAnalyticsState", hook, "sourceTruth");
assertIncludes("useAdminAnalyticsState", hook, "freshnessState");
assertIncludes("useAdminAnalyticsState", hook, "\"server_transactions\"");
assertIncludes("useAdminAnalyticsState", hook, "\"device_sample\"");
assertIncludes("useAdminAnalyticsState", hook, "\"missing\"");
assertIncludes("useAdminAnalyticsState", hook, "/api/admin/overview");
assertNotIncludes("useAdminAnalyticsState", hook, "isFakeZero");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsOverview");
assertIncludes("AdminDebugRoute", debugRoute, "hydrationBudgetMs: 3000");
assertIncludes("AdminDebugRoute", debugRoute, "fullDegradedReasonsSource");
assertIncludes("Historical analytics route", historicalRoute, "analyticsSourceHealth");
assertIncludes("Historical analytics route", historicalRoute, "recentWindowDayKeys");
assertIncludes("Historical analytics route", historicalRoute, "expectedDayKeys");
assertIncludes("Historical analytics route", historicalRoute, "navigationDestinationsState");
assertIncludes("admin analytics types", analyticsTypes, "export interface AnalyticsSourceHealth");
assertIncludes("admin analytics types", analyticsTypes, "missingDays");
assertIncludes("admin analytics types", analyticsTypes, "recentGapDays");
assertIncludes("admin analytics types", analyticsTypes, "chartReadiness");
assertIncludes("admin analytics types", analyticsTypes, "export type AnalyticsOverviewCard");
assertIncludes("admin analytics types", analyticsTypes, "export type NavigationDestinationsState");
assertIncludes("admin analytics types", analyticsTypes, "\"page_view_fallback\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "No explicit navigation tap events found. Showing destination visits from page-view fallback.");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "\"mixed_fallback\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "\"destination_views_only\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "notification_action_clicked");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "semantic_target_clicked with destination");
assertIncludes("audience tab", audienceTab, "Source mode:");
assertIncludes("audience tab", audienceTab, "Explicit taps:");
assertIncludes("audience tab", audienceTab, "Fallback views:");
assertIncludes("audience tab", audienceTab, "Top source events:");
assertIncludes("audience tab", audienceTab, "No navigation tap or destination-view events found in this range.");
assertNotIncludes("audience tab", audienceTab, "Destination drill-down will fill in once more navigation taps are tracked.");

assertIncludes("agent truth doc", doc, "Badge Containment Rule");
assertIncludes("agent truth doc", doc, "Analytics Hydration Rule");
assertIncludes("agent truth doc", doc, "Degraded Copy Rule");
assertIncludes("agent truth doc", doc, "Fake zeros are forbidden");

assertIncludes("admin overview contract", adminOverviewContract, "RollingWindow");
assertIncludes("admin overview contract", adminOverviewContract, "PlatformPulseMetric");
assertIncludes("admin overview contract", adminOverviewContract, "overviewIssues");
assertIncludes("admin overview contract", adminOverviewContract, "rollingWindow");
assertIncludes("admin overview contract", adminOverviewContract, "platformPulse");
assertIncludes("admin overview route", adminOverviewRoute, "buildRolling30dWindow");
assertIncludes("admin overview route", adminOverviewRoute, "overviewIssues");
assertIncludes("admin overview route", adminOverviewRoute, "platformPulse");
assertIncludes("admin overview route", adminOverviewRoute, "rolling transactions");
assertIncludes("admin overview route", adminOverviewRoute, "New account source incomplete");
assertIncludes("admin overview route", adminOverviewRoute, "Purchases and revenue come from completed transactions");
assertIncludes("admin overview page", adminOverviewPage, "platformPulse={data.platformPulse}");
assertIncludes("admin overview page", adminOverviewPage, "overviewIssues={data.overviewIssues}");
assertIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-source");
assertIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-freshness");
assertIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-confidence");
assertIncludes("AdminStatsBar", adminStatsBar, "lifetimeLabel");
assertNotIncludes("AdminStatsBar", adminStatsBar, "live of {stats.totalDrops} drops");
assertNotIncludes("AdminStatsBar", adminStatsBar, "vs. prior 30d");
assertNotIncludes("AdminStatsBar", adminStatsBar, "stats.currentWindowNewUsers");
assertIncludes("Admin overview doctrine", adminOverviewDoc, "Admin Overview");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics overview contract check passed.");
