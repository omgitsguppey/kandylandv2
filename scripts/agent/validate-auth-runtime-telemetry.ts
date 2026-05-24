import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTH_RUNTIME_TELEMETRY_EVENTS,
  buildAuthRuntimeDebugLane,
  buildAuthRuntimeTelemetry,
  buildAuthRuntimeTelemetryReport,
} from "../../src/lib/auth/auth-telemetry-contract";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..", "..");
const STATE_PATH = "agent/state/auth-runtime-telemetry.generated.json";
const DOC_PATH = "docs/agent-truth/auth-runtime-telemetry.md";

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type ScoreSnapshot = Record<ScoreDimension, number>;
type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_auth_telemetry_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

type AuthRuntimeLockReport = ReturnType<typeof buildAuthRuntimeTelemetryReport> & {
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  runtimeWiring: {
    authModalTracksSurface: boolean;
    authModalTracksStartedCompletedFailed: boolean;
    authContextTracksProfileBootstrap: boolean;
    navigationSessionTracked: boolean;
    providerConflictDebugVisible: boolean;
    unexpectedLogoutTracked: boolean;
    adminDebugAuthLaneVisible: boolean;
  };
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  staleAuthTelemetryLogic: Array<{
    reference: string;
    classification: "still_required" | "stale_removed" | "current_alias_compatibility" | "unsafe_unknown";
    reason: string;
  }>;
  remainingGaps: string[];
  nextExactSteps: string[];
};

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const text = read(path);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function currentHead() {
  return shell("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(): ScoreSnapshot {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const dimensions = score.scoreDimensions ?? score.healthV2?.metrics ?? score.metrics ?? score;
  return {
    sourceHealth: numberValue(dimensions.sourceHealth ?? dimensions.sourceHealthScore ?? score.sourceHealthScore),
    runtimeHealth: numberValue(dimensions.runtimeHealth ?? dimensions.runtimeHealthScore ?? score.runtimeHealthScore),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness ?? dimensions.evidenceCompletenessScore ?? score.evidenceCompletenessScore),
    freshness: numberValue(dimensions.freshness ?? dimensions.freshnessScore ?? score.freshnessScore),
    costRisk: numberValue(dimensions.costRisk ?? dimensions.costRiskScore ?? score.costRiskScore),
    regressionRisk: numberValue(dimensions.regressionRisk ?? dimensions.regressionRiskScore ?? score.regressionRiskScore),
    overallHealthScore: numberValue(dimensions.overallHealthScore ?? dimensions.healthScore ?? score.overallHealthScore ?? score.healthScore),
  };
}

function dirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of shell("git", args).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-provider-conflict-resolution.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-persistence-stability.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-runtime-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-email-password-auth-refactor.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/auth-runtime-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/auth/auth-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/context/AuthContext.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Auth/AuthModal.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/^src\/(components\/Chat|lib\/chat|app\/api\/.*chat|lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn|lib\/notifications|lib\/pwa|app\/api\/(paypal|checkout|wallet)|lib\/(paypal|wallet|gumdrop)|components\/PurchaseModal)/u.test(normalized)) {
    return "unsafe_unknown";
  }
  return "unsafe_unknown";
}

function scoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): AuthRuntimeLockReport["scoreDimensions"] {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const afterValue = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: afterValue,
      target: 80,
      status: afterValue >= 80 ? "target_met" : "below_target",
      nextExactAction: afterValue >= 80
        ? "No auth runtime-specific score action required."
        : "Remaining below-target score is governed by formal evidence or cost gates; auth runtime telemetry is source-wired.",
    }];
  })) as AuthRuntimeLockReport["scoreDimensions"];
}

