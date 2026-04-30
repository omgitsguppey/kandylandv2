import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "realtime lane",
  "backend refresh runs",
];

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
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const doc = read("docs/agent-truth/admin-analytics-commerce-snapshot.md");
const commerceSnapshotSection = component.slice(0, component.indexOf("Package Performance"));
const allVisibleSources = [commerceSnapshotSection, helper].join("\n");

assertIncludes("AdminAnalyticsCommerceTab", component, "commerceSnapshotModel");
assertIncludes("AdminAnalyticsCommerceTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__");
assertIncludes("AdminAnalyticsCommerceTab", component, "Money in, completed purchases, GD spend, and funnel health.");
assertIncludes("AdminAnalyticsCommerceTab", component, "Revenue source: completed internal payment records.");
assertIncludes("AdminAnalyticsCommerceTab", component, "Checkout conversion:");
assertIncludes("AdminAnalyticsCommerceTab", component, "compactMetricClass");
assertIncludes("AdminAnalyticsCommerceTab", component, "rounded-[1rem] p-2");
assertIncludes("AdminAnalyticsCommerceTab", component, "statusBadgeLabel={commerceBadgeLabel}");
assertIncludes("commerce snapshot helper", helper, "Promo and bonus GD are excluded from revenue.");
assertNotIncludes("Commerce Snapshot", commerceSnapshotSection, "text-3xl");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Commerce Snapshot copy", allVisibleSources, phrase);
}

assertIncludes("commerce snapshot helper", helper, "revenueSource");
assertIncludes("commerce snapshot helper", helper, "adjustedProfitFormula");
assertIncludes("commerce snapshot helper", helper, "purchaseCompletionsSource");
assertIncludes("commerce snapshot helper", helper, "checkoutStartsSource");
assertIncludes("commerce snapshot helper", helper, "checkoutConversionFormula");
assertIncludes("commerce snapshot helper", helper, "gdSpentSource");
assertIncludes("commerce snapshot helper", helper, "paidGdSpentValue");
assertIncludes("commerce snapshot helper", helper, "bonusGdSpentValue");
assertIncludes("commerce snapshot helper", helper, "promoGdSpentValue");
assertIncludes("commerce snapshot helper", helper, "promoValueGranted");
assertIncludes("commerce snapshot helper", helper, "bonusGdGranted");
assertIncludes("commerce snapshot helper", helper, "yieldPer100GdFormula");
assertIncludes("commerce snapshot helper", helper, "fakeZeroPrevented");
assertIncludes("commerce snapshot helper", helper, "driftFlags");
assertIncludes("commerce snapshot helper", helper, "not_primary_for_revenue");
assertIncludes("commerce snapshot helper", helper, "checkoutStartsValue > 0");
assertIncludes("commerce snapshot helper", helper, "completed purchase gross revenue");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsCommerceSnapshotModel");
assertIncludes("useAdminAnalyticsState", hook, "commerceSnapshotModel");
assertIncludes("MetricCard primitive", primitives, "statusBadgeLabel?: string");
assertIncludes("MetricCard primitive", primitives, "max-w-[5.75rem]");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsCommerceSnapshot");
assertIncludes("AdminDebugRoute", debugRoute, "canonicalRevenueRule");
assertIncludes("AdminDebugRoute", debugRoute, "mobileDensityClass");

assertIncludes("agent truth doc", doc, "Revenue means completed real-money currency purchases only");
assertIncludes("agent truth doc", doc, "Promo value is not revenue");
assertIncludes("agent truth doc", doc, "Checkout conversion is");
assertIncludes("agent truth doc", doc, "Yield / 100 GD");
assertIncludes("agent truth doc", doc, "Fake zeros are forbidden");
assertIncludes("agent truth doc", doc, "compact actionable panel");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Commerce Snapshot contract check passed.");
