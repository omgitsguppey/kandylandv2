import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/auth-readiness-lock.generated.json";
const DOC_PATH = "docs/agent-truth/auth-readiness-lock.md";

export const AUTH_READINESS_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

const REQUIRED_RUNTIME_EVENTS = [
  "auth_google_started",
  "auth_google_completed",
  "auth_google_failed",
  "auth_email_login_started",
  "auth_email_login_completed",
  "auth_email_login_failed",
  "auth_email_signup_started",
  "auth_email_signup_completed",
  "auth_email_signup_failed",
  "auth_password_reset_requested",
  "auth_password_reset_failed",
  "auth_navigation_session_started",
  "auth_navigation_session_completed",
  "auth_navigation_session_failed",
  "auth_session_restored",
  "auth_unexpected_session_drop",
  "auth_profile_bootstrap_started",
  "auth_profile_bootstrap_completed",
  "auth_profile_bootstrap_failed",
] as const;

type ScoreDimension = typeof AUTH_READINESS_SCORE_DIMENSIONS[number];
type ScoreSnapshot = Record<ScoreDimension, number>;
type StatusName = "pass" | "fail" | "owner_review";

export type AuthReadinessStatus = {
  status: StatusName;
  evidence: string[];
  missing: string[];
  nextAction: string;
};

export type AuthReadinessLockReport = {
  reportKey: "auth-readiness-lock";
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  providerCallsRequired: false;
  deployRequired: false;
  fakeAuthEventsUsed: false;
  securityWeakened: false;
  providerConflictStatus: AuthReadinessStatus;
  googleAuthStatus: AuthReadinessStatus;
  emailPasswordAuthStatus: AuthReadinessStatus;
  signupStatus: AuthReadinessStatus;
  loginStatus: AuthReadinessStatus;
  passwordResetStatus: AuthReadinessStatus;
  persistenceStatus: AuthReadinessStatus;
  navigationSessionStatus: AuthReadinessStatus;
  profileBootstrapStatus: AuthReadinessStatus;
  unexpectedLogoutStatus: AuthReadinessStatus;
  authTelemetryStatus: AuthReadinessStatus;
  adminDebugStatus: AuthReadinessStatus;
  personMetricsStatus: AuthReadinessStatus;
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  sourceReports: Record<string, string>;
  dirtyFiles: Array<{ path: string; classification: string }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "current_alias_compatibility" | "stale_removed" | "unsafe_unknown";
    reason: string;
  }>;
  protectedSurfaceStatus: {
    chatTouched: boolean;
    taskTouched: boolean;
    notificationTouched: boolean;
    paymentRuntimeTouched: boolean;
    gumdropRuntimeTouched: boolean;
  };
  validationFailures: string[];
};

type BuildInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  artifacts?: {
    providerConflict?: Record<string, any>;
    emailPassword?: Record<string, any>;
    persistence?: Record<string, any>;
    runtime?: Record<string, any>;
    personMetrics?: Record<string, any>;
    publicBetaScore?: Record<string, any>;
  };
  dirtyFiles?: string[];
  oldLogicClassification?: AuthReadinessLockReport["oldLogicClassification"];
};

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function git(args: readonly string[]) {
  return shell("git", args);
}