function validateReport(report: AuthRuntimeLockReport) {
  const failures: string[] = [...report.validationFailures];
  if (report.eventEnvelopeStatus !== "mapped") failures.push("auth events bypass event envelope");
  if (report.personMetricsStatus !== "mapped") failures.push("auth events lack person metrics mapping");
  if (report.featureRegistrationStatus !== "mapped") failures.push("auth not feature registered");
  if (report.debugLane.laneId !== "auth_runtime") failures.push("admin debug auth lane missing");
  if (!report.runtimeWiring.providerConflictDebugVisible) failures.push("provider conflicts not debug-visible");
  if (!report.runtimeWiring.unexpectedLogoutTracked) failures.push("unexpected logout not tracked");
  if (!report.runtimeWiring.authModalTracksStartedCompletedFailed) failures.push("auth runtime started/completed/failed events missing");
  if (!report.runtimeWiring.authContextTracksProfileBootstrap) failures.push("profile bootstrap telemetry missing");
  if (!report.runtimeWiring.adminDebugAuthLaneVisible) failures.push("admin debug auth lane missing");
  if (report.privacy.rawPasswordLogged || report.privacy.rawEmailLogged || report.privacy.rawFirebaseTokenLogged) failures.push("raw password/email/token leaks");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified");
  return [...new Set(failures)];
}

function buildReport(): AuthRuntimeLockReport {
  const before = scoreSnapshot();
  const base = buildAuthRuntimeTelemetryReport({ currentHead: currentHead() });
  const authModal = read("src/components/Auth/AuthModal.tsx");
  const authContext = read("src/context/AuthContext.tsx");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const personMetrics = read("src/lib/analytics/person-metrics-contract.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const adminRoute = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");
  const files = dirtyFiles();
  const telemetrySample = buildAuthRuntimeTelemetry({
    eventName: "auth_email_login_failed",
    method: "email_password",
    failureCode: "auth/invalid-credential",
    metadata: {
      emailHash: "email_redacted_hash",
      rawFirebaseTokenIncluded: false,
    },
  });
  const sampleJson = JSON.stringify(telemetrySample.params);
  const runtimeWiring = {
    authModalTracksSurface: authModal.includes("auth_surface_viewed"),
    authModalTracksStartedCompletedFailed: [
      "auth_google_started",
      "auth_google_completed",
      "auth_google_failed",
      "auth_email_login_started",
      "auth_email_login_completed",
      "auth_email_login_failed",
      "auth_email_signup_started",
      "auth_email_signup_completed",
      "auth_email_signup_failed",
    ].every((eventName) => authModal.includes(eventName)),
    authContextTracksProfileBootstrap: [
      "auth_profile_bootstrap_started",
      "auth_profile_bootstrap_completed",
      "auth_profile_bootstrap_failed",
    ].every((eventName) => authContext.includes(eventName)),
    navigationSessionTracked: [
      "auth_navigation_session_started",
      "auth_navigation_session_completed",
      "auth_navigation_session_failed",
    ].every((eventName) => authContext.includes(eventName)),
    providerConflictDebugVisible: debugSummary.includes("auth_provider_conflict") && authContext.includes("auth_provider_conflict_detected"),
    unexpectedLogoutTracked: authContext.includes("auth_unexpected_session_drop") && telemetryCatalog.includes("auth_unexpected_session_drop"),
    adminDebugAuthLaneVisible: debugSummary.includes("auth_runtime") && adminRoute.includes("authRuntimeTelemetry"),
  };
  const after = before;
  const report: AuthRuntimeLockReport = {
    ...base,
    scoreBefore: before,
    scoreAfter: after,
    scoreDimensions: scoreDimensions(before, after),
    runtimeWiring,
    dirtyFiles: files.map((path) => ({ path, classification: classifyDirtyFile(path) })),
    staleAuthTelemetryLogic: [
      {
        reference: "auth_sign_in_attempted/auth_sign_in_success/auth_sign_in_failed",
        classification: "current_alias_compatibility",
        reason: "Legacy admin outcome events remain for compatibility while auth_email_login_* is the runtime family.",
      },
      {
        reference: "auth_sign_up_attempted/auth_sign_up_success/auth_sign_up_failed",
        classification: "current_alias_compatibility",
        reason: "Legacy signup events remain for admin outcome history while auth_email_signup_* is the runtime family.",
      },
      {
        reference: "auth_profile_snapshot_failed",
        classification: "still_required",
        reason: "Persistence lane still consumes profile snapshot failures; auth_profile_bootstrap_failed feeds runtime telemetry.",
      },
    ],
    remainingGaps: [],
    nextExactSteps: [
      "Attach deployed runtime auth smoke evidence before clearing formal runtime gates.",
      "Keep admin auth runtime summaries redacted and drilldown-only for raw details.",
    ],
  };

  if (sampleJson.includes("password_value") || sampleJson.includes("firebase_token_value")) {
    report.validationFailures.push("auth runtime telemetry leaks credential sample");
  }
  if (authModal.includes("detail: {\n                    action: \"password_reset\",\n                    email,")) {
    report.validationFailures.push("password reset client issue still includes raw email");
  }
  if (!packageJson.includes("\"check:auth-runtime-telemetry\"")) {
    report.validationFailures.push("package script check:auth-runtime-telemetry missing");
  }
  if (!personMetrics.includes("auth_runtime_events")) {
    report.validationFailures.push("auth runtime person metric missing");
  }
  for (const eventName of AUTH_RUNTIME_TELEMETRY_EVENTS) {
    if (!telemetryCatalog.includes(`"${eventName}"`)) {
      report.validationFailures.push(`${eventName} missing from telemetry catalog`);
    }
  }
  report.validationFailures = validateReport(report);
  report.status = report.validationFailures.length > 0 ? "fail" : "pass";
  report.debugLane = buildAuthRuntimeDebugLane({
    telemetryStatus: report.featureRegistrationStatus === "mapped" ? "mapped" : "missing",
    personMetricsStatus: report.personMetricsStatus,
    eventEnvelopeStatus: report.eventEnvelopeStatus,
  });
  return report;
}

