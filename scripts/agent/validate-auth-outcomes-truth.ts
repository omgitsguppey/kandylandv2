import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[auth-outcomes-truth] ${message}`);
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

const authModal = read("src/components/Auth/AuthModal.tsx");
const authContext = read("src/context/AuthContext.tsx");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const authTelemetry = read("src/lib/auth-outcome-telemetry.ts");
const authOutcomeHelper = read("src/lib/admin-analytics-auth-outcome-split.ts");
const authOutcomeCheck = read("scripts/check-admin-analytics-auth-outcome-split.ts");

assertIncludes("AuthModal", authModal, "emitAuthAttemptStarted");
assertIncludes("AuthModal", authModal, "emitAuthAttemptSucceeded");
assertIncludes("AuthModal", authModal, "emitAuthAttemptFailed");
assertIncludes("AuthModal", authModal, "emitAuthLifecycleEvent");
assertIncludes("AuthModal", authModal, "auth_registration_started");
assertIncludes("AuthModal", authModal, "auth_registration_completed");
assertIncludes("AuthModal", authModal, "emailAuthSubmissionInFlightRef.current");
assertNotIncludes("AuthModal", authModal, "Waiting for first snapshot");

assertIncludes("AuthContext", authContext, "ensureNavigationSessionEstablished");
assertIncludes("AuthContext", authContext, "auth_navigation_session_started");
assertIncludes("AuthContext", authContext, "auth_navigation_session_completed");
assertIncludes("AuthContext", authContext, "auth_navigation_session_failed");
assertIncludes("AuthContext", authContext, "auth_session_established");

assertIncludes("telemetry catalog", telemetryCatalog, '"auth_attempt_started"');
assertIncludes("telemetry catalog", telemetryCatalog, '"auth_attempt_succeeded"');
assertIncludes("telemetry catalog", telemetryCatalog, '"auth_attempt_failed"');
assertIncludes("telemetry catalog", telemetryCatalog, '"auth_navigation_session_failed"');

assertIncludes("auth telemetry helper", authTelemetry, "startedAtUtc");
assertIncludes("auth telemetry helper", authTelemetry, "finishedAtUtc");
assertIncludes("auth telemetry helper", authTelemetry, "durationMs");
assertNotIncludes("auth telemetry helper", authTelemetry, "password");
assertNotIncludes("auth telemetry helper", authTelemetry, "token");

assertIncludes("auth outcome helper", authOutcomeHelper, "timingState");
assertIncludes("auth outcome helper", authOutcomeHelper, "lifecycleOutcomes");
assertIncludes("auth outcome helper", authOutcomeHelper, "failureBreakdown");
assertNotIncludes("auth outcome helper", authOutcomeHelper, "registrationOutcome");

assertIncludes("auth outcome contract check", authOutcomeCheck, "Auth lifecycle outcomes");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Auth outcomes truth validator passed.");
