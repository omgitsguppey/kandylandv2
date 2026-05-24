import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUTH_PERSISTENCE_CONTRACT, buildAuthPersistenceDebugLane } from "../../src/lib/auth/auth-persistence-contract";
import {
  buildAuthPersistenceTelemetry,
  classifyAuthStateTransition,
  classifyLogoutReason,
  shouldClearUserState,
  shouldDeleteNavigationSession,
  shouldRetryProfileSnapshot,
} from "../../src/lib/auth/auth-session-stability";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..", "..");
const STATE_PATH = "agent/state/auth-persistence-stability.generated.json";
const DOC_PATH = "docs/agent-truth/auth-persistence-stability.md";

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
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

type AuthPersistenceReport = {
  generatedAtUtc: string;
  currentHead: string;
  persistenceStatus: "established" | "missing";
  transitionClassifierStatus: "mapped" | "missing";
  navigationSessionDeletePolicy: "reasoned_only" | "unsafe_harmless_delete";
  profileSnapshotRetryStatus: "transient_retry_keeps_user" | "can_force_logout";
  logoutReasonStatus: "mapped" | "missing";
  securityLogoutStatus: "preserved" | "missing";
  explicitLogoutStatus: "clears_session" | "missing";
  telemetryEvents: string[];
  debugLane: ReturnType<typeof buildAuthPersistenceDebugLane>;
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
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown";
    reason: string;
  }>;
  protectedSurfaceStatus: {
    chatTouched: boolean;
    taskImplementationTouched: boolean;
    notificationTouched: boolean;
    paymentRuntimeTouched: boolean;
    walletRuntimeTouched: boolean;
    gumdropRuntimeTouched: boolean;
  };
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
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/auth-persistence-stability.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/context/AuthContext.tsx"
    || normalized === "src/lib/auth/auth-persistence-contract.ts"
    || normalized === "src/lib/auth/auth-session-stability.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "package.json"
  ) return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(normalized)) return "unsafe_unknown";
  if (/^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(normalized)) return "unsafe_unknown";
  if (/^src\/(lib\/notifications|components\/Dashboard\/NotificationPromptBanner|lib\/pwa|public\/firebase-messaging-sw)/u.test(normalized)) return "unsafe_unknown";
  if (/^src\/(app\/api\/(paypal|checkout|wallet)|lib\/(paypal|wallet|gumdrop|gumdrop-ledger)|components\/PurchaseModal)/u.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function protectedSurfaceStatus(files: string[]): AuthPersistenceReport["protectedSurfaceStatus"] {
  return {
    chatTouched: files.some((path) => /^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(path)),
    taskImplementationTouched: files.some((path) => /^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(path)),
    notificationTouched: files.some((path) => /^src\/(lib\/notifications|components\/Dashboard\/NotificationPromptBanner|lib\/pwa|public\/firebase-messaging-sw)/u.test(path)),
    paymentRuntimeTouched: files.some((path) => /^src\/(app\/api\/(paypal|checkout)|lib\/paypal|components\/PurchaseModal)/u.test(path)),
    walletRuntimeTouched: files.some((path) => /^src\/(app\/api\/wallet|lib\/wallet)/u.test(path)),
    gumdropRuntimeTouched: files.some((path) => /^src\/lib\/(gumdrop|gumdrop-ledger)/u.test(path)),
  };
}

function scoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): AuthPersistenceReport["scoreDimensions"] {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const afterValue = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: afterValue,
      target: 80,
      status: afterValue >= 80 ? "target_met" : "below_target",
      nextExactAction: afterValue >= 80
        ? "No auth persistence-specific score action required."
        : "Remaining below-target score is governed by formal evidence/cost gates; auth persistence source evidence is now mapped.",
    }];
  })) as AuthPersistenceReport["scoreDimensions"];
}