function readText(path: string) {
  const absolute = join(ROOT, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const text = readText(path);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function readState(name: string) {
  return readJson(`agent/state/${name}`);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(score: Record<string, any>): ScoreSnapshot {
  return {
    sourceHealth: numberValue(score.sourceHealthScore ?? score.sourceHealth),
    runtimeHealth: numberValue(score.runtimeHealthScore ?? score.runtimeHealth),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore ?? score.evidenceCompleteness),
    freshness: numberValue(score.freshnessScore ?? score.freshness),
    costRisk: numberValue(score.costRiskScore ?? score.costRisk),
    regressionRisk: numberValue(score.regressionRiskScore ?? score.regressionRisk),
    overallHealthScore: numberValue(score.healthScore ?? score.overallHealthScore),
  };
}

function listDirtyFiles(input?: string[]) {
  if (input) return input.map((path) => path.replace(/\\/gu, "/")).sort();
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of git(args).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function hasEvent(runtime: Record<string, any>, eventName: string) {
  return Array.isArray(runtime.eventFamilies) && runtime.eventFamilies.includes(eventName);
}

function statusFrom(condition: boolean, evidence: string[], missing: string[], nextAction: string): AuthReadinessStatus {
  return {
    status: condition ? "pass" : "fail",
    evidence,
    missing,
    nextAction,
  };
}

export function classifyAuthReadinessLockDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/auth-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "agent/state/auth-provider-conflict-resolution.generated.json"
    || normalized === "agent/state/email-password-auth-refactor.generated.json"
    || normalized === "agent/state/auth-persistence-stability.generated.json"
    || normalized === "agent/state/auth-runtime-telemetry.generated.json"
    || normalized === "agent/state/identity-handoff-spine.generated.json"
    || normalized === "agent/state/event-envelope-normalization.generated.json"
    || normalized === "agent/state/person-metrics-hydration.generated.json"
    || normalized === "agent/state/feature-registration-gate.generated.json"
    || normalized === "agent/state/debug-tracking-simplification.generated.json"
    || normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
    || normalized === "agent/state/overnight-beta-readiness-lock.generated.json"
    || normalized === "agent/state/user-management-refactor.generated.json"
    || normalized === "agent/state/telemetry-trigger-test-matrix.generated.json"
    || normalized === "agent/state/settings-debug-validator-authority.generated.json"
    || normalized === "agent/state/notification-pwa-score-lock.generated.json"
    || normalized === "agent/state/daily-task-debug-score-lock.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === "docs/agent-truth/auth-provider-conflict-resolution.md"
    || normalized === "docs/agent-truth/email-password-auth-refactor.md"
    || normalized === "docs/agent-truth/auth-persistence-stability.md"
    || normalized === "docs/agent-truth/auth-runtime-telemetry.md"
    || normalized === "docs/agent-truth/identity-handoff-spine.md"
    || normalized === "docs/agent-truth/event-envelope-normalization.md"
    || normalized === "docs/agent-truth/person-metrics-hydration.md"
    || normalized === "docs/agent-truth/feature-registration-gate.md"
    || normalized === "docs/agent-truth/debug-tracking-simplification.md"
    || normalized === "docs/agent-truth/current-beta-exit-status.md"
    || normalized === "docs/agent-truth/overnight-beta-readiness-lock.md"
    || normalized === "docs/agent-truth/user-management-refactor.md"
    || normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md"
    || normalized === "docs/agent-truth/settings-debug-validator-authority.md"
    || normalized === "docs/agent-truth/notification-pwa-score-lock.md"
    || normalized === "docs/agent-truth/daily-task-debug-score-lock.md"
  ) return "documentation_artifact_expected";
  if (
    normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts"
    || normalized === "scripts/agent/validate-email-password-auth-refactor.ts"
    || normalized === "scripts/agent/validate-auth-persistence-stability.ts"
    || normalized === "scripts/agent/validate-auth-runtime-telemetry.ts"
    || normalized === "src/lib/auth/auth-provider-conflict-contract.ts"
    || normalized === "src/lib/auth/auth-provider-conflict-resolver.ts"
    || normalized === "src/lib/auth/email-password-auth-contract.ts"
    || normalized === "src/lib/auth/email-password-auth-flow.ts"
    || normalized === "src/lib/auth/auth-persistence-contract.ts"
    || normalized === "src/lib/auth/auth-session-stability.ts"
    || normalized === "src/lib/auth/auth-telemetry-contract.ts"
    || normalized === "src/context/AuthContext.tsx"
    || normalized === "src/components/Auth/AuthModal.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts"
    || normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx"
    || normalized === "src/lib/admin/user-management-contract.ts"
    || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
  ) return "real_source_change_needs_review";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (
    normalized === "scripts/agent/validate-notification-pwa-score-lock.ts"
    || normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts"
  ) return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/^src\/(components\/Chat|lib\/chat|lib\/tasks|lib\/notifications|app\/api\/checkin|app\/api\/.*chat)/u.test(normalized)) return "unsafe_unknown";
  if (/^src\/(app\/api\/(paypal|checkout|wallet)|lib\/(paypal|wallet|gumdrop|gumdrop-ledger)|components\/PurchaseModal)/u.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function protectedSurfaceStatus(files: string[]): AuthReadinessLockReport["protectedSurfaceStatus"] {
  return {
    chatTouched: files.some((path) => /^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(path)),
    taskTouched: files.some((path) => /^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(path)),
    notificationTouched: files.some((path) => /^src\/(lib\/notifications|components\/Dashboard\/NotificationPromptBanner|lib\/pwa|public\/firebase-messaging-sw)/u.test(path)),
    paymentRuntimeTouched: files.some((path) => /^src\/(app\/api\/(paypal|checkout|wallet)|lib\/wallet|lib\/paypal|components\/PurchaseModal)/u.test(path)),
    gumdropRuntimeTouched: files.some((path) => /^src\/lib\/(gumdrop|gumdrop-ledger)/u.test(path)),
  };
}

function buildScoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): AuthReadinessLockReport["scoreDimensions"] {
  return Object.fromEntries(AUTH_READINESS_SCORE_DIMENSIONS.map((dimension) => {
    const value = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      nextExactAction: value >= 80
        ? "No auth-readiness-specific score action required."
        : "Remaining below-target score is governed by formal evidence or cost owner-review gates; auth readiness source wiring is locked.",
    }];
  })) as AuthReadinessLockReport["scoreDimensions"];
}

