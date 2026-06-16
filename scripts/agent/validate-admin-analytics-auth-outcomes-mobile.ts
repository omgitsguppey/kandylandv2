import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

function between(source: string, startNeedle: string, endNeedle: string) {
  const start = source.indexOf(startNeedle);
  if (start === -1) {
    failures.push(`Unable to find section start "${startNeedle}".`);
    return "";
  }
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    failures.push(`Unable to find section end "${endNeedle}".`);
    return source.slice(start);
  }
  return source.slice(start, end);
}

const packageJson = readRequired("package.json");
const authModel = readRequired("src/lib/admin-analytics-auth-outcome-split.ts");
const operationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const serverHelper = readRequired("src/lib/server/admin-analytics-historical-engagement.ts");
const authSpec = readRequired("tests/unit/admin-analytics-auth-outcome-split.spec.ts");
const mobileSpec = readRequired("tests/unit/admin-analytics-auth-outcomes-mobile.spec.tsx");
const serverSpec = readRequired("tests/unit/admin-analytics-historical-engagement.spec.ts");
const authDoc = readRequired("docs/agent-truth/admin-analytics-auth-outcomes.md");
const truthDoc = readRequired("docs/agent-truth/admin-analytics-truth.md");

requireIncludes(packageJson, "check:admin-analytics-auth-outcomes-mobile", "package scripts");

for (const needle of [
  "AuthOutcomeHydrationState",
  '"no_sample"',
  '"legacy_fallback"',
  '"NO SAMPLE"',
  '"UNAVAILABLE"',
  "hasCanonicalAuthAttemptSample",
  "hasLegacyAuthSample",
  "hasUsableAuthSample",
  "canRenderMethodDetails",
  "measurementMode",
  "trackingCapability",
  "methodGroups",
  "emailPassword",
  "google",
  "AUTH_FUTURE_INSTRUMENTATION",
  "AUTH_NEXT_SOURCE_STEP",
  "Do not log raw password/email values.",
]) {
  requireIncludes(authModel, needle, "Auth Outcomes model contract");
}

requireNotIncludes(
  authModel,
  '!hasResponse ? input.loading ? "WAIT" : "ERROR"',
  "Auth Outcomes no-response mode label",
);
requireIncludes(authModel, '!hasResponse\n        ? input.loading ? "WAIT" : "NO SAMPLE"', "Auth Outcomes no-response label");
requireNotIncludes(authModel, "fallback: !input.response?.authOutcomeSummary", "Auth Outcomes fallback truth");
requireIncludes(authModel, "attempts: { value: hasUsableAuthSample ? summary.attempts : null", "Auth Outcomes no-sample attempts");
requireIncludes(authModel, "successRate: { formula: \"successes / attempts\", value: hasUsableAuthSample", "Auth Outcomes no-sample rate");
requireIncludes(authModel, "avgFinish: { formula: \"completed attempts with start/end timestamps\", value: hasUsableAuthSample", "Auth Outcomes no-sample timing");

for (const needle of [
  "readAuthFailureCode",
  'getTelemetryParamString(record, "errorCode")',
  'getTelemetryParamString(record, "error_code")',
  'getTelemetryParamString(record, "reasonCode")',
  'getTelemetryParamString(record, "reason_code")',
  'getTelemetryParamString(record, "provider")',
  'getTelemetryParamString(record, "authProvider")',
  'getTelemetryParamString(record, "auth_provider")',
  'sourceMode: "canonical_attempt_chain"',
  'sourceMode: hasLegacyAuthSample ? "legacy_event_counts" : "unavailable"',
]) {
  requireIncludes(serverHelper, needle, "Historical engagement auth source");
}

for (const unsafeNeedle of [
  "passwordValue",
  "rawPassword",
  "emailAddress",
  "rawEmail",
]) {
requireNotIncludes(serverHelper, unsafeNeedle, "Historical engagement auth source");
  requireNotIncludes(authModel, unsafeNeedle, "Auth Outcomes model contract");
  requireNotIncludes(operationsTab, unsafeNeedle, "Auth Outcomes UI contract");
}

requireIncludes(operationsTab, "Failure reason not captured", "Auth Outcomes primary failure copy");

const authSection = between(operationsTab, 'title="Auth Outcomes"', "<AdminOnboardingAnalyticsModules");

for (const needle of [
  "authHasUsableSample",
  "authCanRenderDetails",
  "!authHasUsableSample",
  "No auth sample yet",
  "Next source step: run bounded email/password and Google login attempts, then refresh.",
  "Email/password",
  "Google",
  "data-admin-analytics-auth-hydration-state",
  "data-admin-analytics-auth-measurement-mode",
  "data-admin-analytics-auth-exact-chain-available",
  "data-admin-analytics-auth-failure-reasons-available",
  "data-admin-analytics-auth-next-source-step",
  "className=\"hidden grid-cols-2 gap-2 md:grid lg:grid-cols-5\"",
  "className=\"mt-2 md:hidden\"",
  "className=\"mt-2 hidden rounded-[1rem] border border-white/10 bg-black/30 p-2.5 md:block md:p-3\"",
]) {
  requireIncludes(authSection, needle, "Auth Outcomes compact UI");
}

if (
  authSection.includes("authOutcomeModel.timingMissingReason")
  && !authSection.includes("{authOutcomeModel.timingMissingReason ? (")
) {
  failures.push("Auth Outcomes timing warning must stay inside the usable-sample branch.");
}

requireNotIncludes(authSection, "Waiting for first snapshot", "Auth Outcomes compact UI");
requireNotIncludes(authSection, "Finish timing unavailable because start timestamps are missing", "Auth Outcomes compact UI");
requireNotIncludes(authSection, "failure_code_unavailable}</", "Auth Outcomes compact UI");

for (const needle of [
  "modeLabel).not.toBe(\"ERROR\")",
  "hasUsableAuthSample).toBe(false)",
  "canRenderMethodDetails).toBe(false)",
  "measurementMode).toBe(\"canonical_attempt_chain\")",
  "measurementMode).toBe(\"legacy_event_counts\")",
  "failureReasonsAvailable).toBe(false)",
]) {
  requireIncludes(authSpec, needle, "Auth Outcomes model tests");
}

for (const needle of [
  "No auth sample yet",
  "does not render five metric cards",
  "data-admin-analytics-auth-hydration-state",
  "Failure reason not captured",
]) {
  requireIncludes(mobileSpec, needle, "Auth Outcomes mobile tests");
}

for (const needle of [
  "error_code",
  "provider",
  "canonical_attempt_chain",
  "failure_code_unavailable",
]) {
  requireIncludes(serverSpec, needle, "Historical engagement auth tests");
}

for (const needle of [
  "Auth Outcomes canonical source is the first-party auth_attempt_* chain.",
  "Email/password combines email_sign_in and email_sign_up.",
  "Google uses google_sign_in.",
  "Missing auth sample is no-sample or unavailable, not error.",
  "Legacy auth_*_attempted/success/failed counts are partial fallback only.",
]) {
  requireIncludes(authDoc, needle, "Auth Outcomes doctrine");
}

requireIncludes(truthDoc, "Auth Outcomes canonical source is first-party auth_attempt_* telemetry", "Admin Analytics truth doctrine");
requireIncludes(truthDoc, "Missing auth samples render as no-sample or unavailable, not ERROR", "Admin Analytics truth doctrine");

if (failures.length > 0) {
  console.error("Admin Analytics Auth Outcomes mobile validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics Auth Outcomes mobile validation passed.");
