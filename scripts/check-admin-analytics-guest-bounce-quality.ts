import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "GA totals minus identified first-party traffic",
  "consented guest semantic batches did not land",
  "semantic engine",
  "anonymous quality metrics",
  "polled route snapshot",
  "failed closed",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-guest-bounce-quality] ${message}`);
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
const helper = read("src/lib/admin-analytics-guest-bounce-quality.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-guest-bounce-quality.md");
const section = component.slice(
  component.indexOf('title="Guest Quality"'),
  component.indexOf('title="Event Mix"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "guestBounceQualityModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__");
assertIncludes("Guest Quality section", section, 'title="Guest Quality"');
assertIncludes("Guest Quality section", section, "guestBounceQualityModel.visibleCopy");
assertIncludes("Guest Quality section", section, "Guest Quality");
assertIncludes("Guest Quality section", section, "NO SAMPLE");
assertIncludes("Guest Quality section", section, "chartCollapsedBecauseEmpty");
assertNotIncludes("Guest Quality section", section, "h-72 w-full");
assertNotIncludes("Guest Quality section", section, "BarChart");
assertNotIncludes("Guest Quality section", section, "formatPercent(guestBounceIdentifiedRate)");
assertNotIncludes("Guest Quality section", section, "guestViewsDisplayCount ?? 0");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Guest Quality copy", section, phrase);
}

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsGuestBounceQualityModel");
assertIncludes("useAdminAnalyticsState", hook, "guestBounceQualityModel");
assertIncludes("guest quality helper", helper, "guestEstimateFormula");
assertIncludes("guest quality helper", helper, "guestEstimateClamped");
assertIncludes("guest quality helper", helper, "Guest views are estimated");
assertIncludes("guest quality helper", helper, "Guest quality unavailable until consented guest quality batches arrive.");
assertIncludes("guest quality helper", helper, "Signed-in bounce has no valid visit sample.");
assertIncludes("guest quality helper", helper, "fakeZeroPrevented");
assertIncludes("guest quality helper", helper, "chartCollapsedBecauseEmpty");
assertIncludes("guest quality helper", helper, "GA total views - identified first-party views");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsGuestBounceQuality");
assertIncludes("AdminDebugRoute", debugRoute, "guestEstimateRule");
assertIncludes("AdminDebugRoute", debugRoute, "signedInBounceRule");
assertIncludes("AdminDebugRoute", debugRoute, "chartRule");
assertIncludes("AdminDebugRoute", debugRoute, "consentedGuestBatchStatus");

assertIncludes("agent truth doc", doc, "Guest views may be estimated");
assertIncludes("agent truth doc", doc, "`GA total views - identified first-party views`");
assertIncludes("agent truth doc", doc, "must show `Unavailable` or `No sample`, not `0%`");
assertIncludes("agent truth doc", doc, "Do not render a giant empty chart");
assertIncludes("agent truth doc", doc, "Future agents must not render giant empty charts");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Guest + Bounce Quality contract check passed.");
