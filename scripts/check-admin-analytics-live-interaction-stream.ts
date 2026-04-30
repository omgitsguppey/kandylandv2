import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "backend lane",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-live-interaction-stream] ${message}`);
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
const helper = read("src/lib/admin-analytics-live-interaction-stream.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-live-interaction-stream.md");
const section = component.slice(
  component.indexOf('title="Live Interaction Stream"'),
  component.indexOf('title="Data Validation"'),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "liveInteractionStreamModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__");
assertIncludes("Live Interaction Stream section", section, "liveInteractionStreamModel.eventRows");
assertIncludes("Live Interaction Stream section", section, "Admin excl.");
assertIncludes("Live Interaction Stream section", section, "compactTypeLabel");
assertIncludes("Live Interaction Stream section", section, "duplicateCount");
assertIncludes("Live Interaction Stream section", section, "rounded-[0.9rem]");
assertIncludes("Live Interaction Stream section", section, "No user interactions available for this range.");
assertNotIncludes("Live Interaction Stream section", section, "{event.type}");
assertNotIncludes("Live Interaction Stream section", section, "rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5");
assertNotIncludes("Live Interaction Stream section", section, "TASK_ASSIGNED");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Live Interaction Stream copy", section, phrase);
}

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsLiveInteractionStreamModel");
assertIncludes("useAdminAnalyticsState", hook, "liveInteractionStreamModel");

for (const required of [
  "adminExcludedCount",
  "systemExcludedCount",
  "unknownActorCount",
  "uniqueActorCount",
  "failureCount",
  "duplicateGroupedCount",
  "actorType",
  "shouldAppearInUserStream",
  "exclusionReason",
  "duplicateGroupKey",
  "adminExclusionRuleApplied",
  "actorClassificationRules",
  "missingSurfaceMappings",
  "fakeZeroPrevented",
  "rawActorId",
  "streamSourceStatusDetail",
]) {
  assertIncludes("live interaction stream helper", helper, required);
}

assertIncludes("live interaction stream helper", helper, "path.startsWith(\"/admin\")");
assertIncludes("live interaction stream helper", helper, "raw actor id without display identity maps to unknown");
assertIncludes("live interaction stream helper", helper, "First-party backend interaction snapshot; realtime is not claimed unless the source upgrades.");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsLiveInteractionStream");
assertIncludes("AdminDebugRoute", debugRoute, "adminExclusionRule");
assertIncludes("AdminDebugRoute", debugRoute, "systemExclusionRule");
assertIncludes("AdminDebugRoute", debugRoute, "duplicateRule");
assertIncludes("AdminDebugRoute", debugRoute, "rawActorId");

assertIncludes("agent truth doc", doc, "Admin actions must be excluded");
assertIncludes("agent truth doc", doc, "Raw backend event keys stay available in Debug");
assertIncludes("agent truth doc", doc, "Actor display labels follow this fallback order");
assertIncludes("agent truth doc", doc, "stale snapshots labeled as live");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce giant stream cards");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Live Interaction Stream contract check passed.");
