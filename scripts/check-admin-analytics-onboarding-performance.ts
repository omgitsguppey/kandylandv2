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
  console.error(`[admin-analytics-onboarding-performance] ${message}`);
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
const operationsTab = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const helper = read("src/lib/admin-onboarding-velocity.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-onboarding-performance.md");

assertIncludes("AdminOnboardingAnalyticsModules", component, 'title="Onboarding Performance"');
assertNotIncludes("AdminOnboardingAnalyticsModules", component, 'title="Onboarding Velocity"');
assertNotIncludes("AdminOnboardingAnalyticsModules", component, 'title="Onboarding Step Flow"');
assertIncludes("AdminOnboardingAnalyticsModules", component, "__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Showing verified onboarding starts.");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Details in Debug");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Biggest drop-off:");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Slowest:");
assertIncludes("AdminOnboardingAnalyticsModules", component, "Step flow");
assertIncludes("AdminOnboardingAnalyticsModules", component, "durationLabel(step.avgSeconds)");
assertIncludes("AdminOnboardingAnalyticsModules", component, "step.dropOffCount");
assertIncludes("AdminOnboardingAnalyticsModules", component, "step.starts");
assertIncludes("AdminOnboardingAnalyticsModules", component, "step.completions");
assertIncludes("AdminOnboardingAnalyticsModules", component, "h-12");
assertIncludes("AdminOnboardingAnalyticsModules", component, "rounded-[0.9rem]");
assertNotIncludes("AdminOnboardingAnalyticsModules", component, "rounded-[1.5rem] border border-white/10 bg-black/30 p-4");
assertNotIncludes("AdminOnboardingAnalyticsModules", component, "h-64 w-full");
assertNotIncludes("AdminOnboardingAnalyticsModules", component, "BarChart");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Onboarding Performance copy", component, phrase);
}

assertIncludes("Operations tab", operationsTab, "onboardingVelocityModel={onboardingVelocityModel}");
assertIncludes("onboarding helper", helper, "perStep");
assertIncludes("onboarding helper", helper, "biggestDropoffStep");
assertIncludes("onboarding helper", helper, "slowestStep");
assertIncludes("onboarding helper", helper, "fastestStep");
assertIncludes("onboarding helper", helper, 'stepConversionFormula: "step completions / step starts"');
assertIncludes("onboarding helper", helper, 'stepDropoffFormula: "step starts - step completions"');
assertIncludes("onboarding helper", helper, "consolidatedModuleEnabled");
assertIncludes("onboarding helper", helper, "fakeZeroPrevented");
assertIncludes("onboarding helper", helper, "bucketReconciliationDelta");
assertIncludes("onboarding helper", helper, "auth sign-ups and onboarding starts measure different events");

assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsOnboardingPerformance");
assertIncludes("AdminDebugRoute", debugRoute, "perStep");
assertIncludes("AdminDebugRoute", debugRoute, "biggestDropoffStep");
assertIncludes("AdminDebugRoute", debugRoute, "slowestStep");
assertIncludes("AdminDebugRoute", debugRoute, "stepConversionRule");
assertIncludes("AdminDebugRoute", debugRoute, "consolidatedModuleEnabled");

assertIncludes("agent truth doc", doc, "Onboarding Velocity and Onboarding Step Flow are one onboarding truth family");
assertIncludes("agent truth doc", doc, "Completion rate is `completed / started`");
assertIncludes("agent truth doc", doc, "Step conversion is `step completions / step starts`");
assertIncludes("agent truth doc", doc, "never fake `0s`");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce separate giant onboarding modules");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Onboarding Performance contract check passed.");
