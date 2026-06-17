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
const contracts = read("src/lib/admin-analytics-contracts.ts");
const adminUserTruthSnapshot = read("src/lib/server/admin-user-truth-snapshot.ts");
const userBehaviorTruthRollup = read("src/lib/server/user-behavior-truth-rollup.ts");
const statusBadge = read("src/components/Admin/AdminStatusBadge.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const analyticsTypes = read("src/types/admin-analytics.ts");
const navigationDestinationsHelper = read("src/lib/admin-analytics-navigation-destinations.ts");
const deviceMixHelper = read("src/lib/admin-analytics-device-mix.ts");
const topPathsHelper = read("src/lib/admin-analytics-top-paths.ts");
const regionDemandHelper = read("src/lib/admin-analytics-region-demand.ts");
const contentConversionHelper = read("src/lib/admin-analytics-content-conversion.ts");
const topDropConversionHelper = read("src/lib/admin-analytics-top-drop-conversion.ts");
const recentCommerceFeedHelper = read("src/lib/admin-analytics-recent-commerce-feed.ts");
const deterministicTruth = read("src/lib/deterministic-admin-truth.ts");
const audienceTab = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const commerceTab = read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const doc = read("docs/agent-truth/admin-analytics-overview.md");
const analyticsDoctrine = read("docs/doctrine/surfaces/admin-analytics-doctrine.md");
const analyticsTruthDoc = read("docs/agent-truth/admin-analytics-truth.md");
const adminOverviewPage = read("src/app/admin/page.tsx");
const adminStatsBar = read("src/components/Admin/AdminStatsBar.tsx");
const adminOverviewRoute = read("src/app/api/admin/overview/route.ts");
const adminOverviewContract = read("src/lib/admin-overview.ts");
const adminOverviewDoc = read("docs/agent-truth/admin-overview.md");

assertIncludes("admin analytics contracts", contracts, "ADMIN_ANALYTICS_MODULE_CONTRACT_REGISTRY");
assertIncludes("admin user truth snapshot", adminUserTruthSnapshot, "buildAdminUserTruthSnapshot");
assertIncludes("user behavior truth rollup", userBehaviorTruthRollup, "buildUserBehaviorTruthRollup");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsLivePulseBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsCommerceBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "buildAdminAnalyticsReturnCadenceBuckets");
assertIncludes("admin analytics contracts", contracts, "buildAdminAnalyticsViewerDrilldownContract");
assertIncludes("admin analytics contracts", contracts, "formatAdminAnalyticsJourneyDenominatorMode");
assertIncludes("admin analytics contracts", contracts, "\"return_cadence\"");
assertIncludes("admin analytics contracts", contracts, "\"viewer_drilldown\"");
assertIncludes("AdminAnalyticsPrimitives", primitives, "resolveAdminAnalyticsBadgeLabel");
assertNotIncludes("AdminAnalyticsPrimitives", primitives, "ANALYTICS_METRIC_BADGE_LABELS");
for (const expected of [
  "resolveMetricState",
  "safeRate",
  "getRollingWindow",
  "calculateGumdropValueBasis",
  "resolveWatchTruth",
  "classifyEventContext",
  "adjustRegionalDemand",
  "resolvePanelPagination",
]) {
  assertIncludes("deterministic admin truth helper", deterministicTruth, expected);
}
for (const expected of [
  "WAIT means actively loading only",
  "A zero is valid only when the source loaded and verified zero",
  "No rate may render without denominator, source, and range truth",
  "Display language uses unwrap",
]) {
  assertIncludes("admin analytics doctrine bundle", `${analyticsDoctrine}\n${analyticsTruthDoc}`, expected);
}
for (const badge of EXPECTED_OPERATOR_BADGES) {
  assertIncludes("admin analytics contracts", contracts, badge);
}
assertIncludes("AdminAnalyticsPrimitives", primitives, "grid grid-cols-[minmax(0,1fr)_auto]");
assertIncludes("AdminAnalyticsPrimitives", primitives, "min-w-0");
assertIncludes("AdminAnalyticsPrimitives", primitives, "max-w-[5.75rem]");
assertIncludes("AdminAnalyticsPrimitives", primitives, "truncate whitespace-nowrap");
assertIncludes("AdminStatusBadge", statusBadge, "aria-label");
assertIncludes("AdminStatusBadge", statusBadge, "label?: string");

