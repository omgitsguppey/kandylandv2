import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BANNED_VISIBLE_COPY = [
  "polled route snapshot",
  "failed closed",
  "realtime lane",
  "backend refresh runs",
  "Google Sign IN",
  "Email Sign UP",
  "Email Sign IN",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-auth-outcome-split] ${message}`);
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
const helper = read("src/lib/admin-analytics-auth-outcome-split.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/admin-analytics-auth-outcome-split.md");
const section = component.slice(
  component.indexOf('title="Auth Outcomes"'),
  component.indexOf("<AdminOnboardingAnalyticsModules"),
);

assertIncludes("AdminAnalyticsOperationsTab", component, "authOutcomeModel");
assertIncludes("AdminAnalyticsOperationsTab", component, "__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__");
assertIncludes("AdminAnalyticsOperationsTab", component, 'title="Auth Outcomes"');
assertIncludes("Auth Outcomes section", section, "Method split");
assertIncludes("Auth Outcomes section", section, "bg-brand-purple");
assertIncludes("Auth Outcomes section", section, "bg-slate-500");
assertIncludes("Auth Outcomes section", section, "bg-rose-400");
assertIncludes("Auth Outcomes section", section, "Registration completed");
assertIncludes("Auth Outcomes section", section, "This is not listed as an auth method");
assertIncludes("Auth Outcomes section", section, "rounded-[0.9rem]");
assertNotIncludes("Auth Outcomes section", section, "h-72");
assertNotIncludes("Auth Outcomes section", section, "authOutcomeFailureFill");
assertNotIncludes("Auth Outcomes section", section, "#f97316");
assertNotIncludes("Auth Outcomes section", section, "rounded-[1.35rem]");
assertNotIncludes("Auth Outcomes section", section, "Method detail");
assertNotIncludes("Auth Outcomes section", section, "formatDuration(item.avgDurationMs / 1000)");
assertNotIncludes("Auth Outcomes section", section, "formatDuration(authOutcomeTotals.weightedAvgDurationMs / 1000)");

for (const phrase of BANNED_VISIBLE_COPY) {
  assertNotIncludes("visible Auth Outcomes copy", section, phrase);
}

assertIncludes("auth outcome helper", helper, "normalizeAuthOutcomeMethod");
assertIncludes("auth outcome helper", helper, "Google sign-in");
assertIncludes("auth outcome helper", helper, "Email sign-up");
assertIncludes("auth outcome helper", helper, "Email sign-in");
assertIncludes("auth outcome helper", helper, "Registration completed");
assertIncludes("auth outcome helper", helper, "successRateFormula");
assertIncludes("auth outcome helper", helper, 'formula: "successes / attempts"');
assertIncludes("auth outcome helper", helper, "timingAvailable");
assertIncludes("auth outcome helper", helper, "timingMissingReason");
assertIncludes("auth outcome helper", helper, "missingStartCount");
assertIncludes("auth outcome helper", helper, "missingFinishCount");
assertIncludes("auth outcome helper", helper, "unfinishedTimeoutWindow");
assertIncludes("auth outcome helper", helper, "rawEventNames");
assertIncludes("auth outcome helper", helper, "casingDriftDetected");
assertIncludes("auth outcome helper", helper, "reconciliationDelta");
assertIncludes("auth outcome helper", helper, "registeredUsersMovedToOutcome");
assertIncludes("auth outcome helper", helper, "weakestMethod");
assertIncludes("auth outcome helper", helper, "mostFailuresMethod");
assertIncludes("auth outcome helper", helper, "mostUnfinishedMethod");
assertIncludes("auth outcome helper", helper, "fakeZeroPrevented");
assertIncludes("auth outcome helper", helper, "badgeOverflowProtectionEnabled");

assertIncludes("useAdminAnalyticsState", hook, "buildAdminAnalyticsAuthOutcomeModel");
assertIncludes("useAdminAnalyticsState", hook, "authOutcomeModel");
assertIncludes("AdminDebugRoute", debugRoute, "adminAnalyticsAuthOutcomeSplit");
assertIncludes("AdminDebugRoute", debugRoute, "registeredUsersRule");
assertIncludes("AdminDebugRoute", debugRoute, "timingRule");
assertIncludes("AdminDebugRoute", debugRoute, "rawEventNames");

assertIncludes("agent truth doc", doc, "Registered users or completed account creation are outcomes");
assertIncludes("agent truth doc", doc, "Success rate is `successes / attempts`");
assertIncludes("agent truth doc", doc, "not `0s`");
assertIncludes("agent truth doc", doc, "brand purple for success");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce giant auth cards");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Auth Outcome Split contract check passed.");
