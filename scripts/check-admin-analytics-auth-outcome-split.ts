import fs from "fs";
import path from "path";

const ROOT = process.cwd();

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
const helper = read("src/lib/admin-analytics-auth-outcome-split.ts");
const serverHelper = read("src/lib/server/admin-analytics-historical-engagement.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");

assertIncludes("AdminAnalyticsOperationsTab", component, 'title="Auth Outcomes"');
assertIncludes("AdminAnalyticsOperationsTab", component, "Source-truthed auth attempts, lifecycle outcomes, and finish timing.");
assertIncludes("AdminAnalyticsOperationsTab", component, "Auth lifecycle outcomes");
assertIncludes("AdminAnalyticsOperationsTab", component, "Timing review");
assertIncludes("AdminAnalyticsOperationsTab", component, "Top failure:");
assertNotIncludes("AdminAnalyticsOperationsTab", component, "This is not listed as an auth method.");

assertIncludes("auth outcome helper", helper, "lifecycleOutcomes");
assertIncludes("auth outcome helper", helper, "timingState");
assertIncludes("auth outcome helper", helper, "generatedAtUtc");
assertIncludes("auth outcome helper", helper, "lastAuthEventAtUtc");
assertIncludes("auth outcome helper", helper, 'formula: "completed attempts with start/end timestamps"');
assertIncludes("auth outcome helper", helper, "lifecycleOutcomes");

assertIncludes("historical engagement helper", serverHelper, "authOutcomeSummary");
assertIncludes("historical engagement helper", serverHelper, "auth_attempt_started");
assertIncludes("historical engagement helper", serverHelper, "auth_navigation_session_completed");
assertIncludes("historical engagement helper", serverHelper, "failure_code_unavailable");

assertIncludes("admin debug route", debugRoute, "adminAnalyticsAuthOutcomeSplit");
assertIncludes("admin debug route", debugRoute, "timingState");
assertIncludes("admin debug route", debugRoute, "lifecycleOutcomes");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Auth Outcome Split contract check passed.");