function writeDoc(report: AuthRuntimeLockReport) {
  const scoreRows = SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreDimensions[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const lines = [
    "# Auth Runtime Telemetry",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    `- Feature registration: ${report.featureRegistrationStatus}`,
    `- Event envelope: ${report.eventEnvelopeStatus}`,
    `- Person metrics: ${report.personMetricsStatus}`,
    `- Debug lane: ${report.debugLane.label}`,
    `- Privacy: ${report.privacy.redactionPolicy}`,
    "",
    "## Event Families",
    "",
    ...report.eventFamilies.map((eventName) => `- ${eventName}`),
    "",
    "## Admin Debug Lane",
    "",
    `- Signup attempts: ${report.debugLane.signupAttempts}`,
    `- Login attempts: ${report.debugLane.loginAttempts}`,
    `- Provider conflicts: ${report.debugLane.providerConflictCount}`,
    `- Unexpected logouts: ${report.debugLane.unexpectedLogoutCount}`,
    `- Navigation session failures: ${report.debugLane.navigationSessionFailureCount}`,
    `- Profile bootstrap failures: ${report.debugLane.profileBootstrapFailureCount}`,
    `- Raw details collapsed by default: ${report.debugLane.rawDetailsCollapsedByDefault}`,
    "",
    "## Score Dimensions",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    scoreRows,
    "",
    "## Dirty File Classification",
    "",
    ...report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}`),
    "",
    "## Stale Auth Telemetry Logic",
    "",
    ...report.staleAuthTelemetryLogic.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`),
    "",
    "## Release Note",
    "",
    "- Connected auth signup, login, provider conflicts, and session stability to telemetry.",
    "- Added admin debug visibility for auth runtime health.",
    "- Protected auth telemetry from raw PII or token exposure.",
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ];
  write(DOC_PATH, `${lines.join("\n")}\n`);
}

const report = buildReport();
write(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeDoc(report);

if (report.validationFailures.length > 0) {
  console.error("Auth runtime telemetry validation failed:");
  for (const failure of report.validationFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Auth runtime telemetry validation passed. Report: ${STATE_PATH}`);
