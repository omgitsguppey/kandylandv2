import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "telemetry lanes resolve",
  "polled route snapshot",
  "failed closed",
  "backend refresh",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-event-mix] ${message}`);
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
const helper = read("src/lib/admin-analytics-event-mix.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-event-mix.md");
const section = component.slice(
  component.indexOf('title="Event Mix"'),
  component.indexOf('title="Live Interaction Stream"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "eventMixModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__");
assertIncludes("Event Mix section", section, "Ranked raw events");
assertIncludes("Event Mix section", section, "raw events");
assertIncludes("Event Mix section", section, "event count / total counted events");
assertIncludes("Event Mix section", section, "Surface context unavailable for this range.");
assertIncludes("Event Mix section", section, "rounded-[0.9rem]");
assertNotIncludes("Event Mix section", section, "angle={-18}");
assertNotIncludes("Event Mix section", section, "h-64 w-full md:h-72");
assertNotIncludes("Event Mix section", section, "BarChart");
assertNotIncludes("Event Mix section", section, "Component context will populate");
assertNotIncludes("Event Mix section", section, "{topComponentContexts.length} surfaces");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Event Mix copy", section, phrase);
}

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsEventMixModel");
assertIncludes("useAdminAnalyticsState", hook, "eventMixModel");
assertIncludes("event mix helper", helper, "totalEventsInRange");
assertIncludes("event mix helper", helper, "denominatorAvailable");
assertIncludes("event mix helper", helper, "topEventShare");
assertIncludes("event mix helper", helper, "event count / total counted events in selected range");
assertIncludes("event mix helper", helper, "mappedSurfaceCount");
assertIncludes("event mix helper", helper, "unmappedEventCount");
assertIncludes("event mix helper", helper, "missingSurfaceMappings");
assertIncludes("event mix helper", helper, "mappedByFallbackCatalog");
assertIncludes("event mix helper", helper, "fakeZeroPrevented");
assertIncludes("event mix helper", helper, "Surface context unavailable for this range.");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsEventMix");
assertIncludes("AdminDebugRoute", debugRoute, "shareRule");
assertIncludes("AdminDebugRoute", debugRoute, "contextRule");
assertIncludes("AdminDebugRoute", debugRoute, "missingSurfaceMappings");

assertIncludes("agent truth doc", doc, "raw event count");
assertIncludes("agent truth doc", doc, "`event count / total counted events in the selected range`");
assertIncludes("agent truth doc", doc, "`0 surfaces` is forbidden");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce the giant slanted-label bar chart");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Event Mix contract check passed.");
