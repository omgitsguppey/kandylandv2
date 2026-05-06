import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "realtime lane",
  "ordered conversion",
  "Biggest Drop",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-journey-funnel] ${message}`);
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
const helper = read("src/lib/admin-analytics-journey-funnel.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const primitives = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const doc = read("docs/agent-truth/admin-analytics-journey-funnel.md");
const section = component.slice(
  component.indexOf("journeyFunnelModel.visibleTitle"),
  component.indexOf('title="Auth Outcomes"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "journeyFunnelModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__");
assertIncludes("AdminAnalyticsOperationsTab", component, "Repeated event-volume chain. Not a unique-user funnel.");
assertIncludes("AdminAnalyticsOperationsTab", component, "formatJourneyDenominatorMode");
assertIncludes("AdminAnalyticsOperationsTab", component, "nonSequentialSteps");
assertIncludes("AdminAnalyticsOperationsTab", component, "sourceMismatchSteps");
assertIncludes("AdminAnalyticsOperationsTab", component, "Largest Event-Volume Decrease");
assertIncludes("AdminAnalyticsOperationsTab", component, "Supporting Events");
assertIncludes("AdminAnalyticsOperationsTab", component, "Separate from the chain");
assertIncludes("AdminAnalyticsOperationsTab", component, "Event ratio");
assertIncludes("AdminAnalyticsOperationsTab", component, "rounded-[0.9rem]");
assertIncludes("AdminAnalyticsOperationsTab", component, "statusBadgeLabel={journeyFunnelBadgeLabel}");
assertNotIncludes("Journey Funnel section", section, "rounded-[1.6rem]");
assertNotIncludes("Journey Funnel section", section, "p-4");
assertNotIncludes("Journey Funnel section", section, "AdminStatusBadge state={historicalMetricTruthState} className=\"shrink-0\"");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Journey Funnel copy", section, phrase);
}

assertIncludes("journey funnel helper", helper, "funnelMode");
assertIncludes("journey funnel helper", helper, "denominatorMode");
assertIncludes("journey funnel helper", helper, "generatedAtUtc");
assertIncludes("journey funnel helper", helper, "warningCount");
assertIncludes("journey funnel helper", helper, "warnings");
assertIncludes("journey funnel helper", helper, "sequential: false");
assertIncludes("journey funnel helper", helper, "uniqueActorsAvailable: false");
assertIncludes("journey funnel helper", helper, "ratioMeaning");
assertIncludes("journey funnel helper", helper, "countUnit: \"events\"");
assertIncludes("journey funnel helper", helper, "supportingEvents");
assertIncludes("journey funnel helper", helper, "rawEventCount");
assertIncludes("journey funnel helper", helper, "uniqueUserCount");
assertIncludes("journey funnel helper", helper, "uniqueSessionCount");
assertIncludes("journey funnel helper", helper, "orderedTransitionCount");
assertIncludes("journey funnel helper", helper, "nonSequentialSteps");
assertIncludes("journey funnel helper", helper, "sourceMismatchSteps");
assertIncludes("journey funnel helper", helper, "onboardingComparison");
assertIncludes("journey funnel helper", helper, "journeyStatsComparison");
assertIncludes("journey funnel helper", helper, "fakeZeroPrevented");
assertIncludes("journey funnel helper", helper, "displayedPercent");
assertIncludes("journey funnel helper", helper, "purchaseCount > checkoutCount");
assertIncludes("journey funnel helper", helper, "\"event_volume_chain\"");
assertIncludes("journey funnel helper", helper, "\"partial_event_chain\"");
assertIncludes("journey funnel helper", helper, "orderedJourneyAvailable: false");
assertIncludes("journey funnel helper", helper, "This is event volume, not a sequential conversion funnel.");
assertIncludes("journey funnel helper", helper, "Not a conversion rate.");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsJourneyFunnelModel");
assertIncludes("useAdminAnalyticsState", hook, "journeyFunnelModel");
assertIncludes("MetricCard primitive", primitives, "max-w-[5.75rem]");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsJourneyFunnel");
assertIncludes("AdminDebugRoute", debugRoute, "nonSequentialSteps");
assertIncludes("AdminDebugRoute", debugRoute, "sourceMismatchSteps");

assertIncludes("agent truth doc", doc, "Event Chain");
assertIncludes("agent truth doc", doc, "later step exceeds a prior step");
assertIncludes("agent truth doc", doc, "Fake zeros are forbidden");
assertIncludes("agent truth doc", doc, "Future agents must not display raw event ratios as ordered conversion or primary operator copy");
assertIncludes("agent truth doc", doc, "Repeated event ratios are event-volume ratios, not user conversion");
assertIncludes("agent truth doc", doc, "Largest event-volume decrease");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Journey Funnel contract check passed.");