assertIncludes("AdminAnalyticsPage", page, "visibleDegradedCopy");
assertIncludes("AdminAnalyticsPage", page, "title={visibleOverviewDegradedCopy.join(\" | \")}");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewDisplayMetrics.mobileShare.displayValue");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewDisplayMetrics.revenue.displayValue");
assertIncludes("AdminAnalyticsPage", page, "analyticsOverviewDisplayMetrics.purchases.displayValue");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewDisplayMetrics.mobileShare.badgeLabel}");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewDisplayMetrics.revenue.badgeLabel}");
assertIncludes("AdminAnalyticsPage", page, "statusBadgeLabel={analyticsOverviewDisplayMetrics.purchases.badgeLabel}");
assertNotIncludes("AdminAnalyticsPage", page, "title={backgroundAnalyticsIssues.join(\" | \")}");
assertNotIncludes("AdminAnalyticsPage", page, "backgroundAnalyticsIssues.join(\" · \")");
assertNotIncludes("AdminAnalyticsPage", page, "mobile users in range");
assertNotIncludes("AdminAnalyticsPage", page, "checkout starts ·");
for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("AdminAnalyticsPage", page.toLowerCase(), phrase);
}

const degradedCopyMatch = hook.match(/Snapshot refresh delayed\. Showing last verified data\./);
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
assertIncludes("useAdminAnalyticsState", hook, "No sample");
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
assertIncludes("admin analytics types", analyticsTypes, "export type RegionDemandPanelState");
assertIncludes("admin analytics types", analyticsTypes, "countUnit: \"views\" | \"sessions\" | \"users\" | \"events\" | \"mixed\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "No explicit navigation tap events found. Showing destination visits from page-view fallback.");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "\"mixed_fallback\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "\"destination_views_only\"");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "notification_action_clicked");
assertIncludes("navigation destinations helper", navigationDestinationsHelper, "semantic_target_clicked with destination");
assertIncludes("device mix helper", deviceMixHelper, "GA engaged sessions / GA sessions for each device category.");
assertIncludes("device mix helper", deviceMixHelper, "\"ga4\"");
assertIncludes("top paths helper", topPathsHelper, "buildAdminAnalyticsTopPathsModel");
assertIncludes("top paths helper", topPathsHelper, "\"ga4\"");
assertIncludes("top paths helper", topPathsHelper, "Top 25 snapshot only. This panel paginates the available snapshot, not every path in GA.");
assertIncludes("top paths helper", topPathsHelper, "0s avg time suggests timing is unavailable for this path or users are exiting immediately after arrival.");
assertIncludes("top paths helper", topPathsHelper, "High view volume with low engagement needs review before this route is treated as healthy traffic.");
assertIncludes("region demand helper", regionDemandHelper, "buildAdminAnalyticsRegionDemandModel");
assertIncludes("region demand helper", regionDemandHelper, "Adjusted demand excludes proven admin-surface traffic only.");
assertIncludes("region demand helper", regionDemandHelper, "Counts are GA4");
assertIncludes("content conversion helper", contentConversionHelper, "buildAdminAnalyticsContentConversionModel");
assertIncludes("content conversion helper", contentConversionHelper, "\"drop_metadata_plus_unlock_rollups\"");
assertIncludes("content conversion helper", contentConversionHelper, "No preview/unwrap/drop metadata source available for this range.");
assertIncludes("content conversion helper", contentConversionHelper, "Content conversion is using access rollup fallback because unwrap telemetry is missing.");
assertIncludes("top drop conversion helper", topDropConversionHelper, "buildAdminAnalyticsTopDropConversionModel");
assertIncludes("top drop conversion helper", topDropConversionHelper, "safeRate");
assertIncludes("top drop conversion helper", topDropConversionHelper, "formatTopDropUnwrapRate");
assertIncludes("top drop conversion helper", topDropConversionHelper, "dropIdentityState");
assertIncludes("top drop conversion helper", topDropConversionHelper, "chartLabel");
assertIncludes("top drop conversion helper", topDropConversionHelper, "Unwrap conversion uses unwraps divided by validated drop views");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "buildAdminAnalyticsRecentCommerceFeedState");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "amountDisplay");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "sourceOfFunds");
assertIncludes("commerce tab", commerceTab, "data-recent-commerce-feed-source-truth");
assertIncludes("commerce tab", commerceTab, "w-full max-w-full space-y-3 overflow-x-hidden");
assertNotIncludes("commerce tab", commerceTab, "Unlocked:");
assertIncludes("audience tab", audienceTab, "Source mode:");
assertIncludes("audience tab", audienceTab, "Explicit taps:");
assertIncludes("audience tab", audienceTab, "Fallback views:");
assertIncludes("audience tab", audienceTab, "Top source events:");
assertIncludes("audience tab", audienceTab, "No navigation tap or destination-view events found in this range.");
assertIncludes("audience tab", audienceTab, "Total sessions:");
assertIncludes("audience tab", audienceTab, "Commerce / watch");
assertIncludes("audience tab", audienceTab, "Search path");
assertIncludes("audience tab", audienceTab, "Page size");
assertIncludes("commerce tab", commerceTab, "data-library-viewer-source-truth");
assertIncludes("commerce tab", commerceTab, "data-library-viewer-freshness");
assertIncludes("commerce tab", commerceTab, "label=\"Total Watch\"");
assertIncludes("commerce tab", commerceTab, "Verified ${formatDuration(verifiedWatchSeconds)}; estimated ${formatDuration(estimatedWatchSeconds)}");
assertIncludes("commerce tab", commerceTab, "viewerCapturePulseExplanation");
assertIncludes("commerce tab", commerceTab, "data-library-viewer-user-session-count");
assertIncludes("commerce tab", commerceTab, "unwrap/asset-consumed signals");
assertIncludes("commerce tab", commerceTab, "Page {boundedViewerDropPage} of {viewerDropPageCount}");
assertIncludes("commerce tab", commerceTab, "Transport counts use watch-session captureTransport");
assertIncludes("audience tab", audienceTab, "Prev");
assertIncludes("audience tab", audienceTab, "Next");
assertIncludes("audience tab", audienceTab, "Percent column: Engagement");
assertIncludes("audience tab", audienceTab, "data-regions-source-truth");
assertIncludes("audience tab", audienceTab, "data-regions-filter-mode");
assertIncludes("audience tab", audienceTab, "Raw geography with internal/admin traffic separated from external demand.");
assertIncludes("audience tab", audienceTab, "Raw traffic");
assertIncludes("audience tab", audienceTab, "External demand");
assertIncludes("audience tab", audienceTab, "Admin/internal excluded");
assertIncludes("audience tab", audienceTab, "Adjusted external");
assertIncludes("audience tab", audienceTab, "data-top-paths-source-truth");
assertIncludes("audience tab", audienceTab, "data-top-paths-route-group");
assertIncludes("audience tab", audienceTab, "data-top-paths-issue-state");
assertIncludes("audience tab", audienceTab, "Top 25 snapshot only");
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
assertIncludes("admin overview contract", adminOverviewContract, '"gumdropsCirculation30d"');
assertIncludes("admin overview contract", adminOverviewContract, '"supportBugs30d"');
assertIncludes("admin overview contract", adminOverviewContract, 'primaryScope: "rolling_30d"');
assertIncludes("admin overview route", adminOverviewRoute, "buildPlatformPulseWindow");
assertIncludes("admin overview route", adminOverviewRoute, "buildAdminOverviewPlatformPulse");
assertIncludes("admin overview route", adminOverviewRoute, "overviewIssues");
assertIncludes("admin overview route", adminOverviewRoute, "platformPulse");
assertIncludes("admin overview route", adminOverviewRoute, "analytics_commerce_daily");
assertIncludes("admin overview route", adminOverviewRoute, "analytics_task_daily");
assertIncludes("admin overview route", adminOverviewRoute, "SUPPORT_BUG_USER_CHANNELS");
assertIncludes("admin overview page", adminOverviewPage, "platformPulse={pageData.platformPulse}");
assertIncludes("admin overview page", adminOverviewPage, "overviewIssues={data.overviewIssues}");
assertIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-freshness");
assertIncludes("AdminStatsBar", adminStatsBar, 'data-admin-platform-pulse-grid="compact-six"');
assertIncludes("AdminStatsBar", adminStatsBar, "grid-cols-2");
assertIncludes("AdminStatsBar", adminStatsBar, "md:grid-cols-3");
assertIncludes("AdminStatsBar", adminStatsBar, "metricNeedsIssueBadge");
assertNotIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-source");
assertNotIncludes("AdminStatsBar", adminStatsBar, "data-admin-metric-confidence");
assertNotIncludes("AdminStatsBar", adminStatsBar, "lifetimeLabel");
assertNotIncludes("AdminStatsBar", adminStatsBar, "metric.subtext");
assertNotIncludes("AdminStatsBar", adminStatsBar, "live of {stats.totalDrops} drops");
assertNotIncludes("AdminStatsBar", adminStatsBar, "vs. prior 30d");
assertNotIncludes("AdminStatsBar", adminStatsBar, "stats.currentWindowNewUsers");
assertIncludes("Admin overview doctrine", adminOverviewDoc, "Admin Overview");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics overview contract check passed.");