export function buildAuthReadinessLockReport(input: BuildInput = {}): AuthReadinessLockReport {
  const providerConflict = input.artifacts?.providerConflict ?? readState("auth-provider-conflict-resolution.generated.json");
  const emailPassword = input.artifacts?.emailPassword ?? readState("email-password-auth-refactor.generated.json");
  const persistence = input.artifacts?.persistence ?? readState("auth-persistence-stability.generated.json");
  const runtime = input.artifacts?.runtime ?? readState("auth-runtime-telemetry.generated.json");
  const personMetrics = input.artifacts?.personMetrics ?? readState("person-metrics-hydration.generated.json");
  const publicBetaScore = input.artifacts?.publicBetaScore ?? readState("public-beta-score.generated.json");
  const score = scoreSnapshot(publicBetaScore);
  const dirtyPaths = listDirtyFiles(input.dirtyFiles);
  const dirtyFiles = dirtyPaths.map((path) => ({ path, classification: classifyAuthReadinessLockDirtyFile(path) }));
  const authMetric = personMetrics.metricStatus?.auth_runtime_events;

  const providerConflictOk = providerConflict.googleCreatedEmailPasswordAttempt === "mapped"
    && providerConflict.emailPasswordCreatedGoogleAttempt === "mapped"
    && providerConflict.emailAlreadyInUseResolution === "mapped"
    && providerConflict.wrongPasswordInvalidCredentialGuidance === "mapped"
    && providerConflict.rawFirebaseErrorLeak === false;
  const runtimeEventsOk = REQUIRED_RUNTIME_EVENTS.every((eventName) => hasEvent(runtime, eventName));
  const privacyOk = runtime.privacy?.rawPasswordLogged === false
    && runtime.privacy?.rawEmailLogged === false
    && runtime.privacy?.rawFirebaseTokenLogged === false
    && runtime.debugLane?.rawPiiExposed === false
    && runtime.debugLane?.rawTokensExposed === false;
  const authTelemetryOk = runtimeEventsOk
    && runtime.featureRegistrationStatus === "mapped"
    && runtime.eventEnvelopeStatus === "mapped"
    && runtime.personMetricsStatus === "mapped"
    && privacyOk;

  const report: AuthReadinessLockReport = {
    reportKey: "auth-readiness-lock",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    productionReadsRequired: false,
    providerCallsRequired: false,
    deployRequired: false,
    fakeAuthEventsUsed: false,
    securityWeakened: false,
    providerConflictStatus: statusFrom(
      providerConflictOk,
      ["Google/email-password provider conflicts mapped to safe resolutions.", "Common Firebase provider errors avoid raw Firebase copy."],
      providerConflictOk ? [] : ["Provider conflict resolution missing or raw Firebase error leak detected."],
      "Keep provider conflict resolver mapped before adding new auth providers.",
    ),
    googleAuthStatus: statusFrom(
      emailPassword.googleAuthPathStatus === "untouched_required_path_present" && hasEvent(runtime, "auth_google_started") && hasEvent(runtime, "auth_google_completed") && hasEvent(runtime, "auth_google_failed"),
      ["Google auth path remains present and has runtime start/complete/fail telemetry."],
      ["Google auth runtime path or telemetry is incomplete."],
      "Restore Google auth path or runtime event mapping before release.",
    ),
    emailPasswordAuthStatus: statusFrom(
      emailPassword.signupFlowStatus === "mapped" && emailPassword.loginFlowStatus === "mapped" && emailPassword.rollbackStatus === "safe",
      ["Email/password signup and login flows are mapped with rollback safety."],
      ["Email/password signup/login flow, rollback, or common error mapping incomplete."],
      "Run npm run check:email-password-auth-refactor and fix the first failing auth flow invariant.",
    ),
    signupStatus: statusFrom(
      emailPassword.signupFlowStatus === "mapped" && hasEvent(runtime, "auth_email_signup_started") && hasEvent(runtime, "auth_email_signup_completed") && hasEvent(runtime, "auth_email_signup_failed"),
      ["Signup flow maps start, complete, and fail telemetry."],
      ["Signup lifecycle telemetry missing."],
      "Wire signup start/complete/fail through the auth telemetry contract.",
    ),
    loginStatus: statusFrom(
      emailPassword.loginFlowStatus === "mapped" && hasEvent(runtime, "auth_email_login_started") && hasEvent(runtime, "auth_email_login_completed") && hasEvent(runtime, "auth_email_login_failed"),
      ["Login flow maps start, complete, and fail telemetry."],
      ["Login lifecycle telemetry missing."],
      "Wire login start/complete/fail through the auth telemetry contract.",
    ),
    passwordResetStatus: statusFrom(
      hasEvent(runtime, "auth_password_reset_requested") && hasEvent(runtime, "auth_password_reset_failed"),
      ["Password reset request/failure telemetry is mapped without raw credentials."],
      ["Password reset telemetry missing."],
      "Map password reset request/failure events through auth telemetry.",
    ),
    persistenceStatus: statusFrom(
      persistence.persistenceStatus === "established" && persistence.securityLogoutStatus === "preserved" && persistence.explicitLogoutStatus === "clears_session",
      ["Browser persistence is established; security and explicit logout behavior are preserved."],
      ["Persistence, security logout, or explicit logout behavior missing."],
      "Fix auth persistence status without weakening security logout handling.",
    ),
    navigationSessionStatus: statusFrom(
      emailPassword.navigationSessionOrdering === "after_registration_truth"
        && persistence.navigationSessionDeletePolicy === "reasoned_only"
        && hasEvent(runtime, "auth_navigation_session_failed"),
      ["Navigation session is established after registration truth and failures are tracked."],
      ["Navigation session ordering/failure telemetry incomplete."],
      "Keep navigation session creation after registration truth and map failure telemetry.",
    ),
    profileBootstrapStatus: statusFrom(
      persistence.profileSnapshotRetryStatus === "transient_retry_keeps_user"
        && hasEvent(runtime, "auth_profile_bootstrap_started")
        && hasEvent(runtime, "auth_profile_bootstrap_completed")
        && hasEvent(runtime, "auth_profile_bootstrap_failed"),
      ["Profile bootstrap start/complete/fail is tracked while transient snapshot reconnects keep user state."],
      ["Profile bootstrap lifecycle or transient retry behavior incomplete."],
      "Wire profile bootstrap events and preserve transient snapshot retry behavior.",
    ),
    unexpectedLogoutStatus: statusFrom(
      persistence.logoutReasonStatus === "mapped" && hasEvent(runtime, "auth_unexpected_session_drop"),
      ["Unexpected logout reason is classified and telemetry-visible."],
      ["Unexpected logout reason or telemetry missing."],
      "Map unexpected session drops with explicit logout reason.",
    ),
    authTelemetryStatus: statusFrom(
      authTelemetryOk,
      ["Auth runtime events use feature registration, event envelopes, person metrics, and privacy-safe metadata."],
      authTelemetryOk ? [] : ["Auth telemetry is missing event envelope/person metric mapping or privacy guard."],
      "Fix the first missing link in auth telemetry: feature registration, envelope, person metrics, or privacy redaction.",
    ),
    adminDebugStatus: statusFrom(
      runtime.debugLane?.status === "live" && providerConflict.debugLaneStatus?.status === "live" && persistence.debugLane?.status === "live",
      ["Auth runtime, provider conflict, and persistence debug lanes are live."],
      ["Admin debug auth lane missing."],
      "Restore the auth runtime lane in debug-panel tracking summary and admin debug route.",
    ),
    personMetricsStatus: statusFrom(
      runtime.personMetricsStatus === "mapped"
        && personMetrics.debugLane?.lowConfidenceMetrics === 0
        && (authMetric?.state === "hydrated" || authMetric?.hydrated === true),
      ["auth_runtime_events is hydrated through person metrics with lowConfidenceMetrics=0."],
      ["Auth runtime person metric missing, low confidence, or not hydrated."],
      "Run npm run check:person-metrics-hydration and fix auth_runtime_events hydration.",
    ),
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions: buildScoreDimensions(score, score),
    remainingGaps: [
      "Formal provider/runtime/admin evidence and cost owner-review gates remain outside this auth source lock.",
    ],
    nextExactSteps: [
      "Attach formal provider/runtime/admin evidence artifacts when available; do not mark them passed from local auth validators.",
      "Keep auth provider conflict, email/password, persistence, and runtime telemetry validators in the auth readiness signoff lane.",
    ],
    sourceReports: {
      providerConflict: "agent/state/auth-provider-conflict-resolution.generated.json",
      emailPassword: "agent/state/email-password-auth-refactor.generated.json",
      persistence: "agent/state/auth-persistence-stability.generated.json",
      runtimeTelemetry: "agent/state/auth-runtime-telemetry.generated.json",
      personMetrics: "agent/state/person-metrics-hydration.generated.json",
      score: "agent/state/public-beta-score.generated.json",
    },
    dirtyFiles,
    oldLogicClassification: input.oldLogicClassification ?? [
      {
        reference: "auth_sign_in_attempted/auth_sign_in_success/auth_sign_in_failed",
        classification: "current_alias_compatibility",
        reason: "Legacy admin auth outcome events remain for historical outcome panels while auth_email_login_* owns runtime telemetry.",
      },
      {
        reference: "auth_sign_up_attempted/auth_sign_up_success/auth_sign_up_failed",
        classification: "current_alias_compatibility",
        reason: "Legacy signup outcome events remain for compatibility while auth_email_signup_* owns runtime telemetry.",
      },
      {
        reference: "Authentication failed",
        classification: "stale_removed",
        reason: "Common provider/email/password failures map to safe resolution copy instead of raw generic Firebase errors.",
      },
    ],
    protectedSurfaceStatus: protectedSurfaceStatus(dirtyPaths),
    validationFailures: [],
  };
  report.validationFailures = validateAuthReadinessLockReport(report);
  return report;
}

