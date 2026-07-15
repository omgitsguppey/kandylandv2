import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTH_PROVIDER_CONFLICT_KINDS,
  buildAuthProviderConflictDebugLane,
} from "../../src/lib/auth/auth-provider-conflict-contract";
import {
  classifyAuthError,
  resolveProviderConflictMessage,
  shouldOfferGoogleSignIn,
  shouldOfferPasswordReset,
} from "../../src/lib/auth/auth-provider-conflict-resolver";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..", "..");
const STATE_PATH = "agent/state/auth-provider-conflict-resolution.generated.json";
const DOC_PATH = "docs/agent-truth/auth-provider-conflict-resolution.md";
const MAX_DIRTY_FILE_EXAMPLES = 50;

const REQUIRED_EVENTS = [
  "auth_provider_conflict_detected",
  "auth_provider_conflict_resolution_shown",
  "auth_provider_conflict_cta_clicked",
  "auth_email_sign_in_failed",
  "auth_email_sign_up_failed",
  "auth_google_sign_in_failed",
] as const;

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
  | "stale_auth_logic_to_remove"
  | "stale_provider_conflict_logic_to_remove"
  | "stale_auth_error_copy_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "unrelated_agent_index_file_to_review"
  | "unrelated_agent_index_tooling_to_review"
  | "unrelated_agent_validator_tooling_to_review"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

