import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-commerce-snapshot] ${message}`);
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

const component = read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const contracts = read("src/lib/admin-analytics-contracts.ts");
const adminUserTruthSnapshot = read("src/lib/server/admin-user-truth-snapshot.ts");
const helper = read("src/lib/admin-analytics-commerce-snapshot.ts");
const contentConversionHelper = read("src/lib/admin-analytics-content-conversion.ts");
const topDropConversionHelper = read("src/lib/admin-analytics-top-drop-conversion.ts");
const recentCommerceFeedHelper = read("src/lib/admin-analytics-recent-commerce-feed.ts");
const deterministicTruth = read("src/lib/deterministic-admin-truth.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const analyticsTypes = read("src/types/admin-analytics.ts");
const doc = read("docs/agent-truth/admin-analytics-commerce-snapshot.md");

assertIncludes("AdminAnalyticsCommerceTab", component, "commerceSnapshotModel.commerceSnapshotState");
assertIncludes("admin user truth snapshot", adminUserTruthSnapshot, "buildAdminUserTruthSnapshot");
assertIncludes("AdminAnalyticsCommerceTab", component, "resolveAdminAnalyticsCommerceBadgeLabel");
assertIncludes("AdminAnalyticsCommerceTab", component, "buildAdminAnalyticsViewerDrilldownContract");
assertIncludes("AdminAnalyticsCommerceTab", component, "resolveAdminAnalyticsContentConversionRowTruthState");
assertIncludes("AdminAnalyticsCommerceTab", component, "resolveAdminAnalyticsTopDropIdentityTruthState");
assertIncludes("AdminAnalyticsCommerceTab", component, "Platform Economy");
assertIncludes("AdminAnalyticsCommerceTab", component, "Last verified");
assertIncludes("AdminAnalyticsCommerceTab", component, "Cache freshness");
assertIncludes("AdminAnalyticsCommerceTab", component, "Server ledger remains the treasury source.");
assertIncludes("AdminAnalyticsCommerceTab", component, 'data-admin-analytics-vendor-source-label="vendor_evidence"');
assertIncludes("AdminAnalyticsCommerceTab", component, 'data-admin-analytics-recovery-promotion="debug_only_not_promoted"');
assertIncludes("AdminAnalyticsCommerceTab", component, "{commerceConversionFooter}");
assertIncludes("AdminAnalyticsCommerceTab", component, "selectedRangeLabel");
assertIncludes("AdminAnalyticsCommerceTab", component, "paymentFeesUsdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "paidBaseDeliveredGdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "promoDiscountUsdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "Package Performance");
assertIncludes("AdminAnalyticsCommerceTab", component, "Package config exists, but no package-specific checkout or purchase data was observed in this range.");
assertIncludes("AdminAnalyticsCommerceTab", component, "No package config found. Package value basis should come from Platform Economy packages.");
assertIncludes("AdminAnalyticsCommerceTab", component, "Content Conversion");
assertIncludes("AdminAnalyticsCommerceTab", component, "No preview/unwrap/drop metadata source available for this range.");
assertIncludes("AdminAnalyticsCommerceTab", component, "Content conversion is using access rollup fallback because unwrap telemetry is missing.");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-content-conversion-source-truth");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-content-conversion-grouping");
assertIncludes("AdminAnalyticsCommerceTab", component, "Top Drop Conversion");
assertIncludes("AdminAnalyticsCommerceTab", component, "Drops with enough views to evaluate unwrap conversion.");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-top-drop-conversion-source-truth");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-top-drop-conversion-identity-state");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-top-drop-conversion-unwraps");
assertIncludes("AdminAnalyticsCommerceTab", component, "drop.unwrapRateDisplay");
assertIncludes("AdminAnalyticsCommerceTab", component, "Identity details");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-package-performance-id");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-package-performance-state");
assertIncludes("AdminAnalyticsCommerceTab", component, "Recent Commerce Feed");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-recent-commerce-feed-source-truth");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-recent-commerce-feed-direction");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-recent-commerce-feed-created-at-utc");
assertIncludes("AdminAnalyticsCommerceTab", component, "w-full max-w-full space-y-3 overflow-x-hidden");
assertIncludes("AdminAnalyticsCommerceTab", component, "grid-cols-[auto_minmax(0,1fr)_auto]");
assertIncludes("AdminAnalyticsCommerceTab", component, "item.amountDisplay");
assertIncludes("AdminAnalyticsCommerceTab", component, "item.sourceLabel");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "Checkout conversion: {commerceConversionLabel}");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "const commerceBadgeLabel = commerceSnapshotModel.cacheState");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "const livePulseBadgeLabel =");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "const earlyExitFormula =");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "const avgWatchDenominator =");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "Unlocked drops with enough demand to matter.");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "name=\"Unlocks\"");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "dataKey=\"dropId\"");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "item.amount.toLocaleString()");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "Unlocked:");
assertNotIncludes("AdminAnalyticsCommerceTab", component, " Â· ");

assertIncludes("admin analytics contracts", contracts, "\"commerce_snapshot\"");
assertIncludes("admin analytics contracts", contracts, "\"viewer_drilldown\"");
assertIncludes("admin analytics contracts", contracts, "\"top_drop_conversion\"");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsCommerceBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "buildAdminAnalyticsViewerDrilldownContract");

assertIncludes("commerce snapshot helper", helper, "CommerceSnapshotState");
assertIncludes("commerce snapshot helper", helper, "selectedRangeLabel");
assertIncludes("commerce snapshot helper", helper, "cacheState");
assertIncludes("commerce snapshot helper", helper, "\"grossRevenue - paymentFees - promoBonusValueBasis\"");
assertIncludes("commerce snapshot helper", helper, "\"revenue / (deliveredGd / 100)\"");
assertIncludes("commerce snapshot helper", helper, "source_breakdown_unavailable");
assertIncludes("commerce snapshot helper", helper, "paid_bonus_spend_unavailable");
assertIncludes("commerce snapshot helper", helper, "Checkout conversion unavailable: purchases and checkout starts use different ranges/sources.");
assertIncludes("commerce snapshot helper", helper, "Yield / 100 GD is near the Platform Economy watch floor.");
assertIncludes("commerce snapshot helper", helper, "Yield / 100 GD is below the Platform Economy floor");
assertIncludes("commerce snapshot helper", helper, "rangeConsistency");
assertIncludes("commerce snapshot helper", helper, "treasuryWarnings");
assertIncludes("commerce snapshot helper", helper, "rewardFreeGdSpentValue");
assertIncludes("commerce snapshot helper", helper, "unknownSourceGdSpentValue");
assertNotIncludes("commerce snapshot helper", helper, "purchaseCompletions / checkoutStarts");

assertIncludes("historical route", historicalRoute, "checkoutScope");
assertIncludes("historical route", historicalRoute, "paymentFeesUsd");
assertIncludes("historical route", historicalRoute, "paidGdSpent");
assertIncludes("historical route", historicalRoute, "rewardFreeGdSpent");
assertIncludes("historical route", historicalRoute, "unknownSourceGdSpent");
assertIncludes("historical route", historicalRoute, "promoDiscountUsd");
assertIncludes("historical route", historicalRoute, "paidSourceDeliveredGd");
assertIncludes("historical route", historicalRoute, "sourceBreakdownAvailable");
assertIncludes("historical route", historicalRoute, "packagePerformanceState");
assertIncludes("historical route", historicalRoute, "contentConversionState");
assertIncludes("historical route", historicalRoute, "dropDailyDocs");
assertIncludes("historical route", historicalRoute, "viewerDropInsights");
assertIncludes("historical route", historicalRoute, "readPlatformEconomyPackages");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsCommerceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "commerceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "packagePerformancePanelState");
assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsContentConversionModel");
assertIncludes("useAdminAnalyticsState", hook, "contentConversionModel");

assertIncludes("content conversion helper", contentConversionHelper, "rowsByDimension");
assertIncludes("content conversion helper", contentConversionHelper, "overallUnlockRatePct");
assertIncludes("content conversion helper", contentConversionHelper, "\"drop_metadata_plus_unlock_rollups\"");
assertIncludes("content conversion helper", contentConversionHelper, "No preview/unwrap/drop metadata source available for this range.");
assertIncludes("content conversion helper", contentConversionHelper, "Content conversion is using access rollup fallback because unwrap telemetry is missing.");
assertIncludes("content conversion helper", contentConversionHelper, "fakeZeroPrevented");

assertIncludes("top drop conversion helper", topDropConversionHelper, "buildAdminAnalyticsTopDropConversionModel");
assertIncludes("top drop conversion helper", topDropConversionHelper, "formatTopDropUnwrapRate");
assertIncludes("top drop conversion helper", topDropConversionHelper, "safeRate");
assertIncludes("deterministic top drop rate helper", deterministicTruth, "\"<0.1%\"");
assertIncludes("top drop conversion helper", topDropConversionHelper, "dropIdentityState");
assertIncludes("top drop conversion helper", topDropConversionHelper, "chartLabel");
assertIncludes("top drop conversion helper", topDropConversionHelper, "Unwrap conversion uses unwraps divided by validated drop views");

assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "RecentCommerceFeedState");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "amountDisplay");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "direction");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "sourceOfFunds");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "\"drop_unwrap\"");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, "\"Creator spend\"");
assertIncludes("recent commerce feed helper", recentCommerceFeedHelper, ".replace(/^Unlocked:/iu, \"Unwrapped:\")");

assertIncludes("admin analytics types", analyticsTypes, "export type CommerceMetricCard");
assertIncludes("admin analytics types", analyticsTypes, "export type CommerceSnapshotState");
assertIncludes("admin analytics types", analyticsTypes, "export type PackagePerformanceState");
assertIncludes("admin analytics types", analyticsTypes, "export type PackagePerformanceRow");
assertIncludes("admin analytics types", analyticsTypes, "export type ContentConversionState");
assertIncludes("admin analytics types", analyticsTypes, "export type ContentConversionRow");
assertIncludes("admin analytics types", analyticsTypes, "export type TopDropConversionState");
assertIncludes("admin analytics types", analyticsTypes, "export type TopDropConversionRow");
assertIncludes("admin analytics types", analyticsTypes, "export type RecentCommerceFeedState");
assertIncludes("admin analytics types", analyticsTypes, "export type RecentCommerceFeedRow");
assertIncludes("admin analytics types", analyticsTypes, "commerceSnapshotState?: CommerceSnapshotState");
assertIncludes("admin analytics types", analyticsTypes, "packagePerformanceState?: PackagePerformanceState");
assertIncludes("admin analytics types", analyticsTypes, "contentConversionState?: ContentConversionState");
assertIncludes("admin analytics types", analyticsTypes, "topDropConversionState?: TopDropConversionState");
assertIncludes("admin analytics types", analyticsTypes, "checkoutScope?: \"lifetime\" | \"rolling_30d\" | \"selected_range\" | \"cache_snapshot\" | \"unknown\"");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsCommerceSnapshot");
assertIncludes("AdminDebugRoute", debugRoute, "generatedAtUtcSource");
assertIncludes("AdminDebugRoute", debugRoute, "cacheStateSource");
assertIncludes("AdminDebugRoute", debugRoute, "\"commerceSnapshotState\"");
assertIncludes("AdminDebugRoute", debugRoute, "\"checkoutConversionWarning\"");
assertIncludes("AdminDebugRoute", debugRoute, "rangeRule");
assertIncludes("AdminDebugRoute", debugRoute, "treasuryRule");

assertIncludes("agent truth doc", doc, "Revenue means completed real-money currency purchases only");
assertIncludes("agent truth doc", doc, "Adjusted profit is completed purchase gross revenue minus payment fees and package-rate promo or bonus value.");
assertIncludes("agent truth doc", doc, "Yield / 100 GD");
assertIncludes("agent truth doc", doc, "Promo value is not revenue");
assertIncludes("agent truth doc", doc, "Fake zeros are forbidden");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Commerce Snapshot contract check passed.");