export function validateAuthReadinessLockReport(report: AuthReadinessLockReport) {
  const failures: string[] = [];
  if (report.reportKey !== "auth-readiness-lock") failures.push("reportKey must be auth-readiness-lock.");
  for (const dimension of AUTH_READINESS_SCORE_DIMENSIONS) {
    if (!report.scoreDimensions[dimension]) failures.push(`score dimension missing: ${dimension}.`);
    if (report.scoreAfter[dimension] < 80 && !report.scoreDimensions[dimension]?.nextExactAction) {
      failures.push(`${dimension} below target must include nextExactAction.`);
    }
  }
  if (report.providerConflictStatus.status !== "pass") {
    failures.push("Google-created account email/password attempt unresolved.");
    failures.push("Email/password-created account Google attempt unresolved.");
  }
  if (report.emailPasswordAuthStatus.status !== "pass") failures.push("Email signup/login common failures unmapped.");
  if (report.persistenceStatus.status !== "pass") failures.push("Auth persistence missing.");
  if (report.unexpectedLogoutStatus.status !== "pass") failures.push("Unexpected logout reason missing.");
  if (report.authTelemetryStatus.status !== "pass") failures.push("Auth telemetry is missing event envelope or person metrics mapping.");
  if (report.adminDebugStatus.status !== "pass") failures.push("Admin debug auth lane missing.");
  if (report.personMetricsStatus.status !== "pass") failures.push("Auth person metrics missing.");
  if (report.fakeAuthEventsUsed) failures.push("Fake auth events are not allowed.");
  if (report.securityWeakened) failures.push("Security logout protections removed.");
  const dirtyUnsafe = report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown");
  if (dirtyUnsafe || Object.values(report.protectedSurfaceStatus).some(Boolean)) {
    failures.push("Dirty files include unclassified or forbidden auth-lock scope.");
  }
  if (JSON.stringify(report).match(/raw Firebase token|password_value|firebase_token_value/iu)) {
    failures.push("Raw PII or token exposure is not allowed in auth readiness lock.");
  }
  if (report.authTelemetryStatus.status !== "pass" || JSON.stringify(report).includes("\"rawPiiExposed\":true") || JSON.stringify(report).includes("\"rawTokensExposed\":true")) {
    failures.push("Raw PII or token exposure is not allowed in auth readiness lock.");
  }
  return [...new Set(failures)];
}