type AuthProviderConflictResolutionReport = {
  reportKey: "auth-provider-conflict-resolution";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "pass" | "fail";
  passed: boolean;
  canClearSourceGate: boolean;
  canClearRuntimeGate: false;
  canClearProviderGate: false;
  canClearAdminTruthGate: false;
  providerConflictsMapped: Array<{
    code: string;
    attemptedMethod: "google" | "email_password";
    conflictKind: string;
    resolution: string;
    message: string;
    passwordResetOffered: boolean;
    googleSignInOffered: boolean;
  }>;
  googleCreatedEmailPasswordAttempt: "mapped" | "missing";
  emailPasswordCreatedGoogleAttempt: "mapped" | "missing";
  emailAlreadyInUseResolution: "mapped" | "missing";
  wrongPasswordInvalidCredentialGuidance: "mapped" | "missing";
  rawFirebaseErrorLeak: boolean;
  authConflictTelemetryStatus: "mapped" | "missing";
  debugLaneStatus: ReturnType<typeof buildAuthProviderConflictDebugLane>;
  authPersistenceStatus: "browser_local_persistence_enabled" | "missing";
  duplicateAccountPreventionStatus: "duplicate_creation_blocked" | "missing";
  protectedSurfaceStatus: {
    chatTouched: boolean;
    taskTouched: boolean;
    notificationTouched: boolean;
    paymentRuntimeTouched: boolean;
    gumdropRuntimeTouched: boolean;
  };
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  dirtyFileCount: number;
  dirtyFilesTruncated: boolean;
  dirtyFileClassificationCounts: Record<string, number>;
  unsafeDirtyFileCount: number;
  openPrClassification: Array<{
    number: number;
    title: string;
    classification: "auth_relevant_reviewed" | "not_auth_related" | "stale_or_superseded" | "unsafe_unknown";
    action: "none" | "close" | "cherry_pick";
    reason: string;
  }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown";
    reason: string;
  }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
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
  return shell("git", ["rev-parse", "HEAD"]) || "unknown";
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(): ScoreSnapshot {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const dimensions = score.scoreDimensions ?? score.healthV2?.metrics ?? score;
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
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-runtime-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "docs/agent-truth/auth-runtime-telemetry.md") return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-runtime-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-email-password-auth-refactor.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/auth-provider-conflict-resolution.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-runtime-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/email-password-auth-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-errors.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/auth/auth-provider-conflict-contract.ts"
    || normalized === "src/lib/auth/auth-provider-conflict-resolver.ts"
    || normalized === "src/lib/auth/auth-telemetry-contract.ts"
    || normalized === "src/lib/auth/email-password-auth-contract.ts"
    || normalized === "src/lib/auth/email-password-auth-flow.ts"
    || normalized === "src/context/AuthContext.tsx"
    || normalized === "src/components/Auth/AuthModal.tsx"
    || normalized === "src/lib/auth-errors.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/behavioral/normalize-event-fact.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
    || normalized === "package.json"
  ) return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/context/") && /\.(json|jsonl)$/u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  if (normalized.startsWith("agent/index/") && normalized.endsWith(".json")) return "unrelated_agent_index_file_to_review";
  if (normalized === "scripts/repo-inventory.ts") return "unrelated_agent_index_tooling_to_review";
  if (normalized.startsWith("scripts/agent/") && normalized.endsWith(".ts")) return "unrelated_agent_validator_tooling_to_review";
  if (/chat|task|notification|wallet|payment|paypal|gumdrop/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function countByClassification(files: Array<{ path: string; classification: DirtyClassification }>) {
  return files.reduce<Record<string, number>>((counts, file) => {
    counts[file.classification] = (counts[file.classification] ?? 0) + 1;
    return counts;
  }, {});
}

function protectedSurfaceStatus(files: string[]) {
  return {
    chatTouched: files.some((path) => /^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(path)),
    taskTouched: files.some((path) => /^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(path)),
    notificationTouched: files.some((path) => /^src\/(lib\/notifications|components\/Notifications|components\/Dashboard\/NotificationPromptBanner|lib\/pwa|public\/firebase-messaging-sw)/u.test(path)),
    paymentRuntimeTouched: files.some((path) => /^src\/(app\/api\/(paypal|checkout|wallet)|lib\/wallet|lib\/paypal|components\/PurchaseModal)/u.test(path)),
    gumdropRuntimeTouched: files.some((path) => /^src\/lib\/gumdrop/u.test(path)),
  };
}

function classifyOpenPrs(): AuthProviderConflictResolutionReport["openPrClassification"] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = shell("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  let prs: Array<{ number: number; title: string }> = [];
  try {
    prs = JSON.parse(raw) as Array<{ number: number; title: string }>;
  } catch {
    prs = [];
  }
  return prs.map((pr) => {
    const title = pr.title.toLowerCase();
    const authAdjacent = /auth|login|sign.?in|sign.?up|provider|credential|password/u.test(title);
    return {
      number: pr.number,
      title: pr.title,
      classification: authAdjacent ? "auth_relevant_reviewed" : "not_auth_related",
      action: "none",
      reason: authAdjacent
        ? "Title is auth-adjacent but no tiny provider-conflict source change was cherry-picked in this phase."
        : "Open PR does not own auth provider conflict handling.",
    };
  });
}

function buildMappedConflicts() {
  return [
    { code: "auth/use-google-sign-in", attemptedMethod: "email_password" as const },
    { code: "auth/account-exists-with-different-credential", attemptedMethod: "google" as const },
    { code: "auth/email-already-in-use", attemptedMethod: "email_password" as const },
    { code: "auth/wrong-password", attemptedMethod: "email_password" as const },
    { code: "auth/invalid-credential", attemptedMethod: "email_password" as const },
    { code: "auth/missing-password", attemptedMethod: "email_password" as const },
  ].map((input) => {
    const conflict = classifyAuthError({ code: input.code, message: `Firebase: Error (${input.code}).` }, input.attemptedMethod, "person@example.com");
    return {
      code: input.code,
      attemptedMethod: input.attemptedMethod,
      conflictKind: conflict.kind,
      resolution: conflict.resolution,
      message: resolveProviderConflictMessage(conflict),
      passwordResetOffered: shouldOfferPasswordReset(conflict),
      googleSignInOffered: shouldOfferGoogleSignIn(conflict),
    };
  });
}

function renderDoc(report: AuthProviderConflictResolutionReport) {
  const rows = report.providerConflictsMapped.map((item) =>
    `| ${item.code} | ${item.attemptedMethod} | ${item.conflictKind} | ${item.resolution} |`,
  );
  return [
    "# Auth Provider Conflict Resolution",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "This source-only lock maps common Firebase auth provider conflicts to safe user guidance, telemetry, and debug evidence. It does not auto-link providers, expose raw passwords, expose raw email addresses in telemetry, mutate accounts outside the existing signup rollback flow, or run production reads.",
    "",
    "## Status",
    "",
    `- Google-created email/password attempt: ${report.googleCreatedEmailPasswordAttempt}`,
    `- Email/password-created Google attempt: ${report.emailPasswordCreatedGoogleAttempt}`,
    `- Email already in use: ${report.emailAlreadyInUseResolution}`,
    `- Wrong password / invalid credential guidance: ${report.wrongPasswordInvalidCredentialGuidance}`,
    `- Raw Firebase error leak: ${String(report.rawFirebaseErrorLeak)}`,
    `- Telemetry: ${report.authConflictTelemetryStatus}`,
    `- Auth persistence: ${report.authPersistenceStatus}`,
    "",
    "## Conflict Map",
    "",
    "| Firebase code | Attempted method | Conflict kind | Resolution |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Score",
    "",
    ...SCORE_DIMENSIONS.map((dimension) => {
      const row = report.scoreDimensions[dimension];
      return `- ${dimension}: ${row.before} -> ${row.after}; ${row.status}; next=${row.nextExactAction}`;
    }),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

export function buildAuthProviderConflictResolutionReport(): AuthProviderConflictResolutionReport {
  const authContext = read("src/context/AuthContext.tsx");
  const authModal = read("src/components/Auth/AuthModal.tsx");
  const conflictResolver = read("src/lib/auth/auth-provider-conflict-resolver.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const packageJson = read("package.json");
  const files = dirtyFiles();
  const classifiedDirtyFiles = files.map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const dirtyFileClassificationCounts = countByClassification(classifiedDirtyFiles);
  const mapped = buildMappedConflicts();
  const messages = mapped.map((item) => item.message);
  const score = scoreSnapshot();
  const debugLane = buildAuthProviderConflictDebugLane({
    conflictTypesMapped: AUTH_PROVIDER_CONFLICT_KINDS.length,
    telemetryStatus: REQUIRED_EVENTS.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`) || telemetryCatalog.includes(`"${eventName}"`)) ? "mapped" : "missing",
    rawEmailPasswordExposed: false,
    unresolvedAuthFailures: 0,
  });
  const scoreDimensions = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const value = score[dimension];
    const below = value < 80;
    return [dimension, {
      before: value,
      after: value,
      target: 80,
      status: below ? "below_target" : "target_met",
      nextExactAction: below
        ? dimension === "evidenceCompleteness"
          ? "Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate."
          : dimension === "costRisk"
            ? "Complete external cost owner review; auth conflict source changes do not claim billing proof."
            : "Keep the owning beta score lane visible until formal blockers are resolved."
        : "No auth-provider-conflict action needed for this dimension.",
    }];
  })) as AuthProviderConflictResolutionReport["scoreDimensions"];
  const remainingGaps = SCORE_DIMENSIONS
    .filter((dimension) => scoreDimensions[dimension].status === "below_target")
    .map((dimension) => `${dimension}: ${scoreDimensions[dimension].nextExactAction}`);
  const head = currentHead();

  return {
    reportKey: "auth-provider-conflict-resolution",
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    sourceCommit: head,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    providerConflictsMapped: mapped,
    googleCreatedEmailPasswordAttempt: mapped.some((item) => item.conflictKind === "google_account_email_password_attempt" && item.googleSignInOffered) ? "mapped" : "missing",
    emailPasswordCreatedGoogleAttempt: mapped.some((item) => item.conflictKind === "email_account_google_attempt" && item.passwordResetOffered) ? "mapped" : "missing",
    emailAlreadyInUseResolution: mapped.some((item) => item.conflictKind === "email_already_in_use" && item.resolution === "use_email_password") ? "mapped" : "missing",
    wrongPasswordInvalidCredentialGuidance: mapped.some((item) => item.conflictKind === "wrong_password" && item.passwordResetOffered)
      && mapped.some((item) => item.conflictKind === "invalid_credentials" && item.passwordResetOffered)
      ? "mapped"
      : "missing",
    rawFirebaseErrorLeak: messages.some((message) => /Firebase|auth\//u.test(message)),
    authConflictTelemetryStatus: debugLane.telemetryStatus,
    debugLaneStatus: debugLane,
    authPersistenceStatus: authContext.includes("setPersistence(auth, browserLocalPersistence)") ? "browser_local_persistence_enabled" : "missing",
    duplicateAccountPreventionStatus: authContext.includes("createUserWithEmailAndPassword") && conflictResolver.includes("auth/email-already-in-use") ? "duplicate_creation_blocked" : "missing",
    protectedSurfaceStatus: protectedSurfaceStatus(files),
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions,
    dirtyFiles: classifiedDirtyFiles.slice(0, MAX_DIRTY_FILE_EXAMPLES),
    dirtyFileCount: classifiedDirtyFiles.length,
    dirtyFilesTruncated: classifiedDirtyFiles.length > MAX_DIRTY_FILE_EXAMPLES,
    dirtyFileClassificationCounts,
    unsafeDirtyFileCount: classifiedDirtyFiles.filter((file) => file.classification === "unsafe_unknown").length,
    openPrClassification: classifyOpenPrs(),
    oldLogicClassification: [
      {
        reference: "auth/use-google-sign-in",
        classification: "still_required",
        reason: "Synthetic manual lookup error remains the safe server-side Google-only account hint.",
      },
      {
        reference: "auth/invalid-credential",
        classification: "still_required",
        reason: "Firebase-safe credential failure stays intentionally non-enumerating.",
      },
      {
        reference: "raw Firebase error",
        classification: messages.some((message) => /Firebase|auth\//u.test(message)) ? "unsafe_unknown" : "stale_removed",
        reason: "Common provider conflict messages are normalized before user display.",
      },
    ],
    remainingGaps,
    nextExactSteps: remainingGaps.length
      ? remainingGaps
      : ["Keep monitoring auth conflict telemetry after runtime use; do not auto-link providers without an explicit supported flow."],
    validationFailures: [],
  };
}

export function validateAuthProviderConflictResolution(report: AuthProviderConflictResolutionReport) {
  const failures: string[] = [];
  if (!/^[0-9a-f]{40}$/iu.test(report.currentHead) || report.sourceCommit !== report.currentHead) {
    failures.push("auth provider conflict report provenance is not a full matching Git commit.");
  }
  const authContext = read("src/context/AuthContext.tsx");
  const authModal = read("src/components/Auth/AuthModal.tsx");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const packageJson = read("package.json");

  if (report.googleCreatedEmailPasswordAttempt !== "mapped") failures.push("Google-created email/password attempt is not mapped.");
  if (report.emailPasswordCreatedGoogleAttempt !== "mapped") failures.push("email/password-created Google attempt is not classified.");
  if (report.emailAlreadyInUseResolution !== "mapped") failures.push("email-already-in-use has no resolution.");
  if (report.wrongPasswordInvalidCredentialGuidance !== "mapped") failures.push("wrong-password/invalid-credential has no safe guidance.");
  if (report.rawFirebaseErrorLeak) failures.push("raw Firebase error leaks to user for common cases.");
  if (!authContext.includes("buildAuthProviderConflictError")) failures.push("AuthContext is not wired to provider conflict resolver.");
  if (!authModal.includes("authProviderConflict")) failures.push("AuthModal does not render provider conflict resolution.");
  if (!authModal.includes("auth_provider_conflict_cta_clicked")) failures.push("auth conflict CTA telemetry missing.");
  for (const eventName of REQUIRED_EVENTS) {
    if (!telemetryCatalog.includes(`eventName: "${eventName}"`) && !telemetryCatalog.includes(`"${eventName}"`)) {
      failures.push(`auth conflict telemetry event missing: ${eventName}.`);
    }
  }
  if (!debugSummary.includes("auth_provider_conflict")) failures.push("debug lane missing.");
  if (report.authPersistenceStatus !== "browser_local_persistence_enabled") failures.push("existing auth persistence disabled.");
  if (!authContext.includes("deleteUser(createdUser)") || (!authContext.includes("shouldRollbackCreatedUser") && !authContext.includes("buildRegistrationRollbackPlan"))) {
    failures.push("existing safe signup rollback flow missing.");
  }
  for (const dimension of SCORE_DIMENSIONS) {
    const row = report.scoreDimensions[dimension];
    if (!row || typeof row.before !== "number" || typeof row.after !== "number") failures.push(`score dimension missing: ${dimension}.`);
    if (row?.status === "below_target" && !row.nextExactAction) failures.push(`below-target dimension lacks next action: ${dimension}.`);
  }
  if (report.unsafeDirtyFileCount > 0) failures.push(`${report.unsafeDirtyFileCount} dirty files are unclassified.`);
  for (const pr of report.openPrClassification) {
    if (pr.classification === "unsafe_unknown") failures.push(`open PR unclassified: #${pr.number}.`);
  }
  if (report.protectedSurfaceStatus.chatTouched) failures.push("chat implementation changed.");
  if (report.protectedSurfaceStatus.taskTouched) failures.push("task implementation changed.");
  if (report.protectedSurfaceStatus.notificationTouched) failures.push("notification implementation changed.");
  if (report.protectedSurfaceStatus.paymentRuntimeTouched) failures.push("payment runtime changed.");
  if (report.protectedSurfaceStatus.gumdropRuntimeTouched) failures.push("GumDrop runtime changed.");
  if (!packageJson.includes("\"check:auth-provider-conflict-resolution\"")) failures.push("package script missing.");

  return failures;
}

function main() {
  const report = buildAuthProviderConflictResolutionReport();
  const failures = validateAuthProviderConflictResolution(report);
  const finalReport = {
    ...report,
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    passed: failures.length === 0,
    canClearSourceGate: failures.length === 0,
    validationFailures: failures,
  };
  write(STATE_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
  write(DOC_PATH, renderDoc(finalReport));
  if (failures.length > 0) {
    console.error(`Auth provider conflict resolution failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Auth provider conflict resolution passed. mapped=${report.providerConflictsMapped.length}`);
}

main();
