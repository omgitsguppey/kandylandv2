import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "realtime lane",
  "Auth sign-ups 8 do not match onboarding starts 481",
  "Cross-check against Onboarding Step Flow below.",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-onboarding-velocity] ${message}`);
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

const component = read("src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx");
const adminUserTruthSnapshot = read("src/lib/server/admin-user-truth-snapshot.ts");
const operationsTab = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const helper = read("src/lib/admin-onboarding-velocity.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-onboarding-velocity.md");
const section = component.slice(
  component.indexOf('title="Onboarding Performance"'),
  component.indexOf("</SectionCard>"),
);

assertIncludes("AdminOnboardingAnalyticsModules", component, "onboardingVelocityModel");
assertIncludes("admin user truth snapshot", adminUserTruthSnapshot, "buildAdminUserTruthSnapshot");
assertIncludes("AdminOnboardingAnalyticsModules", component, "__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__");
assertIncludes("Onboarding Velocity section", section, "Showing verified onboarding starts.");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Details in Debug");
assertIncludes("Onboarding Velocity section", section, "bucketReconciliationDelta");
assertIncludes("Onboarding Velocity section", section, "Timing unavailable");
assertIncludes("Onboarding Velocity section", section, "rounded-[1rem] p-2");
assertIncludes("Onboarding Velocity section", section, "Step flow");
assertNotIncludes("Onboarding Velocity section", section, "rounded-[1.35rem] border border-amber-400/20 bg-amber-500/10 p-4");
assertNotIncludes("Onboarding Velocity section", section, "h-64 w-full");
assertNotIncludes("Onboarding Velocity section", section, "props.formatDuration(props.onboardingVelocityAvgDurationSeconds)");
assertNotIncludes("AdminOnboardingAnalyticsModules", component, 'title="Onboarding Step Flow"');

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Onboarding Velocity copy", section, phrase);
}

assertIncludes("Operations tab", operationsTab, "onboardingVelocityModel={onboardingVelocityModel}");
assertIncludes("useAdminAnalyticsState", hook, "selectedRange: onboardingVelocityRange");
assertIncludes("useAdminAnalyticsState", hook, "response: onboardingVelocityData");
assertIncludes("onboarding velocity helper", helper, "canonicalOnboardingSource");
assertIncludes("onboarding velocity helper", helper, "completionRateMetric");
assertIncludes("onboarding velocity helper", helper, 'formula: "completed / started"');
assertIncludes("onboarding velocity helper", helper, 'formula: "started - completed"');
assertIncludes("onboarding velocity helper", helper, "bucketReconciliationDelta");
assertIncludes("onboarding velocity helper", helper, "discrepancyType");
assertIncludes("onboarding velocity helper", helper, "discrepancySummary");
assertIncludes("onboarding velocity helper", helper, "expectedMismatch");
assertIncludes("onboarding velocity helper", helper, "timingMissing");
assertIncludes("onboarding velocity helper", helper, "missingStartTimestampCount");
assertIncludes("onboarding velocity helper", helper, "missingCompletionTimestampCount");
assertIncludes("onboarding velocity helper", helper, "fakeZeroPrevented");
assertIncludes("onboarding velocity helper", helper, "compactLayoutApplied");
assertIncludes("onboarding velocity helper", helper, "auth sign-ups and onboarding starts measure different events");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsOnboardingVelocity");
assertIncludes("AdminDebugRoute", debugRoute, "bucketReconciliationDelta");
assertIncludes("AdminDebugRoute", debugRoute, "fromCache");
assertIncludes("AdminDebugRoute", debugRoute, "hasPendingWrites");

assertIncludes("agent truth doc", doc, "Auth sign-ups are not onboarding starts");
assertIncludes("agent truth doc", doc, "Completion rate is `completed / started`");
assertIncludes("agent truth doc", doc, "Drop-off count is `started - completed`");
assertIncludes("agent truth doc", doc, "never fake `0s`");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce giant discrepancy warning cards");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Onboarding Velocity contract check passed.");