function validateReport(report: AuthPersistenceReport) {
  const failures: string[] = [];
  if (report.persistenceStatus !== "established") failures.push("browserLocalPersistence not established");
  if (report.transitionClassifierStatus !== "mapped") failures.push("auth state transition classifier missing");
  if (report.navigationSessionDeletePolicy !== "reasoned_only") failures.push("navigation session deletion happens on harmless state sync");
  if (report.profileSnapshotRetryStatus !== "transient_retry_keeps_user") failures.push("transient profile snapshot failure can force logout without reason");
  if (report.logoutReasonStatus !== "mapped") failures.push("logout reason missing");
  if (report.securityLogoutStatus !== "preserved") failures.push("banned/suspended bypassed");
  if (report.explicitLogoutStatus !== "clears_session") failures.push("explicit logout no longer clears session");
  if (report.telemetryEvents.length < 9) failures.push("auth persistence telemetry missing");
  if (report.debugLane.laneId !== "auth_persistence") failures.push("auth persistence debug lane missing");
  if (Object.values(report.protectedSurfaceStatus).some(Boolean)) failures.push("protected chat/task/notification/payment/wallet/GumDrop surface changed");
  const unsafe = report.dirtyFiles.filter((entry) => entry.classification === "unsafe_unknown");
  if (unsafe.length > 0) failures.push(`dirty files unclassified: ${unsafe.map((entry) => entry.path).join(", ")}`);
  return failures;
}

function buildReport(): AuthPersistenceReport {
  const authContext = read("src/context/AuthContext.tsx");
  const contract = read("src/lib/auth/auth-persistence-contract.ts");
  const stability = read("src/lib/auth/auth-session-stability.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const packageJson = read("package.json");
  const files = dirtyFiles();
  const before = scoreSnapshot();
  const after = before;
  const restoredTransition = classifyAuthStateTransition({
    previousUserId: null,
    nextUserId: "user_1",
    initialAuthResolved: false,
  });
  const explicitTransition = classifyAuthStateTransition({
    previousUserId: "user_1",
    nextUserId: null,
    initialAuthResolved: true,
    explicitLogoutInFlight: true,
  });
  const reconnectKeepsUser = shouldRetryProfileSnapshot({
    profileSnapshotStatus: "reconnecting",
    hasAuthUser: true,
  }) && !shouldClearUserState({
    logoutReason: null,
    profileSnapshotStatus: "reconnecting",
  });
  const telemetryEvents = [
    "auth_persistence_established",
    "auth_session_restored",
    "auth_state_changed",
    "auth_unexpected_session_drop",
    "auth_logout_started",
    "auth_logout_completed",
    "auth_navigation_session_deleted",
    "auth_profile_snapshot_reconnect",
    "auth_profile_snapshot_failed",
  ];
  const authStateBlock = authContext.slice(authContext.indexOf("unsubscribe = onAuthStateChanged"), authContext.indexOf("setUser(currentUser)"));
  const logoutBlock = authContext.slice(authContext.indexOf("const logout = useCallback"), authContext.indexOf("const identityValue"));

  const report: AuthPersistenceReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    persistenceStatus: authContext.includes("setPersistence(auth, browserLocalPersistence)")
      && authContext.includes("auth_persistence_established")
      && AUTH_PERSISTENCE_CONTRACT.persistenceStatus === "browser_local_persistence_established"
      ? "established"
      : "missing",
    transitionClassifierStatus: stability.includes("classifyAuthStateTransition")
      && restoredTransition.sessionRestoreReason === "initial_browser_local_restore"
      && explicitTransition.logoutReason === "explicit_user_logout"
      ? "mapped"
      : "missing",
    navigationSessionDeletePolicy: authStateBlock.includes("shouldDeleteAuthNavigationSession")
      && authStateBlock.includes("deleteNavigationSession(transition.logoutReason")
      && !authStateBlock.includes("method: \"DELETE\"")
      && restoredTransition.shouldDeleteNavigationSession === false
      && shouldDeleteNavigationSession({ logoutReason: "explicit_user_logout", explicitLogoutAlreadyDeleted: true }) === false
      ? "reasoned_only"
      : "unsafe_harmless_delete",
    profileSnapshotRetryStatus: reconnectKeepsUser
      && authContext.includes("auth_profile_snapshot_reconnect")
      && authContext.includes("setLoading(true)")
      ? "transient_retry_keeps_user"
      : "can_force_logout",
    logoutReasonStatus: contract.includes("explicit_user_logout")
      && contract.includes("navigation_session_failed")
      && classifyLogoutReason({ navigationSessionFailed: true }) === "navigation_session_failed"
      ? "mapped"
      : "missing",
    securityLogoutStatus: authContext.includes("profile.status === \"banned\" || profile.status === \"suspended\"")
      && authContext.includes("securityStatus: profile.status")
      && classifyLogoutReason({ securityStatus: "banned" }) === "security_banned"
      && classifyLogoutReason({ securityStatus: "suspended" }) === "security_suspended"
      ? "preserved"
      : "missing",
    explicitLogoutStatus: logoutBlock.includes("explicitLogoutInFlightRef.current = true")
      && logoutBlock.includes("deleteNavigationSession(\"explicit_user_logout\"")
      && logoutBlock.includes("signOut(auth)")
      && logoutBlock.includes("auth_logout_completed")
      ? "clears_session"
      : "missing",
    telemetryEvents: telemetryEvents.filter((eventName) => telemetryCatalog.includes(eventName) && authContext.includes(eventName)),
    debugLane: buildAuthPersistenceDebugLane(),
    scoreBefore: before,
    scoreAfter: after,
    scoreDimensions: scoreDimensions(before, after),
    dirtyFiles: files.map((path) => ({ path, classification: classifyDirtyFile(path) })),
    oldLogicClassification: [
      {
        reference: "browserLocalPersistence",
        classification: "still_required",
        reason: "Firebase browser local persistence is the source-backed restore mechanism.",
      },
      {
        reference: "navigation-session DELETE inside onAuthStateChanged",
        classification: "stale_removed",
        reason: "Navigation session deletion is now reasoned through shouldDeleteNavigationSession/deleteNavigationSession.",
      },
      {
        reference: "auth profile snapshot auto-healing",
        classification: "still_required",
        reason: "Profile listener reconnects remain active and now emit retry/failure telemetry.",
      },
    ],
    protectedSurfaceStatus: protectedSurfaceStatus(files),
    remainingGaps: [],
    nextExactSteps: [
      "Run a local browser restore/logout smoke when browser QA is explicitly authorized.",
      "Attach deployed runtime evidence before clearing any formal beta runtime gate.",
    ],
    validationFailures: [],
  };

  const telemetrySample = buildAuthPersistenceTelemetry({
    eventName: "auth_unexpected_session_drop",
    userId: "user_1",
    logoutReason: "token_invalid",
  });
  if (JSON.stringify(telemetrySample.params).includes("user_1")) {
    report.validationFailures.push("auth persistence telemetry leaks raw user id");
  }
  if (!debugSummary.includes("auth_persistence") || !debugSummary.includes("Auth persistence")) {
    report.validationFailures.push("auth persistence debug lane missing");
  }
  if (!packageJson.includes("\"check:auth-persistence-stability\"")) {
    report.validationFailures.push("package script check:auth-persistence-stability missing");
  }
  report.validationFailures.push(...validateReport(report));
  return report;
}

