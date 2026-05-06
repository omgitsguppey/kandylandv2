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
const helper = read("src/lib/admin-analytics-commerce-snapshot.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const analyticsTypes = read("src/types/admin-analytics.ts");
const doc = read("docs/agent-truth/admin-analytics-commerce-snapshot.md");

assertIncludes("AdminAnalyticsCommerceTab", component, "commerceSnapshotModel.commerceSnapshotState");
assertIncludes("AdminAnalyticsCommerceTab", component, "Treasury truth lives in Platform Economy.");
assertIncludes("AdminAnalyticsCommerceTab", component, "Last verified");
assertIncludes("AdminAnalyticsCommerceTab", component, "Cache freshness");
assertIncludes("AdminAnalyticsCommerceTab", component, "Revenue source: completed internal payment records. Treasury truth lives in Platform Economy.");
assertIncludes("AdminAnalyticsCommerceTab", component, "{commerceConversionFooter}");
assertIncludes("AdminAnalyticsCommerceTab", component, "selectedRangeLabel");
assertIncludes("AdminAnalyticsCommerceTab", component, "paymentFeesUsdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "paidBaseDeliveredGdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "promoDiscountUsdValue");
assertIncludes("AdminAnalyticsCommerceTab", component, "Package Performance");
assertIncludes("AdminAnalyticsCommerceTab", component, "Package config exists, but no package-specific checkout or purchase data was observed in this range.");
assertIncludes("AdminAnalyticsCommerceTab", component, "No package config found. Package value basis should come from Platform Economy packages.");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-package-performance-id");
assertIncludes("AdminAnalyticsCommerceTab", component, "data-package-performance-state");
assertNotIncludes("AdminAnalyticsCommerceTab", component, "Checkout conversion: {commerceConversionLabel}");
assertNotIncludes("AdminAnalyticsCommerceTab", component, " Â· ");

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
assertIncludes("historical route", historicalRoute, "readPlatformEconomyPackages");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsCommerceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "commerceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "packagePerformancePanelState");

assertIncludes("admin analytics types", analyticsTypes, "export type CommerceMetricCard");
assertIncludes("admin analytics types", analyticsTypes, "export type CommerceSnapshotState");
assertIncludes("admin analytics types", analyticsTypes, "export type PackagePerformanceState");
assertIncludes("admin analytics types", analyticsTypes, "export type PackagePerformanceRow");
assertIncludes("admin analytics types", analyticsTypes, "commerceSnapshotState?: CommerceSnapshotState");
assertIncludes("admin analytics types", analyticsTypes, "packagePerformanceState?: PackagePerformanceState");
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