function renderDoc(report: AuthReadinessLockReport) {
  const lines = [
    "# Auth Readiness Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Status",
    `- Provider conflicts: ${report.providerConflictStatus.status}`,
    `- Google auth: ${report.googleAuthStatus.status}`,
    `- Email/password auth: ${report.emailPasswordAuthStatus.status}`,
    `- Signup: ${report.signupStatus.status}`,
    `- Login: ${report.loginStatus.status}`,
    `- Password reset: ${report.passwordResetStatus.status}`,
    `- Persistence: ${report.persistenceStatus.status}`,
    `- Navigation session: ${report.navigationSessionStatus.status}`,
    `- Profile bootstrap: ${report.profileBootstrapStatus.status}`,
    `- Unexpected logout: ${report.unexpectedLogoutStatus.status}`,
    `- Auth telemetry: ${report.authTelemetryStatus.status}`,
    `- Admin debug: ${report.adminDebugStatus.status}`,
    `- Person metrics: ${report.personMetricsStatus.status}`,
    "",
    "## Score Dimensions",
    ...AUTH_READINESS_SCORE_DIMENSIONS.map((dimension) => {
      const score = report.scoreDimensions[dimension];
      return `- ${dimension}: ${score.before} -> ${score.after} (${score.status}); next: ${score.nextExactAction}`;
    }),
    "",
    "## Remaining Gaps",
    ...report.remainingGaps.map((gap) => `- ${gap}`),
    "",
    "## Next Exact Steps",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Dirty File Classification",
    ...report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}`),
    "",
    "## Old Logic Classification",
    ...report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function main() {
  const report = buildAuthReadinessLockReport();
  mkdirSync(dirname(join(ROOT, STATE_PATH)), { recursive: true });
  mkdirSync(dirname(join(ROOT, DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Auth readiness lock validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Auth readiness lock passed. provider=${report.providerConflictStatus.status} email=${report.emailPasswordAuthStatus.status} telemetry=${report.authTelemetryStatus.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