function writeDoc(report: AuthPersistenceReport) {
  const scoreRows = SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreDimensions[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const lines = [
    "# Auth Persistence Stability",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    `- Persistence: ${report.persistenceStatus}`,
    `- Transition classifier: ${report.transitionClassifierStatus}`,
    `- Navigation session delete policy: ${report.navigationSessionDeletePolicy}`,
    `- Profile snapshot retry: ${report.profileSnapshotRetryStatus}`,
    `- Logout reasons: ${report.logoutReasonStatus}`,
    `- Security logout handling: ${report.securityLogoutStatus}`,
    `- Explicit logout: ${report.explicitLogoutStatus}`,
    `- Debug lane: ${report.debugLane.label}`,
    "",
    "## Telemetry",
    "",
    ...report.telemetryEvents.map((eventName) => `- ${eventName}`),
    "",
    "## Dirty File Classification",
    "",
    ...report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}`),
    "",
    "## Score Dimensions",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    scoreRows,
    "",
    "## Old Logic Classification",
    "",
    ...report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- None for source-level auth persistence stabilization."]),
    "",
    "## Release Note",
    "",
    "- Improved auth persistence and unexpected logout tracking.",
    "- Separated security logouts from transient session failures.",
    "- Added debug visibility for auth session stability.",
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
  console.error("Auth persistence stability validation failed:");
  for (const failure of report.validationFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Auth persistence stability validation passed. Report: ${STATE_PATH}`);
